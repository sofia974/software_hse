import { useState } from "react"
import Card from "../components/Card"
import IncidentModal from "../components/IncidentModal"

export default function Dashboard() {
  const [openModal, setOpenModal] = useState(false)

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      {/* Botón principal */}
      <div className="col-span-12">
        <button
          className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          onClick={() => setOpenModal(true)}
        >
          + Nuevo Incidente
        </button>
      </div>

      {/* KPIs */}
      <div className="col-span-12 md:col-span-4">
        <Card title="Incidentes del Mes">
          <p className="text-4xl font-bold text-red-600">10</p>
          <p className="text-sm text-slate-500 mt-1">Incluye Cercano a Pérdida</p>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-4">
        <Card title="Días sin Accidentes">
          <p className="text-4xl font-bold text-green-600">45</p>
          <p className="text-sm text-slate-500 mt-1">
            Último incidente: hace 45 días
          </p>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-4">
        <Card title="Riesgos Críticos Abiertos">
          <p className="text-4xl font-bold text-orange-500">8</p>
          <p className="text-sm text-slate-500 mt-1">Prioridad alta</p>
        </Card>
      </div>

      {/* Matriz IPERC (CORREGIDO: con col-span) */}
      <div className="col-span-12 lg:col-span-6">
        <Card title="Matriz de Riesgos (IPERC)">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }).map((_, i) => {
              const prob = 5 - Math.floor(i / 5)
              const sev = (i % 5) + 1
              const score = prob * sev

              const color =
                score >= 16
                  ? "bg-red-500/30 border-red-600/30"
                  : score >= 9
                  ? "bg-yellow-400/30 border-yellow-600/30"
                  : "bg-green-500/30 border-green-600/30"

              return (
                <div
                  key={i}
                  className={`h-10 rounded border ${color} flex items-center justify-center text-xs font-semibold`}
                  title={`Prob ${prob} × Sev ${sev} = ${score}`}
                >
                  {score}
                </div>
              )
            })}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Verde: Bajo · Amarillo: Medio · Rojo: Crítico
          </div>

          <button
            className="mt-4 px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
            onClick={() => console.log("Abrir IPERC completo")}
          >
            Ver riesgos
          </button>
        </Card>
      </div>

      {/* Inspecciones */}
      <div className="col-span-12 lg:col-span-6">
        <Card title="Inspecciones Recientes">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2">Área</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">% Cumpl.</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-b">
                  <td className="py-2">Planta</td>
                  <td className="py-2 text-yellow-600">En proceso</td>
                  <td className="py-2">80%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Almacén</td>
                  <td className="py-2 text-green-700">Completada</td>
                  <td className="py-2">95%</td>
                </tr>
                <tr>
                  <td className="py-2">Taller</td>
                  <td className="py-2 text-red-600">Pendiente</td>
                  <td className="py-2">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button
            className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => console.log("Nueva inspección")}
          >
            Nueva inspección
          </button>
        </Card>
      </div>

      {/* Incidentes recientes */}
      <div className="col-span-12">
        <Card title="Incidentes (últimos 7 días)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: "INC-1021", tipo: "Cercano a Pérdida", area: "Planta", sev: "Media" },
              { id: "INC-1022", tipo: "Incidente", area: "Almacén", sev: "Baja" },
              { id: "INC-1023", tipo: "Accidente", area: "Taller", sev: "Alta" },
            ].map((x) => (
              <div key={x.id} className="border rounded-lg p-3 bg-slate-50">
                <div className="flex justify-between">
                  <span className="font-semibold">{x.id}</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-200">
                    {x.sev}
                  </span>
                </div>
                <div className="text-sm text-slate-700 mt-1">{x.tipo}</div>
                <div className="text-xs text-slate-500">Área: {x.area}</div>
                <button
                  className="mt-3 text-sm underline"
                  onClick={() => console.log("Abrir incidente", x.id)}
                >
                  Ver detalle
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal */}
      <IncidentModal open={openModal} onClose={() => setOpenModal(false)} />
    </main>
  )
}
