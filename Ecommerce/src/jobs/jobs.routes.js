const { Router } = require('express');
const asyncHandler = require('../common/async-handler');
const { authenticate } = require('../common/auth.middleware');
const controller = require('./jobs.controller');

const router = Router();

router.get('/:cola/:id', authenticate, asyncHandler(controller.obtener));

module.exports = router;
