const mysql = require('mysql2/promise');
const { db } = require('./env');

// Equivale a Database::getConnection() del PHP (PDO).
// dateStrings: true -> DATE(p.creado_en) llega como '2026-10-15' (string)
// y no como objeto Date, igual que en PHP.
const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

module.exports = pool;
