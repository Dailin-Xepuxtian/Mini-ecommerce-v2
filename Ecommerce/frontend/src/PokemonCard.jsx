// Tarjeta con el detalle del Pokemon buscado

const COLORES_TIPO = {
  normal: "#9FA19F", fire: "#E62829", water: "#2980EF", electric: "#FAC000",
  grass: "#3FA129", ice: "#3DCEF3", fighting: "#FF8000", poison: "#9141CB",
  ground: "#915121", flying: "#81B9EF", psychic: "#EF4179", bug: "#91A119",
  rock: "#AFA981", ghost: "#704170", dragon: "#5060E1", dark: "#624D4E",
  steel: "#60A1B8", fairy: "#EF70EF",
};
const TIPOS_CLAROS = ["electric", "ice", "normal", "rock", "flying", "fairy"];

// Texto que se muestra segun el origen de la respuesta
const ORIGENES = {
  pokeapi: "Origen: PokeAPI",
  cache: "Origen: cache en memoria",
  fallback: "Origen: respaldo local (fallback)",
};

const NOMBRES_STATS = { hp: "PS", attack: "Ataque", defense: "Defensa" };

export default function PokemonCard({ pokemon, onFavorito, onEquipo }) {
  return (
    <article className="tarjeta">
      <img className="tarjeta-img" src={pokemon.image} alt={pokemon.name} />

      <div className="tarjeta-info">
        <span className={`origen origen-${pokemon.source}`}>{ORIGENES[pokemon.source]}</span>
        <h2>
          {pokemon.name} <span className="tenue">#{pokemon.id}</span>
        </h2>

        <div className="tipos">
          {pokemon.types.map((tipo) => (
            <span
              key={tipo}
              className="tipo"
              style={{
                background: COLORES_TIPO[tipo] || "#888",
                color: TIPOS_CLAROS.includes(tipo) ? "#1d1d1d" : "#fff",
              }}
            >
              {tipo}
            </span>
          ))}
        </div>

        <p className="tenue">
          Altura: {pokemon.height / 10} m | Peso: {pokemon.weight / 10} kg
        </p>

        {/* Estadisticas: la barra se calcula sobre 255, el valor maximo posible */}
        <div className="stats">
          {Object.entries(pokemon.stats).map(([nombre, valor]) => (
            <div key={nombre} className="stat">
              <span>{NOMBRES_STATS[nombre] || nombre}</span>
              <div className="barra">
                <div style={{ width: `${(valor / 255) * 100}%` }} />
              </div>
              <strong>{valor}</strong>
            </div>
          ))}
        </div>

        <div className="acciones">
          <button onClick={() => onFavorito(pokemon.id)}>Agregar a favoritos</button>
          <button className="secundario" onClick={() => onEquipo(pokemon.id)}>
            Agregar al equipo
          </button>
        </div>
      </div>
    </article>
  );
}
