import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { pedidosApi, ESTADOS_PEDIDO } from '../api/endpoints';
import { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/EstadoBadge';
import { money, fecha } from '../lib/format';

export default function Pedidos() {
  const { isAdmin } = useAuth();
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const limite = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['pedidos', estado, pagina],
    queryFn: () => pedidosApi.listar({ estado: estado || undefined, pagina, limite }),
    placeholderData: keepPreviousData,
  });

  const pedidos = data?.data ?? [];
  const totalPaginas = Math.max(1, Math.ceil((data?.total ?? 0) / limite));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{isAdmin ? 'Todos los pedidos' : 'Mis pedidos'}</h1>
        <select value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
                className="rounded-lg border bg-white px-3 py-2">
          <option value="">Todos los estados</option>
          {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">{errorMessage(error)}</p>}
      {!isLoading && pedidos.length === 0 && (
        <p className="rounded-lg bg-white p-6 text-center text-gray-500">No hay pedidos.</p>
      )}

      {/* Tarjetas (móvil) */}
      <div className="space-y-3 md:hidden">
        {pedidos.map((p) => (
          <Link key={p.id_pedido} to={`/pedidos/${p.id_pedido}`} className="block rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.numero_orden}</span>
              <EstadoBadge estado={p.estado} />
            </div>
            {isAdmin && <p className="text-sm text-gray-500">{p.cliente.nombre}</p>}
            <p className="mt-1 text-sm text-gray-500">{fecha(p.creado_en)}</p>
            <p className="mt-1 font-bold">{money(p.total)}</p>
          </Link>
        ))}
      </div>

      {/* Tabla (md+) */}
      <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">Orden</th>
              {isAdmin && <th className="px-4 py-3">Cliente</th>}
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id_pedido} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.numero_orden}</td>
                {isAdmin && <td className="px-4 py-3">{p.cliente.nombre}</td>}
                <td className="px-4 py-3">{fecha(p.creado_en)}</td>
                <td className="px-4 py-3"><EstadoBadge estado={p.estado} /></td>
                <td className="px-4 py-3 text-right">{money(p.total)}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/pedidos/${p.id_pedido}`} className="text-indigo-600 hover:underline">Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 text-sm">
        <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}
                className="rounded-lg border bg-white px-3 py-1 disabled:opacity-40">Anterior</button>
        <span>Página {pagina} de {totalPaginas}</span>
        <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}
                className="rounded-lg border bg-white px-3 py-1 disabled:opacity-40">Siguiente</button>
      </div>
    </div>
  );
}