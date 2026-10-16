const { Router } = require('express');
const asyncHandler = require('../common/async-handler');
const { authenticate, requireRole } = require('../common/auth.middleware');
const { adminRole } = require('../common/roles');
const c = require('./pedidos.controller');

const router = Router();

router.use(authenticate); // todas las rutas de pedidos requieren sesión

router.post('/', asyncHandler(c.crear));
router.get('/', asyncHandler(c.listar));
router.get('/:id', asyncHandler(c.obtener));
router.put('/:id', asyncHandler(c.actualizar));
router.patch('/:id/estado', requireRole(adminRole), asyncHandler(c.cambiarEstado));
router.delete('/:id', asyncHandler(c.eliminar));

router.get('/:id/trabajos', asyncHandler(c.trabajos));
router.post('/:id/reenviar', asyncHandler(c.reenviar));
router.get('/:id/pdf', asyncHandler(c.descargarPdf));

module.exports = router;
