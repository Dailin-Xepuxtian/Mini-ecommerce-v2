const crypto = require('crypto');
const { Queue } = require('bullmq');
const connection = require('../config/redis');
const trabajos = require('./trabajos.service');

const NOMBRES = { PDF: 'pdf-ordenes', CORREO: 'correos' };

// Reintentos con espera exponencial (5s, 10s...). Los fallidos se conservan 7 días para poder revisarlos.
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

const colaPdf = new Queue(NOMBRES.PDF, { connection, defaultJobOptions });
const colaCorreo = new Queue(NOMBRES.CORREO, { connection, defaultJobOptions });
const colas = { [NOMBRES.PDF]: colaPdf, [NOMBRES.CORREO]: colaCorreo };

for (const c of Object.values(colas)) {
  c.on('error', (err) => console.error(`[cola ${c.name}]`, err.message));
}

/**
 * Registra el trabajo en BD y luego lo encola con el mismo id.
 * (Primero la BD: así el worker nunca actualiza un registro que todavía no existe.)
 */
async function encolar(cola, nombreJob, data, { idPedido, tipo }) {
  const jobId = crypto.randomUUID();
  await trabajos.registrar({ idPedido, cola: cola.name, jobId, tipo });
  try {
    await cola.add(nombreJob, data, { jobId });
  } catch (e) {
    await trabajos.actualizar(cola.name, jobId, { estado: 'fallido', error: `No se pudo encolar: ${e.message}` });
    throw e;
  }
  return jobId;
}

/** motivo: 'creada' | 'actualizada' | 'reenvio' */
const encolarPdf = (idPedido, motivo) =>
  encolar(colaPdf, 'generar-pdf', { idPedido, motivo }, { idPedido, tipo: 'pdf' });

const encolarCorreo = (idPedido, motivo) =>
  encolar(colaCorreo, 'enviar-correo', { idPedido, motivo }, { idPedido, tipo: 'correo' });

module.exports = { NOMBRES, colas, colaPdf, colaCorreo, encolarPdf, encolarCorreo };
