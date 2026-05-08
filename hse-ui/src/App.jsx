import { useState, useMemo, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";

// Importación de páginas
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import Risks from "./pages/Risks";
import Inspections from "./pages/Inspections";
import Training from "./pages/Training";
import Reports from "./pages/Reports";
import Environment from "./pages/Environment";
import Residuos from "./pages/Residuos";
import Administrador from "./pages/Administrador";
import ReportarIncidente from "./pages/ReportarIncidente";
import Notificacion from "./components/Notificacion";

import SuperAdmin from "./pages/SuperAdmin";
function getStoredUser() {
  try {
    const ls = localStorage.getItem("hse_user");
    if (ls) return JSON.parse(ls);
    const ss = sessionStorage.getItem("hse_user");
    if (ss) return JSON.parse(ss);
  } catch {
    return null;
  }
  return null;
}

// Mapa de componentes
const PAGES_COMPONENTS = {
  Dashboard: <Dashboard />,
  Incidents: <Incidents />,
  Risks: <Risks />,
  Inspections: <Inspections />,
  Training: <Training />,
  Environment: <Environment />,
  Residuos: <Residuos />,
  Reports: <Reports />,
  Administrador: <Administrador />,
  Superadministrador: <SuperAdmin />,
};

export default function App() {
  const isPublicReport = window.location.pathname === "/reportar";

  const [user, setUser] = useState(() => getStoredUser());
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");

  async function handleLogout() {
    // 1. Obtener el token antes de borrar nada
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token) {
      try {
        // 2. Avisar al servidor para que ponga activo = 0
        await fetch("http://localhost:4000/api/logout", {
          // Ajusta la URL según tu config
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        console.error("Error al cerrar sesión en el servidor:", err);
      }
    }

    // 3. Limpiar el estado local (esto se hace siempre, incluso si falla el fetch)
    localStorage.removeItem("hse_user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("hse_user");
    sessionStorage.removeItem("token");

    setUser(null);
    setPage("Dashboard");
  }
  // --- 2. EL HOOK DE INACTIVIDAD DEBE IR AQUÍ (ANTES DE LOS IF) ---
  useEffect(() => {
    let timeout;

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      // 10 minutos = 10 * 60 * 1000 ms
      timeout = setTimeout(() => {
        console.log("Inactividad detectada, cerrando sesión...");
        handleLogout();
      }, 600000);
    };

    // Escuchar eventos de actividad
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer(); // Iniciar el temporizador al cargar

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      window.removeEventListener("click", resetTimer);
      if (timeout) clearTimeout(timeout);
    };
  }, [user]); // Se reinicia si el usuario cambia

  // --- LÓGICA DE SEGURIDAD ---
  const tieneAcceso = useMemo(() => {
    if (isPublicReport) return false;
    if (!user) return false;

    if (page === "Dashboard") return true;

    // 🔥 SOLO SUPER ADMIN accede a ese módulo
    // if (page === "Superadministrador") {
    //   return user.nivel === "SUPER_ADMIN";
    // }
    const isSuperAdmin =
      user?.nivel_acceso === "SUPER_ADMIN" || user?.idNivelAcceso === 1;

    if (page === "Superadministrador") {
      return isSuperAdmin;
    }

    // 🔥 ADMIN_EMPRESA tiene acceso a todo MENOS SuperAdmin
    if (user.nivel === "ADMIN_EMPRESA") {
      return true;
    }

    // 🔥 USER depende de permisos
    return user.permisos?.some((p) => p.nombre === page);
  }, [user, page, isPublicReport]);

  console.log("USER:", user);
  console.log("NIVEL:", user?.nivel);
  // Página pública de reporte de incidentes — sin autenticación
  if (isPublicReport) {
    return <ReportarIncidente />;
  }

  function handleLogin(userData) {
    setUser(userData);
    setPage("Dashboard");
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Notificacion />

      {/* El Sidebar ya recibe el user internamente del storage o puedes pasárselo por props */}
      <Sidebar page={page} setPage={setPage} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          search={search}
          setSearch={setSearch}
          page={page}
          user={user}
          onLogout={handleLogout}
        />

        <div className="flex-1 min-w-0 overflow-auto">
          {/* RENDERIZADO PROTEGIDO */}
          {tieneAcceso ? (
            PAGES_COMPONENTS[page] || (
              <div className="p-10 text-slate-500 text-xl">
                {page} (en construcción)
              </div>
            )
          ) : (
            // Pantalla de Error 403 (Acceso Denegado)
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <h2 className="text-2xl font-bold text-red-600 mb-2">
                  Acceso Denegado
                </h2>
                <p className="text-slate-600 mb-6">
                  No tienes los permisos necesarios para visualizar el módulo:
                  <span className="font-bold"> {page}</span>.
                </p>
                <button
                  onClick={() => setPage("Dashboard")}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Volver al Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
