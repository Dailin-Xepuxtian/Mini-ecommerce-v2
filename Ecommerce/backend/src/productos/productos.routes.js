const { Router } = require('express');
const asyncHandler = require('../common/async-handler');
const { authenticate } = require('../common/auth.middleware');
const controller = require('./productos.controller');

const router = Router();

router.get('/productos', authenticate, asyncHandler(controller.listar));
router.get('/categorias', authenticate, asyncHandler(controller.categorias));

module.exports = router;
