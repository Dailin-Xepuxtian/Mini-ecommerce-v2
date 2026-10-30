const crypto = require('crypto');
const pool = require('../config/db');
const { HttpError } = require('../common/errors');
const { withTransaction } = require('../common/transaction');
const { esAdmin } = require('../common/roles');
const inventario = require('./inventario');
const queues = require('./pagos.queue');
const colasPedido = require('../queues/queues'); // PDF de la orden de compra -> correo al cliente

const MAX_INTENTOS = Number(process.env.PAGO_MAX_INTENTOS || 3);
const PROB_RECHAZO = Number(process.env.PAGO_PROB_RECHAZO || 0); // 0 a 1: rechazos al azar
const DEMO_FALLOS = Number(process.env.DEMO_FALLOS_PAGO || 0); // demo: los N primeros intentos del trabajo fallan (evidencia de reintentos)
const DEMO_RECHAZOS = Number(process.env.DEMO_RECHAZOS_PAGO || 0); // rechaza los N primeros intentos de cada pedido

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const noEncontrado = () => new HttpError(404, 'NOT_FOUND', 'Pedido no encontrado');
const referenciaPago = () => `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/** El cliente solo ve lo suyo; con soloDueno, ni siquiera un admin (pagar es cosa del comprador). */
async function cargarPedido(user, id, { soloDueno = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT id_pedido, id_usuario, estado, estado_pago, total
     FROM pedidos WHERE id_pedido = ? LIMIT 1`,
    [id]
  );
  const p = rows[0];
  const esDueno = p && Number(p.id_usuario) === user.id;
  if (!p || (!esDueno && (soloDueno || !esAdmin(user)))) throw noEncontrado();
  return p;
}

// ---------------- API ----------------
/** POST /pedidos/:id/pagar -> valida reglas, marca "procesando" y encola el trabajo de pago. */
async function iniciarPago(user, id) {
  const p = await cargarPedido(user, id, { soloDueno: true });

  if (p.estado !== 'pendiente') {
    throw new HttpError(409, 'CONFLICT', `El pedido está '${p.estado}' y ya no admite pago`);
  }
  if (!['pendiente', 'rechazado'].includes(p.estado_pago)) {
    throw new HttpError(
      409,
      'CONFLICT',
      p.estado_pago === 'procesando' ? 'El pago ya se está procesando' : 'El pedido ya fue pagado'
    );
  }
  const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM pedido_pagos WHERE id_pedido = ?', [id]);
  if (Number(n) >= MAX_INTENTOS) {
    throw new HttpError(409, 'CONFLICT', `Alcanzaste el máximo de ${MAX_INTENTOS} intentos de pago`);
  }

  // UPDATE condicional: aunque lleguen dos clics a la vez, solo uno pasa
  const idPago = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      `UPDATE pedidos SET estado_pago = 'procesando'
       WHERE id_pedido = ? AND estado = 'pendiente' AND estado_pago IN ('pendiente','rechazado')`,
      [id]
    );
    if (r.affectedRows !== 1) throw new HttpError(409, 'CONFLICT', 'El pedido cambió, intenta de nuevo');
    const [ins] = await conn.execute(
      "INSERT INTO pedido_pagos (id_pedido, metodo, monto, estado, referencia) VALUES (?, 'en_linea', ?, 'procesando', ?)",
      [id, p.total, referenciaPago()]
    );
    return ins.insertId;
  });

  try {
    const jobId = await queues.encolarPago(id, idPago);
    return { mensaje: 'Pago en proceso', id_pago: idPago, job_id: jobId, cola: queues.NOMBRES.PAGOS };
  } catch {
    await rechazar(id, idPago, 'No se pudo iniciar el pago, intenta de nuevo');
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'No se pudo encolar el pago, intenta de nuevo');
  }
}

// ---------------- lo que ejecuta el worker ----------------
async function rechazar(idPedido, idPago, motivo) {
  await pool.execute("UPDATE pedido_pagos SET estado = 'rechazado', motivo = ? WHERE id_pago = ? AND estado = 'procesando'", [
    String(motivo).slice(0, 200),
    idPago,
  ]);
  await pool.execute("UPDATE pedidos SET estado_pago = 'rechazado' WHERE id_pedido = ? AND estado_pago = 'procesando'", [
    idPedido,
  ]);
}

/**
 * Pago simulado. Aprobado: en UNA transacción descuenta el inventario, confirma el pedido y marca el pago.
 * Después encola la orden de compra (PDF) y el correo al cliente. Rechazado (banco simulado o sin stock): el pedido sigue pendiente.
 */
async function procesarPago(idPago, job) {
  const [rows] = await pool.execute('SELECT id_pago, id_pedido, estado FROM pedido_pagos WHERE id_pago = ?', [idPago]);
  const pago = rows[0];
  if (!pago || pago.estado !== 'procesando') return { omitido: true }; // idempotente

  // Error técnico simulado: BullMQ lo reintenta con backoff (el pago sigue 'procesando')
  if ((job?.attemptsMade ?? 0) < DEMO_FALLOS) throw new Error('Pasarela de pago no disponible (fallo simulado)');

  await pausa(2000 + Math.floor(Math.random() * 1500)); // simula la pasarela de pago

  const [[{ n }]] = await pool.execute('SELECT COUNT(*) AS n FROM pedido_pagos WHERE id_pedido = ? AND id_pago <= ?', [
    pago.id_pedido,
    idPago,
  ]);
  let motivo = null;
  if (Number(n) <= DEMO_RECHAZOS) motivo = 'Pago rechazado por el banco (simulado)';
  else if (Math.random() < PROB_RECHAZO) motivo = 'Fondos insuficientes (simulado)';

  if (!motivo) {
    try {
      await withTransaction(async (conn) => {
        const [[ped]] = await conn.execute('SELECT estado, estado_pago FROM pedidos WHERE id_pedido = ? FOR UPDATE', [
          pago.id_pedido,
        ]);
        if (!ped || ped.estado !== 'pendiente' || ped.estado_pago !== 'procesando') {
          throw new Error('El pedido cambió de estado mientras se procesaba el pago');
        }
        await inventario.descontar(conn, pago.id_pedido);
        await conn.execute(
          "UPDATE pedidos SET estado = 'confirmado', estado_pago = 'aprobado', pagado_en = NOW() WHERE id_pedido = ?",
          [pago.id_pedido]
        );
        await conn.execute("UPDATE pedido_pagos SET estado = 'aprobado' WHERE id_pago = ?", [idPago]);
      });
    } catch (e) {
      if (!(e instanceof inventario.StockInsuficienteError)) throw e;
      motivo = e.message; // sin stock: se rechaza el pago, no se cobra
    }
  }

  if (motivo) {
    await rechazar(pago.id_pedido, idPago, motivo);
    return { estado: 'rechazado', motivo };
  }

  try {
    await colasPedido.encolarPdf(pago.id_pedido, 'creada'); // cola PDF -> cola de correo
  } catch (e) {
    // El pago ya está aprobado: no se revierte. El trabajo queda "fallido" y se puede usar "Reenviar".
    console.error(`No se pudo encolar la orden de compra del pedido ${pago.id_pedido}:`, e.message);
  }
  return { estado: 'aprobado' };
}

module.exports = { iniciarPago, procesarPago, rechazar };
