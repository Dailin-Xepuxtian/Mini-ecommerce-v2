import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const link = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`;

export default function Layout() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const salir = async () => { await logout(); navigate('/login'); };

  const carrito = (
    <NavLink to="/carrito" className={link}>
      <span className="inline-flex items-center gap-2">
        <ShoppingCart size={16} /> Carrito
        {count > 0 && <span className="rounded-full bg-action px-1.5 text-xs font-bold text-night">{count}</span>}
      </span>
    </NavLink>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-banner sticky top-0 z-10 text-white shadow-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            Giganet <span className="text-action">Shop</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={link}>Productos</NavLink>
            <NavLink to="/pedidos" className={link}>Mis pedidos</NavLink>
            {carrito}
            <span className="px-3 text-sm text-white/70">{usuario.nombre}</span>
            <button onClick={salir} className="rounded-lg border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10">Salir</button>
          </div>
          <button className="md:hidden" onClick={() => setAbierto(!abierto)} aria-label="Menú">{abierto ? <X /> : <Menu />}</button>
        </nav>
        {abierto && (
          <div className="space-y-1 border-t border-white/10 px-4 py-3 md:hidden" onClick={() => setAbierto(false)}>
            <NavLink to="/" end className={link}>Productos</NavLink>
            <NavLink to="/pedidos" className={link}>Mis pedidos</NavLink>
            {carrito}
            <button onClick={salir} className="w-full rounded-lg border border-white/30 px-3 py-2 text-sm">Salir ({usuario.nombre})</button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
