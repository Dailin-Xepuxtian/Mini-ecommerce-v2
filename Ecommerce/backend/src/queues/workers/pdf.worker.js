const fs = require('fs/promises');
const path = require('path');
const { Worker, UnrecoverableError } = require('bullmq');
const connection = require('../../config/redis');
const pool = require('../../config/db');
const { storageDir } = require('../../config/env');
const { numeroOrden } = require('../../common/formato');
const pedidosService = require('../../pedidos/pedidos.service');
const { NOMBRES, encolarCorreo } = require('../queues');
const { enlazarWorker } = require('../trabajos.service');
const { generarPdf } = require('../pdf/orden-compra.pdf');

/** Trabajo 1: genera el PDF de la orden y, al terminar, encola el envío del correo. */
async function procesar(job) {
  const { idPedido, motivo } = job.data;

  const pedido = await pedidosService.obtenerPedidoCompleto(idPedido);
  // Sin reintentos: si el pedido ya no existe, volver a intentar no sirve de nada
  if (!pedido) throw new UnrecoverableError(`El pedido ${idPedido} ya no existe`);
  await job.updateProgress(20);

  const carpeta = path.join(storageDir, 'ordenes');
  await fs.mkdir(carpeta, { recursive: true });
  const archivo = `${numeroOrden(pedido.id_pedido)}.pdf`;
  await generarPdf(pedido, path.join(carpeta, archivo));
  await job.updateProgress(70);

  await pool.execute('UPDATE pedidos SET pdf_archivo = ? WHERE id_pedido = ?', [archivo, idPedido]);
  await encolarCorreo(idPedido, motivo);
  await job.updateProgress(100);

  return { archivo };
}

function crearWorkerPdf() {
  const worker = new Worker(NOMBRES.PDF, procesar, { connection, concurrency: 3 });
  enlazarWorker(worker);
  return worker;
}

module.exports = { crearWorkerPdf };
