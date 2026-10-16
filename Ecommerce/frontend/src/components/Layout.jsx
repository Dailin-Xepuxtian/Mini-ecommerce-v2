import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart } from 'lucide-react';//sea agrega carrito al NavBar
import { useCart } from '../context/CartContext';

const link = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
  }`;

export default function Layout() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const salir = async () => { await logout(); navigate('/login'); };
  const{count}=useCart();//se agrega carrito al NavBar

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-600">Galacticos Shop</Link>

          <div className="hidden items-center gap-2 md:flex">
            <NavLink to="/" end className={link}>Productos</NavLink>
            <NavLink to="/pedidos" className={link}>Mis pedidos</NavLink>
            <NavLink to="/carrito" className={link}><span className="inline-flex items-center gap-1"><ShoppingCart size={16} /> Carrito{count > 0 && ` (${count})`}</span>
            </NavLink>
            <span className="px-2 text-sm text-gray-500">{usuario.nombre}</span>
            <button onClick={salir} className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-700">Salir</button>
          </div>

          <button className="md:hidden" onClick={() => setAbierto(!abierto)} aria-label="Menú">
            {abierto ? <X /> : <Menu />}
          </button>
        </nav>

        {abierto && (
          <div className="space-y-1 border-t px-4 py-3 md:hidden" onClick={() => setAbierto(false)}>
            <NavLink to="/" end className={link}>Productos</NavLink>
            <NavLink to="/pedidos" className={link}>Mis pedidos</NavLink>
            <button onClick={salir} className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Salir ({usuario.nombre})</button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}