const express = require('express');
const asyncHandler = require('../common/async-handler');
const { authenticate, requireRole } = require('../common/auth.middleware');
const { adminRole } = require('../common/roles');
const controller = require('./usuarios.controller');

const router = express.Router();

router.use(authenticate, requireRole(adminRole));

router.get('/', asyncHandler(controller.listar));
router.get('/:id', asyncHandler(controller.obtener));
router.post('/', asyncHandler(controller.crear));

module.exports = router;