const { z } = require('zod');
const { validar } = require('../common/validate');
const service = require('./auth.service');

// Si el valor no es string se trata como vacío
const texto = (v) => (typeof v === 'string' ? v : '');

const loginSchema = z.object({
  email: z.preprocess(texto, z.string().trim().min(1, "El campo 'email' es obligatorio")),
  password: z.preprocess(texto, z.string().min(1, "El campo 'password' es obligatorio")),
});

const registerSchema = z.object({
  nombres: z.preprocess(texto, z.string().trim().min(1, "El campo 'nombres' es obligatorio").max(100, "'nombres' admite máximo 100 caracteres")),
  apellidos: z.preprocess(texto, z.string().trim().min(1, "El campo 'apellidos' es obligatorio").max(100, "'apellidos' admite máximo 100 caracteres")),
  email: z.preprocess(
    (v) => texto(v).trim().toLowerCase(),
    z.string().min(1, "El campo 'email' es obligatorio").max(150, "'email' admite máximo 150 caracteres").email("El campo 'email' no es válido")
  ),
  // 72 = límite de bcrypt
  password: z.preprocess(texto, z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72, "La contraseña admite máximo 72 caracteres")),
});

const refreshSchema = z.object({
  refreshToken: z.preprocess(texto, z.string().min(1, "El campo 'refreshToken' es obligatorio")),
});

/** POST /auth/login */
async function login(req, res) {
  const dto = validar(loginSchema, req.body, 'Datos de acceso incompletos');
  res.status(200).json(await service.login(dto));
}

/** POST /auth/register */
async function register(req, res) {
  const dto = validar(registerSchema, req.body, 'Datos de registro inválidos');
  res.status(201).json(await service.register(dto));
}

/** POST /auth/refresh */
async function refresh(req, res) {
  const { refreshToken } = validar(refreshSchema, req.body, 'Refresh token requerido');
  res.status(200).json(await service.refresh(refreshToken));
}

/** POST /auth/logout */
async function logout(req, res) {
  const { refreshToken } = validar(refreshSchema, req.body, 'Refresh token requerido');
  await service.logout(refreshToken);
  res.status(204).end();
}

module.exports = { login, register, refresh, logout };
