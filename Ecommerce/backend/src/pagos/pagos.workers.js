/**
 * Worker del pago simulado. Al aprobarse, procesarPago() encola la orden de compra (PDF) y el correo
 * (workers de src/queues).
 * Lo inicia src/worker.js (el proceso "worker" de docker compose) llamando a crearWorkerPago(), NO la API.
 */
const { Worker } = require('bullmq');
const pagosService = require('./pagos.service');
const { connection, NOMBRES, marcarTrabajo } = require('./pagos.queue');

/** Crea un worker y mantiene al día la tabla pedido_trabajos (en_cola -> procesando -> reintentando -> completado/fallido). */
function crearWorker(nombre, handler, opciones = {}) {
  const worker = new Worker(nombre, handler, { connection, concurrency: 2, ...opciones });

  worker.on('active', (job) => marcarTrabajo(nombre, job.id, 'procesando', { intentos: job.attemptsMade + 1 }));
  worker.on('completed', (job) => marcarTrabajo(nombre, job.id, 'completado', { error: null }));
  worker.on('failed', (job, err) => {
    if (!job) return;
    const definitivo = job.attemptsMade >= (job.opts.attempts ?? 1);
    marcarTrabajo(nombre, job.id, definitivo ? 'fallido' : 'reintentando', {
      intentos: Math.max(job.attemptsMade, 1),
      error: err.message,
    });
  });
  worker.on('error', (e) => console.error(`[worker ${nombre}]`, e.message));
  return worker;
}

// ---------- Pago simulado ----------
/** Arranca el worker del pago. Se llama desde src/worker.js junto a crearWorkerPdf() y crearWorkerCorreo(). */
function crearWorkerPago() {
  const worker = crearWorker(NOMBRES.PAGOS, (job) => pagosService.procesarPago(job.data.idPago, job));
  worker.on('failed', (job) => {
    if (!job) return;
    // Error técnico (no un rechazo): solo al agotar los reintentos se libera el pedido para que el cliente vuelva a intentar
    const definitivo = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (definitivo) pagosService.rechazar(job.data.idPedido, job.data.idPago, 'Error técnico al procesar el pago').catch(() => {});
  });
  console.log(`Worker de pago iniciado: ${NOMBRES.PAGOS}`);
  return worker;
}

// Acepta tanto  const { crearWorkerPago } = require(...)  como  const crearWorkerPago = require(...)
module.exports = crearWorkerPago;
module.exports.crearWorkerPago = crearWorkerPago;