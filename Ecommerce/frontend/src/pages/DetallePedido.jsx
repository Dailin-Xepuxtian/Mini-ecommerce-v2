import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { pedidosApi } from '../api/endpoints';
import { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EstadoBadge from '../components/EstadoBadge';
import TrabajosPedido, { trabajoPendiente } from '../components/TrabajosPedido';
import { money, fecha } from '../lib/format';

const SIGUIENTES = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({ items: [], observaciones: '' });

  const { data: pedido, isLoading, error } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidosApi.obtener(id),
    // polling cada 3 s mientras haya trabajos sin terminar (o aún no se haya registrado ninguno)
    refetchInterval: (q) => {
      const t = q.state.data?.trabajos;
      return !t || t.length === 0 || t.some(trabajoPendiente) ? 3000 : false;
    },
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['pedido', id] });
    qc.invalidateQueries({ queryKey: ['pedidos'] });
  };
  const onError = (e) => toast.error(errorMessage(e), { duration: 6000 });

  const cambiarEstado = useMutation({
    mutationFn: (estado) => pedidosApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); refrescar(); },
    onError,
  });
  const reenviar = useMutation({
    mutationFn: () => pedidosApi.reenviar(id),
    onSuccess: (r) => { toast.success(r.mensaje); refrescar(); },
    onError,
  });
  const guardar = useMutation({
    mutationFn: () => pedidosApi.actualizar(id, borrador),
    onSuccess: () => { toast.success('Pedido actualizado; se regenerará el PDF'); setEditando(false); refrescar(); },
    onError,
  });
  const eliminar = useMutation({
    mutationFn: () => pedidosApi.eliminar(id),
    onSuccess: () => { toast.success('Pedido eliminado'); qc.invalidateQueries({ queryKey: ['pedidos'] }); navigate('/pedidos'); },
    onError,
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{errorMessage(error)}</p>;

  const pendiente = pedido.estado === 'pendiente';

  const empezarEdicion = () => {
    setBorrador({
      items: pedido.items.map((i) => ({ id_producto: i.id_producto, nombre: i.nombre, cantidad: i.cantidad })),
      observaciones: pedido.observaciones ?? '',
    });
    setEditando(true);
  };
  const cambiarCantidad = (idProd, cantidad) =>
    setBorrador((b) => ({
      ...b,
      items: b.items.map((i) => (i.id_producto === idProd ? { ...i, cantidad: Math.max(1, cantidad || 1) } : i)),
    }));
  const quitar = (idProd) =>
    setBorrador((b) => ({ ...b, items: b.items.filter((i) => i.id_producto !== idProd) }));

  const descargar = async () => {
    try { await pedidosApi.descargarPdf(id); } catch (e) { onError(e); }
  };

  const payloadItems = () => ({
    items: borrador.items.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
    observaciones: borrador.observaciones,
  });

  return (
    <div className="space-y-5">
      <Link to="/pedidos" className="text-sm text-indigo-600 hover:underline">← Volver a pedidos</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold">{pedido.numero_orden} <EstadoBadge estado={pedido.estado} /></h1>
          <p className="text-sm text-gray-500">
            {fecha(pedido.creado_en)} · {pedido.cliente.nombre} ({pedido.cliente.email})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={descargar} disabled={!pedido.tiene_pdf}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:bg-gray-300">
            <Download size={16} /> {pedido.tiene_pdf ? 'Descargar PDF' : 'PDF en proceso...'}
          </button>
          {pendiente && !editando && (
            <>
              <button onClick={empezarEdicion} className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                <Pencil size={16} /> Editar
              </button>
              <button onClick={() => window.confirm('¿Eliminar este pedido?') && eliminar.mutate()}
                      className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <Trash2 size={16} /> Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {isAdmin && SIGUIENTES[pedido.estado].length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4">
          <span className="text-sm font-medium">Cambiar estado a:</span>
          {SIGUIENTES[pedido.estado].map((e) => (
            <button key={e} disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate(e)}
                    className="rounded-lg border px-3 py-1 text-sm capitalize hover:bg-gray-50 disabled:opacity-50">
              {e}
            </button>
          ))}
        </div>
      )}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Productos</h2>
        <div className="space-y-2">
          {(editando ? borrador.items : pedido.items).map((i) => (
            <div key={i.id_producto} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0">
              <span className="min-w-0 flex-1 truncate">{i.nombre}</span>
              {editando ? (
                <>
                  <input type="number" min={1} value={i.cantidad}
                         onChange={(e) => cambiarCantidad(i.id_producto, Number(e.target.value))}
                         className="w-20 rounded-lg border px-2 py-1" />
                  <button onClick={() => quitar(i.id_producto)} className="text-red-500"><Trash2 size={16} /></button>
                </>
              ) : (
                <span className="text-gray-600">{i.cantidad} × {money(i.precio_unitario)} = <b>{money(i.subtotal)}</b></span>
              )}
            </div>
          ))}
        </div>

        {editando ? (
          <div className="mt-4 space-y-3">
            <textarea value={borrador.observaciones} maxLength={500} rows={2}
                      onChange={(e) => setBorrador({ ...borrador, observaciones: e.target.value })}
                      placeholder="Observaciones" className="w-full rounded-lg border px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button disabled={guardar.isPending || borrador.items.length === 0}
                      onClick={() => guardar.mutate(payloadItems())}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {guardar.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditando(false)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            {pedido.observaciones && <p className="mt-3 text-sm text-gray-500">Observaciones: {pedido.observaciones}</p>}
            <p className="mt-3 text-right text-lg font-bold">Total: {money(pedido.total)}</p>
          </>
        )}
      </section>

      <TrabajosPedido trabajos={pedido.trabajos} onReenviar={() => reenviar.mutate()} reenviando={reenviar.isPending} />
    </div>
  );
}