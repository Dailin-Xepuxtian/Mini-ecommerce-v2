const { HttpError } = require('../common/errors');
const service = require('./jobs.service');

/** GET /jobs/:cola/:id */
async function obtener(req, res) {
  const { cola, id } = req.params;
  if (!/^[\w-]{1,64}$/.test(cola) || !/^[\w-]{1,64}$/.test(id)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Cola o id de trabajo inválidos');
  }
  res.status(200).json(await service.obtenerEstado(req.user, cola, id));
}

module.exports = { obtener };
