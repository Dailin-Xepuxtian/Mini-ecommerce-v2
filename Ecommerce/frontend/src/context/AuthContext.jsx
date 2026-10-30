import { createContext, useContext, useState } from 'react';
import { authApi } from '../api/endpoints';
import { session } from '../api/axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => session.usuario);

  const guardar = (data) => { session.save(data); setUsuario(data.usuario); };

  const login = async (d) => guardar(await authApi.login(d));
  const register = async (d) => guardar(await authApi.register(d));
  const logout = async () => {
    try { if (session.refreshToken) await authApi.logout(session.refreshToken); } catch { /* ignorar */ }
    session.clear();
    setUsuario(null);
  };

  const isAdmin = usuario?.rol === import.meta.env.VITE_ADMIN_ROLE;

  return (
    <AuthContext.Provider value={{ usuario, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}