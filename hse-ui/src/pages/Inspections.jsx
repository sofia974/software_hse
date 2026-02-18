import { useMemo, useState } from "react"
import Card from "../components/Card"

// -------------------- UI Helpers --------------------
function StatusBadge({ status }) {
  const base = "text-xs px-2 py-1 rounded border"
  if (status === "Completada") return <span className={`${base} bg-green-50 text-green-700 border-green-200`}>Completada</span>
  if (status === "En proceso") return <span className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}>En proceso</span>
  return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Pendiente</span>
}

function ResultBadge({ ok }) {
  const base = "text-xs px-2 py-1 rounded border"
  if (ok === true) return <span className={`${base} bg-green-50 text-green-700 border-green-200`}>OK</span>
  if (ok === false) return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>NO</span>
  return <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>—</span>
}

function SeverityBadge({ sev }) {
  const base = "text-xs px-2 py-1 rounded border"
  if (sev === "Alta") return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Alta</span>
  if (sev === "Media") return <span className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}>Media</span>
  return <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>Baja</span>
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">{title}</div>
          <button className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// -------------------- Utils --------------------
const uid = () => Math.random().toString(16).slice(2, 10).toUpperCase()

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fmtDate(iso) {
  if (!iso) return "—"
  const [y, m, d] = String(iso).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function clamp01(v) {
  if (v === null || v === undefined) return null
  if (v === true) return true
  if (v === false) return false
  return null
}

function calcCompliance(items) {
  const answered = items.filter((x) => x.ok === true || x.ok === false)
  if (answered.length === 0) return null
  const ok = answered.filter((x) => x.ok === true).length
  return Math.round((ok / answered.length) * 100)
}

function statusFromItems(items) {
  const answered = items.filter((x) => x.ok === true || x.ok === false).length
  if (answered === 0) return "Pendiente"
  if (answered < items.length) return "En proceso"
  return "Completada"
}

// -------------------- Seed Templates --------------------
const AREAS = ["Planta", "Almacén", "Taller", "Patio", "Oficinas"]
const CHECKLISTS = [
  {
    name: "Inspección de Equipos",
    items: ["EPP completo", "Orden y limpieza", "Extintores operativos", "Señalización visible"],
  },
  {
    name: "Seguridad en Almacenaje",
    items: ["Pasillos libres", "Apilado correcto", "Etiquetado", "Iluminación"],
  },
  {
    name: "Trabajo en Caliente",
    items: ["Permiso de trabajo", "Extintor disponible", "Área aislada", "EPP específico"],
  },
]

function seedInspections() {
  return [
    {
      id: "INSP-2101",
      fecha: "2026-02-06",
      area: "Planta",
      checklist: "Inspección de Equipos",
      status: "En proceso",
      responsable: "Supervisor HSE",
      evidencia: ["foto_01.jpg"],
      items: [
        { id: "IT-" + uid(), q: "EPP completo", ok: true, comentario: "" },
        { id: "IT-" + uid(), q: "Orden y limpieza", ok: true, comentario: "" },
        { id: "IT-" + uid(), q: "Extintores operativos", ok: false, comentario: "Extintor sin precinto" },
        { id: "IT-" + uid(), q: "Señalización visible", ok: true, comentario: "" },
      ],
      findings: [
        {
          id: "FND-" + uid(),
          titulo: "Extintor sin precinto",
          severidad: "Media",
          categoria: "Equipos de emergencia",
          accionRecomendada: "Reemplazar precinto y registrar inspección del extintor",
          estado: "Abierto",
        },
      ],
    },
    {
      id: "INSP-2100",
      fecha: "2026-02-05",
      area: "Almacén",
      checklist: "Seguridad en Almacenaje",
      status: "Completada",
      responsable: "Jefe de Almacén",
      evidencia: [],
      items: [
        { id: "IT-" + uid(), q: "Pasillos libres", ok: true, comentario: "" },
        { id: "IT-" + uid(), q: "Apilado correcto", ok: true, comentario: "" },
        { id: "IT-" + uid(), q: "Etiquetado", ok: true, comentario: "" },
        { id: "IT-" + uid(), q: "Iluminación", ok: true, comentario: "" },
      ],
      findings: [],
    },
    {
      id: "INSP-2099",
      fecha: "2026-02-04",
      area: "Taller",
      checklist: "Trabajo en Caliente",
      status: "Pendiente",
      responsable: "Supervisor de Taller",
      evidencia: [],
      items: [
        { id: "IT-" + uid(), q: "Permiso de trabajo", ok: null, comentario: "" },
        { id: "IT-" + uid(), q: "Extintor disponible", ok: null, comentario: "" },
        { id: "IT-" + uid(), q: "Área aislada", ok: null, comentario: "" },
        { id: "IT-" + uid(), q: "EPP específico", ok: null, comentario: "" },
      ],
      findings: [],
    },
  ].map((insp) => ({
    ...insp,
    cumplimiento: calcCompliance(insp.items),
  }))
}

function seedActionsFrom(inspections) {
  // Acciones CAPA nacen desde hallazgos (si quieres)
  const actions = []
  for (const i of inspections) {
    for (const f of i.findings || []) {
      actions.push({
        id: "ACT-" + uid(),
        origen: i.id,
        inspection_id: i.id,
        finding_id: f.id,
        titulo: f.accionRecomendada || f.titulo,
        responsable: i.responsable || "Sin asignar",
        fecha_compromiso: "",
        estado: "Pendiente",
        evidencia: "",
      })
    }
  }
  return actions
}

// -------------------- Main --------------------
export default function Inspections() {
  const [inspections, setInspections] = useState(() => seedInspections())
  const [actions, setActions] = useState(() => seedActionsFrom(seedInspections()))
  const [selectedId, setSelectedId] = useState(inspections[0]?.id ?? null)

  // Filters
  const [q, setQ] = useState("")
  const [area, setArea] = useState("Todas")
  const [status, setStatus] = useState("Todos")
  const [checklist, setChecklist] = useState("Todos")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newInspection, setNewInspection] = useState({
    fecha: todayISO(),
    area: "Planta",
    checklist: CHECKLISTS[0].name,
    responsable: "",
  })

  const selected = inspections.find((i) => i.id === selectedId) || null

  const kpis = useMemo(() => {
    const total = inspections.length
    const pendientes = inspections.filter((i) => i.status === "Pendiente").length
    const proceso = inspections.filter((i) => i.status === "En proceso").length
    const completas = inspections.filter((i) => i.status === "Completada").length
    const complValues = inspections.map((i) => i.cumplimiento).filter((x) => typeof x === "number")
    const promedio = complValues.length ? Math.round(complValues.reduce((a, b) => a + b, 0) / complValues.length) : null
    const hallazgosAbiertos = inspections.reduce((acc, i) => acc + (i.findings || []).filter((f) => f.estado !== "Cerrado").length, 0)
    const accionesPendientes = actions.filter((a) => a.estado !== "Cerrada").length
    return { total, pendientes, proceso, completas, promedio, hallazgosAbiertos, accionesPendientes }
  }, [inspections, actions])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const inRange = (d) => {
      if (!d) return false
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    }

    return inspections
      .filter((x) => {
        if (area !== "Todas" && x.area !== area) return false
        if (status !== "Todos" && x.status !== status) return false
        if (checklist !== "Todos" && x.checklist !== checklist) return false
        if (dateFrom || dateTo) {
          if (!inRange(x.fecha)) return false
        }
        if (s) {
          const blob = `${x.id} ${x.area} ${x.checklist} ${x.responsable || ""}`.toLowerCase()
          if (!blob.includes(s)) return false
        }
        return true
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  }, [inspections, q, area, status, checklist, dateFrom, dateTo])

  const openCreate = () => {
    setNewInspection({ fecha: todayISO(), area: "Planta", checklist: CHECKLISTS[0].name, responsable: "" })
    setCreateOpen(true)
  }

  const createInspection = () => {
    const id = `INSP-${Math.floor(1000 + Math.random() * 9000)}`
    const template = CHECKLISTS.find((c) => c.name === newInspection.checklist) || CHECKLISTS[0]

    const items = template.items.map((q) => ({ id: "IT-" + uid(), q, ok: null, comentario: "" }))
    const status = statusFromItems(items)
    const cumplimiento = calcCompliance(items)

    const row = {
      id,
      fecha: newInspection.fecha || todayISO(),
      area: newInspection.area,
      checklist: newInspection.checklist,
      responsable: newInspection.responsable.trim() || "Sin asignar",
      status,
      cumplimiento,
      items,
      findings: [],
      evidencia: [],
    }

    setInspections((prev) => [row, ...prev])
    setSelectedId(id)
    setCreateOpen(false)
  }

  const updateItem = (inspectionId, itemId, patch) => {
    setInspections((prev) =>
      prev.map((ins) => {
        if (ins.id !== inspectionId) return ins
        const items = ins.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it))
        const nextStatus = statusFromItems(items)
        const cumplimiento = calcCompliance(items)
        return { ...ins, items, status: nextStatus, cumplimiento }
      })
    )
  }

  const addFindingFromItem = (inspectionId, item) => {
    // solo si está NO
    if (item.ok !== false) return
    setInspections((prev) =>
      prev.map((ins) => {
        if (ins.id !== inspectionId) return ins
        const f = {
          id: "FND-" + uid(),
          titulo: item.q,
          severidad: "Media",
          categoria: "Checklist",
          accionRecomendada: "Definir acción correctiva y evidencia",
          estado: "Abierto",
        }
        return { ...ins, findings: [f, ...(ins.findings || [])] }
      })
    )
  }

  const updateFinding = (inspectionId, findingId, patch) => {
    setInspections((prev) =>
      prev.map((ins) => {
        if (ins.id !== inspectionId) return ins
        const findings = (ins.findings || []).map((f) => (f.id === findingId ? { ...f, ...patch } : f))
        return { ...ins, findings }
      })
    )
  }

  const createActionFromFinding = (inspectionId, finding) => {
    const ins = inspections.find((x) => x.id === inspectionId)
    setActions((prev) => [
      {
        id: "ACT-" + uid(),
        origen: inspectionId,
        inspection_id: inspectionId,
        finding_id: finding.id,
        titulo: finding.accionRecomendada || finding.titulo,
        responsable: ins?.responsable || "Sin asignar",
        fecha_compromiso: "",
        estado: "Pendiente",
        evidencia: "",
      },
      ...prev,
    ])
  }

  const toggleCloseInspection = (inspectionId) => {
    setInspections((prev) =>
      prev.map((ins) => {
        if (ins.id !== inspectionId) return ins
        if (ins.status === "Completada") {
          // “reabrir” => en proceso si hay respuestas; si no, pendiente
          const nextStatus = statusFromItems(ins.items)
          return { ...ins, status: nextStatus === "Completada" ? "En proceso" : nextStatus }
        }
        return { ...ins, status: "Completada", cumplimiento: calcCompliance(ins.items) }
      })
    )
  }

  const toggleActionDone = (actionId) => {
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, estado: a.estado === "Cerrada" ? "En proceso" : "Cerrada" } : a))
    )
  }

  // -------------------- UI --------------------
  return (
    <main className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inspecciones</h1>
          <p className="text-sm text-slate-500">Checklists, hallazgos y acciones (CAPA) en una sola vista.</p>
        </div>

        <button className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700" onClick={openCreate}>
          + Nueva inspección
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Card title="Total">
            <div className="text-3xl font-semibold text-slate-900">{kpis.total}</div>
            <div className="text-xs text-slate-500 mt-1">Inspecciones registradas</div>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card title="Pendientes / En proceso">
            <div className="text-3xl font-semibold text-slate-900">{kpis.pendientes + kpis.proceso}</div>
            <div className="text-xs text-slate-500 mt-1">
              Pendientes: {kpis.pendientes} • En proceso: {kpis.proceso}
            </div>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card title="Promedio % Cumpl.">
            <div className="text-3xl font-semibold text-slate-900">{kpis.promedio === null ? "—" : `${kpis.promedio}%`}</div>
            <div className="text-xs text-slate-500 mt-1">Solo inspecciones con respuestas</div>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card title="Hallazgos / Acciones abiertas">
            <div className="text-3xl font-semibold text-slate-900">{kpis.hallazgosAbiertos}</div>
            <div className="text-xs text-slate-500 mt-1">Acciones no cerradas: {kpis.accionesPendientes}</div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card title="Filtros">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Buscar</div>
            <input
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              placeholder="ID, área, checklist, responsable..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Área</div>
            <select className="w-full border border-slate-200 rounded px-3 py-2 text-sm" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="Todas">Todas</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Estado</div>
            <select className="w-full border border-slate-200 rounded px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En proceso">En proceso</option>
              <option value="Completada">Completada</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Checklist</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={checklist}
              onChange={(e) => setChecklist(e.target.value)}
            >
              <option value="Todos">Todos</option>
              {CHECKLISTS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-6 md:col-span-1">
            <div className="text-xs text-slate-500 mb-1">Desde</div>
            <input type="date" className="w-full border border-slate-200 rounded px-3 py-2 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="col-span-6 md:col-span-1">
            <div className="text-xs text-slate-500 mb-1">Hasta</div>
            <input type="date" className="w-full border border-slate-200 rounded px-3 py-2 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* List */}
        <div className="col-span-12 lg:col-span-7">
          <Card title={`Listado (${filtered.length})`}>
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
                    <th className="py-2 pr-3">Hallazgos</th>
                    <th className="py-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {filtered.map((x) => {
                    const isActive = x.id === selectedId
                    const openFindings = (x.findings || []).filter((f) => f.estado !== "Cerrado").length
                    return (
                      <tr key={x.id} className={`border-b last:border-b-0 ${isActive ? "bg-slate-50" : ""}`}>
                        <td className="py-2 pr-3 font-semibold">{x.id}</td>
                        <td className="py-2 pr-3">{fmtDate(x.fecha)}</td>
                        <td className="py-2 pr-3">{x.area}</td>
                        <td className="py-2 pr-3">{x.checklist}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={x.status} />
                        </td>
                        <td className="py-2 pr-3">{x.cumplimiento === null ? "—" : `${x.cumplimiento}%`}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs ${openFindings > 0 ? "text-red-700 font-semibold" : "text-slate-600"}`}>
                            {openFindings}
                          </span>
                        </td>
                        <td className="py-2">
                          <button className="text-sm underline" onClick={() => setSelectedId(x.id)}>
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
                        No hay resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail */}
        <div className="col-span-12 lg:col-span-5">
          <Card title="Detalle">
            {!selected ? (
              <div className="text-sm text-slate-500">Selecciona una inspección para ver el detalle.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">{selected.id}</div>
                    <div className="font-semibold text-slate-800">{selected.checklist}</div>
                    <div className="text-sm text-slate-600">
                      {selected.area} • {fmtDate(selected.fecha)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Responsable: <span className="text-slate-700 font-semibold">{selected.responsable || "—"}</span>
                    </div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 mb-1">% Cumplimiento</div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {selected.cumplimiento === null ? "—" : `${selected.cumplimiento}%`}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Auto-calculado según respuestas</div>
                  </div>
                  <div className="p-3 rounded border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 mb-1">Hallazgos abiertos</div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {(selected.findings || []).filter((f) => f.estado !== "Cerrado").length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Desde checklist / manual</div>
                  </div>
                </div>

                {/* Checklist interactive */}
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-2">Checklist</div>
                  <div className="space-y-2">
                    {selected.items.map((it) => (
                      <div key={it.id} className="border rounded p-3 bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm text-slate-800 font-medium">{it.q}</div>
                          <div className="flex items-center gap-2">
                            <button
                              className={`text-xs px-2 py-1 rounded border ${
                                it.ok === true ? "bg-green-50 text-green-700 border-green-200" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                              onClick={() => updateItem(selected.id, it.id, { ok: true })}
                            >
                              OK
                            </button>
                            <button
                              className={`text-xs px-2 py-1 rounded border ${
                                it.ok === false ? "bg-red-50 text-red-700 border-red-200" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                              onClick={() => updateItem(selected.id, it.id, { ok: false })}
                            >
                              NO
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              onClick={() => updateItem(selected.id, it.id, { ok: null })}
                              title="Limpiar respuesta"
                            >
                              —
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-xs text-slate-500">
                            Resultado: <ResultBadge ok={it.ok} />
                          </div>

                          <button
                            className={`text-xs px-2 py-1 rounded border ${
                              it.ok === false ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                            disabled={it.ok !== false}
                            onClick={() => addFindingFromItem(selected.id, it)}
                            title={it.ok !== false ? "Solo disponible si marcaste NO" : "Crear hallazgo desde este ítem"}
                          >
                            + Hallazgo
                          </button>
                        </div>

                        <div className="mt-2">
                          <div className="text-xs text-slate-500 mb-1">Comentario</div>
                          <input
                            className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white"
                            placeholder="Detalle del hallazgo / evidencia observada..."
                            value={it.comentario || ""}
                            onChange={(e) => updateItem(selected.id, it.id, { comentario: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Findings */}
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-2">Hallazgos</div>
                  {(selected.findings || []).length === 0 ? (
                    <div className="text-sm text-slate-600">No hay hallazgos registrados.</div>
                  ) : (
                    <div className="space-y-2">
                      {selected.findings.map((f) => (
                        <div key={f.id} className="p-3 rounded border border-slate-200 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{f.titulo}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                Categoría: <span className="text-slate-700 font-semibold">{f.categoria || "—"}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <SeverityBadge sev={f.severidad} />
                              <StatusBadge status={f.estado === "Cerrado" ? "Completada" : "En proceso"} />
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2 mt-3">
                            <div className="col-span-12 md:col-span-4">
                              <div className="text-xs text-slate-500 mb-1">Severidad</div>
                              <select
                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                                value={f.severidad}
                                onChange={(e) => updateFinding(selected.id, f.id, { severidad: e.target.value })}
                              >
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                              </select>
                            </div>

                            <div className="col-span-12 md:col-span-8">
                              <div className="text-xs text-slate-500 mb-1">Acción recomendada</div>
                              <input
                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                                value={f.accionRecomendada || ""}
                                onChange={(e) => updateFinding(selected.id, f.id, { accionRecomendada: e.target.value })}
                              />
                            </div>

                            <div className="col-span-12 flex items-center justify-between mt-1">
                              <button
                                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                onClick={() => createActionFromFinding(selected.id, f)}
                              >
                                Crear acción CAPA
                              </button>

                              <button
                                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                onClick={() => updateFinding(selected.id, f.id, { estado: f.estado === "Cerrado" ? "Abierto" : "Cerrado" })}
                              >
                                {f.estado === "Cerrado" ? "Reabrir" : "Cerrar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions for this inspection */}
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-2">Acciones (CAPA)</div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-600 border-b">
                          <th className="py-2 pr-3">ID</th>
                          <th className="py-2 pr-3">Acción</th>
                          <th className="py-2 pr-3">Resp.</th>
                          <th className="py-2 pr-3">Estado</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {actions.filter((a) => a.inspection_id === selected.id).map((a) => (
                          <tr key={a.id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-semibold">{a.id}</td>
                            <td className="py-2 pr-3">{a.titulo}</td>
                            <td className="py-2 pr-3">{a.responsable}</td>
                            <td className="py-2 pr-3">
                              <StatusBadge status={a.estado === "Cerrada" ? "Completada" : a.estado === "En proceso" ? "En proceso" : "Pendiente"} />
                            </td>
                            <td className="py-2">
                              <button
                                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                onClick={() => toggleActionDone(a.id)}
                              >
                                {a.estado === "Cerrada" ? "Reabrir" : "Cerrar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {actions.filter((a) => a.inspection_id === selected.id).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500">
                              No hay acciones creadas para esta inspección.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-4 py-2 rounded border hover:bg-slate-50"
                    onClick={() => console.log("Editar meta (demo)", selected.id)}
                  >
                    Editar
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
                    onClick={() => toggleCloseInspection(selected.id)}
                  >
                    {selected.status === "Completada" ? "Reabrir" : "Cerrar inspección"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva inspección">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Fecha</div>
            <input
              type="date"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={newInspection.fecha}
              onChange={(e) => setNewInspection((x) => ({ ...x, fecha: e.target.value }))}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Área</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={newInspection.area}
              onChange={(e) => setNewInspection((x) => ({ ...x, area: e.target.value }))}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Checklist</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={newInspection.checklist}
              onChange={(e) => setNewInspection((x) => ({ ...x, checklist: e.target.value }))}
            >
              {CHECKLISTS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12">
            <div className="text-xs text-slate-500 mb-1">Responsable</div>
            <input
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              placeholder="Ej: Supervisor HSE"
              value={newInspection.responsable}
              onChange={(e) => setNewInspection((x) => ({ ...x, responsable: e.target.value }))}
            />
          </div>

          <div className="col-span-12 flex items-center justify-end gap-2 mt-2">
            <button className="px-4 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-sm" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <button className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 text-sm" onClick={createInspection}>
              Crear inspección
            </button>
          </div>
        </div>
      </Modal>
    </main>
  )
}
