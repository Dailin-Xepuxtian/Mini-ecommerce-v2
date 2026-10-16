const fs = require('fs/promises');
const path = require('path');
const pool = require('../config/db');
const { storageDir } = require('../config/env');
const { HttpError } = require('../common/errors');
const { withTransaction } = require('../common/transaction');
const { esAdmin } = require('../common/roles');
const { numeroOrden } = require('../common/formato');
const productosService = require('../productos/productos.service');
const queues = require('../queues/queues');
const trabajos = require('../queues/trabajos.service');

// Flujo permitido de estados
const TRANSICIONES = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

const SELECT_PEDIDO = `SELECT p.id_pedido, p.id_usuario, p.estado, p.total, p.observaciones, p.pdf_archivo,
                              p.creado_en, p.actualizado_en, u.nombres, u.apellidos, u.email
                       FROM pedidos p
                       INNER JOIN usuarios u ON u.id_usuario = p.id_usuario`;

const noEncontrado = () => new HttpError(404, 'NOT_FOUND', 'Pedido no encontrado');
const rutaPdfDe = (archivo) => path.join(storageDir, 'ordenes', path.basename(archivo));

function pedidoResponse(p, items = null) {
  const r = {
    id_pedido: Number(p.id_pedido),
    numero_orden: numeroOrden(p.id_pedido),
    estado: p.estado,
    total: Number(p.total),
    observaciones: p.observaciones,
    tiene_pdf: Boolean(p.pdf_archivo),
    creado_en: p.creado_en,
    actualizado_en: p.actualizado_en,
    cliente: { id: Number(p.id_usuario), nombre: `${p.nombres} ${p.apellidos}`.trim(), email: p.email },
  };
  if (items) {
    r.items = items.map((i) => ({
      id_producto: Number(i.id_producto),
      codigo: i.codigo,
      nombre: i.nombre,
      cantidad: Number(i.cantidad),
      precio_unitario: Number(i.precio_unitario),
      subtotal: Number(i.subtotal),
    }));
  }
  return r;
}

/** Pedido + cliente + items, sin validar permisos (lo usan los workers y el propio service). */
async function obtenerPedidoCompleto(idPedido) {
  const [rows] = await pool.execute(`${SELECT_PEDIDO} WHERE p.id_pedido = ? LIMIT 1`, [idPedido]);
  if (!rows.length) return null;
  const [items] = await pool.execute(
    `SELECT id_producto, codigo, nombre, cantidad, precio_unitario, subtotal
     FROM pedido_detalle WHERE id_pedido = ? ORDER BY id_detalle`,
    [idPedido]
  );
  return { ...rows[0], items };
}

/** Carga el pedido; un cliente solo puede ver los suyos (para los demás responde 404). */
async function cargarConPermiso(user, id) {
  const pedido = await obtenerPedidoCompleto(id);
  if (!pedido || (!esAdmin(user) && Number(pedido.id_usuario) !== user.id)) throw noEncontrado();
  return pedido;
}

async function detalle(pedido) {
  return { ...pedidoResponse(pedido, pedido.items), trabajos: await trabajos.listarPorPedido(pedido.id_pedido) };
}

/**
 * Valida los productos contra el catálogo (RN-01) y calcula precios y total en el servidor.
 * Nunca se confía en precios enviados por el cliente. Los montos se calculan en centavos.
 */
async function prepararLineas(items) {
  const cantidades = new Map();
  for (const { id_producto, cantidad } of items) {
    cantidades.set(id_producto, (cantidades.get(id_producto) ?? 0) + cantidad);
  }
  const productos = await productosService.buscarPorIds([...cantidades.keys()]);

  const problemas = [];
  const lineas = [];
  let totalCent = 0;
  for (const [id, cantidad] of cantidades) {
    const p = productos.get(id);
    if (!p) {
      problemas.push(`El producto ${id} no existe`);
      continue;
    }
    const precio = p.precio_venta === null ? null : Number(p.precio_venta);
    const stock = Number(p.stock);
    if (p.estado_stock === 'sin_stock' || precio === null) {
      problemas.push(`El producto ${p.codigo} no está disponible`);
    } else if (stock < cantidad) {
      problemas.push(`Stock insuficiente de ${p.codigo} (disponible: ${stock}, solicitado: ${cantidad})`);
    } else {
      const precioCent = Math.round(precio * 100);
      totalCent += precioCent * cantidad;
      lineas.push({ id_producto: id, codigo: p.codigo, nombre: p.nombre, cantidad, precioCent });
    }
  }
  if (problemas.length) {
    throw new HttpError(422, 'UNPROCESSABLE_ENTITY', 'La orden no cumple las reglas de negocio', problemas);
  }
  return { lineas, totalCent };
}

async function insertarDetalle(conn, idPedido, lineas) {
  const filas = lineas.map((l) => [
    idPedido,
    l.id_producto,
    l.codigo,
    l.nombre,
    l.cantidad,
    (l.precioCent / 100).toFixed(2),
    ((l.precioCent * l.cantidad) / 100).toFixed(2),
  ]);
  await conn.query(
    'INSERT INTO pedido_detalle (id_pedido, id_producto, codigo, nombre, cantidad, precio_unitario, subtotal) VALUES ?',
    [filas]
  );
}

/** El pedido ya está guardado: si Redis falla no se pierde, el trabajo queda registrado como fallido. */
async function intentarEncolarPdf(idPedido, motivo) {
  try {
    await queues.encolarPdf(idPedido, motivo);
  } catch (e) {
    console.error(`No se pudo encolar el PDF del pedido ${idPedido}:`, e.message);
  }
}

// ---------------- casos de uso ----------------
async function crear(user, { items, observaciones }) {
  const { lineas, totalCent } = await prepararLineas(items);

  const idPedido = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      "INSERT INTO pedidos (id_usuario, estado, total, observaciones) VALUES (?, 'pendiente', ?, ?)",
      [user.id, (totalCent / 100).toFixed(2), observaciones]
    );
    await insertarDetalle(conn, r.insertId, lineas);
    return r.insertId;
  });

  await intentarEncolarPdf(idPedido, 'creada'); // -> PDF -> correo
  return detalle(await obtenerPedidoCompleto(idPedido));
}

async function listar(user, { estado, pagina, limite }) {
  const where = [];
  const params = [];
  if (!esAdmin(user)) {
    where.push('p.id_usuario = ?');
    params.push(user.id);
  }
  if (estado) {
    where.push('p.estado = ?');
    params.push(estado);
  }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (pagina - 1) * limite; // enteros ya validados, por eso se pueden interpolar

  const [rows] = await pool.execute(
    `${SELECT_PEDIDO} ${cond} ORDER BY p.id_pedido DESC LIMIT ${limite} OFFSET ${offset}`,
    params
  );
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM pedidos p ${cond}`, params);

  return { data: rows.map((r) => pedidoResponse(r)), pagina, limite, total: Number(total) };
}

async function obtener(user, id) {
  return detalle(await cargarConPermiso(user, id));
}

/** Reemplaza items y observaciones. Solo mientras el pedido esté pendiente. */
async function actualizar(user, id, { items, observaciones }) {
  const actual = await cargarConPermiso(user, id);
  if (actual.estado !== 'pendiente') {
    throw new HttpError(409, 'CONFLICT', 'Solo se pueden modificar pedidos pendientes');
  }
  const { lineas, totalCent } = await prepararLineas(items);

  await withTransaction(async (conn) => {
    await conn.execute('UPDATE pedidos SET total = ?, observaciones = ? WHERE id_pedido = ?', [
      (totalCent / 100).toFixed(2),
      observaciones,
      id,
    ]);
    await conn.execute('DELETE FROM pedido_detalle WHERE id_pedido = ?', [id]);
    await insertarDetalle(conn, id, lineas);
  });

  await intentarEncolarPdf(id, 'actualizada'); // el PDF cambió: se regenera y se reenvía
  return detalle(await obtenerPedidoCompleto(id));
}

async function cambiarEstado(id, nuevo) {
  const [rows] = await pool.execute('SELECT estado FROM pedidos WHERE id_pedido = ?', [id]);
  if (!rows.length) throw noEncontrado();

  const actual = rows[0].estado;
  if (!TRANSICIONES[actual].includes(nuevo)) {
    throw new HttpError(409, 'CONFLICT', `No se puede pasar de '${actual}' a '${nuevo}'`);
  }
  // WHERE estado = actual evita pisarse con otro cambio simultáneo
  const [r] = await pool.execute('UPDATE pedidos SET estado = ? WHERE id_pedido = ? AND estado = ?', [nuevo, id, actual]);
  if (r.affectedRows !== 1) throw new HttpError(409, 'CONFLICT', 'El pedido cambió de estado, intenta de nuevo');

  return detalle(await obtenerPedidoCompleto(id));
}

async function eliminar(user, id) {
  const pedido = await cargarConPermiso(user, id);
  if (pedido.estado !== 'pendiente') {
    throw new HttpError(409, 'CONFLICT', 'Solo se pueden eliminar pedidos pendientes; usa el cambio de estado para cancelar');
  }
  const [r] = await pool.execute("DELETE FROM pedidos WHERE id_pedido = ? AND estado = 'pendiente'", [id]);
  if (r.affectedRows !== 1) throw new HttpError(409, 'CONFLICT', 'El pedido cambió de estado, intenta de nuevo');

  if (pedido.pdf_archivo) await fs.unlink(rutaPdfDe(pedido.pdf_archivo)).catch(() => {});
}

async function listarTrabajos(user, id) {
  await cargarConPermiso(user, id);
  return trabajos.listarPorPedido(id);
}

/** Vuelve a generar el PDF y reenviar el correo (por ejemplo, tras un trabajo fallido). */
async function reenviar(user, id) {
  await cargarConPermiso(user, id);
  try {
    const jobId = await queues.encolarPdf(id, 'reenvio');
    return { mensaje: 'Generación de la orden de compra encolada', job_id: jobId, cola: queues.NOMBRES.PDF };
  } catch {
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'No se pudo encolar el trabajo, intenta de nuevo');
  }
}

async function rutaPdf(user, id) {
  const pedido = await cargarConPermiso(user, id);
  const sinPdf = new HttpError(404, 'NOT_FOUND', 'El PDF de la orden aún no está disponible');
  if (!pedido.pdf_archivo) throw sinPdf;
  const ruta = rutaPdfDe(pedido.pdf_archivo);
  await fs.access(ruta).catch(() => {
    throw sinPdf;
  });
  return { ruta, nombre: pedido.pdf_archivo };
}

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  cambiarEstado,
  eliminar,
  listarTrabajos,
  reenviar,
  rutaPdf,
  obtenerPedidoCompleto,
};
