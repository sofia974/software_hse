// import { useState } from "react";
import logo from "../assets/logo.png";
import React, { useState, useEffect } from "react";

function IconDashboard() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
      />
    </svg>
  );
}
function IconIncidents() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  );
}
function IconRisks() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
function IconInspections() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}
function IconTraining() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
      />
    </svg>
  );
}
function IconEnvironment() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function IconResiduos() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
function IconReports() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function IconSuperAdmin() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7z"
      />
    </svg>
  );
}
const LABELS = {
  Dashboard: "Panel Principal",
  Incidents: "Incidentes",
  Risks: "Riesgos",
  Inspections: "Inspecciones",
  Training: "Capacitaciones",
  Environment: "Medio Ambiente",
  Residuos: "Gestión de Residuos",
  Reports: "Reportes",
  Administrador: "Administrador",
  Superadministrador: "Super Admin",
};
const ICONS = {
  Dashboard: <IconDashboard />,
  Incidents: <IconIncidents />,
  Risks: <IconRisks />,
  Inspections: <IconInspections />,
  Training: <IconTraining />,
  Environment: <IconEnvironment />,
  Residuos: <IconResiduos />,
  Reports: <IconReports />,
  Administrador: <IconAdmin />,
  Superadministrador: <IconSuperAdmin />,
};
export default function Sidebar({ page, setPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const storedUser = JSON.parse(
    localStorage.getItem("hse_user") ||
      sessionStorage.getItem("hse_user") ||
      "{}",
  );
  const isSuperAdmin =
    user?.nivel_acceso === "SUPER_ADMIN" || user?.idNivelAcceso === 1;

  const permisos = user?.permisos || [];
  // let items = [
  //   "Dashboard",
  //   ...permisos.map((p) => p.nombre).filter((n) => n !== "Dashboard"),
  // ];
  let items = permisos.map((p) => p.nombre);

  // SOLO SUPER ADMIN ve este módulo
  if (isSuperAdmin) {
    items.push("Superadministrador");
  }
  // elimina duplicados
  items = [...new Set(items)];
  const initials = (storedUser.username || "U")
    .split("@")[0]
    .split(/[\s._-]/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } shrink-0 bg-gradient-to-b from-slate-900 to-[#0a2f4a] text-white flex flex-col h-screen sticky top-0 shadow-xl transition-all duration-300 overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`flex border-b border-white/10 transition-all duration-300 ${
          collapsed
            ? "flex-col items-center py-4 gap-4"
            : "flex-row-reverse items-center justify-between px-4 py-6"
        }`}
      >
        {/* Botón Toggle - Se oculta en móviles (isMobile) para que no puedan expandirlo */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            className={`shrink-0 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 transition-all duration-300 ${
              collapsed ? "w-10 h-10" : "w-8 h-8"
            }`}
          >
            <svg
              className={`w-5 h-5 text-white/70 transition-transform duration-500 ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        {/* Logo Section */}
        <div
          className={`flex items-center gap-3 transition-all duration-300 ${collapsed ? "justify-center" : ""}`}
        >
          <img
            src={logo}
            alt="Logo"
            className={`${collapsed ? "w-10 h-10" : "w-9 h-9"} object-contain shrink-0`}
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-wide leading-tight truncate">
                MC Consultores
              </div>
              <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold">
                HSE Management
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Info del usuario */}
      <div
        className={`border-b border-white/10 transition-all duration-300 shrink-0 ${
          collapsed ? "py-4 flex justify-center" : "px-5 py-4 bg-white/5"
        }`}
      >
        {collapsed ? (
          <div
            title={`Usuario: ${storedUser.username}`}
            className="w-10 h-10 rounded-full bg-blue-600/60 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10 shadow-inner"
          >
            {initials}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">
              Sesión de:
            </div>
            <div className="text-sm font-medium text-blue-300 truncate">
              {storedUser.username}
            </div>
          </div>
        )}
      </div>
      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto hide-scrollbar">
        {items.map((item) => {
          const active = page === item;
          const label = LABELS[item] || item;
          return (
            <button
              key={item}
              onClick={() => setPage(item)}
              title={collapsed ? label : ""}
              className={`w-full transition-all duration-200 flex items-center rounded-xl
                ${collapsed ? "justify-center h-12 w-12 mx-auto" : "px-4 py-2.5 gap-3"}
                ${
                  active
                    ? "bg-blue-600/30 border border-blue-500/50 text-white shadow-lg shadow-blue-900/40"
                    : "hover:bg-white/10 text-white/70 border border-transparent"
                }`}
            >
              <span
                className={`${active ? "text-blue-300" : "text-white/60"} shrink-0`}
              >
                {ICONS[item] || <IconDashboard />}
              </span>

              {!collapsed && (
                <span className="truncate text-sm font-medium">{label}</span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Footer */}
      <div
        className={`border-t border-white/10 shrink-0 ${collapsed ? "p-3" : "p-4"}`}
      >
        <button
          onClick={onLogout}
          title={collapsed ? "Cerrar Sesión" : ""}
          className={`w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center gap-2 ${
            collapsed ? "h-12 w-12 mx-auto" : "py-2.5 text-xs font-semibold"
          }`}
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
