import { useState } from "react"
import Sidebar from "./components/Sidebar"
import Topbar from "./components/Topbar"

import Dashboard from "./pages/Dashboard"
import Incidents from "./pages/Incidents"
import Risks from "./pages/Risks"
import Inspections from "./pages/Inspections"
import Training from "./pages/Training"
import Reports from "./pages/Reports"
import Environment from "./pages/Environment"

export default function App() {
  const [page, setPage] = useState("Dashboard")
  const [search, setSearch] = useState("")

  // App.jsx
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar page={page} setPage={setPage} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar search={search} setSearch={setSearch} page={page} />

        <div className="flex-1 min-w-0 overflow-auto">
          {page === "Dashboard" && <Dashboard />}
          {page === "Incidentes" && <Incidents search={search} />}
          {page === "Riesgos" && <Risks />}
          {page === "Inspecciones" && <Inspections />}
          {page === "Capacitaciones" && <Training search={search} />}
          {page === "Medio Ambiente" && <Environment />}
          {page === "Reportes" && <Reports />}

          {![
            "Dashboard","Incidentes","Riesgos","Inspecciones",
            "Capacitaciones","Medio Ambiente","Reportes",
          ].includes(page) && (
            <div className="p-10 text-slate-500 text-xl">
              {page} (en construcción)
            </div>
          )}
        </div>
      </div>
    </div>
  )

}

