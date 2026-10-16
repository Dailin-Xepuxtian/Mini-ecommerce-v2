const fs = require('fs');
const PDFDocument = require('pdfkit');
const { numeroOrden, moneda } = require('../../common/formato');

function encabezadoTabla(doc, y) {
  doc.rect(50, y - 4, 512, 20).fill('#1f2937');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Código', 56, y, { width: 70 });
  doc.text('Producto', 130, y, { width: 210 });
  doc.text('Cant.', 345, y, { width: 45, align: 'right' });
  doc.text('P. unitario', 390, y, { width: 80, align: 'right' });
  doc.text('Subtotal', 470, y, { width: 88, align: 'right' });
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
  return y + 24;
}

/** Genera el PDF de la orden de compra en `destino`. `pedido` = resultado de obtenerPedidoCompleto(). */
function generarPdf(pedido, destino) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const stream = fs.createWriteStream(destino);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000').text('Galacticos S.A.', 50, 50);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Orden de compra', 50, 76);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
    doc.text(numeroOrden(pedido.id_pedido), 350, 50, { width: 212, align: 'right' });
    doc.font('Helvetica').fontSize(10);
    doc.text(`Fecha: ${pedido.creado_en}`, 350, 74, { width: 212, align: 'right' });
    doc.text(`Estado: ${pedido.estado}`, 350, 88, { width: 212, align: 'right' });

    doc.moveTo(50, 110).lineTo(562, 110).strokeColor('#d1d5db').lineWidth(1).stroke();

    // Cliente
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Cliente', 50, 122);
    doc.font('Helvetica');
    doc.text(`${pedido.nombres} ${pedido.apellidos}`.trim(), 50, 137);
    doc.text(pedido.email, 50, 151);

    // Detalle
    let y = encabezadoTabla(doc, 185);
    for (const it of pedido.items) {
      if (y > 700) {
        doc.addPage();
        y = encabezadoTabla(doc, 50);
      }
      doc.text(it.codigo, 56, y, { width: 70, height: 12, ellipsis: true });
      doc.text(it.nombre, 130, y, { width: 210, height: 12, ellipsis: true });
      doc.text(String(it.cantidad), 345, y, { width: 45, align: 'right' });
      doc.text(moneda(it.precio_unitario), 390, y, { width: 80, align: 'right' });
      doc.text(moneda(it.subtotal), 470, y, { width: 88, align: 'right' });
      y += 18;
      doc.moveTo(50, y - 4).lineTo(562, y - 4).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    }

    // Total
    if (y > 690) {
      doc.addPage();
      y = 50;
    }
    y += 8;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
    doc.text('TOTAL', 345, y, { width: 120, align: 'right' });
    doc.text(moneda(pedido.total), 470, y, { width: 88, align: 'right' });

    if (pedido.observaciones) {
      y += 36;
      doc.font('Helvetica-Bold').fontSize(10).text('Observaciones', 50, y);
      doc.font('Helvetica').text(pedido.observaciones, 50, y + 14, { width: 512 });
    }

    doc.end();
  });
}

module.exports = { generarPdf };
