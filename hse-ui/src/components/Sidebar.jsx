export default function Sidebar({ page, setPage }) {
  const items = [
    "Dashboard",
    "Incidentes",
    "Riesgos",
    "Inspecciones",
    "Capacitaciones",
    "Medio Ambiente",
    "Reportes",
  ]

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-4 text-xl font-bold">🦺 HSE</div>

      <nav className="flex-1 px-2 space-y-1">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setPage(item)}
            className={`w-full text-left px-4 py-2 rounded
              ${page === item ? "bg-slate-700" : "hover:bg-slate-800"}
            `}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  )
}
