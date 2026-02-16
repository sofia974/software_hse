import { useMemo, useState } from "react"
import Card from "../components/Card"

export default function Reports() {
  const [range, setRange] = useState("Últimos 30 días")
  const [area, setArea] = useState("Todas")
  const [type, setType] = useState("Todos")

  const kpis = useMemo(() => {
    // Demo: valores fijos; mañana los conectas a API según filtros
    return {
      incidentes: 10,
      nearMiss: 6,
      inspecciones: 18,
      riesgosCriticos: 8,
      capacitacionesVencidas: 1,
    }
  }, [range, area, type])

  const exportReport = (fmt) => {
    console.log("Export:", fmt, { range, area, type })
    alert(`(Demo) Exportando reporte en ${fmt}...\n\nFiltros:\n- Periodo: ${range}\n- Área: ${area}\n- Tipo: ${type}`)
  }

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Reportes</h1>
          <p className="text-sm text-slate-500">KPIs, tendencias y exportación</p>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
            onClick={() => exportReport("PDF")}
          >
            Exportar PDF
          </button>
          <button
            className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600"
            onClick={() => exportReport("Excel")}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="col-span-12">
        <Card title="Filtros">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Periodo</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option>Hoy</option>
                <option>Últimos 7 días</option>
                <option>Últimos 30 días</option>
                <option>Este mes</option>
                <option>Este año</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Área</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option>Todas</option>
                <option>Planta</option>
                <option>Almacén</option>
                <option>Taller</option>
                <option>Patio</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Tipo</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>Todos</option>
                <option>Incidentes</option>
                <option>Riesgos</option>
                <option>Inspecciones</option>
                <option>Capacitaciones</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            (Demo) Los filtros ya actualizan el contexto del export. Mañana los conectamos a API.
          </div>
        </Card>
      </div>

      {/* KPIs */}
      <div className="col-span-12 md:col-span-4">
        <Card title="Incidentes">
          <p className="text-4xl font-bold text-red-600">{kpis.incidentes}</p>
          <p className="text-sm text-slate-500 mt-1">Total en el periodo</p>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-4">
        <Card title="Cercano a Pérdida">
          <p className="text-4xl font-bold text-orange-500">{kpis.nearMiss}</p>
          <p className="text-sm text-slate-500 mt-1">Reportes preventivos</p>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-4">
        <Card title="Inspecciones">
          <p className="text-4xl font-bold text-blue-600">{kpis.inspecciones}</p>
          <p className="text-sm text-slate-500 mt-1">Realizadas</p>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-6">
        <Card title="Riesgos críticos abiertos">
          <p className="text-4xl font-bold text-red-600">{kpis.riesgosCriticos}</p>
          <p className="text-sm text-slate-500 mt-1">Requiere plan de acción</p>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-6">
        <Card title="Capacitaciones vencidas">
          <p className="text-4xl font-bold text-yellow-700">{kpis.capacitacionesVencidas}</p>
          <p className="text-sm text-slate-500 mt-1">Reprogramar</p>
        </Card>
      </div>

      {/* Tabla resumen (demo) */}
      <div className="col-span-12">
        <Card title="Resumen (demo)">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">Módulo</th>
                  <th className="py-2 pr-3">Indicador</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-700">
                {[
                  { mod: "Incidentes", ind: "Total", val: kpis.incidentes },
                  { mod: "Incidentes", ind: "Cercano a Pérdida", val: kpis.nearMiss },
                  { mod: "Inspecciones", ind: "Total", val: kpis.inspecciones },
                  { mod: "Riesgos", ind: "Críticos abiertos", val: kpis.riesgosCriticos },
                  { mod: "Capacitaciones", ind: "Vencidas", val: kpis.capacitacionesVencidas },
                ].map((r, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{r.mod}</td>
                    <td className="py-2 pr-3">{r.ind}</td>
                    <td className="py-2 pr-3">{r.val}</td>
                    <td className="py-2">
                      <button
                        className="text-sm underline"
                        onClick={() => console.log("Ver detalle reporte", r)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  )
}

