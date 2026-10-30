import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({ baseURL: API_URL });

export const session = {
  get token() { return localStorage.getItem('token'); },
  get refreshToken() { return localStorage.getItem('refreshToken'); },
  get usuario() { return JSON.parse(localStorage.getItem('usuario') || 'null'); },
  save({ token, refreshToken, usuario }) {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    if (usuario) localStorage.setItem('usuario', JSON.stringify(usuario));
  },
  clear() {
    ['token', 'refreshToken', 'usuario'].forEach((k) => localStorage.removeItem(k));
  },
};

api.interceptors.request.use((config) => {
  if (session.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

// Un solo /refresh en vuelo: el backend rota el token y el reuso revoca todas las sesiones
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const esAuth = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !original._retry && !esAuth && session.refreshToken) {
      original._retry = true;
      try {
        refreshing ??= axios
          .post(`${API_URL}/auth/refresh`, { refreshToken: session.refreshToken })
          .then((r) => { session.save(r.data); return r.data; })
          .finally(() => { refreshing = null; });

        const data = await refreshing;
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        session.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (e) => {
  const err = e.response?.data?.error;
  if (!err) return 'Ocurrió un error inesperado';
  const det = Array.isArray(err.details) ? err.details.join(' · ') : '';
  return det ? `${err.message}: ${det}` : err.message;
};