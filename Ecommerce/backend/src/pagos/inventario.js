class StockInsuficienteError extends Error {
  constructor(codigo) {
    super(`Stock insuficiente de ${codigo}`);
    this.name = 'StockInsuficienteError';
  }
}

async function items(conn, idPedido) {
  // ORDER BY evita bloqueos cruzados (deadlocks) entre dos pagos simultáneos
  const [rows] = await conn.execute(
    'SELECT id_producto, codigo, cantidad FROM pedido_detalle WHERE id_pedido = ? ORDER BY id_producto',
    [idPedido]
  );
  return rows;
}

/** UPDATE condicional sobre la columna física o real, permitiendo que la generada se recalcule sola. */
async function descontar(conn, idPedido) {
  for (const it of await items(conn, idPedido)) {
    const [r] = await conn.execute(
      `UPDATE producto_inventario
        SET cant_fisico = cant_fisico - ?
        WHERE id_producto = ? AND cant_fisico >= ?`,
      [it.cantidad, it.id_producto, it.cantidad]
    );
    if (r.affectedRows !== 1) throw new StockInsuficienteError(it.codigo);
  }
}

async function reponer(conn, idPedido) {
  for (const it of await items(conn, idPedido)) {
    await conn.execute(
      'UPDATE producto_inventario SET cant_fisico = cant_fisico + ? WHERE id_producto = ?',
      [it.cantidad, it.id_producto]
    );
  }
}

module.exports = { descontar, reponer, StockInsuficienteError };