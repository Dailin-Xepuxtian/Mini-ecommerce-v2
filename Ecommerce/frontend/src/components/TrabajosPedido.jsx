import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { jobsApi } from '../api/endpoints';
import { fecha } from '../lib/format';

const FINALES = ['completado', 'completed', 'fallido', 'failed'];
export const trabajoPendiente = (t) => !FINALES.includes(String(t.estado).toLowerCase());

// Nombres entendibles para el usuario (el backend guarda pdf, correo, pago)
const NOMBRES = {
  pdf: 'Orden de compra (PDF)',
  correo: 'Envío de correo',
  pago: 'Pago en línea',
  factura: 'Factura (PDF)',
};


const color = (estado) => {
  const e = String(estado).toLowerCase();
  if (['completado', 'completed'].includes(e)) return 'bg-green-100 text-green-800';
  if (['fallido', 'failed'].includes(e)) return 'bg-red-100 text-red-800';
  if (e === 'reintentando') return 'bg-orange-100 text-orange-800 animate-pulse';
  if (['procesando', 'active'].includes(e)) return 'bg-blue-100 text-blue-800 animate-pulse';
  return 'bg-yellow-100 text-yellow-800'; // en_cola
};

const etiqueta = (estado) => String(estado).replace('_', ' ');


//colas
function DetalleJob({ cola, id }) {
  const { data, isLoading } = useQuery({
    queryKey: ['job', cola, id],
    queryFn: () => jobsApi.obtener(cola, id),
  });
  if (isLoading) return <p className="text-xs text-gray-500">Cargando...</p>;
  if (!data) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3 text-xs sm:grid-cols-4">
      <div><dt className="text-gray-500">Cola</dt><dd>{data.cola}</dd></div>
      <div><dt className="text-gray-500">Estado en Redis</dt><dd>{data.estado_cola ?? 'ya no está'}</dd></div>
      <div><dt className="text-gray-500">Intentos</dt><dd>{data.intentos}{data.max_intentos ? ` de ${data.max_intentos}` : ''}</dd></div>
      <div><dt className="text-gray-500">Actualizado</dt><dd>{fecha(data.actualizado_en)}</dd></div>
      {data.error && <div className="col-span-full text-red-600"><dt className="text-gray-500">Último error</dt><dd>{data.error}</dd></div>}
    </dl>
  );
}

export default function TrabajosPedido({ trabajos = [], onReenviar, reenviando }) {
  const [abierto, setAbierto] = useState(null);
  const hayPendientes = trabajos.some(trabajoPendiente);

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          Trabajos en segundo plano
          {hayPendientes && <Loader2 size={16} className="animate-spin text-indigo-500" />}
        </h3>
        {onReenviar && (
          <button onClick={onReenviar} disabled={reenviando}
                  className="rounded-lg border px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">
            Reenviar orden de compra
          </button>
        )}
      </div>

      {trabajos.length === 0 && <p className="text-sm text-gray-500">Todavía no hay trabajos para este pedido.</p>}

      <ul className="space-y-2">
        {trabajos.map((t, i) => {
          const id = t.job_id ?? t.id;
          const key = `${t.cola}-${id}-${i}`;
          return (
            <li key={key} className="space-y-2">
              <button className="flex w-full items-center justify-between text-left text-sm"
                      onClick={() => setAbierto(abierto === key ? null : key)}>
                <span className="font-medium">{NOMBRES[t.tipo] ?? t.tipo ?? t.cola}</span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${color(t.estado)}`}>{etiqueta(t.estado)}</span>
                  {abierto === key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
              {abierto === key && t.cola && id && <DetalleJob cola={t.cola} id={id} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}