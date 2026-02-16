import { useMemo, useState } from "react"
import Card from "../components/Card"
import IncidentModal from "../components/IncidentModal"

export default function Incidents({ search }) {
  const [openModal, setOpenModal] = useState(false)
  const [q, setQ] = useState("")

  const incidents = useMemo(
    () => [
      { id: "INC-1023", fecha: "2026-02-06", tipo: "Accidente", area: "Taller", sev: "Alta", estado: "Abierto" },
      { id: "INC-1022", fecha: "2026-02-05", tipo: "Incidente", area: "Almacén", sev: "Baja", estado: "En investigación" },
      { id: "INC-1021", fecha: "2026-02-04", tipo: "Cercano a Pérdida", area: "Planta", sev: "Media", estado: "Cerrado" },
      { id: "INC-1020", fecha: "2026-02-03", tipo: "Cercano a Pérdida", area: "Patio", sev: "Baja", estado: "Abierto" },
    ],
    []
  )

    const filtered = useMemo(() => {
    const t = (search || "").trim().toLowerCase()
    if (!t) return incidents

    return incidents.filter((x) =>
        [x.id, x.fecha, x.tipo, x.area, x.sev, x.estado].some((v) =>
        String(v).toLowerCase().includes(t)
        )
    )
    }, [incidents, search])


  const badge = (sev) => {
    const base = "text-xs px-2 py-1 rounded"
    if (sev === "Alta") return <span className={`${base} bg-red-100 text-red-700`}>Alta</span>
    if (sev === "Media") return <span className={`${base} bg-yellow-100 text-yellow-800`}>Media</span>
    return <span className={`${base} bg-green-100 text-green-700`}>Baja</span>
  }

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Incidentes</h1>
          <p className="text-sm text-slate-500">Registro, seguimiento y cierre</p>
        </div>

        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          onClick={() => setOpenModal(true)}
        >
          + Nuevo Incidente
        </button>
      </div>

      <div className="col-span-12">
        <Card title="Búsqueda y listado">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <input
              className="border rounded px-3 py-2 w-full md:w-1/3"
              placeholder="Buscar por ID, área, tipo, severidad, estado..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> de{" "}
              <span className="font-semibold text-slate-700">{incidents.length}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Severidad</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-700">
                {filtered.map((x) => (
                  <tr key={x.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{x.id}</td>
                    <td className="py-2 pr-3">{x.fecha}</td>
                    <td className="py-2 pr-3">{x.tipo}</td>
                    <td className="py-2 pr-3">{x.area}</td>
                    <td className="py-2 pr-3">{badge(x.sev)}</td>
                    <td className="py-2 pr-3">{x.estado}</td>
                    <td className="py-2">
                      <button
                        className="text-sm underline"
                        onClick={() => console.log("Abrir detalle", x.id)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={7}>
                      No hay resultados para “{q}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <IncidentModal open={openModal} onClose={() => setOpenModal(false)} />
    </main>
  )
}
