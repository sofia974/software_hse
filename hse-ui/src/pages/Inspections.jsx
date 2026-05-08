import { useMemo, useState, useEffect } from "react";
import Card from "../components/Card";
import ModalCrearChecklist from "../components/ModalCrearChecklist";
import toast from "react-hot-toast"; // Importante
// -------------------- UI Helpers --------------------
function StatusBadge({ status }) {
  const base = "text-xs px-2 py-1 rounded border";
  if (status === "Completada")
    return (
      <span className={`${base} bg-green-50 text-green-700 border-green-200`}>
        Completada
      </span>
    );
  if (status === "En proceso")
    return (
      <span
        className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}
      >
        En proceso
      </span>
    );
  return (
    <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
      Pendiente
    </span>
  );
}

function ResultBadge({ ok }) {
  const base = "text-xs px-2 py-1 rounded border";
  if (ok === true)
    return (
      <span className={`${base} bg-green-50 text-green-700 border-green-200`}>
        OK
      </span>
    );
  if (ok === false)
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
        NO
      </span>
    );
  return (
    <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>
      —
    </span>
  );
}

function SeverityBadge({ sev }) {
  const base = "text-xs px-2 py-1 rounded border";
  if (sev === "Alta")
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
        Alta
      </span>
    );
  if (sev === "Media")
    return (
      <span
        className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}
      >
        Media
      </span>
    );
  return (
    <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>
      Baja
    </span>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">{title}</div>
          {/* <button
            className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-sm"
            onClick={onClose}
          >
            Cerrar
          </button> */}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// -------------------- Utils --------------------
const _uid = () => Math.random().toString(16).slice(2, 10).toUpperCase();

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// -------------------- Main --------------------
export default function Inspections() {
  const [isEditing, setIsEditing] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [area, setArea] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [filterChecklist, setFilterChecklist] = useState("Todos");
  const [checklists, setChecklists] = useState([]);
  const [areas, setAreas] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [inspections, setInspections] = useState([]);
  const [actions, setActions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const selected = inspections.find((i) => i.id === selectedId) || null;
  const locked = !selected || selected.status === "Completada" || !isEditing;

  const filtered = useMemo(() => {
    return inspections.filter((i) => {
      const s = q.trim().toLowerCase();

      const matchQ =
        !s ||
        String(i.id).includes(s) ||
        (i.area || "").toLowerCase().includes(s) ||
        (i.checklist || "").toLowerCase().includes(s) ||
        (i.responsable || "").toLowerCase().includes(s) ||
        (i.nombreEmpresa || "").toLowerCase().includes(s);

      const matchArea = area === "Todas" || String(i.idArea) === String(area);
      const matchStatus = status === "Todos" || i.status === status;
      const matchChecklist =
        filterChecklist === "Todos" || i.checklist === filterChecklist;

      const fechaISO = i.fecha ? String(i.fecha).slice(0, 10) : "";
      const matchFrom = !dateFrom || fechaISO >= dateFrom;
      const matchTo = !dateTo || fechaISO <= dateTo;

      return (
        matchQ &&
        matchArea &&
        matchStatus &&
        matchChecklist &&
        matchFrom &&
        matchTo
      );
    });
  }, [inspections, q, area, status, filterChecklist, dateFrom, dateTo]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInspections() {
      // 1. Extraer el token
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!token) {
        setError("No hay sesión activa. Por favor, inicia sesión.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 2. Configurar la petición con Authorization
        const response = await fetch("http://localhost:4000/api/inspections", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error("Sesión expirada");
          throw new Error("Error al obtener las inspecciones");
        }

        const data = await response.json();

        // 3. Validar que los datos sean un array
        setInspections(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error en Inspecciones:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInspections();
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    setIsEditing(false);

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch(`http://localhost:4000/api/inspections/${selectedId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No autorizado o error de servidor");
        return res.json();
      })
      .then((data) => {
        // Validamos que data y data.selected existan para evitar el TypeError
        if (data && data.selected) {
          setInspections((prev) =>
            prev.map((i) =>
              i.id === data.selected.id ? { ...i, ...data.selected } : i,
            ),
          );
          // Si tu API también devuelve las acciones aquí, las seteamos
          if (data.actions) setActions(data.actions);
        }
      })
      .catch((err) => console.error("Error fetching inspection:", err));
  }, [selectedId]);

  const updateItem = async (inspectionId, itemId, changes) => {
    // 1. Obtener token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    // Buscar el item actual
    const item = selected.items.find((i) => i.id === itemId);
    if (!item) return;

    // Mantener valores actuales
    const payload = {
      ok: item.ok,
      comentario: item.comentario,
      ...changes,
    };

    try {
      // 2. PUT con Token
      const resPut = await fetch(
        `http://localhost:4000/api/inspections/${inspectionId}/items/${itemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Agregado
          },
          body: JSON.stringify(payload),
        },
      );

      if (!resPut.ok) throw new Error("Error al actualizar el item");

      // 3. GET con Token para recargar
      const resGet = await fetch(
        `http://localhost:4000/api/inspections/${inspectionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Agregado
          },
        },
      );

      if (!resGet.ok) throw new Error("Error al obtener la inspección");

      const data = await resGet.json();

      // 4. Validación de seguridad (El error de 'id' venía de aquí)
      // Asumimos que el backend devuelve la inspección en data o data.selected
      const inspeccionActualizada = data.selected || data;

      if (inspeccionActualizada && inspeccionActualizada.id) {
        setInspections((prev) =>
          prev.map((i) =>
            i.id === inspeccionActualizada.id ? inspeccionActualizada : i,
          ),
        );

        // Si usas un estado para la inspección seleccionada actualmente, actualízalo también
        // setSelected(inspeccionActualizada);
      }

      if (data.actions) setActions(data.actions);
    } catch (err) {
      console.error("Error en updateItem:", err);
      alert("No se pudo actualizar: " + err.message);
    }
  };
  const addFindingFromItem = async (inspectionId, item) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const payload = {
      titulo: item.q,
      severidad: "Media",
      categoria: "Checklist",
      accionRecomendada: item.comentario || "",
    };
    await fetch(
      `http://localhost:4000/api/inspections/${inspectionId}/items/${item.id}/findings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Agregado
        },
        body: JSON.stringify(payload),
      },
    );
    const res = await fetch(
      `http://localhost:4000/api/inspections/${inspectionId}`,
      {
        headers: { Authorization: `Bearer ${token}` }, // Agregado
      },
    );
    const data = await res.json();

    if (data && data.selected) {
      // Validación mínima para evitar el error de 'id'
      setInspections((prev) =>
        prev.map((i) => (i.id === data.selected.id ? data.selected : i)),
      );
    }
    if (data && data.actions) setActions(data.actions);
    toast.success("¡Hallazgo creado correctamente!");
  };
  const updateFinding = async (inspectionId, findingId, payload) => {
    // 1. Obtener el token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const f = selected.findings.find((x) => x.id === findingId);

    const body = {
      severidad: payload.severidad ?? f.severidad,
      accionRecomendada: payload.accionRecomendada ?? f.accionRecomendada,
      estado: payload.estado ?? f.estado,
    };

    // 2. PUT con Authorization
    await fetch(`http://localhost:4000/api/findings/${findingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Agregado
      },
      body: JSON.stringify(body),
    });

    // 3. GET con Authorization
    const res = await fetch(
      `http://localhost:4000/api/inspections/${inspectionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Agregado
        },
      },
    );

    const data = await res.json();

    // 4. Validación para evitar el error de 'id' si la respuesta no es la esperada
    if (data && data.selected) {
      setInspections((prev) =>
        prev.map((i) =>
          i.id === data.selected.id ? { ...i, ...data.selected } : i,
        ),
      );
    }

    if (data && data.actions) setActions(data.actions);
  };

  const createActionFromFinding = async (inspectionId, finding) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    await fetch(`http://localhost:4000/api/findings/${finding.id}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Agregado
      },
      body: JSON.stringify({
        titulo: finding.accionRecomendada || finding.titulo,
        responsable: selected.responsable,
      }),
    });

    const res = await fetch(
      `http://localhost:4000/api/inspections/${inspectionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Agregado
        },
      },
    );

    const data = await res.json();

    // Cambiamos setActions(data.actions) por esto para evitar el error del .map
    if (data && data.actions) {
      setActions(data.actions);
      toast.success("¡Acción creada correctamente!");
    } else {
      setActions([]); // Si falla, inicializamos como array vacío
      toast.error("Hubo un error al intentar crear la acción.");
    }
  };

  const toggleActionDone = async (id) => {
    // 1. Obtener el token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const action = actions.find((a) => a.id === id);
    if (!action) return;

    const newState = action.estado === "Cerrada" ? "Pendiente" : "Cerrada";

    // 2. Agregar Authorization header
    await fetch(`http://localhost:4000/api/actions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Agregado
      },
      body: JSON.stringify({
        estado: newState,
      }),
    });

    // 3. Actualizar el estado localmente
    setActions(
      actions.map((a) => (a.id === id ? { ...a, estado: newState } : a)),
    );
  };

  useEffect(() => {
    if (!selectedId) return;

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch(`http://localhost:4000/api/inspections/${selectedId}/actions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No autorizado");
        return res.json();
      })
      .then((data) => {
        // Nos aseguramos de que data sea un array antes de setearlo
        setActions(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error fetching actions:", err));
  }, [selectedId]);
  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [newInspection, setNewInspection] = useState({
    fecha: "",
    idArea: "",
    idChecklist: "",
    responsable: "",
  });
  // Efecto para Áreas
  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch("http://localhost:4000/api/areas", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error en el servidor");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAreas(data);
          // Solo intenta setear el default si hay datos
          if (data.length > 0) {
            setNewInspection((prev) => ({ ...prev, idArea: data[0].idArea }));
          }
        }
      })
      .catch((err) => {
        console.error("Error cargando áreas:", err);
        setAreas([]); // Evita que .map() falle
      });
  }, []);

  // Efecto para Checklists
  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    fetch("http://localhost:4000/api/checklists", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setChecklists(Array.isArray(data) ? data : []))
      .catch(() => setChecklists([]));
  }, []);
  const kpis = useMemo(() => {
    const total = inspections.length;
    const pendientes = inspections.filter(
      (i) => i.status === "Pendiente",
    ).length;
    const proceso = inspections.filter((i) => i.status === "En proceso").length;
    const completas = inspections.filter(
      (i) => i.status === "Completada",
    ).length;
    const complValues = inspections
      .map((i) => i.cumplimiento)
      .filter((x) => typeof x === "number");
    const promedio = complValues.length
      ? Math.round(complValues.reduce((a, b) => a + b, 0) / complValues.length)
      : null;
    const hallazgosAbiertos = inspections.reduce(
      (acc, i) =>
        acc + (i.findings || []).filter((f) => f.estado !== "Cerrado").length,
      0,
    );
    const accionesPendientes = inspections.reduce(
      (acc, i) =>
        acc + (i.actions || []).filter((a) => a.estado !== "Cerrada").length,
      0,
    );
    return {
      total,
      pendientes,
      proceso,
      completas,
      promedio,
      hallazgosAbiertos,
      accionesPendientes,
    };
  }, [inspections]);
  const openCreate = () => {
    setNewInspection({
      fecha: todayISO(),
      idArea: "",
      idChecklist: "",
      responsable: "",
    });

    setCreateOpen(true);
  };
  const createInspection = async () => {
    try {
      // Obtener el token
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const res = await fetch("http://localhost:4000/api/inspections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Agregado
        },
        body: JSON.stringify(newInspection),
      });

      const data = await res.json();

      if (data.success) {
        setCreateOpen(false);
        // Volver a cargar con token
        const res = await fetch("http://localhost:4000/api/inspections", {
          headers: {
            Authorization: `Bearer ${token}`, // Agregado
          },
        });
        const data2 = await res.json();
        setInspections(data2);
        toast.success("¡Inspección creada correctamente!");
      }
    } catch (error) {
      // console.error(error);
      toast.error("Hubo un error al intentar guardar la Inspeccion.", error);
    }
  };

  const toggleCloseInspection = async (inspectionId) => {
    // 1. Obtener el token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const inspection = inspections.find((i) => i.id === inspectionId);
    if (!inspection) return;

    const newStatus =
      inspection.status === "Completada" ? "En proceso" : "Completada";

    // 2. PUT con Authorization
    await fetch(
      `http://localhost:4000/api/inspections/${inspectionId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Agregado
        },
        body: JSON.stringify({
          estado: newStatus,
        }),
      },
    );

    // 3. Volver a cargar la inspección con Authorization
    const res = await fetch(
      `http://localhost:4000/api/inspections/${inspectionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Agregado
        },
      },
    );
    const data = await res.json();
    // 4. Validación para evitar el error de 'id' (Cannot read properties of undefined)
    if (data && data.selected) {
      setInspections((prev) =>
        prev.map((i) => (i.id === data.selected.id ? data.selected : i)),
      );
      if (data.actions) setActions(data.actions);
    }
    // Si se reabrió, activar edición automáticamente
    if (newStatus !== "Completada") setIsEditing(true);
    else setIsEditing(false);
  };
  // -------------------- UI --------------------
  return (
    <main className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Inspecciones
          </h1>
          <p className="text-sm text-slate-500">
            Checklists, hallazgos y acciones (CAPA) en una sola vista.
          </p>
        </div>

        <button
          className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
          onClick={openCreate}
        >
          + Nueva inspección
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Card title="Total">
            <div className="text-3xl font-semibold text-slate-900">
              {kpis.total}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Inspecciones registradas
            </div>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card title="Pendientes / En proceso">
            <div className="text-3xl font-semibold text-slate-900">
              {kpis.pendientes + kpis.proceso}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Pendientes: {kpis.pendientes} • En proceso: {kpis.proceso}
            </div>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card title="Promedio % Cumpl.">
            <div className="text-3xl font-semibold text-slate-900">
              {kpis.promedio === null ? "—" : `${kpis.promedio}%`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Solo inspecciones con respuestas
            </div>
          </Card>
        </div>
        <div className="col-span-12 md:col-span-3">
          <Card title="Hallazgos / Acciones abiertas">
            <div className="text-3xl font-semibold text-slate-900">
              {kpis.hallazgosAbiertos}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Acciones no cerradas: {kpis.accionesPendientes}
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
              placeholder="ID, área, checklist, responsable..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Área</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="Todas">Todas</option>
              {areas.map((x) => (
                <option key={x.idArea} value={x.idArea}>
                  {x.Nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Estado</div>
            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
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
              value={filterChecklist}
              onChange={(e) => setFilterChecklist(e.target.value)}
            >
              <option value="Todos">Todos</option>
              {checklists.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-6 md:col-span-1">
            <div className="text-xs text-slate-500 mb-1">Desde</div>
            <input
              type="date"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="col-span-6 md:col-span-1">
            <div className="text-xs text-slate-500 mb-1">Hasta</div>
            <input
              type="date"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
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
                    <th className="py-2 pr-3">Empresa</th>
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
                    const isActive = x.id === selectedId;
                    const openFindings = x.openFindings || 0;
                    return (
                      <tr
                        key={x.id}
                        className={`border-b last:border-b-0 cursor-pointer ${isActive ? "bg-slate-50" : ""}`}
                        onClick={() => setSelectedId(x.id)}
                      >
                        <td className="py-2 pr-3 font-semibold">{`INSP-${x.id}`}</td>
                        <td className="py-2 pr-3 text-xs font-medium text-slate-500 uppercase">
                          {x.nombreEmpresa || "N/A"}
                        </td>
                        <td className="py-2 pr-3">
                          {new Date(x.fecha).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2 pr-3">{x.area}</td>
                        <td className="py-2 pr-3">{x.checklist}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={x.status} />
                        </td>
                        <td className="py-2 pr-3">
                          {x.cumplimiento === null ? "—" : `${x.cumplimiento}%`}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`text-xs ${openFindings > 0 ? "text-red-700 font-semibold" : "text-slate-600"}`}
                          >
                            {openFindings}
                          </span>
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
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-6 text-center text-slate-500"
                      >
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
              <div className="text-sm text-slate-500">
                Selecciona una inspección para ver el detalle.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">{`INSP-${selected.id}`}</div>
                    <div className="font-semibold text-slate-800">
                      {selected.checklist}
                    </div>
                    <div className="text-sm text-slate-600">
                      {selected.area} •{" "}
                      {new Date(selected.fecha).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      Responsable:{" "}
                      <span className="text-slate-700 font-semibold">
                        {selected.responsable || "—"}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 mb-1">
                      % Cumplimiento
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {selected.cumplimiento === null
                        ? "—"
                        : `${selected.cumplimiento}%`}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Auto-calculado según respuestas
                    </div>
                  </div>
                  <div className="p-3 rounded border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 mb-1">
                      Hallazgos abiertos
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {
                        (selected.findings || []).filter(
                          (f) => f.estado !== "Cerrado",
                        ).length
                      }
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Desde checklist / manual
                    </div>
                  </div>
                </div>

                {/* Checklist interactive */}
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Checklist
                  </div>
                  <div className="space-y-2">
                    {selected.items?.map((it) => (
                      <div
                        key={it.id}
                        className="border rounded p-3 bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm text-slate-800 font-medium">
                            {it.q}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={locked}
                              className={`text-xs px-2 py-1 rounded border ${
                                locked
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : it.ok === true
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                              onClick={() =>
                                updateItem(selected.id, it.id, { ok: true })
                              }
                            >
                              OK
                            </button>

                            <button
                              disabled={locked}
                              className={`text-xs px-2 py-1 rounded border ${
                                locked
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : it.ok === false
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                              onClick={() =>
                                updateItem(selected.id, it.id, { ok: false })
                              }
                            >
                              NO
                            </button>

                            <button
                              disabled={locked}
                              className="text-xs px-2 py-1 rounded border bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                              onClick={() =>
                                updateItem(selected.id, it.id, { ok: null })
                              }
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
                            disabled={locked || it.ok !== false}
                            className={`text-xs px-2 py-1 rounded border ${
                              locked || it.ok !== false
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                            }`}
                            onClick={() => addFindingFromItem(selected.id, it)}
                          >
                            + Hallazgo
                          </button>
                        </div>

                        <div className="mt-2">
                          <div className="text-xs text-slate-500 mb-1">
                            Comentario
                          </div>

                          <input
                            disabled={locked}
                            className={`w-full border rounded px-3 py-2 text-sm ${
                              locked
                                ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                : "bg-white border-slate-200"
                            }`}
                            placeholder="Detalle del hallazgo..."
                            defaultValue={it.comentario || ""}
                            onBlur={(e) =>
                              updateItem(selected.id, it.id, {
                                comentario: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hallazgos */}
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Hallazgos
                  </div>
                  {(selected.findings || []).length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No hay hallazgos registrados.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selected.findings.map((f) => (
                        <div
                          key={f.id}
                          className="p-3 rounded border border-slate-200 bg-white"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">
                                {f.titulo}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Categoría:{" "}
                                <span className="text-slate-700 font-semibold">
                                  {f.categoria || "—"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <SeverityBadge sev={f.severidad} />
                              <StatusBadge
                                status={
                                  f.estado === "Cerrado"
                                    ? "Completada"
                                    : "En proceso"
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2 mt-3">
                            <div className="col-span-12 md:col-span-4">
                              <div className="text-xs text-slate-500 mb-1">
                                Severidad
                              </div>

                              <select
                                disabled={locked}
                                className={`w-full border border-slate-200 rounded px-3 py-2 text-sm ${
                                  locked
                                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-white border-slate-200"
                                }`}
                                value={f.severidad}
                                onChange={(e) =>
                                  updateFinding(selected.id, f.id, {
                                    severidad: e.target.value,
                                  })
                                }
                              >
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                              </select>
                            </div>

                            <div className="col-span-12 md:col-span-8">
                              <div className="text-xs text-slate-500 mb-1">
                                Acción recomendada
                              </div>

                              <input
                                disabled={locked}
                                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                                value={f.accionRecomendada || ""}
                                onChange={(e) =>
                                  updateFinding(selected.id, f.id, {
                                    accionRecomendada: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="col-span-12 flex items-center justify-between mt-1">
                              <button
                                disabled={locked}
                                className={`text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200 ${
                                  locked
                                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-white border-slate-200"
                                }`}
                                onClick={() =>
                                  createActionFromFinding(selected.id, f)
                                }
                              >
                                Crear acción CAPA
                              </button>

                              <button
                                disabled={locked}
                                // className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                className={`text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200 ${
                                  locked
                                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-white border-slate-200"
                                }`}
                                onClick={() =>
                                  updateFinding(selected.id, f.id, {
                                    estado:
                                      f.estado === "Cerrado"
                                        ? "Abierto"
                                        : "Cerrado",
                                  })
                                }
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
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Acciones (CAPA)
                  </div>
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
                        {actions.map((a) => (
                          <tr key={a.id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-semibold">{`ACT-${a.id}`}</td>
                            <td className="py-2 pr-3">{a.titulo}</td>
                            <td className="py-2 pr-3">{a.responsable}</td>
                            <td className="py-2 pr-3">
                              <StatusBadge
                                status={
                                  a.estado === "Cerrada"
                                    ? "Completada"
                                    : a.estado === "En proceso"
                                      ? "En proceso"
                                      : "Pendiente"
                                }
                              />
                            </td>
                            <td className="py-2">
                              <button
                                disabled={locked}
                                className={`text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200${
                                  locked
                                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-white border-slate-200"
                                }`}
                                // className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                onClick={() => toggleActionDone(a.id)}
                              >
                                {a.estado === "Cerrada" ? "Reabrir" : "Cerrar"}
                              </button>
                            </td>
                          </tr>
                        ))}

                        {actions.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 text-center text-slate-500"
                            >
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
                  {/* <button
                    className="px-4 py-2 rounded border hover:bg-slate-50"
                    onClick={() => setIsEditing((prev) => !prev)}
                    disabled={selected.status === "Completada"}
                  >
                    {isEditing ? "Cancelar edición" : "Editar"}
                  </button> */}
                  <button
                    className="px-4 py-2 rounded border hover:bg-slate-50"
                    onClick={() => setIsEditing((prev) => !prev)}
                  >
                    {isEditing ? "Cancelar edición" : "Editar"}
                  </button>

                  {(selected.status !== "Completada" || isEditing) && (
                    <button
                      className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
                      onClick={() => toggleCloseInspection(selected.id)}
                    >
                      {selected.status === "Completada"
                        ? "Reabrir inspección"
                        : "Cerrar inspección"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva inspección"
      >
        <div className="grid grid-cols-12 gap-3 ">
          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Fecha</div>
            <input
              type="date"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={newInspection.fecha}
              onChange={(e) =>
                setNewInspection((x) => ({ ...x, fecha: e.target.value }))
              }
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Área</div>

            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={newInspection.idArea || ""}
              onChange={(e) =>
                setNewInspection((x) => ({
                  ...x,
                  idArea: Number(e.target.value),
                }))
              }
            >
              <option value="">Seleccionar área</option>

              {areas.map((a) => (
                <option key={a.idArea} value={a.idArea}>
                  {a.Nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-slate-500">Checklist</div>
              {/* <button
                type="button"
                className="text-xs text-slate-500 underline hover:text-slate-800"
                onClick={() => setChecklistModalOpen(true)}
              >
                + Crear nuevo
              </button> */}
            </div>

            <select
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={newInspection.idChecklist || ""}
              onChange={(e) =>
                setNewInspection((x) => ({
                  ...x,
                  idChecklist: Number(e.target.value),
                }))
              }
            >
              <option value="">Seleccionar checklist</option>
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>
                  {/* CAMBIO AQUÍ: Usar c.nombre o c.name según el backend */}
                  {c.nombre || c.name}
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
              onChange={(e) =>
                setNewInspection((x) => ({ ...x, responsable: e.target.value }))
              }
            />
          </div>

          <div className="col-span-12 flex items-center justify-end gap-2 mt-2">
            <button
              className="px-4 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 text-sm"
              onClick={createInspection}
            >
              Crear inspección
            </button>
          </div>
        </div>
      </Modal>

      <ModalCrearChecklist
        open={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        onSave={(newChecklist) => {
          setChecklists((prev) => [...prev, newChecklist]);
          setNewInspection((x) => ({ ...x, idChecklist: newChecklist.id }));
          setChecklistModalOpen(false);
        }}
      />
    </main>
  );
}
