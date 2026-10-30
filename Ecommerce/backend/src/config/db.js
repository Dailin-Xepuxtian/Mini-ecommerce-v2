const mysql = require('mysql2/promise');
const { db } = require('./env');


// dateStrings: true -> DATE(p.creado_en) llega como '2026-10-15' (string)

const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

module.exports = pool;
