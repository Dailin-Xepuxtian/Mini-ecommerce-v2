const { HttpError } = require('./errors');

// 404 para rutas inexistentes
function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada'));
}

// Manejador global de errores (debe ir al final de app.js)
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const error = { code: err.code, message: err.message };
    if (err.details) error.details = err.details;
    return res.status(err.status).json({ error });
  }
  // JSON mal formado en el body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON inválido' } });
  }
  console.error(err);
  return res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
}

module.exports = { notFound, errorHandler };