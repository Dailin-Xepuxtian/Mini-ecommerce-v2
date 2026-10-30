const pool = require('../config/db');

/** Escapa % _ \ para que el LIKE trate el texto como literal (addcslashes del PHP). */
const escapeLike = (s) => s.replace(/[%_\\]/g, '\\$&');

/** Convierte una fila SQL en el esquema "Producto" del contrato OpenAPI. */
// mysql2 devuelve DECIMAL como string, por eso el Number() explícito.
function productoResponse(r) {
  const precioVenta = r.precio_venta === null ? null : Number(r.precio_venta);
  const stock = Number(r.stock);

  return {
    id_producto: Number(r.id_producto),
    codigo: r.codigo,
    nombre: r.nombre,
    marca: r.marca,
    descripcion: r.descripcion,
    categoria: {
      id_categoria: Number(r.id_categoria),
      nombre_categoria: r.nombre_categoria,
    },
    stock,
    stock_minimo: Number(r.stock_minimo),
    stock_maximo: Number(r.stock_maximo),
    precio_compra: Number(r.precio_compra),
    precio_venta: precioVenta,
    imagen: r.imagen,
    fecha_ingreso: r.fecha_ingreso,
    estado_stock: r.estado_stock,
    // RN-01: solo se puede cotizar un producto activo y disponible
    disponible: r.estado_stock !== 'sin_stock' && precioVenta !== null && stock > 0,
    proveedor:
      r.id_proveedor === null
        ? null
        : {
            id_proveedor: Number(r.id_proveedor),
            nombre: r.proveedor_nombre,
            contacto: r.proveedor_contacto,
            telefono: r.proveedor_telefono,
            correo: r.proveedor_correo,
          },
  };
}

/** Catálogo: productos + categoría + existencias + proveedor principal. */
async function listar(idCategoria, busqueda) {
  let sql = `SELECT p.id_producto, p.codigo, p.nombre, p.marca, p.descripcion, p.imagen,
                    p.stock_minimo, p.stock_maximo, p.precio_compra, p.precio_venta, p.estado_stock,
                    DATE(p.creado_en) AS fecha_ingreso,
                    c.id_categoria, c.nombre_categoria,
                    COALESCE(i.cant_total_disponible, 0) AS stock,
                    pr.id_proveedor, pr.nombre_empresa AS proveedor_nombre,
                    pr.contacto_nombre AS proveedor_contacto, pr.email AS proveedor_correo,
                    pr.telefono AS proveedor_telefono
             FROM productos p
             INNER JOIN categorias c ON c.id_categoria = p.id_categoria
             LEFT JOIN producto_inventario i ON i.id_producto = p.id_producto
             LEFT JOIN producto_proveedores pp ON pp.id_producto_proveedor = (
                 SELECT MIN(x.id_producto_proveedor)
                 FROM producto_proveedores x
                 WHERE x.id_producto = p.id_producto
             )
             LEFT JOIN proveedores pr ON pr.id_proveedor = pp.id_proveedor
             WHERE 1 = 1`;
  const params = [];

  if (idCategoria !== null) {
    sql += ' AND p.id_categoria = ?';
    params.push(idCategoria);
  }
  if (busqueda) {
    sql += ' AND (p.codigo LIKE ? OR p.nombre LIKE ?)';
    const like = `%${escapeLike(busqueda)}%`;
    params.push(like, like);
  }
  sql += ' ORDER BY p.nombre ASC';

  const [rows] = await pool.execute(sql, params);
  return rows.map(productoResponse);
}

async function categorias() {
  const [rows] = await pool.execute(
    'SELECT id_categoria, nombre_categoria, descripcion FROM categorias ORDER BY id_categoria'
  );
  return rows.map((c) => ({
    id_categoria: Number(c.id_categoria),
    nombre_categoria: c.nombre_categoria,
    descripcion: c.descripcion,
  }));
}

/** Productos por id con su existencia, para validar una cotización. Devuelve Map<id, fila>. */
async function buscarPorIds(ids) {
  if (!ids.length) return new Map();
  const marcadores = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT p.id_producto, p.codigo, p.nombre, p.precio_venta, p.estado_stock,
            COALESCE(i.cant_total_disponible, 0) AS stock
     FROM productos p
     LEFT JOIN producto_inventario i ON i.id_producto = p.id_producto
     WHERE p.id_producto IN (${marcadores})`,
    ids
  );
  return new Map(rows.map((r) => [Number(r.id_producto), r]));
}

module.exports = { listar, categorias, buscarPorIds };
