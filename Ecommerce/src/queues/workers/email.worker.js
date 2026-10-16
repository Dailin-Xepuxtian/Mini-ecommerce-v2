const path = require('path');
const nodemailer = require('nodemailer');
const { Worker, UnrecoverableError } = require('bullmq');
const connection = require('../../config/redis');
const { smtp, storageDir, demoFallosCorreo } = require('../../config/env');
const { numeroOrden, moneda, esc } = require('../../common/formato');
const pedidosService = require('../../pedidos/pedidos.service');
const { NOMBRES } = require('../queues');
const { enlazarWorker } = require('../trabajos.service');

const transporter = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port,
  secure: smtp.port === 465,
  auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
});

const ASUNTOS = {
  creada: (n) => `Recibimos tu orden de compra ${n}`,
  actualizada: (n) => `Tu orden de compra ${n} fue actualizada`,
  reenvio: (n) => `Copia de tu orden de compra ${n}`,
};

function cuerpoHtml(pedido) {
  const filas = pedido.items
    .map(
      (i) => `<tr><td>${esc(i.codigo)}</td><td>${esc(i.nombre)}</td>
              <td style="text-align:right">${i.cantidad}</td>
              <td style="text-align:right">${moneda(i.subtotal)}</td></tr>`
    )
    .join('');
  return `<p>Hola ${esc(pedido.nombres)},</p>
    <p>Adjuntamos tu orden de compra <strong>${numeroOrden(pedido.id_pedido)}</strong>.</p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><th align="left">Código</th><th align="left">Producto</th><th>Cant.</th><th>Subtotal</th></tr>${filas}
    </table>
    <p><strong>Total: ${moneda(pedido.total)}</strong></p>
    <p>Galacticos S.A.</p>`;
}

/** Trabajo 2: envía por correo la orden de compra con el PDF adjunto. */
async function procesar(job) {
  const { idPedido, motivo } = job.data;

  // Modo demo: falla las primeras N veces para mostrar los reintentos (job.attemptsMade = intentos previos)
  if (job.attemptsMade < demoFallosCorreo) {
    throw new Error(`Fallo simulado del servidor SMTP (intento ${job.attemptsMade + 1})`);
  }

  const pedido = await pedidosService.obtenerPedidoCompleto(idPedido);
  if (!pedido) throw new UnrecoverableError(`El pedido ${idPedido} ya no existe`);
  if (!pedido.pdf_archivo) throw new Error('El PDF todavía no está disponible'); // se reintenta

  const numero = numeroOrden(pedido.id_pedido);
  const info = await transporter.sendMail({
    from: smtp.from,
    to: pedido.email,
    subject: (ASUNTOS[motivo] ?? ASUNTOS.creada)(numero),
    html: cuerpoHtml(pedido),
    attachments: [
      { filename: pedido.pdf_archivo, path: path.join(storageDir, 'ordenes', path.basename(pedido.pdf_archivo)) },
    ],
  });
  return { messageId: info.messageId };
}

function crearWorkerCorreo() {
  const worker = new Worker(NOMBRES.CORREO, procesar, { connection, concurrency: 5 });
  enlazarWorker(worker);
  return worker;
}

module.exports = { crearWorkerCorreo };
