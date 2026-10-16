export const money = (n) =>
  new Intl.NumberFormat('es', { style: 'currency', currency: import.meta.env.VITE_MONEDA || 'GTQ' }).format(n);
export const fecha = (d) => (d ? new Date(d).toLocaleString('es') : '-');