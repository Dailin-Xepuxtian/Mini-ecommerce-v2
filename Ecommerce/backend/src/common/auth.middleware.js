const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { HttpError } = require('./errors');

/** Valida el access token (HS256) y deja en req.user el payload + id numérico. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Token no proporcionado o inválido'));
  }
  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }); // valida firma y exp
    req.user = { ...payload, id: Number(payload.sub) }; // sub viaja como string en el JWT
    return next();
  } catch {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Token no proporcionado o inválido'));
  }
}

/** Uso: router.post('/', authenticate, requireRole('admin'), ...) -> compara con el nombre del rol */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return next(new HttpError(403, 'FORBIDDEN', 'No tienes permisos para esta acción'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
