import { useState } from "react";
import { login } from "./api.js";

// Pantalla de inicio de sesion
export default function Login({ onLogin, aviso }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault(); // evita que el navegador recargue la pagina
    setError("");
    setCargando(true);
    try {
      const datos = await login(username, password); // POST /api/v1/auth/login
      onLogin(datos.token, datos.username);          // le pasamos el JWT a App
    } catch (err) {
      setError(err.message);
    }
    setCargando(false);
  }

  return (
    <div className="login">
      <form className="login-caja" onSubmit={enviar}>
        <h1>Pokemon Explorer</h1>
        <p className="tenue">Inicie sesion para buscar Pokemon y armar su equipo.</p>

        <label htmlFor="usuario">Usuario</label>
        <input id="usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />

        <label htmlFor="clave">Contrasena</label>
        <input id="clave" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {(error || aviso) && <p className="error">{error || aviso}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Entrando..." : "Iniciar sesion"}
        </button>

        <p className="tenue pequeno">Usuarios de prueba: ash / pikachu123, misty / starmie123</p>
      </form>
    </div>
  );
}
