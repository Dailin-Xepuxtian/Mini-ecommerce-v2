const { Queue } = require('bullmq');
const pool = require('../config/db');

// Misma conexión Redis que el resto de las colas (variables del .env)
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Solo el pago simulado. El PDF de la orden de compra y el correo siguen en src/queues/queues.js
const NOMBRES = Object.freeze({ PAGOS: 'pagos' });

const limpieza = { removeOnComplete: 200, removeOnFail: 500 };
const OPCIONES = {
  // Un rechazo del banco es un resultado de negocio: el trabajo termina "bien" y NO se reintenta.
  // Un error técnico (pasarela caída, BD) sí se reintenta 3 veces con espera exponencial; procesarPago es idempotente.
  [NOMBRES.PAGOS]: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, ...limpieza },
};

const colas = {};
for (const nombre of Object.values(NOMBRES)) {
  colas[nombre] = new Queue(nombre, { connection, defaultJobOptions: OPCIONES[nombre] });
  colas[nombre].on('error', (e) => console.error(`[cola ${nombre}]`, e.message));
}

/** Actualiza el registro del trabajo en pedido_trabajos (lo que ve el frontend). Nunca lanza. */
async function marcarTrabajo(cola, jobId, estado, { intentos, error } = {}) {
  const sets = ['estado = ?'];
  const params = [estado];
  if (intentos !== undefined) {
    sets.push('intentos = ?');
    params.push(intentos);
  }
  if (error !== undefined) {
    sets.push('error = ?');
    params.push(error ? String(error).slice(0, 500) : null);
  }
  params.push(cola, String(jobId));
  try {
    await pool.execute(`UPDATE pedido_trabajos SET ${sets.join(', ')} WHERE cola = ? AND job_id = ?`, params);
  } catch (e) {
    console.error(`No se pudo actualizar el trabajo ${cola}/${jobId}:`, e.message);
  }
}

/** Registra el trabajo en BD y lo manda a Redis. Si Redis falla, queda registrado como fallido. */
async function encolar(cola, tipo, nombreJob, data, jobId) {
  await pool.execute('INSERT INTO pedido_trabajos (id_pedido, cola, job_id, tipo, estado) VALUES (?, ?, ?, ?, ?)', [
    data.idPedido,
    cola,
    jobId,
    tipo,
    'en_cola',
  ]);
  try {
    await colas[cola].add(nombreJob, data, { jobId });
  } catch (e) {
    await marcarTrabajo(cola, jobId, 'fallido', { error: e.message });
    throw e;
  }
  return jobId;
}

const encolarPago = (idPedido, idPago) =>
  encolar(NOMBRES.PAGOS, 'pago', 'procesar-pago', { idPedido, idPago }, `pago-${idPago}`);

module.exports = { connection, colas, NOMBRES, marcarTrabajo, encolarPago };
