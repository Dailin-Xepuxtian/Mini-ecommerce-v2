const { z } = require('zod');
const { validar, entero, parseId } = require('../common/validate');
const service = require('./pedidos.service');

const ESTADOS = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
const textoEstado = `El estado debe ser uno de: ${ESTADOS.join(', ')}`;
const texto = (v) => (typeof v === 'string' ? v : '');
const aEntero = (porDefecto) => (v) =>
  v === undefined || v === '' ? porDefecto : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;

const itemSchema = z.object({
  id_producto: entero("Cada producto debe tener un 'id_producto' entero positivo"),
  cantidad: entero("Cada producto debe tener una 'cantidad' entera entre 1 y 10000", { min: 1, max: 10000 }),
});

const pedidoSchema = z.object({
  items: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(itemSchema).min(1, 'Debes incluir al menos un producto').max(50, 'Máximo 50 productos por orden')
  ),
  observaciones: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : ''),
    z.string().max(500, "'observaciones' admite máximo 500 caracteres").transform((v) => v || null)
  ),
});

const estadoSchema = z.object({
  estado: z.preprocess(texto, z.string().refine((v) => ESTADOS.includes(v), textoEstado)),
});

const listarSchema = z.object({
  estado: z.preprocess((v) => (v === '' ? undefined : v), z.string().refine((v) => ESTADOS.includes(v), textoEstado).optional()),
  pagina: z.preprocess(aEntero(1), entero("'pagina' debe ser un entero positivo")),
  limite: z.preprocess(aEntero(20), entero("'limite' debe estar entre 1 y 100", { min: 1, max: 100 })),
});

/** POST /pedidos */
async function crear(req, res) {
  const dto = validar(pedidoSchema, req.body, 'Datos de la orden inválidos');
  res.status(201).json(await service.crear(req.user, dto));
}

/** GET /pedidos?estado=pendiente&pagina=1&limite=20 */
async function listar(req, res) {
  const q = validar(listarSchema, req.query, 'Parámetros de consulta inválidos');
  res.status(200).json(await service.listar(req.user, q));
}

/** GET /pedidos/:id */
async function obtener(req, res) {
  res.status(200).json(await service.obtener(req.user, parseId(req.params.id)));
}

/** PUT /pedidos/:id */
async function actualizar(req, res) {
  const id = parseId(req.params.id);
  const dto = validar(pedidoSchema, req.body, 'Datos de la orden inválidos');
  res.status(200).json(await service.actualizar(req.user, id, dto));
}

/** PATCH /pedidos/:id/estado  (solo admin) */
async function cambiarEstado(req, res) {
  const id = parseId(req.params.id);
  const { estado } = validar(estadoSchema, req.body, 'Estado inválido');
  res.status(200).json(await service.cambiarEstado(id, estado));
}

/** DELETE /pedidos/:id */
async function eliminar(req, res) {
  await service.eliminar(req.user, parseId(req.params.id));
  res.status(204).end();
}

/** GET /pedidos/:id/trabajos */
async function trabajos(req, res) {
  res.status(200).json(await service.listarTrabajos(req.user, parseId(req.params.id)));
}

/** POST /pedidos/:id/reenviar */
async function reenviar(req, res) {
  res.status(202).json(await service.reenviar(req.user, parseId(req.params.id)));
}

/** GET /pedidos/:id/pdf */
async function descargarPdf(req, res) {
  const { ruta, nombre } = await service.rutaPdf(req.user, parseId(req.params.id));
  res.download(ruta, nombre);
}

module.exports = { crear, listar, obtener, actualizar, cambiarEstado, eliminar, trabajos, reenviar, descargarPdf };
