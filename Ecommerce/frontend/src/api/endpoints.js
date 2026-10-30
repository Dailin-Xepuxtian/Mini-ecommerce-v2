import { api } from './axios';

// Descarga un archivo protegido por JWT (no sirve un <a href> directo)
async function descargar(url, nombre) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(href);
}

export const authApi = {
  login: (d) => api.post('/auth/login', d).then((r) => r.data),
  register: (d) => api.post('/auth/register', d).then((r) => r.data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const productosApi = {
  listar: (params) => api.get('/productos', { params }).then((r) => r.data),
  categorias: () => api.get('/categorias').then((r) => r.data),
};

export const pedidosApi = {
  // body: { items: [{ id_producto, cantidad }], observaciones }
  crear: (d) => api.post('/pedidos', d).then((r) => r.data),
  // params: { estado, pagina, limite }
  listar: (params) => api.get('/pedidos', { params }).then((r) => r.data),
  obtener: (id) => api.get(`/pedidos/${id}`).then((r) => r.data),
  actualizar: (id, d) => api.put(`/pedidos/${id}`, d).then((r) => r.data),
  cambiarEstado: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }).then((r) => r.data),
  eliminar: (id) => api.delete(`/pedidos/${id}`),
  trabajos: (id) => api.get(`/pedidos/${id}/trabajos`).then((r) => r.data),
  reenviar: (id) => api.post(`/pedidos/${id}/reenviar`).then((r) => r.data),

  // Orden de compra (se genera al crear el pedido)
  descargarPdf: (id) => descargar(`/pedidos/${id}/pdf`, `orden-${id}.pdf`),

  // Pago en línea y factura (la factura solo existe con el pago aprobado)
  pagar: (id) => api.post(`/pedidos/${id}/pagar`).then((r) => r.data),
  descargarFactura: (id) => descargar(`/pedidos/${id}/factura`, `factura-${id}.pdf`),
  reenviarFactura: (id) => api.post(`/pedidos/${id}/reenviar-factura`).then((r) => r.data),
};

export const jobsApi = {
  obtener: (cola, id) => api.get(`/jobs/${cola}/${id}`).then((r) => r.data),
};

export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
