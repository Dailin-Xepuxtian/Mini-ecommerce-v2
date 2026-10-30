// Punto de entrada del proceso que consume las colas:  node src/worker.js
require('./config/env');
const { crearWorkerPdf } = require('./queues/workers/pdf.worker');
const { crearWorkerCorreo } = require('./queues/workers/email.worker');
const { crearWorkerPago } = require('./pagos/pagos.workers'); // pago -> factura -> correo

const workers = [crearWorkerPdf(), crearWorkerCorreo(),crearWorkerPago()];
console.log(`Workers iniciados: ${workers.map((w) => w.name).join(', ')}`);

// Cierre ordenado: termina los trabajos en curso antes de salir
async function cerrar() {
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
