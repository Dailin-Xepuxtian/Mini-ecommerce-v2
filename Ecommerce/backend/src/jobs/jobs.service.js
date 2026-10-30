const pool = require('../config/db');
const { HttpError } = require('../common/errors');
const { esAdmin } = require('../common/roles');

// 1. Importa asignando alias a cada objeto de colas
const { colas: colasPedido } = require('../queues/queues');
const { colas: colasPago } = require('../pagos/pagos.queue');

// 2. Unifica ambos objetos en una sola constante llamada "colas"
const colas = { ...colasPedido, ...colasPago }; // pdf-ordenes, correos + pagos, facturas, correos-factura

/** Estado de un trabajo: lo guardado en BD + lo que dice BullMQ en vivo (si todavía lo conserva). */
async function obtenerEstado(user, nombreCola, jobId) {
  const [rows] = await pool.execute(
    `SELECT t.tipo, t.estado, t.intentos, t.error, t.creado_en, t.actualizado_en, p.id_usuario
     FROM pedido_trabajos t
     INNER JOIN pedidos p ON p.id_pedido = t.id_pedido
     WHERE t.cola = ? AND t.job_id = ? LIMIT 1`,
    [nombreCola, jobId]
  );

  const fila = rows[0];
  // Un cliente solo ve los trabajos de sus propios pedidos
  if (!fila || (!esAdmin(user) && Number(fila.id_usuario) !== user.id)) {
    throw new HttpError(404, 'NOT_FOUND', 'Trabajo no encontrado');
  }

  // Ahora "colas" existe y contiene tanto colasPedido como colasPago
  const job = await colas[nombreCola]?.getJob(jobId);
  return {
    id: jobId,
    cola: nombreCola,
    tipo: fila.tipo,
    estado: fila.estado,
    estado_cola: job ? await job.getState() : null,
    intentos: Number(fila.intentos),
    max_intentos: job?.opts?.attempts ?? null,
    progreso: job ? job.progress : null,
    error: job?.failedReason ?? fila.error,
    creado_en: fila.creado_en,
    actualizado_en: fila.actualizado_en,
  };
}

module.exports = { obtenerEstado };
