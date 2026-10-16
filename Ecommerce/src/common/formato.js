/** Número de la orden de compra: OC-000123 */
const numeroOrden = (id) => `OC-${String(id).padStart(6, '0')}`;

const moneda = (n) =>
  `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Escapa texto para insertarlo en HTML (correos). */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { numeroOrden, moneda, esc };
