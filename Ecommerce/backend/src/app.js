const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { port } = require('./config/env');
const { notFound, errorHandler } = require('./common/error.middleware');

const app = express();

app.set('trust proxy', 1); // detrás de docker, para que el rate limit vea la IP real
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

//modulos
app.use('/api/auth', require('./auth/auth.routes'));
app.use('/api', require('./productos/productos.routes'));
app.use('/api/usuarios', require('./usuarios/usuarios.routes'));
app.use('/api/pedidos', require('./pedidos/pedidos.routes'));
app.use('/api/jobs', require('./jobs/jobs.routes'));

app.use(notFound);
app.use(errorHandler); 

app.listen(port, () => console.log(`API escuchando en puerto ${port}`));

module.exports = app;
