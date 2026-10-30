import { useState } from 'react';
import { Cable, Check, Cpu, Minus, Package, Plus, Router, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { money } from '../lib/format';

const POCO_STOCK = 5;

/** URL de la foto: por código (frontend/public/productos/<codigo>.PNG). */
export const imagenProducto = (p) =>
  `/productos/${p.codigo}.PNG`;;

function iconoDe(p) {
  const t = `${p.categoria?.nombre_categoria ?? ''} ${p.nombre}`.toLowerCase();
  if (/cable|bobina|patch|utp/.test(t)) return Cable;
  if (/access point|wifi|inal[aá]mbric/.test(t)) return Wifi;
  if (/router|switch|firewall/.test(t)) return Router;
  if (/procesador|cpu|intel|ryzen|amd|core/.test(t)) return Cpu;
  return Package;
}

function Imagen({ p }) {
  const [fallo, setFallo] = useState(false);
  const Icono = iconoDe(p);
  if (fallo) {
    return (
      <div className="bg-banner flex h-full w-full items-center justify-center">
        <Icono size={48} className="text-white/80" strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={imagenProducto(p)} alt={p.nombre} loading="lazy" onError={() => setFallo(true)} className="h-full w-full object-contain p-4" />;
}

function StockBadge({ p }) {
  if (!p.disponible) return <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">Agotado</span>;
  const poco = p.stock <= POCO_STOCK;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${poco ? 'bg-amber-100 text-amber-800' : 'bg-lime-100 text-lime-800'}`}>
      <Check size={13} /> {poco ? `Solo ${p.stock} en existencia` : `${p.stock} en existencia`}
    </span>
  );
}

function Cantidad({ value, max, onChange }) {
  const set = (n) => onChange(Math.min(max, Math.max(1, n || 1)));
  const boton = 'w-9 text-indigo-700 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent';
  return (
    <div className="flex h-10 overflow-hidden rounded-lg border border-indigo-200 bg-white">
      <button type="button" aria-label="Menos" disabled={value <= 1} onClick={() => set(value - 1)} className={boton}><Minus size={14} className="mx-auto" /></button>
      <input aria-label="Cantidad" inputMode="numeric" value={value} onChange={(e) => set(parseInt(e.target.value.replace(/\D/g, ''), 10))}
             className="w-10 border-x border-indigo-200 text-center text-sm font-medium outline-none focus:bg-indigo-50" />
      <button type="button" aria-label="Más" disabled={value >= max} onClick={() => set(value + 1)} className={boton}><Plus size={14} className="mx-auto" /></button>
    </div>
  );
}

export default function ProductCard({ p }) {
  const { items, add } = useCart();
  const [cant, setCant] = useState(1);
  const enCarrito = items.find((i) => i.producto.id_producto === p.id_producto)?.cantidad ?? 0;
  const libres = Math.max(0, p.stock - enCarrito); // lo que aún se puede agregar
  const sinCupo = p.disponible && libres === 0;

  const agregar = () => {
    const n = Math.min(cant, libres);
    add(p, n);
    toast.success(`${n} × ${p.nombre} en el carrito`);
    setCant(1);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm transition-colors hover:border-indigo-300">
      <div className="aspect-[4/3] border-b border-indigo-50 bg-slate-50"><Imagen p={p} /></div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs text-indigo-600">{p.categoria.nombre_categoria} · {p.codigo}</span>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.nombre}</h3>
        {p.marca && <p className="text-sm text-slate-500">{p.marca}</p>}
        <p className="mt-1 font-display text-2xl font-bold text-night">{p.precio_venta !== null ? money(p.precio_venta) : 'Sin precio'}</p>
        <div><StockBadge p={p} /></div>
        {enCarrito > 0 && <p className="text-xs text-slate-500">Ya tienes {enCarrito} en el carrito</p>}

        <div className="mt-auto flex gap-2 pt-2">
          {p.disponible && libres > 0 && <Cantidad value={Math.min(cant, libres)} max={libres} onChange={setCant} />}
          <button onClick={agregar} disabled={!p.disponible || sinCupo}
                  className="h-10 flex-1 rounded-lg border-b-2 border-action-dark bg-action px-3 text-sm font-bold text-night hover:bg-action-dark disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400">
            {!p.disponible ? 'No disponible' : sinCupo ? 'Máximo en carrito' : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  );
}
