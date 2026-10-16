const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { jwtSecret, jwtRefreshSecret, jwtAccessTtl, jwtRefreshTtl, defaultRole } = require('../config/env');
const { HttpError } = require('../common/errors');

// Hash válido para comparar siempre, aunque el usuario no exista (evita revelar por tiempo si el correo existe)
const DUMMY_HASH = bcrypt.hashSync('contraseña-ficticia', 10);

const refreshInvalido = () => new HttpError(401, 'UNAUTHORIZED', 'Refresh token inválido o expirado');

// ---------- consultas ----------
const SELECT_USUARIO = `SELECT u.id_usuario, u.id_rol, u.nombres, u.apellidos, u.email, u.password, u.estado, r.nombre_rol
                        FROM usuarios u
                        INNER JOIN roles r ON r.id_rol = u.id_rol`;

async function buscarPorEmail(email) {
  const [rows] = await pool.execute(`${SELECT_USUARIO} WHERE u.email = ? LIMIT 1`, [email]);
  return rows[0] ?? null;
}

async function buscarPorId(id) {
  const [rows] = await pool.execute(`${SELECT_USUARIO} WHERE u.id_usuario = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

// ---------- tokens ----------
/** Genera access token (corto) + refresh token (largo, registrado en BD para poder revocarlo). */
async function emitirTokens(u) {
  const token = jwt.sign(
    { sub: String(u.id_usuario), email: u.email, rol: u.nombre_rol, id_rol: Number(u.id_rol) },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: jwtAccessTtl }
  );

  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign({ sub: String(u.id_usuario) }, jwtRefreshSecret, {
    algorithm: 'HS256',
    expiresIn: jwtRefreshTtl,
    jwtid: jti,
  });

  const access = jwt.decode(token);
  const refresh = jwt.decode(refreshToken);
  await pool.execute('INSERT INTO refresh_tokens (jti, id_usuario, expira_en) VALUES (?, ?, FROM_UNIXTIME(?))', [
    jti,
    u.id_usuario,
    refresh.exp,
  ]);

  return {
    token,
    refreshToken,
    tipo: 'Bearer',
    expiraEn: access.exp - access.iat, // segundos de vida del access token
    usuario: {
      id: Number(u.id_usuario),
      nombre: `${u.nombres} ${u.apellidos}`.trim(),
      rol: u.nombre_rol,
    },
  };
}

// ---------- casos de uso ----------
async function login({ email, password }) {
  const u = await buscarPorEmail(email);
  // bcryptjs entiende los hashes $2y$ que generó password_hash() de PHP
  const passwordOk = await bcrypt.compare(password, u?.password ?? DUMMY_HASH);

  if (!u || !passwordOk || u.estado !== 'activo') {
    throw new HttpError(401, 'UNAUTHORIZED', 'Email o contraseña incorrectos');
  }
  return emitirTokens(u);
}

async function register({ nombres, apellidos, email, password }) {
  const [roles] = await pool.execute('SELECT id_rol FROM roles WHERE nombre_rol = ? LIMIT 1', [defaultRole]);
  if (!roles.length) throw new Error(`El rol por defecto "${defaultRole}" no existe en la tabla roles`);

  const hash = await bcrypt.hash(password, 10);
  let idUsuario;
  try {
    const [r] = await pool.execute(
      'INSERT INTO usuarios (id_rol, nombres, apellidos, email, password, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [roles[0].id_rol, nombres, apellidos, email, hash, 'activo']
    );
    idUsuario = r.insertId;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'CONFLICT', 'El email ya está registrado');
    throw e;
  }
  return emitirTokens(await buscarPorId(idUsuario));
}

/** Rotación: cada refresh token se usa una sola vez. Si se reutiliza, se revocan todas las sesiones del usuario. */
async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, jwtRefreshSecret, { algorithms: ['HS256'] });
  } catch {
    throw refreshInvalido();
  }

  // UPDATE condicional: solo uno gana aunque lleguen dos peticiones simultáneas
  const [res] = await pool.execute('UPDATE refresh_tokens SET revocado = 1 WHERE jti = ? AND revocado = 0', [
    payload.jti,
  ]);
  if (res.affectedRows !== 1) {
    await pool.execute('UPDATE refresh_tokens SET revocado = 1 WHERE id_usuario = ?', [Number(payload.sub)]);
    throw refreshInvalido();
  }

  const u = await buscarPorId(Number(payload.sub));
  if (!u || u.estado !== 'activo') throw refreshInvalido();
  return emitirTokens(u);
}

/** Revoca el refresh token. Es idempotente: si ya expiró o es inválido, no hay nada que revocar. */
async function logout(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, jwtRefreshSecret, { algorithms: ['HS256'] });
  } catch {
    return;
  }
  await pool.execute('UPDATE refresh_tokens SET revocado = 1 WHERE jti = ?', [payload.jti]);
}

module.exports = { login, register, refresh, logout };
