// =====================================================
// Todas las llamadas HTTP del frontend.
// IMPORTANTE: solo se habla con el API Gateway (puerto 8080),
// nunca directamente con PokeAPI ni con los servicios internos.
// =====================================================
const GATEWAY_URL = "http://localhost:8080/api/v1";

// Funcion general para hacer peticiones
async function peticion(ruta, metodo = "GET", token = null, cuerpo = null) {
  const opciones = { method: metodo, headers: {} };

  if (token) {
    opciones.headers["Authorization"] = `Bearer ${token}`;
  }
  if (cuerpo) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(GATEWAY_URL + ruta, opciones);
  const datos = await respuesta.json().catch(() => ({})); // por si no viene JSON

  if (!respuesta.ok) {
    const error = new Error(datos.error || `Error ${respuesta.status}`);
    error.status = respuesta.status; // codigos de errores
    throw error;
  }
  return datos;
}

export const login = (username, password) =>
  peticion("/auth/login", "POST", null, { username, password });

export const buscarPokemon = (token, nombreOId) =>
  peticion(`/pokemon/${encodeURIComponent(nombreOId)}`, "GET", token);

export const obtenerFavoritos = (token) => peticion("/favorites", "GET", token);
export const agregarFavorito = (token, id) => peticion(`/favorites/${id}`, "POST", token);
export const quitarFavorito = (token, id) => peticion(`/favorites/${id}`, "DELETE", token);

export const obtenerEquipo = (token) => peticion("/team", "GET", token);
export const agregarAlEquipo = (token, id) => peticion(`/team/${id}`, "POST", token);
export const quitarDelEquipo = (token, id) => peticion(`/team/${id}`, "DELETE", token);
