import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { productosApi } from '../api/endpoints';
import { errorMessage } from '../api/axios';
import ProductCard from '../components/ProductCard';

const chip = (activo) =>
  `shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${activo ? 'border-white bg-white font-medium text-night' : 'border-white/25 text-white/85 hover:bg-white/10'}`;

export default function Productos() {
  const [categoria, setCategoria] = useState('');
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), 400); // espera a que termines de escribir
    return () => clearTimeout(t);
  }, [texto]);

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: productosApi.categorias });
  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos', categoria, busqueda],
    queryFn: () => productosApi.listar({ id_categoria: categoria || undefined, codigo: busqueda || undefined }),
  });

  return (
    <div className="space-y-5">
      <section className="bg-banner space-y-4 rounded-2xl p-5 text-white sm:p-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Redes y cómputo</h1>
          <p className="mt-1 text-white/75">Elige la cantidad, paga en línea y recibe tu ticket por correo.</p>
        </div>
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Busca por código o nombre"
                 className="w-full rounded-xl bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none focus:ring-2 focus:ring-action" />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button className={chip(categoria === '')} onClick={() => setCategoria('')}>Todas</button>
          {categorias.map((c) => (
            <button key={c.id_categoria} className={chip(String(categoria) === String(c.id_categoria))} onClick={() => setCategoria(c.id_categoria)}>
              {c.nombre_categoria}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{errorMessage(error)}</p>}
      {!isLoading && !error && (
        <p className="text-sm text-slate-500">{productos.length === 0 ? 'No encontramos productos con ese filtro. Prueba con otra búsqueda o categoría.' : `${productos.length} productos`}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-indigo-100/60" />)
          : productos.map((p) => <ProductCard key={p.id_producto} p={p} />)}
      </div>
    </div>
  );
}
