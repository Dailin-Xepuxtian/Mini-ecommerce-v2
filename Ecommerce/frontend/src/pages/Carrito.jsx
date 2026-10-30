//Crear el pedido
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { pedidosApi } from '../api/endpoints';
import { errorMessage } from '../api/axios';
import { useCart } from '../context/CartContext';
import { money } from '../lib/format';

export default function Carrito() {
  const { items, setCantidad, remove, clear, total } = useCart();
  const [observaciones, setObservaciones] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const crear = useMutation({
    mutationFn: () =>
      pedidosApi.crear({
        items: items.map((i) => ({ id_producto: i.producto.id_producto, cantidad: i.cantidad })),
        observaciones,
      }),
    onSuccess: (pedido) => {
      toast.success(`Orden ${pedido.numero_orden} creada. Se está generando el PDF...`);
      clear();
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      navigate(`/pedidos/${pedido.id_pedido}`);
    },
    onError: (e) => toast.error(errorMessage(e), { duration: 6000 }),
  });

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center">
        <p className="mb-3 text-gray-500">Tu carrito está vacío.</p>
        <Link to="/" className="text-indigo-600 hover:underline">Ir al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h1 className="text-xl font-bold">Carrito</h1>
        {items.map(({ producto: p, cantidad }) => (
          <div key={p.id_producto} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.nombre}</p>
              <p className="text-sm text-gray-500">{p.codigo} · {money(p.precio_venta)} c/u</p>
            </div>
            <input
              type="number" min={1} max={p.stock} value={cantidad}
              onChange={(e) => setCantidad(p.id_producto, Number(e.target.value) || 1)}
              className="w-20 rounded-lg border px-2 py-1"
            />
            <p className="w-24 text-right font-semibold">{money(cantidad * p.precio_venta)}</p>
            <button onClick={() => remove(p.id_producto)} className="text-red-500 hover:text-red-700" aria-label="Quitar">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <aside className="h-fit space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Resumen</h2>
        <div>
          <label className="mb-1 block text-sm">Observaciones (opcional)</label>
          <textarea
            value={observaciones} maxLength={500} rows={3}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
          <p className="text-right text-xs text-gray-400">{observaciones.length}/500</p>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span><span>{money(total)}</span>
        </div>
        <p className="text-xs text-gray-500">El total final se calcula con los precios vigentes.</p>
        <button
          onClick={() => crear.mutate()} disabled={crear.isPending}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Confirmar pedido'}
        </button>
      </aside>
    </div>
  );
}