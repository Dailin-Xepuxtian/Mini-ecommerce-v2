const colores = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  enviado: 'bg-purple-100 text-purple-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

export default function EstadoBadge({ estado }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colores[estado] ?? 'bg-gray-100 text-gray-700'}`}>
      {estado}
    </span>
  );
}

const coloresPago = {
  pendiente: 'bg-gray-100 text-gray-700',
  procesando: 'bg-blue-100 text-blue-800 animate-pulse',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  reembolsado: 'bg-orange-100 text-orange-800',
};

const textosPago = {
  pendiente: 'Sin pagar',
  procesando: 'Procesando pago',
  aprobado: 'Pagado',
  rechazado: 'Pago rechazado',
  reembolsado: 'Reembolsado',
};

export function PagoBadge({ estado }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${coloresPago[estado] ?? 'bg-gray-100 text-gray-700'}`}>
      {textosPago[estado] ?? estado}
    </span>
  );
}
