import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Productos from './pages/Productos';
import Pedidos from './pages/Pedidos';
import DetallePedido from './pages/DetallePedido';
import Carrito from './pages/Carrito';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Productos />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/pedidos/:id" element={<DetallePedido />} />
          <Route path="/carrito" element={<Carrito />} />
        </Route>
      </Route>
    </Routes>
  );
}