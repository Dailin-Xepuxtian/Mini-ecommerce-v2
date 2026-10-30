export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: import.meta.env.VITE_MONEDA || 'GTQ' }).format(n);
export const fecha = (d) => (d ? new Date(d).toLocaleString('es') : '-');