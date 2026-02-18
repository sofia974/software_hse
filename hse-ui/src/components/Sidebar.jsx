// Sidebar.jsx
import logo from "../assets/logo.png"

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
    <aside className="w-64 shrink-0 bg-gradient-to-b bg-slate-900 to-[#0a2f4a] text-white flex flex-col h-screen sticky top-0 shadow-xl">
      
      {/* Header con logo */}
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <img
          src={logo}
          alt="MC Consultores"
          className="w-12 h-12 object-contain"
        />
        <div>
          <div className="text-lg font-semibold tracking-wide">
            MC Consultores
          </div>
          <div className="text-xs text-white/70">
            HSE Management
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-auto">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setPage(item)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 ${
              page === item
                ? "bg-white/15 backdrop-blur text-white font-semibold"
                : "hover:bg-white/10 text-white/80 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Footer opcional */}
      <div className="p-4 text-xs text-white/60 border-t border-white/10">
        © {new Date().getFullYear()} MC Consultores
      </div>
    </aside>
  )
}
