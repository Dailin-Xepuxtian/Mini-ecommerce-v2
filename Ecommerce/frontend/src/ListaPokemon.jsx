// Lista para mostrar favoritos o equipo
export default function ListaPokemon({ titulo, lista, onQuitar, textoVacio }) {
  return (
    <section className="panel">
      <h3>{titulo}</h3>

      {lista.length === 0 && <p className="tenue">{textoVacio}</p>}

      <ul>
        {lista.map((p) => (
          <li key={p.id}>
            <img src={p.image} alt={p.name} />
            <span className="nombre">{p.name}</span>
            <span className="tenue">#{p.id}</span>
            <button className="quitar" onClick={() => onQuitar(p.id)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
