import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi } from '../api/endpoints';
import { errorMessage } from '../api/axios';
import { useCart } from '../context/CartContext';
import { money } from '../lib/format';

function ProductCard({ p }) {
  const { add } = useCart();
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex h-40 items-center justify-center bg-gray-100">
        {p.imagen ? (
          <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover"
               onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <span className="text-sm text-gray-400">Sin imagen</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs text-gray-500">{p.categoria.nombre_categoria} · {p.codigo}</span>
        <h3 className="font-semibold leading-tight">{p.nombre}</h3>
        {p.marca && <p className="text-sm text-gray-500">{p.marca}</p>}
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-lg font-bold text-indigo-600">{p.precio_venta !== null ? money(p.precio_venta) : '-'}</p>
            <p className={`text-xs ${p.disponible ? 'text-green-600' : 'text-red-600'}`}>
              {p.disponible ? `${p.stock} disponibles` : 'No disponible'}
            </p>
          </div>
          <button
            disabled={!p.disponible}
            onClick={() => { add(p); toast.success('Agregado al carrito'); }}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ShoppingCart size={16} /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Productos() {
  const [categoria, setCategoria] = useState('');
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // debounce de 400 ms para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), 400);
    return () => clearTimeout(t);
  }, [texto]);

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: productosApi.categorias });
  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos', categoria, busqueda],
    queryFn: () => productosApi.listar({ id_categoria: categoria || undefined, codigo: busqueda || undefined }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 focus:outline-indigo-500"
          />
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2 sm:w-56">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Cargando productos...</p>}
      {error && <p className="text-red-600">{errorMessage(error)}</p>}
      {!isLoading && !error && productos.length === 0 && (
        <p className="rounded-lg bg-white p-6 text-center text-gray-500">No se encontraron productos.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {productos.map((p) => <ProductCard key={p.id_producto} p={p} />)}
      </div>
    </div>
  );
}