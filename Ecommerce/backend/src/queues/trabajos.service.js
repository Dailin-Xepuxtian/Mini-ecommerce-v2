const pool = require('../config/db');

const cortar = (s) => (s ? String(s).slice(0, 500) : null);

/** Registra en BD un trabajo (antes de encolarlo) para que el frontend pueda mostrar su estado. */
async function registrar({ idPedido, cola, jobId, tipo }) {
  await pool.execute(
    "INSERT INTO pedido_trabajos (id_pedido, cola, job_id, tipo, estado) VALUES (?, ?, ?, ?, 'en_cola')",
    [idPedido, cola, jobId, tipo]
  );
}

async function actualizar(cola, jobId, { estado, intentos = null, error = null }) {
  await pool.execute(
    'UPDATE pedido_trabajos SET estado = ?, intentos = COALESCE(?, intentos), error = ? WHERE cola = ? AND job_id = ?',
    [estado, intentos, cortar(error), cola, jobId]
  );
}

async function listarPorPedido(idPedido) {
  const [rows] = await pool.execute(
    `SELECT id_trabajo, tipo, cola, job_id, estado, intentos, error, creado_en, actualizado_en
     FROM pedido_trabajos WHERE id_pedido = ? ORDER BY id_trabajo`,
    [idPedido]
  );
  return rows.map((r) => ({ ...r, id_trabajo: Number(r.id_trabajo), intentos: Number(r.intentos) }));
}

/** Mantiene la tabla pedido_trabajos sincronizada con lo que hace el worker. */
function enlazarWorker(worker) {
  const cola = worker.name;
  const seguro = (promesa) =>
    promesa.catch((e) => console.error(`[${cola}] no se pudo actualizar el estado del trabajo:`, e.message));

  worker.on('active', (job) =>
    seguro(actualizar(cola, job.id, { estado: 'procesando', intentos: job.attemptsMade + 1 }))
  );
  worker.on('completed', (job) => seguro(actualizar(cola, job.id, { estado: 'completado' })));
  worker.on('failed', (job, err) => {
    if (!job) return;
    // Si BullMQ lo dejó en 'failed' no habrá más reintentos; si quedó 'delayed', se reintentará
    seguro(
      job.getState().then((estadoCola) =>
        actualizar(cola, job.id, {
          estado: estadoCola === 'failed' ? 'fallido' : 'reintentando',
          error: err.message,
        })
      )
    );
  });
  worker.on('error', (err) => console.error(`[${cola}] error del worker:`, err.message));
}

module.exports = { registrar, actualizar, listarPorPedido, enlazarWorker };
