import { useEffect, useMemo, useState } from "react"
import Card from "../components/Card"

// ------------------ Utils / Const ------------------
const HIERARCHY = ["Eliminación", "Sustitución", "Ingeniería", "Administrativos", "EPP"]
const AREAS = ["Planta", "Patio", "Taller", "Almacén", "Oficinas"]

const uid = () => Math.random().toString(16).slice(2, 10).toUpperCase()

const toneStyles = {
  green: { badge: "bg-green-100 text-green-700 border-green-200", cell: "bg-green-100 border-green-200 text-green-700" },
  yellow: { badge: "bg-yellow-100 text-yellow-800 border-yellow-200", cell: "bg-yellow-100 border-yellow-200 text-yellow-800" },
  red: { badge: "bg-red-100 text-red-700 border-red-200", cell: "bg-red-100 border-red-200 text-red-700" },
  slate: { badge: "bg-slate-100 text-slate-700 border-slate-200", cell: "bg-slate-100 border-slate-200 text-slate-700" },
}

function clampInt(v, min, max) {
  const n = Number(v)
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function fmtDate(d) {
  if (!d) return "-"
  const [y, m, day] = String(d).split("-")
  if (!y || !m || !day) return d
  return `${day}/${m}/${y}`
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function daysUntil(dateISO) {
  if (!dateISO) return null
  const t = new Date(todayISO()).getTime()
  const d = new Date(dateISO).getTime()
  const diff = Math.round((d - t) / (1000 * 60 * 60 * 24))
  return diff
}

function normalizeLevels(levels) {
  return [...levels]
    .map((l) => ({
      ...l,
      min: clampInt(l.min, 1, 9999),
      max: clampInt(l.max, 1, 9999),
      name: String(l.name || "Nivel"),
      tone: l.tone || "slate",
    }))
    .map((l) => (l.min > l.max ? { ...l, min: l.max, max: l.min } : l))
    .sort((a, b) => a.min - b.min)
}

function computeCoverageWarnings(levels, maxScore) {
  const sorted = normalizeLevels(levels)
  const warnings = { gaps: [], overlaps: [] }
  let cursor = 1

  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i]
    if (l.max < 1 || l.min > maxScore) continue
    const min = Math.max(1, l.min)
    const max = Math.min(maxScore, l.max)

    if (min > cursor) warnings.gaps.push({ from: cursor, to: min - 1 })

    if (i > 0) {
      const prev = sorted[i - 1]
      const prevMin = Math.max(1, prev.min)
      const prevMax = Math.min(maxScore, prev.max)
      if (min <= prevMax) {
        warnings.overlaps.push({
          a: `${prev.name} (${prevMin}-${prevMax})`,
          b: `${l.name} (${min}-${max})`,
        })
      }
    }
    cursor = Math.max(cursor, max + 1)
  }

  if (cursor <= maxScore) warnings.gaps.push({ from: cursor, to: maxScore })
  return warnings
}

function score(p, s) {
  return p * s
}

// ------------------ Storage ------------------
const STORAGE_KEY = "hse_risk_config_v1"

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  } catch {}
}

// ------------------ Default config ------------------
const DEFAULT_LEVELS = [
  { id: "LVL-" + uid(), name: "Bajo", min: 1, max: 8, tone: "green" },
  { id: "LVL-" + uid(), name: "Medio", min: 9, max: 15, tone: "yellow" },
  { id: "LVL-" + uid(), name: "Crítico", min: 16, max: 25, tone: "red" },
]

const DEFAULT_CONFIG = {
  matrixSize: 5,
  levels: DEFAULT_LEVELS,
}

// ------------------ Demo data ------------------
function seedRisks() {
  return [
    {
      id: "RSK-3001",
      peligro: "Trabajo en altura",
      area: "Planta",
      ubicacion: "Zona de mantenimiento",
      proceso: "Mantenimiento",
      tarea: "Cambio de luminaria",
      puesto: "Técnico de mantenimiento",
      prob_inh: 4,
      sev_inh: 5,
      prob_res: 2,
      sev_res: 4,
      responsable: "Supervisor HSE",
      fecha_registro: "2026-02-10",
      fecha_revision: "2026-03-10",
      estado: "Abierto",
      incident_ids: ["INC-1012"],
      inspection_ids: ["INSP-2201", "INSP-2208"],
      adjuntos: ["IPERC_altura.pdf", "Foto_andamio.jpg"],
      historial: [
        { at: "2026-02-10", msg: "Riesgo registrado" },
        { at: "2026-02-12", msg: "Se agregó control de Ingeniería" },
      ],
      controles: [
        {
          id: "CTRL-" + uid(),
          tipo: "Ingeniería",
          descripcion: "Línea de vida certificada + puntos de anclaje",
          responsable: "Mantenimiento",
          fecha_compromiso: "2026-02-25",
          estado: "En proceso",
          evidencia: "",
        },
        {
          id: "CTRL-" + uid(),
          tipo: "EPP",
          descripcion: "Arnés + doble línea con absorbedor",
          responsable: "Almacén",
          fecha_compromiso: "2026-02-20",
          estado: "Implementado",
          evidencia: "Acta_entrega_EPP.pdf",
        },
      ],
    },
    {
      id: "RSK-3002",
      peligro: "Tránsito interno",
      area: "Patio",
      ubicacion: "Vía principal",
      proceso: "Operaciones",
      tarea: "Tránsito de montacargas",
      puesto: "Operador montacargas",
      prob_inh: 3,
      sev_inh: 4,
      prob_res: 2,
      sev_res: 3,
      responsable: "Jefe de Operaciones",
      fecha_registro: "2026-02-12",
      fecha_revision: "2026-03-12",
      estado: "En seguimiento",
      incident_ids: [],
      inspection_ids: ["INSP-2210"],
      adjuntos: ["Plano_rutas.pdf"],
      historial: [{ at: "2026-02-12", msg: "Riesgo registrado" }],
      controles: [
        {
          id: "CTRL-" + uid(),
          tipo: "Administrativos",
          descripcion: "Rutas definidas + velocidad máxima + inducción",
          responsable: "Operaciones",
          fecha_compromiso: "2026-02-28",
          estado: "Pendiente",
          evidencia: "",
        },
      ],
    },
    {
      id: "RSK-3003",
      peligro: "Atrapamiento",
      area: "Taller",
      ubicacion: "Zona de prensas",
      proceso: "Producción",
      tarea: "Ajuste de máquina",
      puesto: "Operador",
      prob_inh: 3,
      sev_inh: 5,
      prob_res: 2,
      sev_res: 4,
      responsable: "Jefe de Taller",
      fecha_registro: "2026-02-05",
      fecha_revision: "2026-03-05",
      estado: "Abierto",
      incident_ids: ["INC-1009"],
      inspection_ids: [],
      adjuntos: [],
      historial: [{ at: "2026-02-05", msg: "Riesgo registrado" }],
      controles: [],
    },
  ]
}

function seedActions(risks) {
  const seed = []
  for (const r of risks) {
    for (const c of r.controles) {
      if (c.estado !== "Implementado") {
        seed.push({
          id: "ACT-" + uid(),
          origen: `Riesgo ${r.id}`,
          risk_id: r.id,
          control_id: c.id,
          titulo: `${c.tipo}: ${c.descripcion}`,
          responsable: c.responsable,
          fecha_compromiso: c.fecha_compromiso,
          estado: c.estado === "En proceso" ? "En proceso" : "Pendiente",
          evidencia: c.evidencia || "",
        })
      }
    }
  }
  return seed
}

// ------------------ Small UI helpers ------------------
function Badge({ tone = "slate", children }) {
  const st = toneStyles[tone] || toneStyles.slate
  return <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${st.badge}`}>{children}</span>
}

function Drawer({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">{title}</div>
          <button className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200">
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

// ------------------ Main ------------------
export default function Risks() {
  // Config
  const [riskConfig, setRiskConfig] = useState(() => loadConfig() || DEFAULT_CONFIG)
  const matrixSize = clampInt(riskConfig.matrixSize, 3, 7)
  const maxScore = matrixSize * matrixSize
  const levels = useMemo(() => normalizeLevels(riskConfig.levels), [riskConfig.levels])

  const getLevelForScore = (v) => {
    const hit = levels.find((l) => v >= l.min && v <= l.max)
    if (hit) return hit
    let best = null
    let bestDist = Infinity
    for (const l of levels) {
      const dist = v < l.min ? l.min - v : v > l.max ? v - l.max : 0
      if (dist < bestDist) {
        bestDist = dist
        best = l
      }
    }
    return best || { name: "Sin nivel", min: 1, max: maxScore, tone: "slate" }
  }

  const scoreBadge = (v) => {
    const lvl = getLevelForScore(v)
    const st = toneStyles[lvl.tone] || toneStyles.slate
    return (
      <span className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${st.badge}`}>
        <span className="font-semibold">{lvl.name}</span>
        <span className="opacity-80">({v})</span>
      </span>
    )
  }

  const cellClass = (p, s) => {
    const v = score(p, s)
    const lvl = getLevelForScore(v)
    const st = toneStyles[lvl.tone] || toneStyles.slate
    const base =
      "h-10 rounded border cursor-pointer flex items-center justify-center text-xs font-semibold select-none hover:opacity-90"
    return `${base} ${st.cell}`
  }

  // Data
  const [risks, setRisks] = useState(() => seedRisks())
  const [actions, setActions] = useState(() => seedActions(seedRisks()))

  // UI filters
  const [q, setQ] = useState("")
  const [filterArea, setFilterArea] = useState("Todas")
  const [filterEstado, setFilterEstado] = useState("Todos")
  const [filterNivel, setFilterNivel] = useState("Todos")
  const [onlyOverdue, setOnlyOverdue] = useState(false)

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("evaluacion")
  const [selectedRiskId, setSelectedRiskId] = useState(null)
  const selectedRisk = useMemo(() => risks.find((r) => r.id === selectedRiskId) || null, [risks, selectedRiskId])

  // Matrix interaction
  const [matrixMode, setMatrixMode] = useState("inherente")
  const [selectedCell, setSelectedCell] = useState({ prob: 3, sev: 3 })

  // Config modal
  const [configOpen, setConfigOpen] = useState(false)
  const [draftConfig, setDraftConfig] = useState(() => riskConfig)
  useEffect(() => {
    if (configOpen) setDraftConfig(riskConfig)
  }, [configOpen]) // eslint-disable-line

  const draftLevels = useMemo(() => normalizeLevels(draftConfig.levels || []), [draftConfig.levels])
  const draftMatrixSize = clampInt(draftConfig.matrixSize ?? 5, 3, 7)
  const draftMaxScore = draftMatrixSize * draftMatrixSize
  const draftWarnings = useMemo(() => computeCoverageWarnings(draftLevels, draftMaxScore), [draftLevels, draftMaxScore])
  const canSaveConfig = draftWarnings.gaps.length === 0 && draftWarnings.overlaps.length === 0 && draftLevels.length > 0

  const updateDraftLevel = (id, patch) => {
    setDraftConfig((x) => ({
      ...x,
      levels: (x.levels || []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }))
  }

  const addDraftLevel = () => {
    setDraftConfig((x) => ({
      ...x,
      levels: [...(x.levels || []), { id: "LVL-" + uid(), name: "Nuevo", min: 1, max: draftMaxScore, tone: "slate" }],
    }))
  }

  const deleteDraftLevel = (id) => {
    setDraftConfig((x) => ({ ...x, levels: (x.levels || []).filter((l) => l.id !== id) }))
  }

  const autoFillDraftLevels = () => {
    const a = Math.max(1, Math.floor(draftMaxScore / 3))
    const b = Math.max(a + 1, Math.floor((2 * draftMaxScore) / 3))
    setDraftConfig((x) => ({
      ...x,
      levels: [
        { id: "LVL-" + uid(), name: "Bajo", min: 1, max: a, tone: "green" },
        { id: "LVL-" + uid(), name: "Medio", min: a + 1, max: b, tone: "yellow" },
        { id: "LVL-" + uid(), name: "Crítico", min: b + 1, max: draftMaxScore, tone: "red" },
      ],
    }))
  }

  const saveDraft = () => {
    if (!canSaveConfig) return
    const next = { matrixSize: draftMatrixSize, levels: draftLevels }
    setRiskConfig(next)
    saveConfig(next)
    setConfigOpen(false)
  }

  // KPIs
  const kpis = useMemo(() => {
    const list = risks.map((r) => {
      const v = score(r.prob_inh, r.sev_inh)
      const lvl = getLevelForScore(v)
      return { r, v, lvl }
    })
    const criticalCount = list.filter((x) => x.lvl.tone === "red").length
    const openCount = risks.filter((r) => r.estado !== "Cerrado").length
    const overdueActions = actions.filter((a) => {
      if (!a.fecha_compromiso) return false
      const d = daysUntil(a.fecha_compromiso)
      return d !== null && d < 0 && a.estado !== "Cerrada"
    }).length
    return { criticalCount, openCount, overdueActions }
  }, [risks, actions, levels]) // eslint-disable-line

  const levelNames = useMemo(() => {
    const unique = []
    for (const l of levels) if (!unique.includes(l.name)) unique.push(l.name)
    return unique
  }, [levels])

  // List rows
  const riskRows = useMemo(() => {
    const rows = risks.map((r) => {
      const inh = score(r.prob_inh, r.sev_inh)
      const res = score(r.prob_res, r.sev_res)
      const lvlInh = getLevelForScore(inh)
      const pendingControls = r.controles.filter((c) => c.estado !== "Implementado").length
      const dueIn = daysUntil(r.fecha_revision)
      return { ...r, inh, res, lvlInh, pendingControls, dueIn }
    })

    const s = q.trim().toLowerCase()
    const matchQ = (row) => {
      if (!s) return true
      return (
        row.id.toLowerCase().includes(s) ||
        row.peligro.toLowerCase().includes(s) ||
        row.area.toLowerCase().includes(s) ||
        row.proceso.toLowerCase().includes(s) ||
        row.tarea.toLowerCase().includes(s)
      )
    }

    const matchArea = (row) => (filterArea === "Todas" ? true : row.area === filterArea)
    const matchEstado = (row) => (filterEstado === "Todos" ? true : row.estado === filterEstado)
    const matchNivel = (row) => (filterNivel === "Todos" ? true : row.lvlInh?.name === filterNivel)

    const matchOverdue = (row) => {
      if (!onlyOverdue) return true
      const overdueReview = row.dueIn !== null && row.dueIn < 0
      const overdueActs = actions.some((a) => {
        if (a.risk_id !== row.id) return false
        const d = daysUntil(a.fecha_compromiso)
        return d !== null && d < 0 && a.estado !== "Cerrada"
      })
      return overdueReview || overdueActs
    }

    return rows
      .filter((r) => matchQ(r) && matchArea(r) && matchEstado(r) && matchNivel(r) && matchOverdue(r))
      .sort((a, b) => b.inh - a.inh)
  }, [risks, actions, q, filterArea, filterEstado, filterNivel, onlyOverdue, levels]) // eslint-disable-line

  // Actions
  const toggleActionState = (actionId) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id !== actionId) return a
        const next = a.estado === "Cerrada" ? "En proceso" : "Cerrada"
        return { ...a, estado: next }
      })
    )
  }

  const syncControlsWithActions = () => {
    setRisks((prev) =>
      prev.map((r) => {
        const updatedControls = r.controles.map((c) => {
          const a = actions.find((x) => x.control_id === c.id && x.risk_id === r.id)
          if (!a) return c
          if (a.estado === "Cerrada") return { ...c, estado: "Implementado", evidencia: a.evidencia || c.evidencia }
          if (a.estado === "En proceso") return { ...c, estado: "En proceso" }
          return { ...c, estado: "Pendiente" }
        })
        return { ...r, controles: updatedControls }
      })
    )
  }

  const openRisk = (riskId) => {
    setSelectedRiskId(riskId)
    setDrawerOpen(true)
    setActiveTab("evaluacion")
    setMatrixMode("inherente")
    const r = risks.find((x) => x.id === riskId)
    if (r) setSelectedCell({ prob: r.prob_inh, sev: r.sev_inh })
  }

  // Controls (form)
  const [newControl, setNewControl] = useState({
    tipo: "Administrativos",
    descripcion: "",
    responsable: "",
    fecha_compromiso: "",
    crearAccion: true,
  })

  const addControlToSelectedRisk = () => {
    if (!selectedRisk) return
    const desc = newControl.descripcion.trim()
    if (!desc) return

    const ctrl = {
      id: "CTRL-" + uid(),
      tipo: newControl.tipo,
      descripcion: desc,
      responsable: newControl.responsable.trim() || "Sin asignar",
      fecha_compromiso: newControl.fecha_compromiso || "",
      estado: "Pendiente",
      evidencia: "",
    }

    setRisks((prev) =>
      prev.map((r) =>
        r.id === selectedRisk.id
          ? {
              ...r,
              controles: [ctrl, ...r.controles],
              historial: [{ at: todayISO(), msg: `Se agregó control: ${ctrl.tipo}` }, ...(r.historial || [])],
            }
          : r
      )
    )

    if (newControl.crearAccion) {
      setActions((prev) => [
        {
          id: "ACT-" + uid(),
          origen: `Riesgo ${selectedRisk.id}`,
          risk_id: selectedRisk.id,
          control_id: ctrl.id,
          titulo: `${ctrl.tipo}: ${ctrl.descripcion}`,
          responsable: ctrl.responsable,
          fecha_compromiso: ctrl.fecha_compromiso,
          estado: "Pendiente",
          evidencia: "",
        },
        ...prev,
      ])
    }

    setNewControl((x) => ({ ...x, descripcion: "" }))
  }

  const applyMatrixToRisk = () => {
    if (!selectedRisk) return
    setRisks((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRisk.id) return r
        const patch =
          matrixMode === "residual"
            ? { prob_res: selectedCell.prob, sev_res: selectedCell.sev }
            : { prob_inh: selectedCell.prob, sev_inh: selectedCell.sev }

        return {
          ...r,
          ...patch,
          historial: [{ at: todayISO(), msg: `Se actualizó evaluación (${matrixMode})` }, ...(r.historial || [])],
        }
      })
    )
  }

  // Matrix axes
  const sevAxis = Array.from({ length: matrixSize }, (_, i) => i + 1)
  const probAxis = Array.from({ length: matrixSize }, (_, i) => matrixSize - i)

  return (
    <main className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Riesgos (IPERC)</h1>
          <p className="text-sm text-slate-500">Busca rápido, prioriza críticos y gestiona controles + acciones.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="px-3 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700"
            onClick={() => setConfigOpen(true)}
          >
            Configurar matriz
          </button>
          <button
            className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 text-sm"
            onClick={syncControlsWithActions}
            title="Sincroniza estado de controles según acciones"
          >
            Sincronizar
          </button>
          <button
            className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 text-sm"
            onClick={() => console.log("Nuevo riesgo (demo)")}
          >
            + Nuevo riesgo
          </button>
        </div>
      </div>

      {/* ✅ Resumen (arreglado: sin Card dentro de Card) */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Resumen</h2>
          <p className="text-xs text-slate-500">Vista rápida para priorizar</p>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card title="Riesgos críticos">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-slate-900">{kpis.criticalCount}</div>
                <div className="text-xs text-slate-500 mt-1">Según evaluación inherente</div>
              </div>
              <span className="text-xs px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200">Prioridad</span>
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card title="Riesgos abiertos">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-slate-900">{kpis.openCount}</div>
                <div className="text-xs text-slate-500 mt-1">Abierto / En seguimiento</div>
              </div>
              <span className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200">Backlog</span>
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card title="Acciones vencidas">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-slate-900">{kpis.overdueActions}</div>
                <div className="text-xs text-slate-500 mt-1">Pendientes o en proceso</div>
              </div>
              <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800 border-amber-200">Urgente</span>
            </div>
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
              placeholder="ID, peligro, área, tarea..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Área</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
            >
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
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="Abierto">Abierto</option>
              <option value="En seguimiento">En seguimiento</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Nivel (Inherente)</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={filterNivel}
              onChange={(e) => setFilterNivel(e.target.value)}
            >
              <option value="Todos">Todos</option>
              {levelNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
              Solo vencidos
            </label>
          </div>
        </div>
      </Card>

      {/* Main list */}
      <Card title={`Riesgos (${riskRows.length})`}>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Peligro</th>
                <th className="py-2 pr-3">Área</th>
                <th className="py-2 pr-3">Inherente</th>
                <th className="py-2 pr-3">Residual</th>
                <th className="py-2 pr-3">Controles</th>
                <th className="py-2 pr-3">Revisión</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {riskRows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-semibold">{r.id}</td>
                  <td className="py-2 pr-3">{r.peligro}</td>
                  <td className="py-2 pr-3">{r.area}</td>
                  <td className="py-2 pr-3">{scoreBadge(r.inh)}</td>
                  <td className="py-2 pr-3">{scoreBadge(r.res)}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs">
                      {r.controles.length} total •{" "}
                      <span className={r.pendingControls > 0 ? "text-amber-700 font-semibold" : "text-slate-600"}>
                        {r.pendingControls} pendientes
                      </span>
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="text-xs">
                      {fmtDate(r.fecha_revision)}{" "}
                      {r.dueIn !== null && r.dueIn < 0 ? (
                        <span className="ml-2 text-red-700 font-semibold">Vencido</span>
                      ) : r.dueIn !== null && r.dueIn <= 7 ? (
                        <span className="ml-2 text-amber-800 font-semibold">Próximo</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={r.estado === "Cerrado" ? "green" : r.estado === "En seguimiento" ? "yellow" : "slate"}>
                      {r.estado}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <button
                      className="text-sm px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50"
                      onClick={() => openRisk(r.id)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {riskRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    No hay resultados con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedRisk ? `${selectedRisk.id} • ${selectedRisk.peligro}` : "Detalle"}
      >
        {!selectedRisk ? (
          <div className="text-sm text-slate-600">Selecciona un riesgo.</div>
        ) : (
          <>
            <div className="p-3 rounded border border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500">Contexto</div>
              <div className="mt-1 text-sm text-slate-800">
                <span className="font-semibold">{selectedRisk.area}</span> • {selectedRisk.proceso} • {selectedRisk.ubicacion}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Tarea: <span className="font-semibold">{selectedRisk.tarea}</span> • Puesto:{" "}
                <span className="font-semibold">{selectedRisk.puesto}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="text-xs text-slate-500">Inherente:</div>
                {scoreBadge(score(selectedRisk.prob_inh, selectedRisk.sev_inh))}
                <div className="text-xs text-slate-500 ml-2">Residual:</div>
                {scoreBadge(score(selectedRisk.prob_res, selectedRisk.sev_res))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["evaluacion", "Evaluación"],
                ["controles", "Controles"],
                ["acciones", "Acciones"],
                ["adjuntos", "Adjuntos"],
                ["historial", "Historial"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  className={`px-3 py-1.5 rounded text-sm border ${
                    activeTab === k
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setActiveTab(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Evaluación */}
            {activeTab === "evaluacion" && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-800">Matriz</div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded text-sm border ${
                        matrixMode === "inherente"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setMatrixMode("inherente")
                        setSelectedCell({ prob: selectedRisk.prob_inh, sev: selectedRisk.sev_inh })
                      }}
                    >
                      Inherente
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded text-sm border ${
                        matrixMode === "residual"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setMatrixMode("residual")
                        setSelectedCell({ prob: selectedRisk.prob_res, sev: selectedRisk.sev_res })
                      }}
                    >
                      Residual
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 items-center" style={{ gridTemplateColumns: `60px repeat(${matrixSize}, minmax(0, 1fr))` }}>
                  <div></div>
                  {sevAxis.map((s) => (
                    <div key={s} className="text-xs text-slate-500 text-center">
                      Sev {s}
                    </div>
                  ))}
                  {probAxis.map((p) => (
                    <div key={`row-${p}`} className="contents">
                      <div className="text-xs text-slate-500 pr-2">Prob {p}</div>
                      {sevAxis.map((s) => {
                        const isSelected = selectedCell.prob === p && selectedCell.sev === s
                        const v = score(p, s)
                        return (
                          <div
                            key={`${p}-${s}`}
                            className={`${cellClass(p, s)} ${isSelected ? "ring-2 ring-slate-900" : ""}`}
                            onClick={() => setSelectedCell({ prob: p, sev: s })}
                            title={`Prob ${p} x Sev ${s} = ${v}`}
                          >
                            {v}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-slate-700">
                    Selección: <span className="font-semibold">Prob {selectedCell.prob}</span> ×{" "}
                    <span className="font-semibold">Sev {selectedCell.sev}</span>
                  </div>
                  {scoreBadge(score(selectedCell.prob, selectedCell.sev))}
                </div>

                <button className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700" onClick={applyMatrixToRisk}>
                  Guardar evaluación ({matrixMode})
                </button>
              </div>
            )}

            {/* Controles */}
            {activeTab === "controles" && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-semibold text-slate-800">Agregar control</div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12">
                    <div className="text-xs text-slate-500 mb-1">Jerarquía</div>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      value={newControl.tipo}
                      onChange={(e) => setNewControl((x) => ({ ...x, tipo: e.target.value }))}
                    >
                      {HIERARCHY.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12">
                    <div className="text-xs text-slate-500 mb-1">Descripción</div>
                    <input
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      placeholder="Ej: Permiso de trabajo + checklist + supervisor"
                      value={newControl.descripcion}
                      onChange={(e) => setNewControl((x) => ({ ...x, descripcion: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <div className="text-xs text-slate-500 mb-1">Responsable</div>
                    <input
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      placeholder="Ej: HSE / Operaciones"
                      value={newControl.responsable}
                      onChange={(e) => setNewControl((x) => ({ ...x, responsable: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <div className="text-xs text-slate-500 mb-1">Fecha compromiso</div>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      value={newControl.fecha_compromiso}
                      onChange={(e) => setNewControl((x) => ({ ...x, fecha_compromiso: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-12 flex items-center justify-between mt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={newControl.crearAccion}
                        onChange={(e) => setNewControl((x) => ({ ...x, crearAccion: e.target.checked }))}
                      />
                      Crear acción automáticamente
                    </label>

                    <button className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700" onClick={addControlToSelectedRisk}>
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="text-sm font-semibold text-slate-800 mb-2">Controles</div>
                  {selectedRisk.controles.length === 0 ? (
                    <div className="text-sm text-slate-600">Aún no hay controles registrados.</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRisk.controles.map((c) => {
                        const a = actions.find((x) => x.control_id === c.id && x.risk_id === selectedRisk.id)
                        const due = daysUntil(c.fecha_compromiso)
                        const overdue = due !== null && due < 0 && c.estado !== "Implementado"

                        return (
                          <div key={c.id} className="p-3 rounded border border-slate-200 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs text-slate-500">{c.tipo}</div>
                                <div className="text-sm text-slate-800 font-semibold">{c.descripcion}</div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Responsable: <span className="font-semibold">{c.responsable}</span> • Compromiso:{" "}
                                  <span className="font-semibold">{fmtDate(c.fecha_compromiso)}</span>
                                  {overdue ? <span className="ml-2 text-red-700 font-semibold">Vencido</span> : null}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Estado: <span className="font-semibold">{c.estado}</span>
                                  {c.evidencia ? (
                                    <>
                                      {" "}
                                      • Evidencia: <span className="font-semibold">{c.evidencia}</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                {a ? (
                                  <Badge tone={a.estado === "Cerrada" ? "green" : a.estado === "En proceso" ? "yellow" : "slate"}>
                                    Acción: {a.estado}
                                  </Badge>
                                ) : (
                                  <Badge tone="slate">Sin acción</Badge>
                                )}
                                <button
                                  className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                  onClick={() => console.log("Adjuntar evidencia (demo)", c)}
                                >
                                  Adjuntar evidencia
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones */}
            {activeTab === "acciones" && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-semibold text-slate-800">Acciones del riesgo</div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b">
                        <th className="py-2 pr-3">ID</th>
                        <th className="py-2 pr-3">Acción</th>
                        <th className="py-2 pr-3">Responsable</th>
                        <th className="py-2 pr-3">Compromiso</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {actions.filter((a) => a.risk_id === selectedRisk.id).map((a) => {
                        const due = daysUntil(a.fecha_compromiso)
                        const overdue = due !== null && due < 0 && a.estado !== "Cerrada"
                        return (
                          <tr key={a.id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-semibold">{a.id}</td>
                            <td className="py-2 pr-3">{a.titulo}</td>
                            <td className="py-2 pr-3">{a.responsable}</td>
                            <td className="py-2 pr-3">
                              {fmtDate(a.fecha_compromiso)} {overdue ? <span className="ml-2 text-red-700 font-semibold">Vencido</span> : null}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge tone={a.estado === "Cerrada" ? "green" : a.estado === "En proceso" ? "yellow" : "slate"}>
                                {a.estado}
                              </Badge>
                            </td>
                            <td className="py-2">
                              <button
                                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                onClick={() => toggleActionState(a.id)}
                              >
                                {a.estado === "Cerrada" ? "Reabrir" : "Cerrar"}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {actions.filter((a) => a.risk_id === selectedRisk.id).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500">
                            No hay acciones asociadas a este riesgo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-slate-500">“Sincronizar” actualizará estados de controles según estas acciones.</div>
              </div>
            )}

            {/* Adjuntos */}
            {activeTab === "adjuntos" && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold text-slate-800">Adjuntos</div>
                {selectedRisk.adjuntos.length === 0 ? (
                  <div className="text-sm text-slate-600">No hay adjuntos.</div>
                ) : (
                  <ul className="text-sm text-slate-700 list-disc pl-5">
                    {selectedRisk.adjuntos.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                <button
                  className="mt-2 text-sm px-3 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => console.log("Subir adjunto (demo)")}
                >
                  Subir adjunto
                </button>
              </div>
            )}

            {/* Historial */}
            {activeTab === "historial" && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold text-slate-800">Historial</div>
                <div className="space-y-2">
                  {(selectedRisk.historial || []).map((h, idx) => (
                    <div key={idx} className="p-3 rounded border border-slate-200 bg-white">
                      <div className="text-xs text-slate-500">{fmtDate(h.at)}</div>
                      <div className="text-sm text-slate-800">{h.msg}</div>
                    </div>
                  ))}
                  {(selectedRisk.historial || []).length === 0 && <div className="text-sm text-slate-600">Sin eventos registrados.</div>}
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* Config modal */}
      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Configurar matriz y niveles (Admin)">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Tamaño de matriz</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={7}
                value={draftMatrixSize}
                onChange={(e) => setDraftConfig((x) => ({ ...x, matrixSize: clampInt(e.target.value, 3, 7) }))}
                className="w-full"
              />
              <span className="text-sm font-semibold text-slate-800 w-14 text-right">
                {draftMatrixSize}×{draftMatrixSize}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Puntaje máximo: {draftMaxScore}</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                onClick={autoFillDraftLevels}
              >
                Auto-rangos
              </button>
              <button
                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                onClick={addDraftLevel}
              >
                + Nivel
              </button>
            </div>
          </div>

          <div className="col-span-12 md:col-span-8">
            {(draftWarnings.gaps.length > 0 || draftWarnings.overlaps.length > 0) && (
              <div className="mb-3 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                {draftWarnings.gaps.length > 0 && (
                  <div className="mb-1">
                    <span className="font-semibold">Gaps:</span>{" "}
                    {draftWarnings.gaps.map((g, i) => (
                      <span key={i} className="mr-2">
                        {g.from}–{g.to}
                      </span>
                    ))}
                  </div>
                )}
                {draftWarnings.overlaps.length > 0 && (
                  <div>
                    <span className="font-semibold">Solapes:</span>{" "}
                    {draftWarnings.overlaps.slice(0, 3).map((o, i) => (
                      <span key={i} className="mr-2">
                        [{o.a}] con [{o.b}]
                      </span>
                    ))}
                    {draftWarnings.overlaps.length > 3 ? <span>…</span> : null}
                  </div>
                )}
                <div className="mt-2">No se puede guardar hasta corregir rangos.</div>
              </div>
            )}

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Min</th>
                    <th className="py-2 pr-3">Max</th>
                    <th className="py-2 pr-3">Color</th>
                    <th className="py-2 pr-3">Vista</th>
                    <th className="py-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {draftLevels.map((l) => (
                    <tr key={l.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <input
                          className="w-full border border-slate-200 rounded px-2 py-1"
                          value={l.name}
                          onChange={(e) => updateDraftLevel(l.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          max={draftMaxScore}
                          className="w-24 border border-slate-200 rounded px-2 py-1"
                          value={l.min}
                          onChange={(e) => updateDraftLevel(l.id, { min: clampInt(e.target.value, 1, draftMaxScore) })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          max={draftMaxScore}
                          className="w-24 border border-slate-200 rounded px-2 py-1"
                          value={l.max}
                          onChange={(e) => updateDraftLevel(l.id, { max: clampInt(e.target.value, 1, draftMaxScore) })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          className="border border-slate-200 rounded px-2 py-1"
                          value={l.tone}
                          onChange={(e) => updateDraftLevel(l.id, { tone: e.target.value })}
                        >
                          <option value="green">Verde</option>
                          <option value="yellow">Amarillo</option>
                          <option value="red">Rojo</option>
                          <option value="slate">Gris</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={l.tone}>
                          {l.name} ({l.min})
                        </Badge>
                      </td>
                      <td className="py-2">
                        <button
                          className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                          onClick={() => deleteDraftLevel(l.id)}
                          disabled={draftLevels.length <= 1}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                onClick={() => setDraftConfig(riskConfig)}
              >
                Descartar
              </button>
              <button
                className={`px-4 py-2 rounded text-sm ${
                  canSaveConfig ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
                disabled={!canSaveConfig}
                onClick={saveDraft}
              >
                Guardar configuración
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </main>
  )
}
