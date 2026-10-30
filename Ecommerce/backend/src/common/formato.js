/** Número de la orden de compra: OC-000123 */

const numeroOrden = (id, idCliente, fechaCreacion = new Date()) => {
  const fecha = new Date(fechaCreacion);
  const yy = String(fecha.getFullYear()).slice(-2);
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const yymmdd = `${yy}${mm}${dd}`;

  const correlativo = String(id).padStart(6, '0');
  return `OC-${yymmdd}-${correlativo}`;
};

const moneda = (n) =>
  `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Escapa texto para insertarlo en HTML (correos). */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { numeroOrden, moneda, esc };
