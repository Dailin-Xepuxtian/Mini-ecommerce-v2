import { useEffect, useState } from "react";
import Login from "./Login.jsx";
import PokemonCard from "./PokemonCard.jsx";
import ListaPokemon from "./ListaPokemon.jsx";
import * as api from "./api.js";

const MAX_EQUIPO = 6;

export default function App() {
  // ----- Estados de la aplicacion -----
  const [token, setToken] = useState(null);      // JWT recibido en el login
  const [usuario, setUsuario] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pokemon, setPokemon] = useState(null);  // resultado de la busqueda
  const [favoritos, setFavoritos] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [mensaje, setMensaje] = useState("");   
  const [error, setError] = useState("");     
  const [cargando, setCargando] = useState(false);

  // Cuando hay token (despues del login), cargar favoritos y equipo
  useEffect(() => {
    if (token) {
      cargarListas();
    }
  }, [token]);

  async function cargarListas() {
    try {
      setFavoritos(await api.obtenerFavoritos(token));
      setEquipo(await api.obtenerEquipo(token));
    } catch (err) {
      mostrarError(err);
    }
  }

  function iniciarSesion(nuevoToken, nombreUsuario) {
    setError("");
    setToken(nuevoToken);
    setUsuario(nombreUsuario);
  }

  function cerrarSesion() {
    setToken(null);
    setUsuario("");
    setPokemon(null);
    setFavoritos([]);
    setEquipo([]);
    setMensaje("");
  }

  // Si el token vencio (401), se regresa al login
  function mostrarError(err) {
    if (err.status === 401) {
      cerrarSesion();
    }
    setMensaje("");
    setError(err.message);
  }

  // ----- Acciones -----
  async function buscar(e) {
    e.preventDefault();
    if (!busqueda.trim()) return;

    setError("");
    setMensaje("");
    setPokemon(null);
    setCargando(true);
    try {
      const datos = await api.buscarPokemon(token, busqueda.trim().toLowerCase());
      setPokemon(datos);
    } catch (err) {
      mostrarError(err);
    }
    setCargando(false);
  }

  async function agregarFavorito(id) {
    try {
      const datos = await api.agregarFavorito(token, id);
      setFavoritos(datos.favorites);
      setError("");
      setMensaje(datos.message);
    } catch (err) {
      mostrarError(err);
    }
  }

  async function quitarFavorito(id) {
    try {
      const datos = await api.quitarFavorito(token, id);
      setFavoritos(datos.favorites);
      setError("");
      setMensaje(datos.message);
    } catch (err) {
      mostrarError(err);
    }
  }

  async function agregarAlEquipo(id) {
    try {
      const datos = await api.agregarAlEquipo(token, id);
      setEquipo(datos.team);
      setError("");
      setMensaje(datos.message);
    } catch (err) {
      mostrarError(err); // aqui se vera el 409 cuando se intente el septimo
    }
  }

  async function quitarDelEquipo(id) {
    try {
      const datos = await api.quitarDelEquipo(token, id);
      setEquipo(datos.team);
      setError("");
      setMensaje(datos.message);
    } catch (err) {
      mostrarError(err);
    }
  }

  // ----- Pantalla -----
  if (!token) {
    return <Login onLogin={iniciarSesion} aviso={error} />;
  }

  return (
    <div className="app">
      <header className="cabecera">
        <h1>Pokemon Explorer</h1>
        <div className="sesion">
          <span>
            Sesion: <strong>{usuario}</strong>
          </span>
          <span className="token" title={token}>JWT: {token.slice(0, 18)}...</span>
          <button className="secundario" onClick={cerrarSesion}>Cerrar sesion</button>
        </div>
      </header>

      <main>
        <form className="buscador" onSubmit={buscar}>
          <input
            placeholder="Nombre o numero, por ejemplo pikachu o 25"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="submit" disabled={cargando}>
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {mensaje && <p className="exito">{mensaje}</p>}
        {error && <p className="error">{error}</p>}

        {pokemon && (
          <PokemonCard pokemon={pokemon} onFavorito={agregarFavorito} onEquipo={agregarAlEquipo} />
        )}

        <div className="paneles">
          <ListaPokemon
            titulo={`Favoritos (${favoritos.length})`}
            lista={favoritos}
            onQuitar={quitarFavorito}
            textoVacio="Busque un Pokemon y agreguelo a favoritos."
          />
          <ListaPokemon
            titulo={`Equipo (${equipo.length}/${MAX_EQUIPO})`}
            lista={equipo}
            onQuitar={quitarDelEquipo}
            textoVacio="Su equipo esta vacio. Puede tener hasta 6 Pokemon."
          />
        </div>
      </main>
    </div>
  );
}
