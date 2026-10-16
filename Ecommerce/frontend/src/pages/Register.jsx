import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axios';

const schema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios').max(100, 'Máximo 100 caracteres'),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().min(1, 'El email es obligatorio').max(150, 'Máximo 150 caracteres').email('Email no válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.password === d.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden' });

const campos = [
  ['nombres', 'Nombres', 'text'],
  ['apellidos', 'Apellidos', 'text'],
  ['email', 'Email', 'email'],
  ['password', 'Contraseña', 'password'],
  ['confirmar', 'Confirmar contraseña', 'password'],
];

export default function Register() {
  const { register: registrar, usuario } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  if (usuario) return <Navigate to="/" replace />;

  const onSubmit = async ({ confirmar, ...data }) => {
    try {
      await registrar(data);
      toast.success('Cuenta creada');
      navigate('/');
    } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        {campos.map(([name, label, type]) => (
          <div key={name}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input type={type} {...register(name)} className="w-full rounded-lg border px-3 py-2 focus:outline-indigo-500" />
            {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name].message}</p>}
          </div>
        ))}
        <button disabled={isSubmitting} className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {isSubmitting ? 'Creando...' : 'Registrarme'}
        </button>
        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? <Link to="/login" className="text-indigo-600 hover:underline">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}