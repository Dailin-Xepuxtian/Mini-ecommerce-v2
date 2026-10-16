const pool = require('../config/db');

/** Ejecuta fn(conn) dentro de una transacción: commit si termina bien, rollback si lanza. */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };
