const path = require('path');
require('dotenv').config();

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta la variable de entorno ${key}`);
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  defaultRole: process.env.DEFAULT_ROLE || 'cliente', // rol asignado en /auth/register
  adminRole: process.env.ADMIN_ROLE || 'admin', // nombre del rol administrador en la tabla roles
  storageDir: path.resolve(process.env.STORAGE_DIR || './storage'), // donde se guardan los PDF
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '"Galacticos S.A." <no-reply@galacticos.local>',
  },
  // SOLO PARA DEMO: cuántos intentos del envío de correo fallan a propósito (para mostrar reintentos)
  demoFallosCorreo: Number(process.env.DEMO_FALLOS_CORREO || 0),
};
