const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../common/async-handler');
const controller = require('./auth.controller');

const router = Router();

// Frena fuerza bruta sobre las rutas de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos, intenta más tarde' } },
});

router.post('/login', authLimiter, asyncHandler(controller.login));
router.post('/register', authLimiter, asyncHandler(controller.register));
router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));

module.exports = router;
