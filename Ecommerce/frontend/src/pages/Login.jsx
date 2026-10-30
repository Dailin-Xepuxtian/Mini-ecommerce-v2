import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axios';

const schema = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio').email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export default function Login() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  if (usuario) return <Navigate to="/" replace />;

  const onSubmit = async (data) => {
    try {
      await login(data);
      toast.success('Bienvenido');
      navigate('/');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>

        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input type="email" {...register('email')} className="w-full rounded-lg border px-3 py-2 focus:outline-indigo-500" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Contraseña</label>
          <input type="password" {...register('password')} className="w-full rounded-lg border px-3 py-2 focus:outline-indigo-500" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <button disabled={isSubmitting} className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta? <Link to="/register" className="text-indigo-600 hover:underline">Regístrate</Link>
        </p>
      </form>
    </div>
  );
}