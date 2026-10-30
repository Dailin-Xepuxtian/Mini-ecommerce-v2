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

// Formato de fecha corta para el encabezado del correo
const fechaCorta = (d) => {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [a, m, dia] = d.slice(0, 10).split('-');
    return `${dia}/${m}/${a}`;
  }
  return new Date(d).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' });
};

const celda = 'padding:10px 12px;border:1px solid #e5e7eb;font-size:13px;color:#374151;';

//generar plantilla
function cuerpoHtml(pedido, motivo) {
  const numero = numeroOrden(pedido.id_pedido);
  const bannerTitulo = (ASUNTOS[motivo] ?? ASUNTOS.creada)(numero);

  const filas = pedido.items
    .map(
      (i) => `<tr>
        <td style="${celda}">${esc(i.nombre)}<br><span style="font-size:11px;color:#6b7280">(#${esc(i.codigo)})</span></td>
        <td style="${celda}text-align:center">${i.cantidad}</td>
        <td style="${celda}text-align:right">${moneda(i.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6">
  <tr>
    <td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
        
        <!-- BANNER SUPERIOR (Paleta Giganet) -->
        <tr>
          <td style="background:#1b0354;padding:26px 28px;color:#ffffff">
            <h1 style="margin:0;font-size:20px;font-weight:bold;color:#ffffff">${esc(bannerTitulo)}</h1>
            <p style="margin:4px 0 0;font-size:12px;font-weight:bold;color:#84cc16">Giganet</p>
          </td>
        </tr>

        <!-- CUERPO -->
        <tr>
          <td style="padding:26px 28px;color:#333333;font-size:14px;line-height:1.5">
            <p style="margin:0 0 12px">Hola <strong>${esc(pedido.nombres)} ${esc(pedido.apellidos || '')}</strong>,</p>
            <p style="margin:0 0 16px;color:#4b5563">Adjuntamos en este correo la copia en formato PDF de tu orden de compra.</p>
            
            <!-- REFERENCIA Y FECHA -->
            <p style="margin:0 0 16px;color:#4c1d95;font-size:15px;font-weight:bold">
              [${esc(numero)}] <span style="font-size:13px;font-weight:normal;color:#6b7280">(${fechaCorta(pedido.creado_en || new Date())})</span>
            </p>

            <!-- TABLA DE PRODUCTOS -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">
              <thead>
                <tr style="background:#24045f;color:#ffffff">
                  <th align="left" style="${celda}color:#ffffff;font-weight:bold">Producto</th>
                  <th style="${celda}color:#ffffff;font-weight:bold;text-align:center">Cantidad</th>
                  <th align="right" style="${celda}color:#ffffff;font-weight:bold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
                <!-- TOTAL -->
                <tr style="background:#f9fafb">
                  <td colspan="2" style="${celda}font-weight:bold;color:#1b0354;font-size:14px">Total:</td>
                  <td style="${celda}text-align:right;font-weight:bold;color:#1b0354;font-size:14px">${moneda(pedido.total)}</td>
                </tr>
              </tbody>
            </table>

            ${pedido.observaciones ? `<p style="margin:16px 0 0;color:#4b5563;font-size:13px"><strong>Observaciones:</strong> ${esc(pedido.observaciones)}</p>` : ''}
            
            <p style="margin:24px 0 0;color:#374151">Gracias por confiar en nosotros, somos <strong>Giganet</strong>.</p>
          </td>
        </tr>

        <!-- PIE DE PÁGINA -->
        <tr>
          <td style="background:#1b0354;padding:16px;text-align:center;color:#ffffff;font-size:12px">
            <strong>GIGANET</strong> · Redes y cómputo
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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
    html: cuerpoHtml(pedido, motivo),
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