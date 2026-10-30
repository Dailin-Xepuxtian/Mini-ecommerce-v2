const fs = require('fs');
const PDFDocument = require('pdfkit');
const { numeroOrden, moneda } = require('../../common/formato');

/**
 * Genera el PDF de la orden de compra
 */
function generarPdf(pedido, destino) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const stream = fs.createWriteStream(destino);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    const anchoPagina = 532; // 612 - (40 * 2)
    const startX = 40;

   
    doc.rect(startX, 40, anchoPagina, 60).fill('#1b0354');
    
    // Título "Gracias por su orden" 
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(20)
       .text('Gracias por su orden', startX + 20, 52);

    doc.fillColor('#84cc16')
       .font('Helvetica-Bold')
       .fontSize(11)
       .text('Giganet', startX + 20, 76);

    // --- 2. MENSAJE Y DATOS DEL CLIENTE ---
    doc.fillColor('#333333').font('Helvetica').fontSize(10.5);
    
    let y = 120;
    const nombreCliente = `${pedido.nombres || ''} ${pedido.apellidos || ''}`.trim() || 'Cliente';
    doc.text(`Hola ${nombreCliente},`, startX, y);
    
    y += 18;
    doc.text(`Hemos recibido su orden ${numeroOrden(pedido.id_pedido)}, el estado actual es: ${pedido.estado}.`, startX, y, {
      width: anchoPagina,
      lineGap: 4
    });

    // Subtítulo de la Orden en Púrpura
    y += 35;
    doc.fillColor('#4c1d95')
       .font('Helvetica-Bold')
       .fontSize(11)
       .text(`[${numeroOrden(pedido.id_pedido)}] (${pedido.creado_en})`, startX, y);

    // --- 3. TABLA DE PRODUCTOS ---
    y += 20;
    const colProductoX = startX;
    const colProductoW = 280;
    const colCantidadX = startX + 280;
    const colCantidadW = 80;
    const colPrecioX = startX + 360;
    const colPrecioW = 152;

    // Encabezado de la tabla
    function dibujarEncabezadoTabla(currY) {
      doc.rect(startX, currY, anchoPagina, 25).fill('#24045f');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
      doc.text('Producto', colProductoX + 10, currY + 7, { width: colProductoW - 10 });
      doc.text('Cantidad', colCantidadX, currY + 7, { width: colCantidadW, align: 'center' });
      doc.text('Precio', colPrecioX, currY + 7, { width: colPrecioW - 10, align: 'right' });
      return currY + 25;
    }

    y = dibujarEncabezadoTabla(y);

    // Filas de productos
    doc.font('Helvetica').fontSize(9.5);
    
    for (const item of pedido.items) {
      if (y > 680) {
        doc.addPage();
        y = 50;
        y = dibujarEncabezadoTabla(y);
      }

      const textoProducto = `${item.nombre}\n(#${item.codigo})`;
      const altoTexto = doc.heightOfString(textoProducto, { width: colProductoW - 20 });
      const altoFila = Math.max(altoTexto + 16, 35);

      // Bordes de celdas
      doc.rect(startX, y, anchoPagina, altoFila).lineWidth(0.5).strokeColor('#d1d5db').stroke();

      // Contenido de la fila
      doc.fillColor('#374151');
      doc.text(textoProducto, colProductoX + 10, y + 8, { width: colProductoW - 20 });
      doc.text(String(item.cantidad), colCantidadX, y + 8, { width: colCantidadW, align: 'center' });
      doc.text(moneda(item.subtotal), colPrecioX, y + 8, { width: colPrecioW - 10, align: 'right' });

      y += altoFila;
    }

    // Fila del TOTAL
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    doc.rect(startX, y, anchoPagina, 28).lineWidth(0.5).strokeColor('#d1d5db').stroke();
    doc.fillColor('#1b0354').font('Helvetica-Bold').fontSize(10);
    doc.text('Total:', colProductoX + 10, y + 8, { width: colProductoW + colCantidadW - 10 });
    doc.text(moneda(pedido.total), colPrecioX, y + 8, { width: colPrecioW - 10, align: 'right' });

    y += 40;

    // --- 4. OBSERVACIONES (Si existen) ---
    if (pedido.observaciones) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.fillColor('#1b0354').font('Helvetica-Bold').fontSize(10).text('Observaciones:', startX, y);
      doc.font('Helvetica').fontSize(9.5).fillColor('#4b5563').text(pedido.observaciones, startX, y + 14, { width: anchoPagina });
      y += 40;
    }

    // --- 5. MENSAJE FINAL Y PIE DE PÁGINA ---
    if (y > 710) {
      doc.addPage();
      y = 50;
    }

    doc.fillColor('#4b5563').font('Helvetica').fontSize(10);
    doc.text('Gracias por confiar en nosotros, somos Giganet.', startX, y);

    // Pie de página con el fondo morado oscuro
    doc.rect(startX, 730, anchoPagina, 30).fill('#1b0354');
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('GIGANET · Redes y cómputo', startX, 741, { width: anchoPagina, align: 'center' });

    doc.end();
  });
}

module.exports = { generarPdf };