const express = require('express');
const usuariosRoutes = require('./usuarios/usuarios.routes');
const productosRoutes = require('./productos/productos.routes');
const pedidosRoutes = require('./pedidos/pedidos.routes');

const app = express();
const PORT = 3000;
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    arquitectura: 'Monolito Modular',
    mensaje: 'Una sola aplicación Node.js con módulos internos',
    puerto: 3000,
    version: '2.0.0',
    ambiente:'Docker',
    modulos: ['usuarios', 'productos', 'pedidos']
  });
});

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);

app.listen(PORT, () => {
  console.log(`Monolito modular ejecutándose en http://localhost:${PORT}`);
});
