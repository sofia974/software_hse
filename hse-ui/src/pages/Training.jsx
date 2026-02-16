import { useMemo, useState } from "react"
import Card from "../components/Card"

function StatusPill({ status }) {
  const base = "text-xs px-2 py-1 rounded"
  if (status === "Vencido") return <span className={`${base} bg-red-100 text-red-700`}>Vencido</span>
  if (status === "Próximo") return <span className={`${base} bg-yellow-100 text-yellow-800`}>Próximo</span>
  return <span className={`${base} bg-green-100 text-green-700`}>Vigente</span>
}

export default function Training({ search }) {
  const [q, setQ] = useState("")

  const rows = useMemo(
    () => [
      { persona: "Juan Pérez", curso: "Uso de Extintores", fecha: "2025-10-10", vence: "2026-02-01", status: "Vencido" },
      { persona: "María Gómez", curso: "Trabajo en Altura", fecha: "2025-12-15", vence: "2026-02-20", status: "Próximo" },
      { persona: "Luis Rojas", curso: "Primeros Auxilios", fecha: "2025-11-05", vence: "2026-06-05", status: "Vigente" },
      { persona: "Ana Torres", curso: "LOTO", fecha: "2026-01-10", vence: "2026-07-10", status: "Vigente" },
    ],
    []
  )

  
    const filtered = useMemo(() => {
    const t = (search || "").trim().toLowerCase()
    if (!t) return rows

    return rows.filter((x) =>
        [x.persona, x.curso, x.fecha, x.vence, x.status].some((v) =>
        String(v).toLowerCase().includes(t)
        )
    )
    }, [rows, search])

  const stats = useMemo(() => {
    const total = rows.length
    const vencidos = rows.filter((r) => r.status === "Vencido").length
    const proximos = rows.filter((r) => r.status === "Próximo").length
    const vigentes = rows.filter((r) => r.status === "Vigente").length
    return { total, vencidos, proximos, vigentes }
  }, [rows])

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Capacitaciones</h1>
          <p className="text-sm text-slate-500">Control de vigencia y vencimientos</p>
        </div>

        <button
          className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
          onClick={() => console.log("Registrar capacitación")}
        >
          + Registrar
        </button>
      </div>

      {/* KPIs */}
      <div className="col-span-12 md:col-span-3">
        <Card title="Total">
          <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
        </Card>
      </div>
      <div className="col-span-12 md:col-span-3">
        <Card title="Vencidos">
          <p className="text-3xl font-bold text-red-600">{stats.vencidos}</p>
        </Card>
      </div>
      <div className="col-span-12 md:col-span-3">
        <Card title="Próximos">
          <p className="text-3xl font-bold text-yellow-700">{stats.proximos}</p>
        </Card>
      </div>
      <div className="col-span-12 md:col-span-3">
        <Card title="Vigentes">
          <p className="text-3xl font-bold text-green-700">{stats.vigentes}</p>
        </Card>
      </div>

      {/* Tabla */}
      <div className="col-span-12">
        <Card title="Listado">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <input
              className="border rounded px-3 py-2 w-full md:w-1/3"
              placeholder="Buscar por persona, curso, estado..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> de{" "}
              <span className="font-semibold text-slate-700">{rows.length}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">Persona</th>
                  <th className="py-2 pr-3">Curso</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Vence</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-700">
                {filtered.map((x, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{x.persona}</td>
                    <td className="py-2 pr-3">{x.curso}</td>
                    <td className="py-2 pr-3">{x.fecha}</td>
                    <td className="py-2 pr-3">{x.vence}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={x.status} />
                    </td>
                    <td className="py-2">
                      <button
                        className="text-sm underline"
                        onClick={() => console.log("Ver detalle capacitación", x.persona, x.curso)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={6}>
                      No hay resultados para “{q}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  )
}
