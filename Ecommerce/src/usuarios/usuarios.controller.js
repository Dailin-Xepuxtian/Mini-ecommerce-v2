const service = require('./usuarios.service');

function listar(req, res) {
  res.json(service.obtenerTodos());
}
function obtener(req, res) {
  const registro = service.obtenerPorId(req.params.id);
  if (!registro) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
  res.json(registro);
}
function crear(req, res) {
  const nuevo = service.crear(req.body);
  res.status(201).json(nuevo);
}
module.exports = { listar, obtener, crear };
