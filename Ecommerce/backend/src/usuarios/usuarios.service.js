const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../../data/usuarios.json');

function leer() {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function guardar(datos) {
  fs.writeFileSync(filePath, JSON.stringify(datos, null, 2), 'utf8');
}
function obtenerTodos() { return leer(); }
function obtenerPorId(id) { return leer().find(x => x.id === Number(id)); }
function crear(datos) {
  const registros = leer();
  const nuevo = { id: registros.length ? Math.max(...registros.map(x => x.id)) + 1 : 1, ...datos };
  registros.push(nuevo);
  guardar(registros);
  return nuevo;
}
module.exports = { obtenerTodos, obtenerPorId, crear };
