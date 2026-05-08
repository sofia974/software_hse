import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
const API = "http://localhost:4000";

// ─── Colores NTP 900.058-2019 ────────────────────────────────────────────────
const CLASIFICACION_COLOR = {
  Peligroso: {
    bg: "#fef08a",
    border: "#ca8a04",
    text: "#713f12",
    dot: "#ca8a04",
  },
  "No Peligroso - Aprovechable": {
    bg: "#bbf7d0",
    border: "#16a34a",
    text: "#14532d",
    dot: "#16a34a",
  },
  "No Peligroso - No Aprovechable": {
    bg: "#e2e8f0",
    border: "#64748b",
    text: "#1e293b",
    dot: "#64748b",
  },
  RAEE: { bg: "#fecaca", border: "#dc2626", text: "#7f1d1d", dot: "#dc2626" },
};

const TIPOS_RESIDUO = [
  // Peligrosos
  "Aceites y lubricantes usados",
  "Combustibles contaminados",
  "Baterías y acumuladores",
  "Reactivos químicos",
  "Envases de sustancias peligrosas",
  "Residuos hospitalarios/médicos",
  "Lodos de tratamiento de aguas",
  "Material con PCB",
  "Residuos radiactivos",
  // No Peligroso Aprovechable
  "Papel y cartón",
  "Plástico",
  "Vidrio",
  "Chatarra metálica",
  "Madera",
  "Caucho / Neumáticos",
  "Residuos orgánicos / compostables",
  // No Peligroso No Aprovechable
  "Residuos domésticos mixtos",
  "Residuos de limpieza",
  "Material refractario",
  "Escombros inertes",
  // RAEE
  "Equipos electrónicos",
  "Luminarias y fluorescentes",
  "Cables y componentes eléctricos",
];

const CLASIFICACIONES = Object.keys(CLASIFICACION_COLOR);
const UNIDADES = ["kg", "ton", "m³", "L", "unidades", "sacos"];

// ─── Marco Legal (estático) ──────────────────────────────────────────────────
const MARCO_LEGAL = [
  {
    codigo: "D.L. N° 1278",
    nombre: "Ley de Gestión Integral de Residuos Sólidos",
    año: 2016,
    entidad: "MINAM",
    tipo: "Ley",
    descripcion:
      "Marco normativo principal. Establece principios, obligaciones y responsabilidades para la gestión integral de residuos sólidos con enfoque de economía circular.",
    obligaciones: [
      "Minimización de residuos en la fuente",
      "Segregación obligatoria en origen",
      "Uso de EO-RS autorizadas para transporte y disposición",
      "Manifiesto de residuos peligrosos",
      "Declaración anual en SIGERSOL",
    ],
    estado: "Vigente",
  },
  {
    codigo: "D.S. N° 014-2017-MINAM",
    nombre: "Reglamento del Decreto Legislativo N° 1278",
    año: 2017,
    entidad: "MINAM",
    tipo: "Reglamento",
    descripcion:
      "Reglamenta el D.L. 1278. Define procedimientos técnicos para manejo, almacenamiento, transporte, tratamiento y disposición final de residuos sólidos.",
    obligaciones: [
      "Plan de Manejo de Residuos Sólidos (anual)",
      "Registro de operadores y cadena de custodia",
      "Infraestructura de almacenamiento temporal certificada",
      "Etiquetado de contenedores según NTP 900.058",
    ],
    estado: "Vigente",
  },
  {
    codigo: "D.S. N° 040-2014-EM",
    nombre:
      "Reglamento de Protección y Gestión Ambiental para Actividades Mineras",
    año: 2014,
    entidad: "MINEM",
    tipo: "Reglamento",
    descripcion:
      "Regula los aspectos ambientales de la actividad minera incluyendo la gestión de residuos industriales, relaves, desmonte y efluentes generados en operaciones de explotación y beneficio.",
    obligaciones: [
      "Plan de Cierre de Minas (incluye gestión de residuos)",
      "Monitoreo de depósitos de relaves y desmonte",
      "Reportes trimestrales al MINEM / OEFA",
      "Programa de adecuación y manejo ambiental (PAMA)",
    ],
    estado: "Vigente",
  },
  {
    codigo: "NTP 900.058-2019",
    nombre: "Código de colores para segregación de residuos sólidos",
    año: 2019,
    entidad: "INACAL",
    tipo: "Norma Técnica",
    descripcion:
      "Establece el código de colores estándar para los recipientes de almacenamiento: Amarillo (peligrosos), Negro (no aprovechables), Verde (orgánicos), Azul (papel/cartón), Blanco (plástico), Marrón (vidrio), Rojo (RAEE), Naranja (especiales).",
    obligaciones: [
      "Implementar contenedores con colores reglamentarios",
      "Rotular y etiquetar correctamente cada contenedor",
      "Capacitar al personal en segregación por colores",
    ],
    estado: "Vigente",
  },
  {
    codigo: "Ley N° 28611",
    nombre: "Ley General del Ambiente",
    año: 2005,
    entidad: "MINAM",
    tipo: "Ley",
    descripcion:
      "Ley marco que establece los derechos y deberes ambientales. Incluye principios de prevención, precautorio, internalización de costos y responsabilidad ambiental empresarial.",
    obligaciones: [
      "Aplicar principio de prevención y precaución",
      "Responsabilidad por daños ambientales",
      "Participación ciudadana en EIA",
    ],
    estado: "Vigente",
  },
  {
    codigo: "D.S. N° 023-2009-EM",
    nombre: "Reglamento Ambiental para Actividades de Exploración Minera",
    año: 2009,
    entidad: "MINEM",
    tipo: "Reglamento",
    descripcion:
      "Regula los aspectos ambientales en la fase de exploración minera, incluyendo el manejo de residuos sólidos generados durante las actividades de prospección y evaluación.",
    obligaciones: [
      "Plan de manejo de residuos durante exploración",
      "Retiro de residuos al finalizar campaña",
      "Restauración de áreas perturbadas",
    ],
    estado: "Vigente",
  },
  {
    codigo: "D.S. N° 009-2019-MINAM",
    nombre: "Plan Nacional de Gestión Integral de Residuos Sólidos 2019-2021",
    año: 2019,
    entidad: "MINAM",
    tipo: "Plan Nacional",
    descripcion:
      "Define metas nacionales de gestión de residuos: incremento de reciclaje, reducción de disposición en botaderos, formalización de EO-RS y fortalecimiento del SIGERSOL.",
    obligaciones: [
      "Reporte al SIGERSOL (Sistema de Información para la Gestión de Residuos Sólidos)",
      "Metas de valorización y reciclaje",
    ],
    estado: "Vigente",
  },
  {
    codigo: "Ley N° 29783",
    nombre: "Ley de Seguridad y Salud en el Trabajo",
    año: 2011,
    entidad: "MTPE",
    tipo: "Ley",
    descripcion:
      "Establece obligaciones de SST vinculadas al manejo de residuos peligrosos: EPP adecuado, capacitación, hojas de seguridad (MSDS/SDS) y procedimientos de emergencia.",
    obligaciones: [
      "Hojas MSDS para residuos peligrosos",
      "EPP específico para manipulación",
      "Procedimiento de emergencias por derrames",
      "Registro de accidentes vinculados a residuos",
    ],
    estado: "Vigente",
  },
];

// ─── Documentos requeridos (plantilla) ───────────────────────────────────────
const DOCS_REQUERIDOS = [
  "Plan de Manejo de Residuos Sólidos",
  "Declaración Anual SIGERSOL",
  "Manifiesto de Residuos Peligrosos",
  "Contrato con EO-RS Transportista",
  "Contrato con EO-RS Disposición Final",
  "Certificado de Disposición Final",
  "Registro de Generación de Residuos",
  "Plan de Contingencia (Derrames)",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ClasifBadge({ value }) {
  const c = CLASIFICACION_COLOR[value] || {
    bg: "#f1f5f9",
    border: "#94a3b8",
    text: "#334155",
  };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {value}
    </span>
  );
}

function EstadoDocBadge({ estado }) {
  if (estado === "Vigente")
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 font-semibold">
        Vigente
      </span>
    );
  if (estado === "Por vencer")
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 font-semibold">
        Por vencer
      </span>
    );
  if (estado === "Vencido")
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-semibold">
        Vencido
      </span>
    );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
      Sin fecha
    </span>
  );
}

function calcEstadoDoc(fechaVenc) {
  if (!fechaVenc) return "Sin fecha";
  const hoy = new Date();
  const venc = new Date(fechaVenc);
  const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "Vencido";
  if (dias <= 30) return "Por vencer";
  return "Vigente";
}

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const CHART_COLORS = [
  "#f59e0b",
  "#22c55e",
  "#64748b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ["Resumen", "Registros", "Marco Legal", "Documentos"];

// ─── Formulario vacío ─────────────────────────────────────────────────────────
const emptyForm = () => ({
  fecha: new Date().toISOString().slice(0, 10),
  area_generadora: "",
  tipo_residuo: "",
  clasificacion: "Peligroso",
  cantidad: "",
  unidad: "kg",
  empresa_transportista: "",
  nro_manifiesto: "",
  destino_final: "",
  observaciones: "",
});

const emptyDocForm = () => ({
  nombre: "",
  tipo: "Plan",
  numero_doc: "",
  fecha_emision: "",
  fecha_vencimiento: "",
  entidad: "",
  observaciones: "",
});

// ═══════════════════════════════════════════════════════════════════════════════
export default function Residuos() {
  const [tab, setTab] = useState("Resumen");

  // Registros
  const [registros, setRegistros] = useState([]);
  const [loadingReg, setLoadingReg] = useState(true);
  const [showFormReg, setShowFormReg] = useState(false);
  const [formReg, setFormReg] = useState(emptyForm());
  const [savingReg, setSavingReg] = useState(false);

  // Documentos
  const [documentos, setDocumentos] = useState([]);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [showFormDoc, setShowFormDoc] = useState(false);
  const [formDoc, setFormDoc] = useState(emptyDocForm());
  const [savingDoc, setSavingDoc] = useState(false);

  // Marco legal filtro
  const [filtroLegal, setFiltroLegal] = useState("");

  // 1. Definimos una función auxiliar para no repetir código del token
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };
  useEffect(() => {
    fetchRegistros();
    fetchDocumentos();
  }, []);
  async function fetchRegistros() {
    setLoadingReg(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const r = await fetch(`${API}/api/residuos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setRegistros(Array.isArray(d) ? d : []);
      console.log("RESIDUOS", d);
    } catch {
      setRegistros([]);
    } finally {
      setLoadingReg(false);
    }
  }

  async function fetchDocumentos() {
    setLoadingDoc(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const r = await fetch(`${API}/api/residuos/documentos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setDocumentos(Array.isArray(d) ? d : []);
    } catch {
      setDocumentos([]);
    } finally {
      setLoadingDoc(false);
    }
  }

  async function guardarRegistro(e) {
    e.preventDefault();
    if (!formReg.fecha || !formReg.tipo_residuo || !formReg.cantidad) return;
    setSavingReg(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await fetch(`${API}/api/residuos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Agregado para el POST
        },
        body: JSON.stringify(formReg),
      });
      toast.success("¡Registro guardado correctamente!");
      setShowFormReg(false);
      setFormReg(emptyForm());
      fetchRegistros(); // Refresca la lista después de guardar
    } catch (err) {
      console.error("Error al guardar:", err);
      toast.error("Hubo un error al intentar guardar el registro.");
    } finally {
      setSavingReg(false);
    }
  }

  async function eliminarRegistro(id) {
    if (!confirm("¿Eliminar este registro?")) return;

    try {
      const res = await fetch(`${API}/api/residuos/${id}`, {
        method: "DELETE",
        // USAMOS TU FUNCIÓN AQUÍ
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        fetchRegistros();
      } else {
        const data = await res.json();
        alert("Error al eliminar: " + (data.error || "No autorizado"));
      }
    } catch (err) {
      console.error("Error en la eliminación:", err);
    }
  }

  async function guardarDocumento(e) {
    e.preventDefault();
    if (!formDoc.nombre) return;
    setSavingDoc(true);
    try {
      await fetch(`${API}/api/residuos/documentos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formDoc),
      });
      toast.success("¡Documento guardado correctamente!");
      setShowFormDoc(false);
      setFormDoc(emptyDocForm());
      fetchDocumentos();
    } finally {
      setSavingDoc(false);
      toast.error("Hubo un error al intentar guardar el documento.");
    }
  }

  async function eliminarDocumento(id) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`${API}/api/residuos/documentos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    fetchDocumentos();
  }

  // 1. ESTADOS (SIEMPRE ARRIBA)
  const [selectedEmpresa, setSelectedEmpresa] = useState("Todas");

  // 2. FILTROS
  const registrosFiltrados = useMemo(() => {
    if (selectedEmpresa === "Todas") return registros;

    return registros.filter((r) => r.nombreEmpresa === selectedEmpresa);
  }, [registros, selectedEmpresa]);

  const documentosFiltrados = useMemo(() => {
    if (selectedEmpresa === "Todas") return documentos;

    return documentos.filter((d) => d.nombreEmpresa === selectedEmpresa);
  }, [documentos, selectedEmpresa]);

  // 3. KPIs
  const kpis = useMemo(() => {
    const totalKg = registrosFiltrados.reduce((s, r) => {
      const kg = r.unidad === "ton" ? r.cantidad * 1000 : r.cantidad;
      return s + (kg || 0);
    }, 0);

    const peligrosos = registrosFiltrados.filter(
      (r) => r.clasificacion === "Peligroso",
    ).length;

    const docsVigentes = documentosFiltrados.filter(
      (d) => calcEstadoDoc(d.fecha_vencimiento) === "Vigente",
    ).length;

    const docsPorVencer = documentosFiltrados.filter(
      (d) => calcEstadoDoc(d.fecha_vencimiento) === "Por vencer",
    ).length;

    const docsVencidos = documentosFiltrados.filter(
      (d) => calcEstadoDoc(d.fecha_vencimiento) === "Vencido",
    ).length;

    return { totalKg, peligrosos, docsVigentes, docsPorVencer, docsVencidos };
  }, [registrosFiltrados, documentosFiltrados]);

  // 4. CHARTS
  const pieData = useMemo(() => {
    const map = {};
    registrosFiltrados.forEach((r) => {
      const k = r.clasificacion || "Sin clasificar";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [registrosFiltrados]);

  // 5. EMPRESAS DISPONIBLES
  const empresasDisponibles = useMemo(() => {
    const empresas = [
      ...(registros?.map((r) => r.nombreEmpresa) || []),
      ...(documentos?.map((d) => d.nombreEmpresa) || []),
    ];

    const unicas = [...new Set(empresas.filter((e) => e && e.trim() !== ""))];

    return ["Todas", ...unicas];
  }, [registros, documentos]);

  const barData = useMemo(() => {
    const map = {};
    registrosFiltrados.forEach((r) => {
      const mes = r.fecha ? r.fecha.slice(0, 7) : "Sin fecha";
      map[mes] = (map[mes] || 0) + 1;
    });

    return Object.entries(map)
      .sort()
      .slice(-6)
      .map(([mes, cantidad]) => ({
        mes: mes.slice(5) + "/" + mes.slice(2, 4),
        cantidad,
      }));
  }, [registrosFiltrados]);

  const legalFiltrado = useMemo(
    () =>
      MARCO_LEGAL.filter(
        (l) =>
          !filtroLegal ||
          l.codigo.toLowerCase().includes(filtroLegal.toLowerCase()) ||
          l.nombre.toLowerCase().includes(filtroLegal.toLowerCase()) ||
          l.tipo.toLowerCase().includes(filtroLegal.toLowerCase()),
      ),
    [filtroLegal],
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Gestión de Residuos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Módulo de gestión y manejo de residuos — normativa peruana vigente
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <svg
            className="w-4 h-4 text-amber-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Normativa: D.L. 1278 · D.S. 014-2017-MINAM · D.S. 040-2014-EM
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white shadow text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-500 uppercase">
          Filtrar por Empresa:
        </label>
        <select
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 min-w-[250px]"
          value={selectedEmpresa}
          onChange={(e) => setSelectedEmpresa(e.target.value)}
        >
          {empresasDisponibles.map((emp) => (
            <option key={emp} value={emp}>
              {emp}
            </option>
          ))}
        </select>
      </div>
      {/* ══ RESUMEN ══ */}
      {tab === "Resumen" && (
        <ResumenTab
          registros={registrosFiltrados}
          documentos={documentosFiltrados}
          kpis={kpis}
          pieData={pieData}
          barData={barData}
        />
      )}

      {/* ══ REGISTROS ══ */}
      {tab === "Registros" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              {registros.length} registro{registros.length !== 1 ? "s" : ""} en
              total
            </p>
            <button
              onClick={() => {
                setFormReg(emptyForm());
                setShowFormReg(true);
              }}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              + Nuevo registro
            </button>
          </div>

          {/* Modal formulario */}
          {showFormReg && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              onClick={() => setShowFormReg(false)}
            >
              <div
                /* Se agregó 'scrollbar-hide' y estilos inline para asegurar que la barra no se vea */
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                style={{
                  msOverflowStyle: "none" /* IE y Edge */,
                  scrollbarWidth: "none" /* Firefox */,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Estilo inyectado solo para Chrome/Safari/Webkit */}
                <style>{`
      div::-webkit-scrollbar {
        display: none;
      }
    `}</style>

                <div className="bg-slate-800 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                  <h3 className="font-bold text-lg">
                    Nuevo registro de residuos
                  </h3>
                  <button
                    onClick={() => setShowFormReg(false)}
                    className="text-slate-300 hover:text-white text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={guardarRegistro} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Fecha *" required>
                      <input
                        type="date"
                        required
                        value={formReg.fecha}
                        onChange={(e) =>
                          setFormReg((p) => ({ ...p, fecha: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                    <FormField label="Área generadora">
                      <input
                        type="text"
                        placeholder="Ej: Planta concentradora"
                        value={formReg.area_generadora}
                        onChange={(e) =>
                          setFormReg((p) => ({
                            ...p,
                            area_generadora: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Tipo de residuo *" required>
                      <select
                        required
                        value={formReg.tipo_residuo}
                        onChange={(e) =>
                          setFormReg((p) => ({
                            ...p,
                            tipo_residuo: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="">Seleccionar...</option>
                        {TIPOS_RESIDUO.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Clasificación *">
                      <select
                        value={formReg.clasificacion}
                        onChange={(e) =>
                          setFormReg((p) => ({
                            ...p,
                            clasificacion: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {CLASIFICACIONES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Cantidad *" required>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        required
                        placeholder="0.000"
                        value={formReg.cantidad}
                        onChange={(e) =>
                          setFormReg((p) => ({
                            ...p,
                            cantidad: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                    <FormField label="Unidad">
                      <select
                        value={formReg.unidad}
                        onChange={(e) =>
                          setFormReg((p) => ({ ...p, unidad: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {UNIDADES.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Empresa transportista (EO-RS)">
                      <input
                        type="text"
                        placeholder="Nombre de la empresa"
                        value={formReg.empresa_transportista}
                        onChange={(e) =>
                          setFormReg((p) => ({
                            ...p,
                            empresa_transportista: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                    <FormField label="N° Manifiesto">
                      <input
                        type="text"
                        placeholder="MRP-XXXX-YYYY"
                        value={formReg.nro_manifiesto}
                        onChange={(e) =>
                          setFormReg((p) => ({
                            ...p,
                            nro_manifiesto: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                  </div>

                  <FormField label="Destino final">
                    <input
                      type="text"
                      placeholder="Relleno sanitario, planta de tratamiento, etc."
                      value={formReg.destino_final}
                      onChange={(e) =>
                        setFormReg((p) => ({
                          ...p,
                          destino_final: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </FormField>

                  <FormField label="Observaciones">
                    <textarea
                      rows={2}
                      value={formReg.observaciones}
                      onChange={(e) =>
                        setFormReg((p) => ({
                          ...p,
                          observaciones: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    />
                  </FormField>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFormReg(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingReg}
                      className="px-5 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                    >
                      {savingReg ? "Guardando..." : "Guardar registro"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loadingReg ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                Cargando...
              </div>
            ) : registros.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                No hay registros. Crea el primero.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white text-left">
                      {[
                        "Fecha",
                        "Área",
                        "Tipo de residuo",
                        "Clasificación",
                        "Cantidad",
                        "Transportista",
                        "Manifiesto",
                        "Acciones",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map((r, i) => (
                      <tr
                        key={r.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {fmt(r.fecha)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.area_generadora || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">
                          {r.tipo_residuo}
                        </td>
                        <td className="px-4 py-3">
                          <ClasifBadge value={r.clasificacion} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {r.cantidad} {r.unidad}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">
                          {r.empresa_transportista || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {r.nro_manifiesto || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => eliminarRegistro(r.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MARCO LEGAL ══ */}
      {tab === "Marco Legal" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por código, nombre o tipo..."
              value={filtroLegal}
              onChange={(e) => setFiltroLegal(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <span className="text-sm text-slate-400">
              {legalFiltrado.length} norma
              {legalFiltrado.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {legalFiltrado.map((ley) => (
              <LeyCard key={ley.codigo} ley={ley} />
            ))}
          </div>
        </div>
      )}

      {/* ══ DOCUMENTOS ══ */}
      {tab === "Documentos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Vigentes: <b>{kpis.docsVigentes}</b>
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Por vencer: <b>{kpis.docsPorVencer}</b>
              </span>
              <span className="flex items-center gap-1.5 text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Vencidos: <b>{kpis.docsVencidos}</b>
              </span>
            </div>
            <button
              onClick={() => {
                setFormDoc(emptyDocForm());
                setShowFormDoc(true);
              }}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              + Nuevo documento
            </button>
          </div>

          {/* Requeridos warning */}
          {documentos.length < DOCS_REQUERIDOS.length && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">
                Documentos sugeridos según D.L. 1278 y D.S. 040-2014-EM:
              </span>{" "}
              {DOCS_REQUERIDOS.filter(
                (d) =>
                  !documentos.some((doc) =>
                    doc.nombre.toLowerCase().includes(d.toLowerCase()),
                  ),
              ).join(", ")}
            </div>
          )}

          {/* Modal */}
          {showFormDoc && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              onClick={() => setShowFormDoc(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-slate-800 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                  <h3 className="font-bold text-lg">Nuevo documento</h3>
                  <button
                    onClick={() => setShowFormDoc(false)}
                    className="text-slate-300 hover:text-white text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={guardarDocumento} className="p-6 space-y-4">
                  <FormField label="Nombre del documento *" required>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Plan de Manejo de Residuos 2025"
                      value={formDoc.nombre}
                      onChange={(e) =>
                        setFormDoc((p) => ({ ...p, nombre: e.target.value }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Tipo">
                      <select
                        value={formDoc.tipo}
                        onChange={(e) =>
                          setFormDoc((p) => ({ ...p, tipo: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {[
                          "Plan",
                          "Manifiesto",
                          "Contrato",
                          "Certificado",
                          "Declaración",
                          "Autorización",
                          "Registro",
                          "Otro",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="N° Documento / Código">
                      <input
                        type="text"
                        placeholder="Ej: MRP-2025-001"
                        value={formDoc.numero_doc}
                        onChange={(e) =>
                          setFormDoc((p) => ({
                            ...p,
                            numero_doc: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Fecha de emisión">
                      <input
                        type="date"
                        value={formDoc.fecha_emision}
                        onChange={(e) =>
                          setFormDoc((p) => ({
                            ...p,
                            fecha_emision: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                    <FormField label="Fecha de vencimiento">
                      <input
                        type="date"
                        value={formDoc.fecha_vencimiento}
                        onChange={(e) =>
                          setFormDoc((p) => ({
                            ...p,
                            fecha_vencimiento: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </FormField>
                  </div>
                  <FormField label="Entidad emisora / Empresa">
                    <input
                      type="text"
                      placeholder="Ej: MINAM, OEFA, empresa EO-RS"
                      value={formDoc.entidad}
                      onChange={(e) =>
                        setFormDoc((p) => ({ ...p, entidad: e.target.value }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </FormField>
                  <FormField label="Observaciones">
                    <textarea
                      rows={2}
                      value={formDoc.observaciones}
                      onChange={(e) =>
                        setFormDoc((p) => ({
                          ...p,
                          observaciones: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    />
                  </FormField>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFormDoc(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingDoc}
                      className="px-5 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                    >
                      {savingDoc ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabla documentos */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loadingDoc ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                Cargando...
              </div>
            ) : documentos.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                No hay documentos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white text-left">
                      {[
                        "Documento",
                        "Tipo",
                        "N° Código",
                        "Emisión",
                        "Vencimiento",
                        "Entidad",
                        "Estado",
                        "Acciones",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {/* AQUI ESTA EL DOCUMENTOS1 */}
                  <tbody>
                    {documentosFiltrados.map((d, i) => {
                      const estado = calcEstadoDoc(d.fecha_vencimiento);
                      return (
                        <tr
                          key={d.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-xs">
                            {d.nombre}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{d.tipo}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {d.numero_doc || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {fmt(d.fecha_emision)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {fmt(d.fecha_vencimiento)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">
                            {d.entidad || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <EstadoDocBadge estado={estado} />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => eliminarDocumento(d.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Iconos SVG ───────────────────────────────────────────────────────────────
const IcoClipboard = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);
const IcoBiohazard = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <circle cx="12" cy="11.9" r="2" />
    <path d="M12 4a3.5 3.5 0 013 5.3" />
    <path d="M12 4a3.5 3.5 0 00-3 5.3" />
    <path d="M5.6 16a3.5 3.5 0 006-.3" />
    <path d="M18.4 16a3.5 3.5 0 01-6-.3" />
    <path d="M9 18.7A3.5 3.5 0 0112 20a3.5 3.5 0 003-1.3" />
    <circle cx="12" cy="4" r="1" />
    <circle cx="5.2" cy="17" r="1" />
    <circle cx="18.8" cy="17" r="1" />
  </svg>
);
const IcoScale = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M12 3v18M8 21h8" />
    <path d="M5 7l-2 5h4L5 7zM19 7l-2 5h4L19 7z" />
    <path d="M5 7h14" />
  </svg>
);
const IcoShieldCheck = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IcoClock = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const IcoXCircle = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);
const IcoRecycle = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M7 19H4.5A2.5 2.5 0 012 16.5v-1A2.5 2.5 0 014.5 13H5" />
    <path d="M17 19h2.5A2.5 2.5 0 0022 16.5v-1A2.5 2.5 0 0019.5 13H19" />
    <path d="M12 3l3 4H9l3-4z" />
    <path d="M9 7l-4 7M15 7l4 7" />
    <path d="M5 19l7 2 7-2" />
  </svg>
);

// ─── RESUMEN TAB ──────────────────────────────────────────────────────────────
function ResumenTab({ registros, documentos, kpis, pieData, barData }) {
  const totalDocs = documentos.length;
  const pctCumplimiento =
    totalDocs === 0 ? 0 : Math.round((kpis.docsVigentes / totalDocs) * 100);

  // Top 5 tipos más frecuentes
  const topTipos = useMemo(() => {
    const map = {};
    registros.forEach((r) => {
      map[r.tipo_residuo] = (map[r.tipo_residuo] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [registros]);

  const maxTop = topTipos[0]?.[1] || 1;

  // Total kg (solo unidad kg y ton)
  const totalKgNum = registros.reduce((s, r) => {
    if (r.unidad === "ton") return s + r.cantidad * 1000;
    if (r.unidad === "kg") return s + r.cantidad;
    return s;
  }, 0);
  const totalKgLabel =
    totalKgNum >= 1000
      ? (totalKgNum / 1000).toFixed(2) + " ton"
      : totalKgNum.toFixed(1) + " kg";
  // Aqui es donde se debe cambiar para el filtro
  const KPI_DATA = [
    {
      label: "Total registros",
      value: registros.length,
      sub: "eventos registrados",
      icon: <IcoClipboard />,
      gradient: "from-blue-600 to-blue-400",
      ring: "ring-blue-200",
      bg: "bg-blue-50",
    },
    {
      label: "Residuos peligrosos",
      value: kpis.peligrosos,
      sub: `${registros.length ? Math.round((kpis.peligrosos / registros.length) * 100) : 0}% del total`,
      icon: <IcoBiohazard />,
      gradient: "from-amber-500 to-yellow-400",
      ring: "ring-amber-200",
      bg: "bg-amber-50",
    },
    {
      label: "Total generado",
      value: totalKgLabel,
      sub: "kg + ton registrados",
      icon: <IcoScale />,
      gradient: "from-violet-600 to-purple-400",
      ring: "ring-violet-200",
      bg: "bg-violet-50",
    },
    {
      label: "Docs. vigentes",
      value: kpis.docsVigentes,
      sub: `${pctCumplimiento}% cumplimiento`,
      icon: <IcoShieldCheck />,
      gradient: "from-emerald-600 to-green-400",
      ring: "ring-emerald-200",
      bg: "bg-emerald-50",
    },
    {
      label: "Por vencer",
      value: kpis.docsPorVencer,
      sub: "≤ 30 días",
      icon: <IcoClock />,
      gradient: "from-orange-500 to-amber-400",
      ring: "ring-orange-200",
      bg: "bg-orange-50",
    },
    {
      label: "Docs. vencidos",
      value: kpis.docsVencidos,
      sub: "requieren renovación",
      icon: <IcoXCircle />,
      gradient: "from-red-600 to-rose-400",
      ring: "ring-red-200",
      bg: "bg-red-50",
    },
  ];

  const NTP_COLORES = [
    { bg: "#FBBF24", label: "Peligrosos", detalle: "Residuos peligrosos" },
    {
      bg: "#1C1917",
      label: "No aprovechables",
      detalle: "Sin valor de reciclaje",
      light: true,
    },
    { bg: "#16A34A", label: "Orgánicos", detalle: "Compostables", light: true },
    {
      bg: "#2563EB",
      label: "Papel / Cartón",
      detalle: "Reciclable seco",
      light: true,
    },
    {
      bg: "#F8FAFC",
      label: "Plástico",
      detalle: "PET, HDPE, PP",
      border: "#CBD5E1",
    },
    {
      bg: "#92400E",
      label: "Vidrio",
      detalle: "Envases y cristal",
      light: true,
    },
    {
      bg: "#DC2626",
      label: "RAEE",
      detalle: "Equipos eléctricos",
      light: true,
    },
    {
      bg: "#F97316",
      label: "Especiales",
      detalle: "Residuos especiales",
      light: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Banner estado general ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)",
        }}
      >
        {/* patrón decorativo */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,1) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,1) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            transform: "translate(30%,-30%)",
          }}
        />
        <div className="relative z-10 px-7 py-6 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "rgba(59,130,246,0.2)",
                  color: "#93c5fd",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                <IcoRecycle /> D.L. N° 1278 · MINAM
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">
              Panel de Control — Residuos
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Gestión integral conforme a normativa peruana vigente
            </p>
          </div>

          {/* Gauge cumplimiento */}
          <div
            className="flex-shrink-0 flex flex-col items-center gap-1"
            style={{ minWidth: 110 }}
          >
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={
                    pctCumplimiento >= 80
                      ? "#22c55e"
                      : pctCumplimiento >= 50
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${pctCumplimiento} ${100 - pctCumplimiento}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-extrabold text-white">
                  {pctCumplimiento}%
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium text-center leading-tight">
              Cumplimiento
              <br />
              documental
            </span>
          </div>

          {/* Stats rápidos */}
          <div className="flex sm:flex-col gap-4 sm:gap-2 flex-shrink-0">
            {[
              { v: registros.length, l: "Registros" },
              { v: documentos.length, l: "Documentos" },
              { v: totalKgLabel, l: "Generado" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-xl font-bold text-white">{s.v}</div>
                <div className="text-xs text-slate-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_DATA.map((k) => (
          <div
            key={k.label}
            className={`${k.bg} rounded-xl p-4 border border-slate-100 ring-1 ${k.ring} relative overflow-hidden`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.gradient} flex items-center justify-center text-white shadow-sm`}
              >
                {k.icon}
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 leading-none mb-1">
              {k.value}
            </div>
            <div className="text-xs font-bold text-slate-600 leading-tight">
              {k.label}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Generación mensual</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Registros — últimos 6 meses
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          {barData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Sin datos aún
            </div>
          ) : (
            <div className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barSize={28}>
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                    cursor={{ fill: "rgba(59,130,246,0.06)" }}
                  />
                  <Bar
                    dataKey="cantidad"
                    name="Registros"
                    radius={[6, 6, 0, 0]}
                    fill="url(#barGrad)"
                  />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Por clasificación</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribución según D.L. 1278
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                />
              </svg>
            </div>
          </div>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Sin datos aún
            </div>
          ) : (
            <div className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Fila inferior: Top residuos + NTP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top tipos */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">
                Residuos más frecuentes
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Top 5 tipos registrados
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
          {topTipos.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              Sin datos
            </div>
          ) : (
            <div className="space-y-3">
              {topTipos.map(([tipo, count], i) => (
                <div key={tipo}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
                        style={{
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700 truncate">
                        {tipo}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-800 ml-2 flex-shrink-0">
                      {count}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / maxTop) * 100}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NTP 900.058 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Código de colores</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                NTP 900.058-2019 — Segregación de residuos
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              INACAL
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NTP_COLORES.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex-shrink-0 shadow-sm"
                  style={{
                    background: c.bg,
                    border: c.border
                      ? `2px solid ${c.border}`
                      : "2px solid rgba(0,0,0,0.08)",
                  }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 leading-tight">
                    {c.label}
                  </div>
                  <div className="text-xs text-slate-400 leading-tight truncate">
                    {c.detalle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeyCard({ ley }) {
  const [open, setOpen] = useState(false);
  const tipoBg =
    {
      Ley: "bg-blue-100 text-blue-800 border-blue-200",
      Reglamento: "bg-purple-100 text-purple-800 border-purple-200",
      "Norma Técnica": "bg-teal-100 text-teal-800 border-teal-200",
      "Plan Nacional": "bg-orange-100 text-orange-800 border-orange-200",
    }[ley.tipo] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-md">
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-slate-800 text-sm">
              {ley.codigo}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tipoBg}`}
            >
              {ley.tipo}
            </span>
            <span className="text-xs text-slate-400">
              {ley.entidad} · {ley.año}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-semibold">
              {ley.estado}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700">{ley.nombre}</p>
          {!open && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              {ley.descripcion}
            </p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            {ley.descripcion}
          </p>
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Obligaciones / Aplicaciones:
            </p>
            <ul className="space-y-1">
              {ley.obligaciones.map((o) => (
                <li
                  key={o}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <svg
                    className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
