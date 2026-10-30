import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FileText, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { pedidosApi } from '../api/endpoints';
import { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EstadoBadge, { PagoBadge } from '../components/EstadoBadge';
import TrabajosPedido, { trabajoPendiente } from '../components/TrabajosPedido';
import { money, fecha } from '../lib/format';

// El admin ya no confirma a mano(pruebas): 'confirmado' lo pone el sistema cuando el pago se aprueba
const SIGUIENTES = {
  pendiente: ['cancelado'],
  confirmado: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

export default function DetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { usuario, isAdmin } = useAuth();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({ items: [], observaciones: '' });
  const pagoAnterior = useRef(null);

  const { data: pedido, isLoading, error } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidosApi.obtener(id),
    // Se actualiza solo mientras algo esté en marcha: pago, orden de compra (PDF + correo) o trabajos en cola
    refetchInterval: (q) => {
      const p = q.state.data;
      if (!p) return 3000;
      const trabajos = p.trabajos ?? [];
      const pdfFallido = trabajos.some((t) => t.tipo === 'pdf' && t.estado === 'fallido');
      const pagando = p.estado_pago === 'procesando';
      const esperandoPdf = p.estado_pago === 'aprobado' && !p.tiene_pdf && !pdfFallido;
      return pagando || esperandoPdf || trabajos.some(trabajoPendiente) ? 3000 : false;
    },
  });

  // Avisa cuando el pago cambia de "procesando" a aprobado o rechazado
  useEffect(() => {
    const ahora = pedido?.estado_pago;
    if (pagoAnterior.current === 'procesando' && ahora === 'aprobado') {
      toast.success('Pago aprobado. Estamos generando tu orden de compra.');
    }
    if (pagoAnterior.current === 'procesando' && ahora === 'rechazado') {
      toast.error(`Pago rechazado: ${pedido.pagos?.[0]?.motivo ?? 'intenta de nuevo'}`, { duration: 7000 });
    }
    pagoAnterior.current = ahora ?? null;
  }, [pedido?.estado_pago]); // eslint-disable-line react-hooks/exhaustive-deps

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['pedido', id] });
    qc.invalidateQueries({ queryKey: ['pedidos'] });
  };
  const onError = (e) => toast.error(errorMessage(e), { duration: 6000 });

  const pagar = useMutation({
    mutationFn: () => pedidosApi.pagar(id),
    onSuccess: () => { toast('Procesando tu pago...'); refrescar(); },
    onError,
  });
  const cambiarEstado = useMutation({
    mutationFn: (estado) => pedidosApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); refrescar(); },
    onError,
  });
  const reenviarOrden = useMutation({
    mutationFn: () => pedidosApi.reenviar(id),
    onSuccess: (r) => { toast.success(r.mensaje); refrescar(); },
    onError,
  });
  const guardar = useMutation({
    mutationFn: () =>
      pedidosApi.actualizar(id, {
        items: borrador.items.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
        observaciones: borrador.observaciones,
      }),
    onSuccess: () => { toast.success('Pedido actualizado'); setEditando(false); refrescar(); },
    onError,
  });
  const eliminar = useMutation({
    mutationFn: () => pedidosApi.eliminar(id),
    onSuccess: () => { toast.success('Pedido eliminado'); qc.invalidateQueries({ queryKey: ['pedidos'] }); navigate('/pedidos'); },
    onError,
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{errorMessage(error)}</p>;

  const esDueno = usuario?.id === pedido.cliente.id;
  const pendiente = pedido.estado === 'pendiente';
  const procesando = pedido.estado_pago === 'procesando';
  const puedePagar = esDueno && pendiente && ['pendiente', 'rechazado'].includes(pedido.estado_pago);
  const puedeModificar = pendiente && !procesando;
  const ultimoPago = pedido.pagos?.[0];

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

  const descargar = (fn) => async () => {
    try { await fn(id); } catch (e) { onError(e); }
  };

  return (
    <div className="space-y-5">
      <Link to="/pedidos" className="text-sm text-indigo-600 hover:underline">← Volver a pedidos</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
            {pedido.numero_orden}
            <EstadoBadge estado={pedido.estado} />
            <PagoBadge estado={pedido.estado_pago} />
          </h1>
          <p className="text-sm text-gray-500">
            {fecha(pedido.creado_en)} · {pedido.cliente.nombre} ({pedido.cliente.email})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {puedePagar && (
            <button
              onClick={() => window.confirm(`¿Pagar ${money(pedido.total)} en línea?`) && pagar.mutate()}
              disabled={pagar.isPending}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CreditCard size={16} /> {pedido.estado_pago === 'rechazado' ? 'Reintentar pago' : 'Pagar en línea'}
            </button>
          )}
          <button onClick={descargar(pedidosApi.descargarPdf)} disabled={!pedido.tiene_pdf}
                  className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <FileText size={16} /> {pedido.tiene_pdf ? 'Orden de compra' : pedido.estado_pago === 'aprobado' ? 'Orden en proceso...' : 'Orden disponible al pagar'}
          </button>
          {puedeModificar && !editando && (
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

      {/* Mensaje según el punto del flujo */}
      {pendiente && pedido.estado_pago === 'pendiente' && esDueno && (
        <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          Tu pedido está reservado. Págalo en línea para confirmarlo; cuando el pago se apruebe te enviaremos la orden de compra en PDF por correo.
        </p>
      )}
      {procesando && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Estamos procesando el pago. Esta página se actualiza sola.</p>
      )}
      {pedido.estado_pago === 'rechazado' && ultimoPago && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          El pago no se completó: {ultimoPago.motivo ?? 'rechazado'}. Tu pedido sigue pendiente y puedes volver a intentarlo.
        </p>
      )}
      {pedido.estado_pago === 'aprobado' && !pedido.tiene_pdf && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Pago aprobado. Estamos generando tu orden de compra y la enviaremos a {pedido.cliente.email}.
        </p>
      )}

      {isAdmin && SIGUIENTES[pedido.estado].length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4">
          <span className="text-sm font-medium">Cambiar estado a:</span>
          {SIGUIENTES[pedido.estado].map((e) => (
            <button key={e} disabled={cambiarEstado.isPending || procesando} onClick={() => cambiarEstado.mutate(e)}
                    className="rounded-lg border px-3 py-1 text-sm capitalize hover:bg-gray-50 disabled:opacity-50">
              {e}
            </button>
          ))}
          {pedido.estado === 'pendiente' && (
            <span className="text-xs text-gray-500">La confirmación ocurre sola cuando el cliente paga.</span>
          )}
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
                  <button onClick={() => quitar(i.id_producto)} className="text-red-500" aria-label="Quitar"><Trash2 size={16} /></button>
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
              <button disabled={guardar.isPending || borrador.items.length === 0} onClick={() => guardar.mutate()}
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

      {pedido.pagos?.length > 0 && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Pagos</h2>
          <ul className="space-y-2 text-sm">
            {pedido.pagos.map((p) => (
              <li key={p.id_pago} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {p.referencia} · {money(p.monto)} · {fecha(p.creado_en)}
                  {p.motivo && <span className="text-red-600"> · {p.motivo}</span>}
                </span>
                <PagoBadge estado={p.estado} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <TrabajosPedido trabajos={pedido.trabajos} onReenviar={() => reenviarOrden.mutate()} reenviando={reenviarOrden.isPending} />

    </div>
  );
}