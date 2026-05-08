import { useState, useRef, useMemo, useEffect } from "react";
import Card from "../components/Card";
import ModalRegistrarRiesgo from "../components/ModalRegistrarRiesgo";
import toast from "react-hot-toast"; // Importante
const AREAS = ["Planta", "Patio", "Taller", "Almacén", "Oficinas"];
const uid = () => Math.random().toString(16).slice(2, 10).toUpperCase();
const toneStyles = {
  green: {
    badge: "bg-green-100 text-green-700 border-green-200",
    cell: "bg-green-100 border-green-200 text-green-700",
  },
  yellow: {
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    cell: "bg-yellow-100 border-yellow-200 text-yellow-800",
  },
  red: {
    badge: "bg-red-100 text-red-700 border-red-200",
    cell: "bg-red-100 border-red-200 text-red-700",
  },
  slate: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    cell: "bg-slate-100 border-slate-200 text-slate-700",
  },
};

// Formulario de nuevo control

function clampInt(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function fmtDate(d) {
  if (!d) return "-";

  const date = String(d).split("T")[0]; // quita la hora
  const [y, m, day] = date.split("-");

  if (!y || !m || !day) return d;

  return `${day}/${m}/${y}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysUntil(dateISO) {
  if (!dateISO) return null;
  const t = new Date(todayISO()).getTime();
  const d = new Date(dateISO).getTime();
  const diff = Math.round((d - t) / (1000 * 60 * 60 * 24));
  return diff;
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
    .sort((a, b) => a.min - b.min);
}

function computeCoverageWarnings(levels, maxScore) {
  const sorted = normalizeLevels(levels);
  const warnings = { gaps: [], overlaps: [] };
  let cursor = 1;

  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i];
    if (l.max < 1 || l.min > maxScore) continue;
    const min = Math.max(1, l.min);
    const max = Math.min(maxScore, l.max);

    if (min > cursor) warnings.gaps.push({ from: cursor, to: min - 1 });

    if (i > 0) {
      const prev = sorted[i - 1];
      const prevMin = Math.max(1, prev.min);
      const prevMax = Math.min(maxScore, prev.max);
      if (min <= prevMax) {
        warnings.overlaps.push({
          a: `${prev.name} (${prevMin}-${prevMax})`,
          b: `${l.name} (${min}-${max})`,
        });
      }
    }
    cursor = Math.max(cursor, max + 1);
  }

  if (cursor <= maxScore) warnings.gaps.push({ from: cursor, to: maxScore });
  return warnings;
}

function score(p, s) {
  return p * s;
}

// ------------------ Storage ------------------
const STORAGE_KEY = "hse_risk_config_v1";
// ------------------ Default config ------------------
const DEFAULT_LEVELS = [
  { id: "LVL-" + uid(), name: "Bajo", min: 1, max: 8, tone: "green" },
  { id: "LVL-" + uid(), name: "Medio", min: 9, max: 15, tone: "yellow" },
  { id: "LVL-" + uid(), name: "Crítico", min: 16, max: 25, tone: "red" },
];

const DEFAULT_CONFIG = {
  matrixSize: 5,
  levels: DEFAULT_LEVELS,
};

// ------------------ Small UI helpers ------------------
function Badge({ tone = "slate", children }) {
  const st = toneStyles[tone] || toneStyles.slate;
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-1 rounded border ${st.badge}`}
    >
      {children}
    </span>
  );
}

function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 ">
      <div className="absolute inset-0 bg-black/30 " onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">{title}</div>
          <button
            className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">{title}</div>
          <button
            className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-sm"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
const ImagenProtegida = ({ filename, alt, className }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch(`http://localhost:4000/uploads/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No autorizado");
        return res.blob(); // Convertimos la respuesta en un objeto binario
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob); // Creamos una URL local
        setSrc(url);
      })
      .catch((err) => console.error("Error cargando imagen protegida:", err));

    // Limpieza de memoria al desmontar
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [filename]);

  if (!src)
    return <div className="w-full h-32 bg-slate-100 animate-pulse rounded" />;

  return <img src={src} alt={alt} className={className} />;
};
// ------------------ Main ------------------
export default function Risks() {
  const [currentHistory, setCurrentHistory] = useState([]);
  const [jerarquias, setJerarquias] = useState([]);
  const [areas, setAreas] = useState([]);
  const [newJerarquias, setNewJerarquias] = useState({
    idJerarquia: "",
    tipoJerarquia: "",
  });
  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch("http://localhost:4000/api/riesgosJerarquia", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error en el servidor");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setJerarquias(data);
          // Solo intenta setear el default si hay datos
          if (data.length > 0) {
            setNewJerarquias((prev) => ({
              ...prev,
              idJerarquia: data[0].idJerarquia,
            }));
          }
        }
      })
      .catch((err) => {
        console.error("Error cargando peligros:", err);
        setJerarquias([]); // Evita que .map() falle
      });
  }, []);

  const cargarAdjuntos = async (riesgoId) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:4000/api/adjuntos/${riesgoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) return;
      const data = await res.json();

      setRisks((prev) =>
        prev.map((r) =>
          r.id === riesgoId
            ? { ...r, adjuntos: Array.isArray(data) ? data : [] }
            : r,
        ),
      );
    } catch (err) {
      console.error("Error en cargarAdjuntos:", err);
    }
  };

  const subirEvidencia = async (controlId, file, tituloControl) => {
    if (!file) {
      alert("Por favor selecciona un archivo primero");
      return;
    }
    // --- AGREGADO: Obtener el token ---
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("control_id", controlId);
    formData.append("riesgo_id", selectedRisk.id);
    formData.append("titulo", tituloControl || "Sin título");

    try {
      const res = await fetch("http://localhost:4000/api/adjuntos", {
        method: "POST",
        // --- AGREGADO: Cabecera de autorización ---
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      // 🔹 actualizar estado local
      setRisks((prev) =>
        prev.map((r) =>
          r.id === selectedRisk.id
            ? {
                ...r,
                controles: r.controles.map((c) =>
                  c.id === controlId
                    ? { ...c, adjuntos: [...(c.adjuntos || []), data] }
                    : c,
                ),
                adjuntos: [
                  ...(r.adjuntos || []),
                  {
                    ...data,
                    titulo: tituloControl,
                  },
                ],
              }
            : r,
        ),
      );
      await cargarAdjuntos(selectedRisk.id);
      // 🔹 agregar al historial
      setCurrentHistory((prev) => [
        {
          fecha: new Date().toISOString(),
          mensaje: `Se adjuntó evidencia al control "${tituloControl}"`,
        },
        ...prev,
      ]);

      // alert("Archivo subido con éxito");
      toast.success("Archivo subido con éxito");
    } catch (err) {
      console.error("Error al subir:", err);
      toast.error("Hubo un error al intentar subir el archivo.");
    }
  };
  // Config
  // const [riskConfig, setRiskConfig] = useState(
  //   () => loadConfig() || DEFAULT_CONFIG,
  // );

  const [riskConfig, setRiskConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch("http://localhost:4000/api/configuracion-riesgo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setRiskConfig({
          matrixSize: data.matrixSize,
          levels: data.levels,
        });

        setDraftConfig({
          matrixSize: data.matrixSize,
          levels: data.levels.map((l) => ({
            ...l,
            id: "LVL-" + uid(),
          })),
        });
      })
      .catch(() => {
        setRiskConfig(DEFAULT_CONFIG);
        setDraftConfig(DEFAULT_CONFIG);
      });
  }, []);

  const matrixSize = clampInt(riskConfig.matrixSize, 3, 7);
  // const size = clampInt(draftConfig.matrixSize ?? 5, 3, 7);
  const maxScore = matrixSize * matrixSize;
  const levels = useMemo(
    () => normalizeLevels(riskConfig.levels),
    [riskConfig.levels],
  );

  const getLevelForScore = (v) => {
    const hit = levels.find((l) => v >= l.min && v <= l.max);
    if (hit) return hit;
    let best = null;
    let bestDist = Infinity;
    for (const l of levels) {
      const dist = v < l.min ? l.min - v : v > l.max ? v - l.max : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = l;
      }
    }
    return best || { name: "Sin nivel", min: 1, max: maxScore, tone: "slate" };
  };

  const scoreBadge = (v) => {
    const lvl = getLevelForScore(v);
    const st = toneStyles[lvl.tone] || toneStyles.slate;
    return (
      <span
        className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${st.badge}`}
      >
        <span className="font-semibold">{lvl.name}</span>
        <span className="opacity-80">({v})</span>
      </span>
    );
  };

  const cellClass = (p, s) => {
    const v = score(p, s);
    const lvl = getLevelForScore(v);
    const st = toneStyles[lvl.tone] || toneStyles.slate;
    const base =
      "h-10 rounded border cursor-pointer flex items-center justify-center text-xs font-semibold select-none hover:opacity-90";
    return `${base} ${st.cell}`;
  };

  // Data

  const [risks, setRisks] = useState([]);

  useEffect(() => {
    // 1. Obtener el token del almacenamiento
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    // 2. Configurar la petición con el Header de Authorization
    fetch("http://localhost:4000/api/riesgos", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401)
            throw new Error("Sesión expirada o no autorizado");
          throw new Error("Error en el servidor al cargar riesgos");
        }
        return res.json();
      })
      .then((data) => {
        // 3. Validar que la data sea un array antes de guardarla
        setRisks(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error en Riesgos:", err.message);
        setRisks([]); // Evita que el .map() falle si hay un error
      });
  }, []);
  // UI filters
  const [q, setQ] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterNivel, setFilterNivel] = useState("Todos");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("evaluacion");
  const [selectedId, setSelectedId] = useState(null);
  const selectedRisk =
    risks.find((r) => String(r.id) === String(selectedId)) || null;

  // Matrix interaction
  const [matrixMode, setMatrixMode] = useState("inherente");
  const [selectedCell, setSelectedCell] = useState({ prob: 3, sev: 3 });

  // Config modal
  const [configOpen, setConfigOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState(riskConfig);
  const draftLevels = useMemo(
    () => normalizeLevels(draftConfig.levels || []),
    [draftConfig.levels],
  );
  const draftMatrixSize = clampInt(draftConfig.matrixSize ?? 5, 3, 7);

  const draftMaxScore = draftMatrixSize * draftMatrixSize;
  const draftWarnings = useMemo(
    () => computeCoverageWarnings(draftLevels, draftMaxScore),
    [draftLevels, draftMaxScore],
  );
  const canSaveConfig =
    draftWarnings.gaps.length === 0 &&
    draftWarnings.overlaps.length === 0 &&
    draftLevels.length > 0;

  const updateDraftLevel = (id, patch) => {
    setDraftConfig((x) => ({
      ...x,
      levels: (x.levels || []).map((l) =>
        l.id === id ? { ...l, ...patch } : l,
      ),
    }));
  };

  const addDraftLevel = () => {
    setDraftConfig((x) => {
      const size = clampInt(x.matrixSize ?? 5, 3, 7);
      const maxScore = size * size;

      return {
        ...x,
        levels: [
          ...(x.levels || []),
          {
            id: "LVL-" + uid(),
            name: "Nuevo",
            min: 1,
            max: maxScore,
            tone: "slate",
          },
        ],
      };
    });
  };

  const deleteDraftLevel = (id) => {
    setDraftConfig((x) => ({
      ...x,
      levels: (x.levels || []).filter((l) => l.id !== id),
    }));
  };
  const autoFillDraftLevels = () => {
    setDraftConfig((x) => {
      const size = clampInt(x.matrixSize ?? 5, 3, 7);
      const maxScore = size * size;

      const levels = [...(x.levels || [])];

      if (levels.length === 0) return x;

      const n = levels.length;
      const step = Math.floor(maxScore / n);

      let currentMin = 1;

      const newLevels = levels.map((lvl, i) => {
        const min = currentMin;
        const max = i === n - 1 ? maxScore : currentMin + step - 1;

        currentMin = max + 1;

        return {
          ...lvl,
          min,
          max,
        };
      });

      return {
        ...x,
        levels: newLevels,
      };
    });
  };
  const saveDraft = async () => {
    if (!canSaveConfig) {
      toast.error("No se puede guardar la configuración actual.");
      return;
    }

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const payload = {
      matrixSize: draftMatrixSize,
      levels: draftLevels,
    };

    try {
      const res = await fetch(
        "http://localhost:4000/api/configuracion-riesgo",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Error al guardar");

      // Actualizamos el estado global/local
      setRiskConfig(payload);
      setConfigOpen(false);

      // Notificación de éxito
      toast.success("Configuración de matriz actualizada globalmente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al intentar guardar la configuración.");
    }
  };
  // KPIs
  const kpis = useMemo(() => {
    const list = risks.map((r) => {
      const v = score(r.prob_inh, r.sev_inh);
      const lvl = getLevelForScore(v);
      return { r, v, lvl };
    });
    const criticalCount = list.filter((x) => x.lvl.tone === "red").length;
    const openCount = risks.filter((r) => r.estado !== "Cerrado").length;
    const overdueActions = risks
      .flatMap((r) => r.acciones || [])
      .filter((a) => {
        if (!a.fecha_compromiso) return false;
        const d = daysUntil(a.fecha_compromiso);
        return d !== null && d < 0 && a.estado !== "Cerrada";
      }).length;
    return { criticalCount, openCount, overdueActions };
  }, [risks, getLevelForScore]);
  const levelNames = useMemo(() => {
    const unique = [];
    for (const l of levels) if (!unique.includes(l.name)) unique.push(l.name);
    return unique;
  }, [levels]);
  const riskRows = useMemo(() => {
    const rows = risks.map((r) => {
      // CORRECCIÓN: Priorizar el valor que viene de la base de datos (riesgo_inherente)
      // Si no existe, intentar calcularlo, y si falla, poner 0 en lugar de NaN.
      const inh =
        r.riesgo_inherente ?? (Number(r.prob_inh) * Number(r.sev_inh) || 0);
      const res =
        r.riesgo_residual ?? (Number(r.prob_res) * Number(r.sev_res) || 0);

      const lvlInh = getLevelForScore(inh);
      const pendingControls = (r.controles || []).filter(
        (c) => c.estado !== "Implementado",
      ).length;
      const dueIn = daysUntil(r.fecha_revision);

      // Retornamos el objeto asegurando que inh y res sean números válidos
      return { ...r, inh, res, lvlInh, pendingControls, dueIn };
    });
    const s = q.trim().toLowerCase();
    const matchQ = (row) => {
      if (!s) return true;
      // Agregamos comprobaciones de seguridad con ?. y || "" para evitar errores
      return (
        String(row.id).toLowerCase().includes(s) ||
        (row.peligro || "").toLowerCase().includes(s) ||
        (row.area || "").toLowerCase().includes(s) ||
        (row.proceso || "").toLowerCase().includes(s) ||
        (row.tarea || "").toLowerCase().includes(s) ||
        (row.nombreEmpresa || "").toLowerCase().includes(s)
      );
    };
    const matchArea = (row) =>
      filterArea === "Todas" ? true : row.area === filterArea;
    const matchEstado = (row) =>
      filterEstado === "Todos" ? true : row.estado === filterEstado;
    const matchNivel = (row) =>
      filterNivel === "Todos" ? true : row.lvlInh?.name === filterNivel;
    const matchOverdue = (row) => {
      if (!onlyOverdue) return true;
      const overdueReview = row.dueIn !== null && row.dueIn < 0;
      const overdueActs = (row.acciones || []).some((a) => {
        const d = daysUntil(a.fecha_compromiso);
        return d !== null && d < 0 && a.estado !== "Cerrada";
      });
      return overdueReview || overdueActs;
    };
    return rows
      .filter(
        (r) =>
          matchQ(r) &&
          matchArea(r) &&
          matchEstado(r) &&
          matchNivel(r) &&
          matchOverdue(r),
      )
      .sort((a, b) => b.inh - a.inh);
  }, [
    risks,
    q,
    filterArea,
    filterEstado,
    filterNivel,
    onlyOverdue,
    getLevelForScore,
  ]);
  // Actions
  const toggleActionState = async (actionId, estadoActual) => {
    const nuevoEstado = estadoActual === "Cerrada" ? "Pendiente" : "Cerrada";

    // 1. Obtener el token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    try {
      // 2. Primera petición: Actualizar la acción
      const res = await fetch(
        `http://localhost:4000/api/acciones/${actionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Inyectar token
          },
          body: JSON.stringify({ estado: nuevoEstado }),
        },
      );

      if (!res.ok) {
        if (res.status === 401) throw new Error("Sesión expirada");
        throw new Error("Error actualizando acción");
      }

      await res.json();

      // 3. Segunda petición: Obtener historial (también necesita token)
      const resHist = await fetch(
        `http://localhost:4000/api/historial/${selectedRisk.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Inyectar token
          },
        },
      );

      if (!resHist.ok) throw new Error("Error obteniendo historial");
      const historialActualizado = await resHist.json();

      // 4. Actualizar estado de React
      setRisks((prev) =>
        prev.map((r) => {
          const accion = (r.acciones || []).find((a) => a.id === actionId);
          if (!accion) return r;

          return {
            ...r,
            acciones: (r.acciones || []).map((a) =>
              a.id === actionId ? { ...a, estado: nuevoEstado } : a,
            ),
            controles: (r.controles || []).map((c) =>
              c.id === accion.control_id
                ? {
                    ...c,
                    estado:
                      nuevoEstado === "Cerrada" ? "Implementado" : "Pendiente",
                  }
                : c,
            ),
            historial: historialActualizado,
          };
        }),
      );

      setCurrentHistory(historialActualizado);
    } catch (err) {
      console.error("Error cambiando estado:", err);
      if (err.message === "Sesión expirada") {
        alert("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.");
      } else {
        alert("No se pudo actualizar el estado de la acción.");
      }
    }
  };
  const openRisk = async (riskId) => {
    setSelectedId(Number(riskId));
    setDrawerOpen(true);
    setActiveTab("evaluacion");
    setMatrixMode("inherente");

    const r = risks.find((x) => x.id === riskId);
    if (r) setSelectedCell({ prob: r.prob_inh, sev: r.sev_inh });

    // Obtener el token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [resHist, resAdj] = await Promise.all([
        fetch(`http://localhost:4000/api/historial/${riskId}`, { headers }),
        fetch(`http://localhost:4000/api/adjuntos/${riskId}`, { headers }),
      ]);

      if (!resHist.ok || !resAdj.ok)
        throw new Error("No autorizado o error de servidor");

      const historial = await resHist.json();
      const adjuntos = await resAdj.json();

      setCurrentHistory(Array.isArray(historial) ? historial : []);

      setRisks((prev) =>
        prev.map((x) =>
          x.id === riskId
            ? { ...x, adjuntos: Array.isArray(adjuntos) ? adjuntos : [] }
            : x,
        ),
      );
    } catch (err) {
      console.error("Error cargando detalle:", err);
      setCurrentHistory([]);
    }
  };
  const [newControl, setNewControl] = useState({
    tipo: "Administrativos",
    descripcion: "",
    responsable: "",
    fecha_compromiso: "",
    crearAccion: true,
  });
  const descRef = useRef();
  const respRef = useRef();
  const fechaRef = useRef();
  const addControlToSelectedRisk = async () => {
    if (!selectedRisk) return;
    // 1. Obtener el token
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    // 2. Obtener el nombre de la jerarquía desde el estado (ya que el ref está fallando)
    const jerarquiaSeleccionada = jerarquias.find(
      (j) => j.idJerarquia === newJerarquias.idJerarquia,
    );
    const payload = {
      riesgo_id: selectedRisk.id,
      // Usamos el texto de la jerarquía seleccionada
      tipo: jerarquiaSeleccionada
        ? jerarquiaSeleccionada.tipoJerarquia
        : "Sin tipo",
      descripcion: descRef.current.value,
      responsable: respRef.current.value,
      fecha_compromiso: fechaRef.current.value,
      crearAccion: newControl.crearAccion, // Añadimos esto si tu backend lo procesa
    };
    try {
      const res = await fetch("http://localhost:4000/api/controles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 3. IMPORTANTE: Agregar token
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error en el servidor");
      const controlGuardado = await res.json();
      setRisks((prev) =>
        prev.map((r) => {
          if (r.id === selectedRisk.id) {
            return {
              ...r,
              controles: [...(r.controles || []), controlGuardado],
              // Si el backend creó la acción automáticamente, aquí podrías
              // necesitar refrescar o agregar la lógica de acciones.
            };
          }
          return r;
        }),
      );

      // Limpiar campos
      descRef.current.value = "";
      respRef.current.value = "";
      fechaRef.current.value = "";

      toast.success("Control agregado con éxito");
    } catch (error) {
      console.error("Fallo al guardar:", error);
      toast.error("Hubo un error al intentar guardar el control.");
    }
  };
  const deleteControl = async (controlId) => {
    if (!window.confirm("¿Eliminar este control y sus acciones asociadas?"))
      return;
    try {
      const res = await fetch(
        `http://localhost:4000/api/controles/${controlId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          msg = JSON.parse(text).error || msg;
        } catch {
          /* no es JSON */
        }
        alert(`Error del servidor: ${msg}`);
        return;
      }
      const data = await res.json();
      setRisks((prev) =>
        prev.map((r) =>
          r.id === selectedRisk.id
            ? {
                ...r,
                controles: (r.controles || []).filter(
                  (c) => c.id !== controlId,
                ),
                acciones: (r.acciones || []).filter(
                  (a) => a.control_id !== controlId,
                ),
                adjuntos: (r.adjuntos || []).filter(
                  (a) => a.control_id !== controlId,
                ),
              }
            : r,
        ),
      );
      setCurrentHistory((prev) => [
        {
          fecha: new Date().toISOString(),
          mensaje: `Se eliminó el control: "${data.descripcion}"`,
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      alert(`No se pudo conectar con el servidor: ${err.message}`);
    }
  };

  const applyMatrixToRisk = async () => {
    if (!selectedRisk) return;

    // 1. Obtener el token de seguridad
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const body =
      matrixMode === "residual"
        ? {
            prob_res: selectedCell.prob,
            sev_res: selectedCell.sev,
            prob_inh: selectedRisk.prob_inh,
            sev_inh: selectedRisk.sev_inh,
          }
        : {
            prob_inh: selectedCell.prob,
            sev_inh: selectedCell.sev,
            prob_res: selectedRisk.prob_res,
            sev_res: selectedRisk.sev_res,
          };

    try {
      const res = await fetch(
        `http://localhost:4000/api/riesgos/${selectedRisk.id}/evaluacion`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            // 2. Agregar el encabezado de autorización
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        if (res.status === 401) alert("Sesión expirada o no autorizada");
        throw new Error("Error en la petición");
      }

      // Si la petición fue exitosa, actualizamos el estado local
      setRisks((prev) =>
        prev.map((r) =>
          r.id === selectedRisk.id
            ? {
                ...r,
                ...body,
              }
            : r,
        ),
      );

      setCurrentHistory((prev) => [
        {
          fecha: new Date().toISOString(),
          mensaje: `Se actualizó evaluación ${matrixMode}`,
        },
        ...prev,
      ]);
      toast.success("Evaluación guardada correctamente: " + matrixMode);
    } catch (err) {
      console.error("Error al guardar evaluación:", err);
      toast.error("Hubo un error al intentar guardar la evaluación.");
    }
  };

  // Matrix axes
  // const sevAxis = Array.from({ length: matrixSize }, (_, i) => i + 1);
  // const probAxis = Array.from({ length: matrixSize }, (_, i) => matrixSize - i);
  const [open, setOpen] = useState(false);

  //Datos de Areas
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
        }
      })
      .catch((err) => {
        console.error("Error cargando áreas:", err);
        setAreas([]); // Evita que .map() falle
      });
  }, []);
  return (
    <main className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Riesgos (IPERC)
          </h1>
          <p className="text-sm text-slate-500">
            Busca rápido, prioriza críticos y gestiona controles + acciones.
          </p>
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
            onClick={() => console.log("Sincronizar (demo)")}
            title="Sincroniza estado de controles según acciones"
          >
            Sincronizar
          </button>
          <button
            className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 text-sm"
            onClick={() => setOpen(true)}
          >
            + Nuevo riesgo
          </button>

          <ModalRegistrarRiesgo
            open={open}
            onClose={() => setOpen(false)}
            riskConfig={riskConfig}
            onSave={(data) => {
              const formatted = {
                id: data.id,
                nombreEmpresa: data.nombreEmpresa,
                peligro: data.peligro,
                area: data.area,
                inh: data.riesgo_inherente,
                res: data.riesgo_residual,
                controles: [],
                pendingControls: 0,
                fecha_revision: data.fecha_revision
                  ? data.fecha_revision.slice(0, 10)
                  : "Sin fecha",
                estado: data.estado || "Activo",
                dueIn: null,
              };
              setRisks((prev) => [formatted, ...prev]);
              setOpen(false);
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Resumen</h2>
          <p className="text-xs text-slate-500">Vista rápida para priorizar</p>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card title="Riesgos críticos">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-slate-900">
                  {kpis.criticalCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Según evaluación inherente
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200">
                Prioridad
              </span>
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card title="Riesgos abiertos">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-slate-900">
                  {kpis.openCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Abierto / En seguimiento
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200">
                Backlog
              </span>
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card title="Acciones vencidas">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-slate-900">
                  {kpis.overdueActions}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Pendientes o en proceso
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded border bg-amber-50 text-amber-800 border-amber-200">
                Urgente
              </span>
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
              {areas.map((a) => (
                <option key={a.idArea} value={a.idArea}>
                  {a.Nombre}
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
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
              />
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
                <th className="py-2 pr-3">Empresa</th>
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
                  <td className="py-2 pr-3 font-semibold">{`RSK-${r.id}`}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs font-medium uppercase text-slate-500">
                      {r.nombreEmpresa || "Sin Empresa"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{r.peligro}</td>
                  <td className="py-2 pr-3">{r.area}</td>
                  <td className="py-2 pr-3">{scoreBadge(r.inh)}</td>
                  <td className="py-2 pr-3">{scoreBadge(r.res)}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs">
                      {r.controles?.length ?? 0} total •{" "}
                      <span
                        className={
                          (r.pendingControls ?? 0) > 0
                            ? "text-amber-700 font-semibold"
                            : "text-slate-600"
                        }
                      >
                        {r.pendingControls ?? 0} pendientes
                      </span>
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="text-xs">
                      {fmtDate(r.fecha_revision)}{" "}
                      {r.dueIn !== null && r.dueIn < 0 ? (
                        <span className="ml-2 text-red-700 font-semibold">
                          Vencido
                        </span>
                      ) : r.dueIn !== null && r.dueIn <= 7 ? (
                        <span className="ml-2 text-amber-800 font-semibold">
                          Próximo
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge
                      tone={
                        r.estado === "Cerrado"
                          ? "green"
                          : r.estado === "En seguimiento"
                            ? "yellow"
                            : "slate"
                      }
                    >
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
                  <td colSpan={10} className="py-6 text-center text-slate-500">
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
        title={
          selectedRisk
            ? `${`RSK-${selectedRisk.id}`} • ${selectedRisk.peligro}`
            : "Detalle"
        }
      >
        {!selectedRisk ? (
          <div className="text-sm text-slate-600">Selecciona un riesgo.</div>
        ) : (
          <>
            <div className="p-3 rounded border border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500">Contexto</div>
              <div className="mt-1 text-sm text-slate-800">
                <span className="font-semibold">{selectedRisk.area}</span> •{" "}
                {selectedRisk.proceso} • {selectedRisk.ubicacion}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Tarea:{" "}
                <span className="font-semibold">{selectedRisk.tarea}</span> •
                Puesto:{" "}
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
                  <div className="text-sm font-semibold text-slate-800">
                    Matriz de Evaluación
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded text-sm border ${
                        matrixMode === "inherente"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setMatrixMode("inherente");
                        setSelectedCell({
                          prob: selectedRisk.prob_inh,
                          sev: selectedRisk.sev_inh,
                        });
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
                        setMatrixMode("residual");
                        setSelectedCell({
                          prob: selectedRisk.prob_res,
                          sev: selectedRisk.sev_res,
                        });
                      }}
                    >
                      Residual
                    </button>
                  </div>
                </div>

                {/* La clave es usar draftMatrixSize si el modal está abierto, o matrixSize si no */}
                <div
                  className="grid gap-2 items-center"
                  style={{
                    gridTemplateColumns: `60px repeat(${configOpen ? draftMatrixSize : matrixSize}, minmax(0, 1fr))`,
                  }}
                >
                  <div></div>
                  {/* Generamos los encabezados de Severidad dinámicamente */}
                  {Array.from(
                    { length: configOpen ? draftMatrixSize : matrixSize },
                    (_, i) => i + 1,
                  ).map((s) => (
                    <div
                      key={s}
                      className="text-[10px] font-bold text-slate-400 text-center uppercase"
                    >
                      Sev {s}
                    </div>
                  ))}

                  {/* Generamos las filas de Probabilidad dinámicamente */}
                  {Array.from(
                    { length: configOpen ? draftMatrixSize : matrixSize },
                    (_, i) => (configOpen ? draftMatrixSize : matrixSize) - i,
                  ).map((p) => (
                    <div key={`row-${p}`} className="contents">
                      <div className="text-[10px] font-bold text-slate-400 pr-2 uppercase">
                        Prov {p}
                      </div>
                      {Array.from(
                        { length: configOpen ? draftMatrixSize : matrixSize },
                        (_, i) => i + 1,
                      ).map((s) => {
                        const isSelected =
                          selectedCell.prob === p && selectedCell.sev === s;
                        const v = p * s;

                        // Usamos una función que use los draftLevels si está abierto el admin
                        const currentLevels = configOpen
                          ? draftLevels
                          : riskConfig.levels;

                        return (
                          <div
                            key={`${p}-${s}`}
                            className={`${cellClass(p, s, currentLevels)} ${
                              isSelected
                                ? "ring-2 ring-slate-900 scale-105 z-10 shadow-md"
                                : "hover:brightness-95"
                            } h-10 border rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-all`}
                            onClick={() => setSelectedCell({ prob: p, sev: s })}
                            title={`Prob ${p} x Sev ${s} = ${v}`}
                          >
                            {v}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="text-sm text-slate-700">
                    Selección:{" "}
                    <span className="font-bold">P{selectedCell.prob}</span> ×{" "}
                    <span className="font-bold">S{selectedCell.sev}</span>
                  </div>
                  {scoreBadge(
                    selectedCell.prob * selectedCell.sev,
                    configOpen ? draftLevels : riskConfig.levels,
                  )}
                </div>

                <button
                  className="w-full mt-2 px-4 py-2 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                  onClick={applyMatrixToRisk}
                >
                  Guardar evaluación ({matrixMode})
                </button>
              </div>
            )}

            {/* Controles */}
            {activeTab === "controles" && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-semibold text-slate-800">
                  Agregar control
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12">
                    <div className="text-xs text-slate-500 mb-1">Jerarquía</div>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      // ref={tipoRef}
                      value={newJerarquias.idJerarquia || ""}
                      onChange={(e) =>
                        setNewJerarquias((x) => ({
                          ...x,
                          idJerarquia: Number(e.target.value),
                        }))
                      }
                    >
                      <option value="">Seleccionar Jerarquia</option>

                      {jerarquias.map((a) => (
                        <option key={a.idJerarquia} value={a.idJerarquia}>
                          {a.tipoJerarquia}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12">
                    <div className="text-xs text-slate-500 mb-1">
                      Descripción
                    </div>
                    <input
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      placeholder="Ej: Permiso de trabajo + checklist + supervisor"
                      ref={descRef}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <div className="text-xs text-slate-500 mb-1">
                      Responsable
                    </div>
                    <input
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      placeholder="Ej: HSE / Operaciones"
                      ref={respRef}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <div className="text-xs text-slate-500 mb-1">
                      Fecha compromiso
                    </div>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      ref={fechaRef}
                    />
                  </div>

                  <div className="col-span-12 flex items-center justify-between mt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={newControl.crearAccion}
                        onChange={(e) =>
                          setNewControl((x) => ({
                            ...x,
                            crearAccion: e.target.checked,
                          }))
                        }
                      />
                      Crear acción automáticamente
                    </label>

                    <button
                      className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700"
                      onClick={addControlToSelectedRisk}
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Controles
                  </div>
                  {selectedRisk.controles.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      Aún no hay controles registrados.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRisk.controles.map((c) => {
                        const a = (selectedRisk.acciones || []).find(
                          (x) => x.control_id === c.id,
                        );
                        const due = daysUntil(c.fecha_compromiso);
                        const overdue =
                          due !== null &&
                          due < 0 &&
                          c.estado !== "Implementado";
                        const tieneAdjunto =
                          (c.adjuntos && c.adjuntos.length > 0) ||
                          (selectedRisk.adjuntos || []).some(
                            (a) => a.control_id === c.id,
                          );
                        return (
                          <div
                            key={c.id}
                            className="p-3 rounded border border-slate-200 bg-white"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500">
                                  {c.tipo}
                                </div>
                                <div className="text-sm text-slate-800 font-semibold">
                                  {c.descripcion}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Responsable:{" "}
                                  <span className="font-semibold">
                                    {c.responsable}
                                  </span>{" "}
                                  • Compromiso:{" "}
                                  <span className="font-semibold">
                                    {fmtDate(c.fecha_compromiso)}
                                  </span>
                                  {overdue ? (
                                    <span className="ml-2 text-red-700 font-semibold">
                                      Vencido
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Estado:{" "}
                                  <span className="font-semibold">
                                    {c.estado}
                                  </span>
                                  {c.evidencia ? (
                                    <>
                                      {" "}
                                      • Evidencia:{" "}
                                      <span className="font-semibold">
                                        {c.evidencia}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                {a ? (
                                  <Badge
                                    tone={
                                      a.estado === "Cerrada"
                                        ? "green"
                                        : a.estado === "En proceso"
                                          ? "yellow"
                                          : "slate"
                                    }
                                  >
                                    Acción: {a.estado}
                                  </Badge>
                                ) : (
                                  <Badge tone="slate">Sin acción</Badge>
                                )}
                                <label
                                  className={`cursor-pointer text-xs px-2 py-1 rounded border transition
                                      ${
                                        tieneAdjunto
                                          ? "bg-green-100 text-green-800 border-green-300"
                                          : "border-slate-200 hover:bg-slate-50"
                                      }`}
                                >
                                  {tieneAdjunto
                                    ? "✓ Archivo adjunto"
                                    : "Adjuntar PDF o imagen"}
                                  <input
                                    type="file"
                                    hidden
                                    onChange={(e) => {
                                      const selectedFile = e.target.files[0];
                                      if (selectedFile) {
                                        subirEvidencia(
                                          c.id,
                                          selectedFile,
                                          c.descripcion,
                                        );
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  title="Eliminar control"
                                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition"
                                  onClick={() => deleteControl(c.id)}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones */}
            {activeTab === "acciones" && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-semibold text-slate-800">
                  Acciones del riesgo
                </div>
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
                      {(selectedRisk.acciones || []).map((a) => {
                        const due = daysUntil(a.fecha_compromiso);
                        const overdue =
                          due !== null && due < 0 && a.estado !== "Cerrada";

                        return (
                          <tr key={a.id} className="border-b last:border-b-0">
                            {/* <td className="py-2 pr-3 font-semibold">{a.id}</td> */}
                            <td className="py-2 pr-3 font-semibold">{`ACT-${a.id}`}</td>
                            <td className="py-2 pr-3">{a.descripcion}</td>

                            <td className="py-2 pr-3">{a.responsable}</td>

                            <td className="py-2 pr-3">
                              {fmtDate(a.fecha_compromiso)}
                              {overdue && (
                                <span className="ml-2 text-red-700 font-semibold">
                                  Vencido
                                </span>
                              )}
                            </td>

                            <td className="py-2 pr-3">
                              <Badge
                                tone={
                                  a.estado === "Cerrada"
                                    ? "green"
                                    : a.estado === "En proceso"
                                      ? "yellow"
                                      : "slate"
                                }
                              >
                                {a.estado}
                              </Badge>
                            </td>

                            <td className="py-2">
                              <button
                                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                onClick={() =>
                                  toggleActionState(a.id, a.estado)
                                }
                              >
                                {a.estado === "Cerrada" ? "Reabrir" : "Cerrar"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {(selectedRisk.acciones || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 text-center text-slate-500"
                          >
                            No hay acciones asociadas a este riesgo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-slate-500">
                  “Sincronizar” actualizará estados de controles según estas
                  acciones.
                </div>
              </div>
            )}

            {/* Adjuntos */}
            {activeTab === "adjuntos" && (
              <div className="mt-4 space-y-4">
                <div className="text-sm font-semibold text-slate-800">
                  Adjuntos
                </div>

                {(selectedRisk.adjuntos || []).length === 0 && (
                  <div className="text-sm text-slate-500">
                    No hay archivos adjuntos para este riesgo.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedRisk.adjuntos || []).map((adjunto, i) => {
                    const filename =
                      adjunto.nombre_archivo || adjunto.ruta_archivo || "";
                    const url = `http://localhost:4000/uploads/${filename}`;

                    const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(
                      filename,
                    );
                    const esPdf = /\.pdf$/i.test(filename);

                    return (
                      <div
                        key={i}
                        className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm hover:shadow transition flex flex-col gap-3"
                      >
                        {/* CABECERA */}
                        <div className="flex gap-3 items-start">
                          {/* ICONO */}
                          <div className="w-12 h-12 flex items-center justify-center rounded bg-slate-100 text-xl flex-shrink-0">
                            {esPdf ? (
                              <span className="text-red-600">📄</span>
                            ) : esImagen ? (
                              <span className="text-blue-600">🖼</span>
                            ) : (
                              <span className="text-slate-500">📎</span>
                            )}
                          </div>

                          {/* TITULOS */}
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-semibold text-slate-800 truncate"
                              title={adjunto.titulo}
                            >
                              {adjunto.titulo}
                            </div>

                            <div
                              className="text-xs text-slate-500 truncate"
                              title={adjunto.archivo}
                            >
                              {adjunto.archivo}
                            </div>
                          </div>
                        </div>

                        {/* PREVIEW imagen */}
                        {esImagen && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={url}
                              alt={adjunto.titulo}
                              className="w-full h-32 object-cover rounded border border-slate-200"
                            />
                          </a>
                        )}

                        {/* BOTON */}
                        <div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-700"
                          >
                            {esPdf ? "Abrir PDF" : "Ver archivo"}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* <button
                  className="text-sm px-3 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => console.log("Subir adjunto")}
                >
                  Subir adjunto
                </button> */}
              </div>
            )}

            {/* Historial */}
            {activeTab === "historial" && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold text-slate-800">
                  Historial
                </div>
                <div className="space-y-2">
                  {currentHistory.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border border-slate-200 bg-white"
                    >
                      <div className="text-xs text-slate-500">
                        {/* Verifica si tu base de datos devuelve 'fecha' o 'at' */}
                        {fmtDate(h.fecha || h.at)}
                      </div>
                      <div className="text-sm text-slate-800">
                        {/* Verifica si es 'mensaje' o 'msg' */}
                        {h.mensaje || h.msg}
                      </div>
                    </div>
                  ))}
                  {currentHistory.length === 0 && (
                    <div className="text-sm text-slate-600">
                      Sin eventos registrados.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* Config modal */}
      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configurar matriz y niveles (Admin)"
      >
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <div className="text-xs text-slate-500 mb-1">Tamaño de matriz</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={7}
                value={draftMatrixSize}
                onChange={(e) =>
                  setDraftConfig((x) => ({
                    ...x,
                    matrixSize: clampInt(e.target.value, 3, 7),
                  }))
                }
                className="w-full"
              />
              <span className="text-sm font-semibold text-slate-800 w-14 text-right">
                {draftMatrixSize}×{draftMatrixSize}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Puntaje máximo: {draftMaxScore}
            </div>

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
            {(draftWarnings.gaps.length > 0 ||
              draftWarnings.overlaps.length > 0) && (
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
                <div className="mt-2">
                  No se puede guardar hasta corregir rangos.
                </div>
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
                          onChange={(e) =>
                            updateDraftLevel(l.id, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          max={draftMaxScore}
                          className="w-24 border border-slate-200 rounded px-2 py-1"
                          value={l.min}
                          onChange={(e) =>
                            updateDraftLevel(l.id, {
                              min: clampInt(e.target.value, 1, draftMaxScore),
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          max={draftMaxScore}
                          className="w-24 border border-slate-200 rounded px-2 py-1"
                          value={l.max}
                          onChange={(e) =>
                            updateDraftLevel(l.id, {
                              max: clampInt(e.target.value, 1, draftMaxScore),
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          className="border border-slate-200 rounded px-2 py-1"
                          value={l.tone}
                          onChange={(e) =>
                            updateDraftLevel(l.id, { tone: e.target.value })
                          }
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
                  canSaveConfig
                    ? "bg-slate-900 text-white hover:bg-slate-700"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
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
  );
}
