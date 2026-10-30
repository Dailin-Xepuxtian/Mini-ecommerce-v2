const { z } = require('zod');
const { HttpError } = require('./errors');

/** Valida `data` con un schema de Zod; si falla lanza 400 con la lista de errores. */
function validar(schema, data, mensaje = 'Datos inválidos') {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    const details = [...new Set(r.error.issues.map((i) => i.message))];
    throw new HttpError(400, 'BAD_REQUEST', mensaje, details);
  }
  return r.data;
}

/** Entero con mensaje de error propio (el valor debe venir ya como number). */
const entero = (mensaje, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) =>
  z.any().refine((v) => Number.isInteger(v) && v >= min && v <= max, mensaje);

/** Convierte un parámetro de ruta (:id) en entero positivo o lanza 400. */
function parseId(valor, nombre = 'id') {
  const n = Number(valor);
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || !Number.isSafeInteger(n) || n < 1) {
    throw new HttpError(400, 'BAD_REQUEST', `El parámetro '${nombre}' debe ser un entero positivo`);
  }
  return n;
}

module.exports = { validar, entero, parseId };
