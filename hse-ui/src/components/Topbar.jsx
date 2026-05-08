import { useState } from "react";
const LABELS = {
  Dashboard: "Panel Principal",
  Incidents: "Incidentes",
  Risks: "Riesgos IPERC",
  Inspections: "Inspecciones",
  Training: "Capacitaciones",
  Environment: "Medio Ambiente",
  Residuos: "Gestión de Residuos",
  Reports: "Reportes PDF",
  Administrador: "Configuración",
};
export default function Topbar({ search, setSearch, page, user, onLogout }) {
  const enabled = ["Incidentes", "Capacitaciones"].includes(page);
  const [menuOpen, setMenuOpen] = useState(false);

  // --- CAMBIOS AQUÍ ---
  // 1. Priorizamos el email como nombre según tu pedido
  const nombre = user?.email || user?.username || "Usuario";

  // 2. Lógica para mostrar SUPERADMIN o el Rol normal
  // Si el nivel es SUPER_ADMIN, mostramos eso. Si no, mostramos su rol (Administrador, etc.)
  const rolMostrado =
    user?.nivel === "SUPER_ADMIN" ? "SUPERADMIN" : user?.rol || "HSE";

  const initials = nombre
    .split("@")[0] // Si es email, sacamos las iniciales de la parte antes del @
    .split(/[._-]/) // Por si el email tiene puntos o guiones
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center">
      <input
        type="text"
        placeholder={
          enabled ? `Buscar en ${page.toLowerCase()}...` : "Buscar..."
        }
        className="border border-slate-300 rounded-lg px-3 py-2 w-1/3 text-sm disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
        value={search}
        disabled={!enabled}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Usuario */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800 leading-tight">
              {nombre} {/* Aquí saldrá el email */}
            </div>
            <div className="text-xs text-slate-500 font-bold text-blue-600">
              {rolMostrado} {/* Aquí saldrá SUPERADMIN o el rol */}
            </div>
          </div>
          <div className="w-9 h-9 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {nombre}
                </p>
                <p className="text-xs text-slate-500">{rolMostrado}</p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
