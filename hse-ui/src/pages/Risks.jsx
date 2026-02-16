import { useMemo, useState } from "react"
import Card from "../components/Card"

export default function Risks() {
  const [selected, setSelected] = useState({ prob: 3, sev: 3 })

  const risks = useMemo(
    () => [
      { id: "RSK-3001", peligro: "Trabajo en altura", area: "Planta", prob: 4, sev: 5, control: "Arnés + línea de vida", estado: "Abierto" },
      { id: "RSK-3002", peligro: "Tránsito interno", area: "Patio", prob: 3, sev: 4, control: "Rutas + señalización", estado: "En seguimiento" },
      { id: "RSK-3003", peligro: "Atrapamiento", area: "Taller", prob: 2, sev: 5, control: "Guardas + LOTO", estado: "Abierto" },
      { id: "RSK-3004", peligro: "Ruido", area: "Almacén", prob: 3, sev: 2, control: "EPP auditivo", estado: "Cerrado" },
    ],
    []
  )

  const score = (p, s) => p * s

  const cellClass = (p, s) => {
    const v = score(p, s)
    const base = "h-10 rounded border cursor-pointer flex items-center justify-center text-xs font-semibold"
    if (v >= 16) return `${base} bg-red-100 border-red-200 text-red-700 hover:bg-red-200`
    if (v >= 9) return `${base} bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200`
    return `${base} bg-green-100 border-green-200 text-green-700 hover:bg-green-200`
  }

  const selectedScore = score(selected.prob, selected.sev)

  const scoreBadge = (v) => {
    const base = "text-xs px-2 py-1 rounded"
    if (v >= 16) return <span className={`${base} bg-red-100 text-red-700`}>Crítico ({v})</span>
    if (v >= 9) return <span className={`${base} bg-yellow-100 text-yellow-800`}>Medio ({v})</span>
    return <span className={`${base} bg-green-100 text-green-700`}>Bajo ({v})</span>
  }

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <h1 className="text-2xl font-semibold text-slate-800">Riesgos (IPERC)</h1>
        <p className="text-sm text-slate-500">Matriz y controles</p>
      </div>

      {/* Matriz */}
      <div className="col-span-12 lg:col-span-7">
        <Card title="Matriz 5×5 (Probabilidad × Severidad)">
          <div className="grid grid-cols-6 gap-2 items-center">
            <div></div>
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="text-xs text-slate-500 text-center">
                Sev {s}
              </div>
            ))}

            {[5, 4, 3, 2, 1].map((p) => (
              <div key={`row-${p}`} className="contents">
                <div className="text-xs text-slate-500 pr-2">Prob {p}</div>
                {[1, 2, 3, 4, 5].map((s) => {
                  const isSelected = selected.prob === p && selected.sev === s
                  return (
                    <div
                      key={`${p}-${s}`}
                      className={`${cellClass(p, s)} ${isSelected ? "ring-2 ring-slate-900" : ""}`}
                      onClick={() => setSelected({ prob: p, sev: s })}
                      title={`Prob ${p} x Sev ${s} = ${score(p, s)}`}
                    >
                      {score(p, s)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="text-sm text-slate-700">
              Selección: <span className="font-semibold">Prob {selected.prob}</span> ×{" "}
              <span className="font-semibold">Sev {selected.sev}</span>
            </div>
            {scoreBadge(selectedScore)}
          </div>
        </Card>
      </div>

      {/* Controles */}
      <div className="col-span-12 lg:col-span-5">
        <Card title="Controles sugeridos (demo)">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>EPP obligatorio</span>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span>Señalización adecuada</span>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span>Permiso de trabajo</span>
              <input type="checkbox" />
            </div>
            <div className="flex items-center justify-between">
              <span>Capacitación específica</span>
              <input type="checkbox" />
            </div>
          </div>

          <button
            className="mt-5 px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
            onClick={() => console.log("Guardar matriz/controles", selected)}
          >
            Guardar
          </button>
        </Card>
      </div>

      {/* Lista de riesgos */}
      <div className="col-span-12">
        <Card title="Riesgos registrados">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Peligro</th>
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Prob</th>
                  <th className="py-2 pr-3">Sev</th>
                  <th className="py-2 pr-3">Nivel</th>
                  <th className="py-2 pr-3">Control</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {risks.map((r) => {
                  const v = score(r.prob, r.sev)
                  return (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-semibold">{r.id}</td>
                      <td className="py-2 pr-3">{r.peligro}</td>
                      <td className="py-2 pr-3">{r.area}</td>
                      <td className="py-2 pr-3">{r.prob}</td>
                      <td className="py-2 pr-3">{r.sev}</td>
                      <td className="py-2 pr-3">{scoreBadge(v)}</td>
                      <td className="py-2 pr-3">{r.control}</td>
                      <td className="py-2">{r.estado}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  )
}
