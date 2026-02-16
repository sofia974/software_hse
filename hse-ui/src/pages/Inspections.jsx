import { useMemo, useState } from "react"
import Card from "../components/Card"

function StatusBadge({ status }) {
  const base = "text-xs px-2 py-1 rounded"
  if (status === "Completada") return <span className={`${base} bg-green-100 text-green-700`}>Completada</span>
  if (status === "En proceso") return <span className={`${base} bg-yellow-100 text-yellow-800`}>En proceso</span>
  return <span className={`${base} bg-red-100 text-red-700`}>Pendiente</span>
}

export default function Inspections() {
  const [selectedId, setSelectedId] = useState(null)

  const inspections = useMemo(
    () => [
      {
        id: "INSP-2101",
        fecha: "2026-02-06",
        area: "Planta",
        checklist: "Inspección de Equipos",
        status: "En proceso",
        cumplimiento: 80,
        items: [
          { q: "EPP completo", ok: true },
          { q: "Orden y limpieza", ok: true },
          { q: "Extintores operativos", ok: false },
          { q: "Señalización visible", ok: true },
        ],
      },
      {
        id: "INSP-2100",
        fecha: "2026-02-05",
        area: "Almacén",
        checklist: "Seguridad en Almacenaje",
        status: "Completada",
        cumplimiento: 95,
        items: [
          { q: "Pasillos libres", ok: true },
          { q: "Apilado correcto", ok: true },
          { q: "Etiquetado", ok: true },
          { q: "Iluminación", ok: true },
        ],
      },
      {
        id: "INSP-2099",
        fecha: "2026-02-04",
        area: "Taller",
        checklist: "Trabajo en Caliente",
        status: "Pendiente",
        cumplimiento: null,
        items: [
          { q: "Permiso de trabajo", ok: false },
          { q: "Extintor disponible", ok: false },
          { q: "Área aislada", ok: false },
          { q: "EPP específico", ok: false },
        ],
      },
    ],
    []
  )

  const selected = inspections.find((i) => i.id === selectedId) || null

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inspecciones</h1>
          <p className="text-sm text-slate-500">Checklists, hallazgos y seguimiento</p>
        </div>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          onClick={() => console.log("Nueva inspección")}
        >
          + Nueva inspección
        </button>
      </div>

      {/* Lista */}
      <div className="col-span-12 lg:col-span-7">
        <Card title="Listado de inspecciones">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Checklist</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">% Cumpl.</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-700">
                {inspections.map((x) => (
                  <tr key={x.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{x.id}</td>
                    <td className="py-2 pr-3">{x.fecha}</td>
                    <td className="py-2 pr-3">{x.area}</td>
                    <td className="py-2 pr-3">{x.checklist}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={x.status} />
                    </td>
                    <td className="py-2 pr-3">
                      {x.cumplimiento === null ? "—" : `${x.cumplimiento}%`}
                    </td>
                    <td className="py-2">
                      <button
                        className="text-sm underline"
                        onClick={() => setSelectedId(x.id)}
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

      {/* Detalle */}
      <div className="col-span-12 lg:col-span-5">
        <Card title="Detalle de inspección">
          {!selected ? (
            <div className="text-sm text-slate-500">
              Selecciona una inspección para ver el detalle.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">{selected.id}</div>
                  <div className="font-semibold text-slate-800">{selected.checklist}</div>
                  <div className="text-sm text-slate-600">
                    {selected.area} • {selected.fecha}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="text-sm">
                <div className="text-slate-500 mb-1">% Cumplimiento</div>
                <div className="font-semibold text-slate-800">
                  {selected.cumplimiento === null ? "—" : `${selected.cumplimiento}%`}
                </div>
              </div>

              <div className="text-sm">
                <div className="text-slate-500 mb-2">Checklist</div>
                <div className="space-y-2">
                  {selected.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border rounded px-3 py-2 bg-slate-50"
                    >
                      <span className="text-slate-700">{it.q}</span>
                      <span className={`text-xs px-2 py-1 rounded ${it.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {it.ok ? "OK" : "NO"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded border hover:bg-slate-50"
                  onClick={() => console.log("Editar", selected.id)}
                >
                  Editar
                </button>
                <button
                  className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
                  onClick={() => console.log("Cerrar inspección", selected.id)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
