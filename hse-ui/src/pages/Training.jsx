import { useEffect, useMemo, useState } from "react";

// -------------------- Helpers --------------------

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(aISO, bISO) {
  if (!aISO || !bISO) return null;
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addMonthsISO(dateISO, months) {
  if (!dateISO) return "";
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));
  if (d.getDate() !== day) d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function computeStatus({ vence }, warnDays) {
  const diff = daysBetween(todayISO(), vence);
  if (diff === null) return "Sin fecha";
  if (diff < 0) return "Vencido";
  if (diff <= warnDays) return "Próximo";
  return "Vigente";
}

const STATUS_PRIORITY = {
  Vencido: 0,
  Próximo: 1,
  Vigente: 2,
  "Sin fecha": 3,
  "Sin datos": 4,
};

function worstStatus(statuses) {
  if (!statuses.length) return "Sin datos";
  return statuses.reduce((worst, s) =>
    (STATUS_PRIORITY[s] ?? 99) < (STATUS_PRIORITY[worst] ?? 99) ? s : worst,
  );
}

function StatusPill({ status }) {
  const base = "text-xs px-2 py-0.5 rounded-full border font-medium";
  const map = {
    Vencido: "bg-red-50 text-red-700 border-red-200",
    Próximo: "bg-yellow-50 text-yellow-800 border-yellow-200",
    Vigente: "bg-green-50 text-green-700 border-green-200",
    Pendiente: "bg-amber-50 text-amber-800 border-amber-200",
    Cerrada: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      className={`${base} ${map[status] || "bg-slate-50 text-slate-700 border-slate-200"}`}
    >
      {status}
    </span>
  );
}

// -------------------- Person Card --------------------

const DOT_COLOR = {
  Vencido: "bg-red-500",
  Próximo: "bg-yellow-400",
  Vigente: "bg-green-500",
  "Sin fecha": "bg-slate-300",
};

function daysLabel(row) {
  if (typeof row.daysToExpire !== "number" || isNaN(row.daysToExpire))
    return null;
  if (row.daysToExpire < 0)
    return {
      text: `hace ${Math.abs(row.daysToExpire)} días`,
      color: "text-red-600 font-semibold",
    };
  if (row.daysToExpire === 0)
    return { text: "vence hoy", color: "text-red-600 font-semibold" };
  return {
    text: `${row.daysToExpire} días`,
    color:
      row.status === "Próximo"
        ? "text-yellow-700 font-semibold"
        : "text-slate-400",
  };
}

function PersonCard({ person, rows, onDetail }) {
  const personRows = [...rows.filter((r) => r.personaId === person.id)].sort(
    (a, b) =>
      (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99),
  );
  const worst = worstStatus(personRows.map((r) => r.status));

  const borderColor =
    {
      Vencido: "border-red-300",
      Próximo: "border-yellow-300",
      Vigente: "border-green-300",
      "Sin datos": "border-slate-200",
      "Sin fecha": "border-slate-200",
    }[worst] || "border-slate-200";

  const avatarColor =
    {
      Vencido: "bg-red-100 text-red-700",
      Próximo: "bg-yellow-100 text-yellow-800",
      Vigente: "bg-green-100 text-green-700",
      "Sin datos": "bg-slate-100 text-slate-600",
      "Sin fecha": "bg-slate-100 text-slate-600",
    }[worst] || "bg-slate-100 text-slate-600";

  const SHOW_MAX = 4;
  const visible = personRows.slice(0, SHOW_MAX);
  const rest = personRows.length - SHOW_MAX;

  return (
    <div
      className={`bg-white rounded-xl border-2 ${borderColor} p-4 flex flex-col gap-3 hover:shadow-md transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-lg font-bold flex-shrink-0`}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">
            {person.name}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {person.area} · {person.rol}
          </div>
        </div>
        <StatusPill status={worst} />
      </div>

      {/* Courses list with days */}
      {personRows.length > 0 ? (
        <div className="space-y-1.5">
          {visible.map((r) => {
            const dl = daysLabel(r);
            return (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[r.status] || "bg-slate-300"}`}
                />
                <span className="flex-1 truncate text-slate-700">
                  {r.curso}
                </span>
                {dl && <span className={dl.color}>{dl.text}</span>}
              </div>
            );
          })}
          {rest > 0 && (
            <div className="text-xs text-slate-400 pl-4">
              +{rest} curso{rest !== 1 ? "s" : ""} más
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 text-center py-2 bg-slate-50 rounded-lg">
          Sin registros de capacitación
        </div>
      )}

      <button
        onClick={() => onDetail(person.id)}
        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 mt-auto transition-colors"
      >
        Ver detalle →
      </button>
    </div>
  );
}

// -------------------- Modal --------------------

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800 text-lg">{title}</div>
          <button
            className="text-slate-400 hover:text-slate-700 text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// -------------------- Main Component --------------------

export default function Training({ search }) {
  const [compliance, setCompliance] = useState({ byArea: [] });
  const [warnDays, setWarnDays] = useState(30);
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [courseFilter, setCourseFilter] = useState("Todos");
  const [view, setView] = useState("personas"); // "personas" | "historial"

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const [people, setPeople] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rows, setRows] = useState([]);
  const [actions, setActions] = useState([]);

  const areas = useMemo(
    () => [...new Set(people.map((p) => p.area))].filter(Boolean),
    [people],
  );
  const roles = useMemo(
    () => [...new Set(people.map((p) => p.rol))].filter(Boolean),
    [people],
  );

  // ── Load ──
  async function loadData() {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [p, c, t] = await Promise.all([
        fetch("http://localhost:4000/api/personas", { headers }),
        fetch("http://localhost:4000/api/cursos", { headers }),
        fetch("http://localhost:4000/api/capacitaciones", { headers }),
      ]);

      // Verificar si alguna respuesta falló
      if (!p.ok || !c.ok || !t.ok)
        throw new Error("Error al obtener datos de capacitación");

      const personas = await p.json();
      const cursos = await c.json();
      const capacitaciones = await t.json();

      setPeople(
        Array.isArray(personas)
          ? personas.map((x) => ({
              id: x.idPersona,
              name: x.nombre,
              area: x.area,
              rol: x.rol,
            }))
          : [],
      );

      setCourses(
        Array.isArray(cursos)
          ? cursos.map((x) => ({
              id: x.idCurso,
              name: x.nombre,
              vigenciaMeses: x.vigenciaMeses,
              obligatorio: x.obligatorio,
              aplicaRoles: x.aplicaRoles || [],
            }))
          : [],
      );

      setRows(
        Array.isArray(capacitaciones)
          ? capacitaciones.map((r) => ({
              id: r.idCapacitacion,
              personaId: r.idPersona,
              persona: r.persona,
              area: r.area,
              rol: r.rol,
              curso: r.curso,
              fecha: r.fecha,
              vence: r.fechaVencimiento,
              evidencia: r.evidenciaURL,
              nota: r.nota,
            }))
          : [],
      );
    } catch (err) {
      console.error("Error en loadData:", err);
    }
  }

  async function loadCompliance() {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/cumplimiento-area", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;
      const data = await res.json();
      setCompliance({ byArea: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error("Error en cumplimiento:", err);
    }
  }

  async function loadActions() {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/actions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("No autorizado");
      const data = await res.json();

      setActions(
        Array.isArray(data)
          ? data.map((a) => ({
              id: a.id,
              idAccion: a.idAccion,
              persona: a.persona,
              curso: a.curso,
              tipo: a.tipo,
              vence: a.vence,
              estado: a.estado,
            }))
          : [],
      );
    } catch (err) {
      console.error("Error en acciones:", err);
      setActions([]);
    }
  }

  const updateActionEstado = async (id, estado) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    await fetch(`http://localhost:4000/api/accionescapacitacion/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json", // Indispensable
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ estado }), // Asegúrate de que esto se envíe
    });
  };

  useEffect(() => {
    Promise.all([loadData(), loadCompliance(), loadActions()]).catch(
      console.error,
    );
  }, []);

  // ── Form ──
  const [form, setForm] = useState({
    personaId: people[0]?.id || "",
    cursoId: courses[0]?.id || "", // Inicializar con el primer curso disponible
    fecha: new Date().toISOString().split("T")[0], // Opcional: inicializar con hoy
    nota: "",
    evidencia: "",
  });

  const openCreate = () => {
    setForm({
      personaId: people[0]?.id || "",
      cursoId: courses[0]?.id || "",
      fecha: todayISO(),
      evidencia: "",
      nota: "",
    });
    setCreateOpen(true);
  };

  const registerTraining = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const res = await fetch("http://localhost:4000/api/capacitaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idPersona: Number(form.personaId),
          idCurso: Number(form.cursoId),
          fecha: form.fecha || null,
          fechaVencimiento: previewVence,
          nota: form.nota ? Number(form.nota) : null,
          evidenciaURL: form.evidencia || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await loadData();
        setCreateOpen(false);
        // Limpiar formulario si es necesario
      } else {
        alert("Error del servidor: " + (data.detail || data.error));
      }
    } catch (err) {
      console.error("Error en la petición fetch:", err);
    }
  };

  // ── Derived ──
  const computedRows = useMemo(() => {
    return rows.map((r) => {
      const status = computeStatus({ vence: r.vence }, warnDays);
      const daysToExpire = daysBetween(todayISO(), r.vence);
      return { ...r, status, daysToExpire };
    });
  }, [rows, warnDays]);

  const needle = useMemo(
    () => ((search || "") + " " + (q || "")).trim().toLowerCase(),
    [search, q],
  );

  const filteredRows = useMemo(() => {
    return computedRows.filter((x) => {
      if (areaFilter !== "Todas" && x.area !== areaFilter) return false;
      if (roleFilter !== "Todos" && x.rol !== roleFilter) return false;
      if (statusFilter !== "Todos" && x.status !== statusFilter) return false;
      if (courseFilter !== "Todos" && x.curso !== courseFilter) return false;
      if (
        needle &&
        !`${x.persona} ${x.area} ${x.rol} ${x.curso}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      return true;
    });
  }, [
    computedRows,
    areaFilter,
    roleFilter,
    statusFilter,
    courseFilter,
    needle,
  ]);

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (areaFilter !== "Todas" && p.area !== areaFilter) return false;
      if (roleFilter !== "Todos" && p.rol !== roleFilter) return false;
      if (
        needle &&
        !`${p.name} ${p.area} ${p.rol}`.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [people, areaFilter, roleFilter, needle]);

  const stats = useMemo(() => {
    const vencidos = computedRows.filter((r) => r.status === "Vencido").length;
    const proximos = computedRows.filter((r) => r.status === "Próximo").length;
    const vigentes = computedRows.filter((r) => r.status === "Vigente").length;
    return { total: computedRows.length, vencidos, proximos, vigentes };
  }, [computedRows]);

  const hasActiveFilters =
    q ||
    areaFilter !== "Todas" ||
    roleFilter !== "Todos" ||
    statusFilter !== "Todos" ||
    courseFilter !== "Todos";

  const clearFilters = () => {
    setQ("");
    setAreaFilter("Todas");
    setRoleFilter("Todos");
    setStatusFilter("Todos");
    setCourseFilter("Todos");
  };

  // Person detail
  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;
  const selectedPersonRows = useMemo(() => {
    if (!selectedPerson) return [];
    return computedRows
      .filter((r) => r.personaId === selectedPerson.id)
      .sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  }, [computedRows, selectedPerson]);

  const openPersonDetail = (personaId) => {
    setSelectedPersonId(personaId);
    setDetailOpen(true);
  };

  // Preview vencimiento in form
  // const previewVence = useMemo(() => {
  //   const course = courses.find((c) => c.id === Number(form.cursoId));
  //   if (!course?.vigenciaMeses || !form.fecha) return null;
  //   return addMonthsISO(form.fecha, course.vigenciaMeses);
  // }, [form.cursoId, form.fecha, courses]);
  const previewVence = useMemo(() => {
    // Forzamos a Number para evitar errores de tipo "1" !== 1
    const cursoIdNum = Number(form.cursoId);
    const course = courses.find((c) => Number(c.id) === cursoIdNum);

    // Si no hay curso o no tiene fecha, no calculamos nada
    if (!course || !form.fecha) return null;

    // Asegúrate que vigenciaMeses exista, si es 0 o null, podrías poner 12 por defecto
    const meses = Number(course.vigenciaMeses) || 0;

    if (meses === 0) return null;

    return addMonthsISO(form.fecha, meses);
  }, [form.cursoId, form.fecha, courses]);

  // ── Render ──
  return (
    <main className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Capacitaciones
          </h1>
          <p className="text-sm text-slate-500">
            Gestión de vigencias · Cumplimiento por rol · Seguimiento de
            reentrenamientos
          </p>
        </div>
        <button
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 text-sm font-medium"
          onClick={openCreate}
        >
          + Registrar capacitación
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">Total registros</div>
          <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-0.5">capacitaciones</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-xs text-red-600 mb-1">Vencidos</div>
          <div className="text-3xl font-bold text-red-700">
            {stats.vencidos}
          </div>
          <div className="text-xs text-red-500 mt-0.5">requieren acción</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="text-xs text-yellow-700 mb-1">Próximos a vencer</div>
          <div className="text-3xl font-bold text-yellow-800">
            {stats.proximos}
          </div>
          <div className="text-xs text-yellow-600 mt-0.5">
            ≤ {warnDays} días
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-xs text-green-600 mb-1">Vigentes</div>
          <div className="text-3xl font-bold text-green-700">
            {stats.vigentes}
          </div>
          <div className="text-xs text-green-500 mt-0.5">en regla</div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 block mb-1">Buscar</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Persona, curso..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Área</label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="Todas">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Rol</label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="Todos">Todos los roles</option>
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Curso</label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="Todos">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Estado</label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="Vencido">Vencido</option>
              <option value="Próximo">Próximo</option>
              <option value="Vigente">Vigente</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Umbral "Próximo" (días)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={warnDays}
              onChange={(e) =>
                setWarnDays(
                  Math.max(1, Math.min(365, Number(e.target.value || 30))),
                )
              }
            />
            <div className="text-xs text-slate-400 mt-0.5">
              vence en ≤ {warnDays} días → Próximo
            </div>
          </div>
          {hasActiveFilters && (
            <button
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* View toggle + main content */}
      <div>
        <div className="flex items-center gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setView("personas")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "personas"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Por persona ({filteredPeople.length})
          </button>
          <button
            onClick={() => setView("historial")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "historial"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Historial ({filteredRows.length})
          </button>
        </div>

        {view === "personas" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPeople.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                rows={computedRows}
                onDetail={openPersonDetail}
              />
            ))}
            {filteredPeople.length === 0 && (
              <div className="col-span-4 text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">👥</div>
                No hay personas que coincidan con los filtros.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-3 px-4 font-medium">Persona</th>
                    <th className="py-3 px-4 font-medium">Área / Rol</th>
                    <th className="py-3 px-4 font-medium">Curso</th>
                    <th className="py-3 px-4 font-medium">Fecha</th>
                    <th className="py-3 px-4 font-medium">Vence</th>
                    <th className="py-3 px-4 font-medium">Estado</th>
                    <th className="py-3 px-4 font-medium">Días</th>
                    <th className="py-3 px-4 font-medium">Evidencia</th>
                    <th className="py-3 px-4 font-medium">Nota</th>
                    <th className="py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((x) => (
                    <tr key={x.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {x.persona}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{x.area}</div>
                        <div className="text-xs text-slate-400">{x.rol}</div>
                      </td>
                      <td className="py-3 px-4">{x.curso}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {fmtDate(x.fecha)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {fmtDate(x.vence)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={x.status} />
                      </td>
                      <td className="py-3 px-4">
                        {typeof x.daysToExpire === "number" &&
                        !isNaN(x.daysToExpire) ? (
                          <span
                            className={
                              x.daysToExpire < 0
                                ? "text-red-700 font-semibold"
                                : x.daysToExpire <= warnDays
                                  ? "text-yellow-800 font-semibold"
                                  : "text-slate-700"
                            }
                          >
                            {x.daysToExpire}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {x.evidencia ? (
                          <a
                            href={x.evidencia}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Ver evidencia
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {typeof x.nota === "number" ? x.nota : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="text-xs text-slate-600 hover:text-slate-900 underline"
                          onClick={() => openPersonDetail(x.personaId)}
                        >
                          Ver persona
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-12 text-center text-slate-400"
                      >
                        No hay registros que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Compliance by area */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">
            Cumplimiento por área
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cursos obligatorios según rol — No conforme incluye faltantes y
            vencidos
          </p>
        </div>
        {compliance.byArea.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-3 px-4 font-medium">Área</th>
                  <th className="py-3 px-4 font-medium">Vigentes</th>
                  <th className="py-3 px-4 font-medium">Próximos</th>
                  <th className="py-3 px-4 font-medium">No conforme</th>
                  <th className="py-3 px-4 font-medium min-w-[180px]">
                    Cumplimiento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compliance.byArea.map((x) => {
                  const total = (x.ok || 0) + (x.warn || 0) + (x.bad || 0);
                  const pct =
                    total > 0 ? Math.round(((x.ok || 0) / total) * 100) : 0;
                  return (
                    <tr key={x.area} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {x.area}
                      </td>
                      <td className="py-3 px-4 text-green-700">{x.ok}</td>
                      <td className="py-3 px-4 text-yellow-800">{x.warn}</td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            x.bad > 0
                              ? "text-red-700 font-semibold"
                              : "text-slate-600"
                          }
                        >
                          {x.bad}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                pct >= 80
                                  ? "bg-green-500"
                                  : pct >= 50
                                    ? "bg-yellow-400"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 text-sm">
            Sin datos de cumplimiento por área.
          </div>
        )}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">
              Acciones de seguimiento
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reentrenamientos y tareas de seguimiento activas
            </p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-3 px-4 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">Tipo</th>
                  <th className="py-3 px-4 font-medium">Persona</th>
                  <th className="py-3 px-4 font-medium">Curso</th>
                  <th className="py-3 px-4 font-medium">Vence</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {a.id}
                    </td>
                    <td className="py-3 px-4">{a.tipo}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {a.persona}
                    </td>
                    <td className="py-3 px-4">{a.curso}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {fmtDate(a.vence)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill
                        status={
                          a.estado === "Cerrada" ? "Cerrada" : "Pendiente"
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        onClick={async () => {
                          const nuevoEstado =
                            a.estado === "Cerrada" ? "Pendiente" : "Cerrada";
                          await updateActionEstado(a.idAccion, nuevoEstado);
                          setActions((prev) =>
                            prev.map((x) =>
                              x.idAccion === a.idAccion
                                ? { ...x, estado: nuevoEstado }
                                : x,
                            ),
                          );
                        }}
                      >
                        {a.estado === "Cerrada" ? "Reabrir" : "Cerrar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Register training */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Registrar capacitación"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Persona <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.personaId}
              onChange={(e) =>
                setForm((x) => ({ ...x, personaId: e.target.value }))
              }
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.area} / {p.rol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Curso <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.cursoId}
              onChange={(e) =>
                setForm((x) => ({ ...x, cursoId: e.target.value }))
              }
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.obligatorio ? "★ Obligatorio" : ""}
                </option>
              ))}
            </select>
            {(() => {
              const c = courses.find((c) => c.id === Number(form.cursoId));
              return c ? (
                <div className="text-xs text-slate-500 mt-1">
                  Vigencia:{" "}
                  <span className="font-semibold text-slate-700">
                    {c.vigenciaMeses} meses
                  </span>
                </div>
              ) : null;
            })()}
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Fecha de realización <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.fecha}
              onChange={(e) =>
                setForm((x) => ({ ...x, fecha: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Vencimiento (calculado automáticamente)
            </label>
            <div
              className={`border rounded-lg px-3 py-2 text-sm ${
                previewVence
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {previewVence
                ? fmtDate(previewVence)
                : "Selecciona curso y fecha"}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Nota (0–20, opcional)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.nota}
              onChange={(e) => setForm((x) => ({ ...x, nota: e.target.value }))}
              placeholder="Ej: 18"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Evidencia (URL o nombre de archivo)
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Ej: certificado.pdf"
              value={form.evidencia}
              onChange={(e) =>
                setForm((x) => ({ ...x, evidencia: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 text-sm"
              onClick={registerTraining}
            >
              Registrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Person detail */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detalle por persona"
      >
        {!selectedPerson ? (
          <div className="text-sm text-slate-600">
            No hay persona seleccionada.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Person header */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 flex-shrink-0">
                {selectedPerson.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-xl font-semibold text-slate-900">
                  {selectedPerson.name}
                </div>
                <div className="text-sm text-slate-600">
                  {selectedPerson.area} · {selectedPerson.rol}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {selectedPersonRows.length} capacitación
                  {selectedPersonRows.length !== 1 ? "es" : ""} registrada
                  {selectedPersonRows.length !== 1 ? "s" : ""}
                </div>
              </div>
              <StatusPill
                status={worstStatus(selectedPersonRows.map((r) => r.status))}
              />
            </div>

            {/* Required courses */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Cursos obligatorios
              </h3>
              {courses.filter((c) => c.obligatorio).length > 0 ? (
                <div className="space-y-2">
                  {courses
                    .filter((c) => c.obligatorio)
                    .map((course) => {
                      const record = selectedPersonRows.find(
                        (r) => r.curso === course.name,
                      );
                      return (
                        <div
                          key={course.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 bg-white"
                        >
                          <div>
                            <div className="text-sm text-slate-800">
                              {course.name}
                            </div>
                            {record ? (
                              <div className="text-xs text-slate-500 mt-0.5">
                                Vence: {fmtDate(record.vence)}
                                {typeof record.daysToExpire === "number" &&
                                  !isNaN(record.daysToExpire) && (
                                    <span
                                      className={
                                        record.daysToExpire < 0
                                          ? " text-red-600 font-medium"
                                          : " text-slate-400"
                                      }
                                    >
                                      {record.daysToExpire < 0
                                        ? ` (vencido hace ${Math.abs(record.daysToExpire)} días)`
                                        : ` (faltan ${record.daysToExpire} días)`}
                                    </span>
                                  )}
                              </div>
                            ) : (
                              <div className="text-xs text-red-500 mt-0.5">
                                Sin registro
                              </div>
                            )}
                          </div>
                          <StatusPill
                            status={record ? record.status : "Vencido"}
                          />
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-sm text-slate-400 py-2">
                  No hay cursos obligatorios configurados.
                </div>
              )}
            </div>

            {/* Training history */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Historial completo
              </h3>
              <div className="overflow-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-600 border-b">
                      <th className="py-2 px-4 font-medium">Curso</th>
                      <th className="py-2 px-4 font-medium">Fecha</th>
                      <th className="py-2 px-4 font-medium">Vence</th>
                      <th className="py-2 px-4 font-medium">Estado</th>
                      <th className="py-2 px-4 font-medium">Evidencia</th>
                      <th className="py-2 px-4 font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPersonRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 px-4 font-medium text-slate-800">
                          {r.curso}
                        </td>
                        <td className="py-2 px-4 text-slate-600">
                          {fmtDate(r.fecha)}
                        </td>
                        <td className="py-2 px-4 text-slate-600">
                          {fmtDate(r.vence)}
                        </td>
                        <td className="py-2 px-4">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="py-2 px-4">
                          {r.evidencia ? (
                            <a
                              href={r.evidencia}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Ver
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {typeof r.nota === "number" ? r.nota : "—"}
                        </td>
                      </tr>
                    ))}
                    {selectedPersonRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-400"
                        >
                          Sin historial de capacitaciones.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
