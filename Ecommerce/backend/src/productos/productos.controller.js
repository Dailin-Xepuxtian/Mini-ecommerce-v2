const { z } = require('zod');
const { HttpError } = require('../common/errors');
const service = require('./productos.service');

// (busca por código y por nombre).
const listarQuery = z.object({
  id_categoria: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().regex(/^\d+$/).transform(Number).refine((n) => n >= 1).optional()
  ),
  codigo: z.string().optional(),
});

/** GET /productos?id_categoria=1&codigo=HK- */
async function listar(req, res) {
  const parsed = listarQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'BAD_REQUEST', "El parámetro 'id_categoria' debe ser un entero positivo");
  }
  const idCategoria = parsed.data.id_categoria ?? null;
  const busqueda = parsed.data.codigo ? parsed.data.codigo.trim().slice(0, 50) : null;

  res.status(200).json(await service.listar(idCategoria, busqueda));
}

/** GET /categorias */
async function categorias(req, res) {
  res.status(200).json(await service.categorias());
}

module.exports = { listar, categorias };
