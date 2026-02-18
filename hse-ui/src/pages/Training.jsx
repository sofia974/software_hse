import { useMemo, useState } from "react"
import Card from "../components/Card"

// -------------------- Helpers --------------------
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

function daysBetween(aISO, bISO) {
  // b - a (días)
  if (!aISO || !bISO) return null
  const a = new Date(aISO + "T00:00:00")
  const b = new Date(bISO + "T00:00:00")
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function addMonthsISO(dateISO, months) {
  if (!dateISO) return ""
  const d = new Date(dateISO + "T00:00:00")
  const day = d.getDate()
  d.setMonth(d.getMonth() + Number(months || 0))
  // Ajuste simple si el día “se pasa” (ej: 31 → mes con 30)
  if (d.getDate() !== day) d.setDate(0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

function computeStatus({ vence }, warnDays) {
  const hoy = todayISO()
  const diff = daysBetween(hoy, vence) // vence - hoy
  if (diff === null) return "Sin fecha"
  if (diff < 0) return "Vencido"
  if (diff <= warnDays) return "Próximo"
  return "Vigente"
}

function StatusPill({ status }) {
  const base = "text-xs px-2 py-1 rounded border"
  if (status === "Vencido") return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Vencido</span>
  if (status === "Próximo") return <span className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}>Próximo</span>
  if (status === "Vigente") return <span className={`${base} bg-green-50 text-green-700 border-green-200`}>Vigente</span>
  return <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>{status}</span>
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

// -------------------- Demo master data --------------------
const AREAS = ["Planta", "Almacén", "Taller", "Patio", "Oficinas"]
const ROLES = ["Operario", "Supervisor", "Mantenimiento", "HSE", "Administración"]

// Catálogo de cursos (clave en HSE)
const COURSE_CATALOG = [
  { id: "CRS-EXT", name: "Uso de Extintores", vigenciaMeses: 12, obligatorio: true, aplicaRoles: ["Operario", "Supervisor", "Mantenimiento"], evidencia: "Certificado" },
  { id: "CRS-ALT", name: "Trabajo en Altura", vigenciaMeses: 12, obligatorio: true, aplicaRoles: ["Operario", "Supervisor", "Mantenimiento"], evidencia: "Certificado + evaluación" },
  { id: "CRS-PA", name: "Primeros Auxilios", vigenciaMeses: 24, obligatorio: false, aplicaRoles: ["Supervisor", "HSE"], evidencia: "Certificado" },
  { id: "CRS-LOTO", name: "LOTO", vigenciaMeses: 24, obligatorio: true, aplicaRoles: ["Mantenimiento", "Supervisor"], evidencia: "Certificado" },
]

// Personas (para matriz de cumplimiento)
const PEOPLE = [
  { id: "P-001", name: "Juan Pérez", area: "Planta", rol: "Operario" },
  { id: "P-002", name: "María Gómez", area: "Planta", rol: "Supervisor" },
  { id: "P-003", name: "Luis Rojas", area: "Taller", rol: "Mantenimiento" },
  { id: "P-004", name: "Ana Torres", area: "Oficinas", rol: "Administración" },
]

// -------------------- Component --------------------
export default function Training({ search }) {
  // Config SaaS: umbral “Próximo”
  const [warnDays, setWarnDays] = useState(30)

  // UI states
  const [q, setQ] = useState("")
  const [areaFilter, setAreaFilter] = useState("Todas")
  const [roleFilter, setRoleFilter] = useState("Todos")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [courseFilter, setCourseFilter] = useState("Todos")

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState(null)

  // Acciones tipo “tareas” (para que Training no sea solo registro)
  const [actions, setActions] = useState([
    { id: "ACT-" + uid(), tipo: "Reentrenar", persona: "Juan Pérez", curso: "Uso de Extintores", vence: "2026-02-01", estado: "Pendiente" },
  ])

  // Registros (historial de capacitaciones)
  const [rows, setRows] = useState(() => {
    const seed = [
      { id: "TRN-" + uid(), personaId: "P-001", persona: "Juan Pérez", area: "Planta", rol: "Operario", cursoId: "CRS-EXT", curso: "Uso de Extintores", fecha: "2025-10-10", vence: "2026-02-01", evidencia: "cert_extintores.pdf", nota: 16 },
      { id: "TRN-" + uid(), personaId: "P-002", persona: "María Gómez", area: "Planta", rol: "Supervisor", cursoId: "CRS-ALT", curso: "Trabajo en Altura", fecha: "2025-12-15", vence: "2026-02-20", evidencia: "", nota: 18 },
      { id: "TRN-" + uid(), personaId: "P-003", persona: "Luis Rojas", area: "Taller", rol: "Mantenimiento", cursoId: "CRS-PA", curso: "Primeros Auxilios", fecha: "2025-11-05", vence: "2026-11-05", evidencia: "cert_pa.pdf", nota: 17 },
      { id: "TRN-" + uid(), personaId: "P-004", persona: "Ana Torres", area: "Oficinas", rol: "Administración", cursoId: "CRS-LOTO", curso: "LOTO", fecha: "2026-01-10", vence: "2028-01-10", evidencia: "", nota: 14 },
    ]
    return seed
  })

  // Modal “registrar”
  const [form, setForm] = useState({
    personaId: PEOPLE[0].id,
    cursoId: COURSE_CATALOG[0].id,
    fecha: todayISO(),
    vence: "", // si queda vacío => se calcula por vigencia
    evidencia: "",
    nota: "",
  })

  // Derivados
  const computedRows = useMemo(() => {
    return rows.map((r) => {
      const status = computeStatus({ vence: r.vence }, warnDays)
      const daysToExpire = daysBetween(todayISO(), r.vence) // vence - hoy
      return { ...r, status, daysToExpire }
    })
  }, [rows, warnDays])

  // Filtro combinado: search (Topbar) + q local + filtros
  const filtered = useMemo(() => {
    const t1 = (search || "").trim().toLowerCase()
    const t2 = (q || "").trim().toLowerCase()
    const needle = (t1 + " " + t2).trim()

    return computedRows.filter((x) => {
      if (areaFilter !== "Todas" && x.area !== areaFilter) return false
      if (roleFilter !== "Todos" && x.rol !== roleFilter) return false
      if (statusFilter !== "Todos" && x.status !== statusFilter) return false
      if (courseFilter !== "Todos" && x.curso !== courseFilter) return false

      if (!needle) return true
      const blob = `${x.persona} ${x.area} ${x.rol} ${x.curso} ${x.fecha} ${x.vence} ${x.status}`.toLowerCase()
      return blob.includes(needle)
    })
  }, [computedRows, search, q, areaFilter, roleFilter, statusFilter, courseFilter])

  const stats = useMemo(() => {
    const total = computedRows.length
    const vencidos = computedRows.filter((r) => r.status === "Vencido").length
    const proximos = computedRows.filter((r) => r.status === "Próximo").length
    const vigentes = computedRows.filter((r) => r.status === "Vigente").length
    const sinFecha = computedRows.filter((r) => r.status === "Sin fecha").length
    return { total, vencidos, proximos, vigentes, sinFecha }
  }, [computedRows])

  // Matriz de cumplimiento por persona: cursos obligatorios para su rol
  const compliance = useMemo(() => {
    const byPerson = PEOPLE.map((p) => {
      const required = COURSE_CATALOG.filter((c) => c.obligatorio && c.aplicaRoles.includes(p.rol))
      const recs = computedRows.filter((r) => r.personaId === p.id)
      const latestByCourse = new Map()

      for (const r of recs) {
        const prev = latestByCourse.get(r.cursoId)
        if (!prev || (prev.vence || "") < (r.vence || "")) latestByCourse.set(r.cursoId, r)
      }

      let ok = 0
      let warn = 0
      let bad = 0

      const details = required.map((c) => {
        const r = latestByCourse.get(c.id)
        const status = r ? r.status : "No registrado"
        if (status === "Vigente") ok++
        else if (status === "Próximo") warn++
        else bad++
        return { course: c.name, status }
      })

      return { person: p, ok, warn, bad, requiredCount: required.length, details }
    })

    // resumen por área (para dashboard SaaS)
    const byArea = AREAS.map((a) => {
      const people = byPerson.filter((x) => x.person.area === a)
      const bad = people.reduce((acc, x) => acc + x.bad, 0)
      const warn = people.reduce((acc, x) => acc + x.warn, 0)
      const ok = people.reduce((acc, x) => acc + x.ok, 0)
      return { area: a, ok, warn, bad }
    })

    return { byPerson, byArea }
  }, [computedRows])

  // -------------------- Actions --------------------
  const openCreate = () => {
    setForm({
      personaId: PEOPLE[0].id,
      cursoId: COURSE_CATALOG[0].id,
      fecha: todayISO(),
      vence: "",
      evidencia: "",
      nota: "",
    })
    setCreateOpen(true)
  }

  const registerTraining = () => {
    const person = PEOPLE.find((p) => p.id === form.personaId) || PEOPLE[0]
    const course = COURSE_CATALOG.find((c) => c.id === form.cursoId) || COURSE_CATALOG[0]

    const fecha = form.fecha || todayISO()
    const vence = form.vence || addMonthsISO(fecha, course.vigenciaMeses)

    const row = {
      id: "TRN-" + uid(),
      personaId: person.id,
      persona: person.name,
      area: person.area,
      rol: person.rol,
      cursoId: course.id,
      curso: course.name,
      fecha,
      vence,
      evidencia: form.evidencia.trim(),
      nota: form.nota ? Number(form.nota) : null,
    }

    setRows((prev) => [row, ...prev])

    // Si quedó Vencido/Próximo, genera acción automáticamente (interfaz)
    const status = computeStatus({ vence }, warnDays)
    if (status === "Vencido" || status === "Próximo") {
      setActions((prev) => [
        {
          id: "ACT-" + uid(),
          tipo: "Reentrenar",
          persona: person.name,
          curso: course.name,
          vence,
          estado: "Pendiente",
        },
        ...prev,
      ])
    }

    setCreateOpen(false)
  }

  const openPersonDetail = (personaId) => {
    setSelectedPersonId(personaId)
    setDetailOpen(true)
  }

  const selectedPerson = PEOPLE.find((p) => p.id === selectedPersonId) || null
  const selectedPersonRows = useMemo(() => {
    if (!selectedPerson) return []
    return computedRows
      .filter((r) => r.personaId === selectedPerson.id)
      .sort((a, b) => ((a.vence || "") < (b.vence || "") ? 1 : -1))
  }, [computedRows, selectedPerson])

  // -------------------- UI --------------------
  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Capacitaciones</h1>
          <p className="text-sm text-slate-500">
            Vigencias automáticas • Matriz de cumplimiento por rol • Acciones por vencimiento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block text-xs text-slate-500">
            Próximo en{" "}
            <span className="font-semibold text-slate-800">{warnDays}</span> días
          </div>
          <button
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
            onClick={openCreate}
          >
            + Registrar
          </button>
        </div>
      </div>

      {/* Config rápida */}
      <div className="col-span-12">
        <Card title="Configuración rápida">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12 md:col-span-4">
              <div className="text-xs text-slate-500 mb-1">Umbral “Próximo” (días)</div>
              <input
                type="number"
                min={1}
                max={365}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                value={warnDays}
                onChange={(e) => setWarnDays(Math.max(1, Math.min(365, Number(e.target.value || 30))))}
              />
              <div className="text-xs text-slate-500 mt-1">
                Si faltan ≤ {warnDays} días para vencer → “Próximo”.
              </div>
            </div>

            <div className="col-span-12 md:col-span-8">
              <div className="text-xs text-slate-500 mb-1">Filtros</div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  className="col-span-12 md:col-span-4 border border-slate-200 rounded px-3 py-2 text-sm"
                  placeholder="Buscar (persona, curso, estado...)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <select
                  className="col-span-6 md:col-span-2 border border-slate-200 rounded px-3 py-2 text-sm"
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                >
                  <option value="Todas">Área</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <select
                  className="col-span-6 md:col-span-2 border border-slate-200 rounded px-3 py-2 text-sm"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="Todos">Rol</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  className="col-span-6 md:col-span-2 border border-slate-200 rounded px-3 py-2 text-sm"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <option value="Todos">Curso</option>
                  {COURSE_CATALOG.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  className="col-span-6 md:col-span-2 border border-slate-200 rounded px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Todos">Estado</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Próximo">Próximo</option>
                  <option value="Vigente">Vigente</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 mt-2">
                Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> de{" "}
                <span className="font-semibold text-slate-700">{computedRows.length}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* KPIs */}
      <div className="col-span-12 md:col-span-3">
        <Card title="Total">
          <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Registros</p>
        </Card>
      </div>
      <div className="col-span-12 md:col-span-3">
        <Card title="Vencidos">
          <p className="text-3xl font-bold text-red-600">{stats.vencidos}</p>
          <p className="text-xs text-slate-500 mt-1">Fuera de vigencia</p>
        </Card>
      </div>
      <div className="col-span-12 md:col-span-3">
        <Card title="Próximos">
          <p className="text-3xl font-bold text-yellow-700">{stats.proximos}</p>
          <p className="text-xs text-slate-500 mt-1">≤ {warnDays} días</p>
        </Card>
      </div>
      <div className="col-span-12 md:col-span-3">
        <Card title="Vigentes">
          <p className="text-3xl font-bold text-green-700">{stats.vigentes}</p>
          <p className="text-xs text-slate-500 mt-1">En regla</p>
        </Card>
      </div>

      {/* Matriz de cumplimiento por área (simple) */}
      <div className="col-span-12">
        <Card title="Cumplimiento por área (cursos obligatorios por rol)">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Vigentes</th>
                  <th className="py-2 pr-3">Próximos</th>
                  <th className="py-2 pr-3">No conforme</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {compliance.byArea.map((x) => (
                  <tr key={x.area} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{x.area}</td>
                    <td className="py-2 pr-3">{x.ok}</td>
                    <td className="py-2 pr-3">{x.warn}</td>
                    <td className="py-2 pr-3">
                      <span className={`${x.bad > 0 ? "text-red-700 font-semibold" : "text-slate-700"}`}>{x.bad}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            “No conforme” = faltante, vencido o no registrado para cursos obligatorios según rol.
          </p>
        </Card>
      </div>

      {/* Tabla de registros */}
      <div className="col-span-12">
        <Card title="Registros (historial)">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">Persona</th>
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Rol</th>
                  <th className="py-2 pr-3">Curso</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Vence</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Días</th>
                  <th className="py-2 pr-3">Evidencia</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-700">
                {filtered.map((x) => (
                  <tr key={x.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{x.persona}</td>
                    <td className="py-2 pr-3">{x.area}</td>
                    <td className="py-2 pr-3">{x.rol}</td>
                    <td className="py-2 pr-3">{x.curso}</td>
                    <td className="py-2 pr-3">{fmtDate(x.fecha)}</td>
                    <td className="py-2 pr-3">{fmtDate(x.vence)}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={x.status} />
                    </td>
                    <td className="py-2 pr-3">
                      {typeof x.daysToExpire === "number" ? (
                        <span className={`${x.daysToExpire < 0 ? "text-red-700 font-semibold" : x.daysToExpire <= warnDays ? "text-yellow-800 font-semibold" : "text-slate-700"}`}>
                          {x.daysToExpire}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">{x.evidencia || "—"}</td>
                    <td className="py-2">
                      <button className="text-sm underline" onClick={() => openPersonDetail(x.personaId)}>
                        Ver persona
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={10}>
                      No hay resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Acciones (para convertir training en gestión) */}
      <div className="col-span-12">
        <Card title="Acciones (reentrenamiento / seguimiento)">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Persona</th>
                  <th className="py-2 pr-3">Curso</th>
                  <th className="py-2 pr-3">Vence</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {actions.map((a) => (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{a.id}</td>
                    <td className="py-2 pr-3">{a.tipo}</td>
                    <td className="py-2 pr-3">{a.persona}</td>
                    <td className="py-2 pr-3">{a.curso}</td>
                    <td className="py-2 pr-3">{fmtDate(a.vence)}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={a.estado === "Cerrada" ? "Vigente" : "Próximo"} />
                    </td>
                    <td className="py-2">
                      <button
                        className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        onClick={() =>
                          setActions((prev) =>
                            prev.map((x) => (x.id === a.id ? { ...x, estado: x.estado === "Cerrada" ? "Pendiente" : "Cerrada" } : x))
                          )
                        }
                      >
                        {a.estado === "Cerrada" ? "Reabrir" : "Cerrar"}
                      </button>
                    </td>
                  </tr>
                ))}

                {actions.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={7}>
                      No hay acciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Idea SaaS: estas acciones luego se convierten en notificaciones (correo/Teams) y agenda de sesiones.
          </p>
        </Card>
      </div>

      {/* Modal: Registrar */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Registrar capacitación">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs text-slate-500 mb-1">Persona</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={form.personaId}
              onChange={(e) => setForm((x) => ({ ...x, personaId: e.target.value }))}
            >
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.area} / {p.rol}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="text-xs text-slate-500 mb-1">Curso</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={form.cursoId}
              onChange={(e) => setForm((x) => ({ ...x, cursoId: e.target.value }))}
            >
              {COURSE_CATALOG.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.obligatorio ? "(Obligatorio)" : ""}
                </option>
              ))}
            </select>

            <div className="text-xs text-slate-500 mt-1">
              Vigencia:{" "}
              <span className="font-semibold text-slate-700">
                {(COURSE_CATALOG.find((c) => c.id === form.cursoId) || COURSE_CATALOG[0]).vigenciaMeses} meses
              </span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Fecha</div>
            <input
              type="date"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={form.fecha}
              onChange={(e) => setForm((x) => ({ ...x, fecha: e.target.value }))}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Vence (opcional)</div>
            <input
              type="date"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={form.vence}
              onChange={(e) => setForm((x) => ({ ...x, vence: e.target.value }))}
            />
            <div className="text-xs text-slate-500 mt-1">
              Si lo dejas vacío, se calcula por la vigencia del curso.
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Nota (opcional)</div>
            <input
              type="number"
              min={0}
              max={20}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={form.nota}
              onChange={(e) => setForm((x) => ({ ...x, nota: e.target.value }))}
              placeholder="0-20"
            />
          </div>

          <div className="col-span-12">
            <div className="text-xs text-slate-500 mb-1">Evidencia (simulada)</div>
            <input
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              placeholder="Ej: certificado.pdf / acta_asistencia.jpg"
              value={form.evidencia}
              onChange={(e) => setForm((x) => ({ ...x, evidencia: e.target.value }))}
            />
          </div>

          <div className="col-span-12 flex items-center justify-end gap-2 mt-2">
            <button className="px-4 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-sm" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <button className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 text-sm" onClick={registerTraining}>
              Registrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Detalle persona */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Detalle por persona">
        {!selectedPerson ? (
          <div className="text-sm text-slate-600">No hay persona seleccionada.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedPerson.name}</div>
                <div className="text-sm text-slate-600">
                  {selectedPerson.area} • {selectedPerson.rol}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Cursos obligatorios para su rol:{" "}
                <span className="font-semibold text-slate-700">
                  {COURSE_CATALOG.filter((c) => c.obligatorio && c.aplicaRoles.includes(selectedPerson.rol)).length}
                </span>
              </div>
            </div>

            <Card title="Brechas (obligatorios)">
              <div className="space-y-2">
                {(compliance.byPerson.find((x) => x.person.id === selectedPerson.id)?.details || []).map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded border border-slate-200 p-2 bg-white">
                    <div className="text-sm text-slate-800">{d.course}</div>
                    <StatusPill status={d.status} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Historial">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600 border-b">
                      <th className="py-2 pr-3">Curso</th>
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Vence</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Evidencia</th>
                      <th className="py-2">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {selectedPersonRows.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 font-semibold">{r.curso}</td>
                        <td className="py-2 pr-3">{fmtDate(r.fecha)}</td>
                        <td className="py-2 pr-3">{fmtDate(r.vence)}</td>
                        <td className="py-2 pr-3">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="py-2 pr-3">{r.evidencia || "—"}</td>
                        <td className="py-2">{typeof r.nota === "number" ? r.nota : "—"}</td>
                      </tr>
                    ))}
                    {selectedPersonRows.length === 0 && (
                      <tr>
                        <td className="py-6 text-center text-slate-500" colSpan={6}>
                          No hay registros para esta persona.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </main>
  )
}
