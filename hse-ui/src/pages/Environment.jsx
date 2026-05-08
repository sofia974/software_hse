import { useEffect, useMemo, useState } from "react";
import EnvSampleModal from "../components/EnvSampleModal";
import EnvImportExcel from "../components/EnvImportExcel";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import toast from "react-hot-toast";
const LS_KEY = "hse_env_samples_v1";

// ---------- helpers ----------
const fmtInt = (n) =>
  n == null || !Number.isFinite(n) ? "—" : new Intl.NumberFormat().format(n);
const fmtPct = (n, d = 0) =>
  n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(d)}%`;

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows) {
  const headers = [
    "id",
    "tipo",
    "punto",
    "parametro",
    "laboratorio",
    "fecha",
    "valor",
    "unidad",
    "preservante",
    "filtro",
    "sensor",
    "retenida_h",
    "duplicado_de",
  ];
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return lines.join("\n");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((acc, x) => acc + x, 0) / arr.length;
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v =
    arr.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}

function statusFrom(value, limit) {
  // N/A = Indefinido
  if (!Number.isFinite(value)) return "N/A";
  if (limit == null) return "N/A";
  if (value > limit) return "Excedencia";
  if (value >= limit * 0.8) return "Alerta";
  return "OK";
}

function toneFromScore(score) {
  if (score == null)
    return {
      label: "Sin datos",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
    };
  if (score >= 95)
    return {
      label: "Verde",
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  if (score >= 85)
    return {
      label: "Ámbar",
      cls: "bg-amber-50 text-amber-900 border-amber-200",
    };
  return { label: "Rojo", cls: "bg-rose-50 text-rose-800 border-rose-200" };
}

function Panel({ title, subtitle, right, children }) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="p-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function Kpi({ label, value, sub, accent = "indigo" }) {
  const accents = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
    slate: "bg-slate-50 border-slate-200 text-slate-900",
  };
  return (
    <div
      className={`rounded-2xl border p-4 ${accents[accent] || accents.indigo}`}
    >
      <div className="text-xs text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function HeatCell({ pct }) {
  // 0..100 => color BI
  const p = pct == null ? null : clamp(pct, 0, 100);
  let cls = "bg-slate-50 text-slate-500";
  if (p != null) {
    if (p >= 95) cls = "bg-emerald-50 text-emerald-900";
    else if (p >= 85) cls = "bg-amber-50 text-amber-900";
    else cls = "bg-rose-50 text-rose-900";
  }
  return (
    <div
      className={`rounded-lg px-2 py-1 text-xs font-semibold text-center ${cls}`}
    >
      {pct == null ? "—" : `${Math.round(pct)}%`}
    </div>
  );
}

// ---------- component ----------
export default function Environment() {
  const [tab, setTab] = useState("Dashboard");
  const [openModal, setOpenModal] = useState(false);
  // filtros
  const [tipo, setTipo] = useState("Agua");
  const [punto, setPunto] = useState("Todos");
  const [param, setParam] = useState("Todos");
  const [rango, setRango] = useState("Últimos 60 días");
  const baselineDays = 7;
  const [samples, setSamples] = useState([]);
  const [importaciones, setImportaciones] = useState([]);
  const [importacionSeleccionada, setImportacionSeleccionada] = useState(null);
  const [importStatus, setImportStatus] = useState(null); // { ok, msg }
  const [importing, setImporting] = useState(false);

  const [catalogs, setCatalogs] = useState({});
  // --- ESTADOS DE DATOS ---
  const [empresas, setEmpresas] = useState([]);
  // --- ESTADOS DE CONTROL ---
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState(""); // Empresa seleccionada en el dashboard

  // 1. Modifica loadImportaciones para que acepte el ID
  async function loadImportaciones(idEmpresaSeleccionada) {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      // Añadimos el idEmpresa como query parameter
      let url = "http://localhost:4000/api/importaciones";
      if (idEmpresaSeleccionada) {
        url += `?idEmpresa=${idEmpresaSeleccionada}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const data = await res.json();
      setImportaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando importaciones:", err);
      setImportaciones([]);
    }
  }

  // 2. Ejecutar loadImportaciones cada vez que empresaFiltro cambie
  useEffect(() => {
    if (empresaFiltro) {
      loadImportaciones(empresaFiltro);
    } else {
      setImportaciones([]); // Limpiar si no hay selección
    }
  }, [empresaFiltro]); // <-- Esto es clave

  useEffect(() => {
    if (!importacionSeleccionada) return;

    async function loadData() {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const [muestrasRes, catalogsRes] = await Promise.all([
          fetch(
            `http://localhost:4000/api/muestras/${importacionSeleccionada}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          ),
          fetch(
            `http://localhost:4000/api/catalogs/${importacionSeleccionada}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          ),
        ]);
        setSamples(await muestrasRes.json());
        setCatalogs(await catalogsRes.json());
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    }
    loadData();
  }, [importacionSeleccionada]);

  async function saveSample(sample) {
    try {
      await fetch("http://localhost:4000/api/muestras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sample,
          idImportacion: importacionSeleccionada,
        }),
      });
      const res = await fetch(
        `http://localhost:4000/api/muestras/${importacionSeleccionada}`,
      );
      setSamples(await res.json());
    } catch (err) {
      console.error("Error guardando muestra:", err);
    }
  }

  // 1. CARGAR EMPRESAS AL INICIAR
  useEffect(() => {
    fetchEmpresas();
    if (typeof loadImportaciones === "function") loadImportaciones();
  }, []);
  // Función para cargar importaciones cuando cambia la empresa
  useEffect(() => {
    if (empresaFiltro) {
      cargarImportacionesPorEmpresa(empresaFiltro);
    } else {
      setImportaciones([]); // Si no hay empresa, limpiamos las importaciones
      setImportacionSeleccionada("");
    }
  }, [empresaFiltro]);
  const cargarImportacionesPorEmpresa = async (id) => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`http://localhost:4000/api/importaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setImportaciones(data);
    } catch (err) {
      console.error("Error al cargar importaciones:", err);
    }
  };
  const fetchEmpresas = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/empresas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setEmpresas(data);
    } catch (err) {
      alert("Error técnico: " + err.message);
    }
  };

  // 2. FUNCIÓN DE SUBIDA FINAL (Se dispara desde el componente Excel)
  const ejecutarSubida = async (muestrasProcesadas, nombreArchivo) => {
    if (!empresaSeleccionada) {
      alert("Por favor, selecciona una empresa primero.");
      return;
    }

    setImporting(true);

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          muestras: muestrasProcesadas,
          nombreArchivo: nombreArchivo,
          idEmpresa: parseInt(empresaSeleccionada),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // alert(`¡Éxito! Se cargaron los datos para la empresa seleccionada.`);
        toast.success("¡Datos importados correctamente!");
        setShowEmpresaModal(false);
        setEmpresaSeleccionada("");
        if (typeof loadImportaciones === "function") await loadImportaciones();
      } else {
        toast.error(
          "Hubo un error al intentar importar los datos" +
            (data.error || "No se pudo importar"),
        );
      }
    } catch (err) {
      toast.error("Error técnico: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const limits = useMemo(
    () => ({
      // Agua
      pH: 8.5,
      Conductividad: 1500,
      Turbidez: 5,
      DBO5: 30,
      DQO: 100,
      SST: 50,
      Nitratos: 10,
      Amonio: 1,
      As: 0.01,
      Pb: 0.01,
      Cd: 0.003,
      Hg: 0.001,
      // Aire
      PM10: 100,
      "PM2.5": 50,
      SO2: 125,
      NO2: 200,
      CO: 10000,
      O3: 120,
      // Ruido
      LAeq: 80,
      Lmax: 90,
    }),
    [],
  );

  const limit = useMemo(() => {
    if (param === "Todos") return null;
    return limits[String(param).trim()] ?? null;
  }, [limits, param]);

  const rangeDays = useMemo(() => {
    if (rango === "Todos") return null;
    if (rango === "Últimos 7 días") return 7;
    if (rango === "Últimos 30 días") return 30;
    if (rango === "Últimos 60 días") return 60;
    if (rango === "Último año") return 365;
    return null;
  }, [rango]);

  // opciones dependientes (tipo -> punto -> param)
  const dataByTipo = useMemo(() => {
    if (tipo === "Todos") return samples;
    return samples.filter((s) => s.tipo === tipo);
  }, [samples, tipo]);
  const availablePoints = useMemo(() => {
    const pts = Array.from(
      new Set(dataByTipo.map((s) => s.punto).filter(Boolean)),
    ).sort();

    return pts.length ? pts : catalogs.puntosByTipo?.[tipo] || [];
  }, [dataByTipo, catalogs, tipo]);

  const dataByTipoAndPoint = useMemo(() => {
    if (punto === "Todos") return dataByTipo;
    return dataByTipo.filter((s) => s.punto === punto);
  }, [dataByTipo, punto]);

  const availableParams = useMemo(() => {
    const ps = Array.from(
      new Set(dataByTipoAndPoint.map((s) => s.parametro).filter(Boolean)),
    ).sort();

    return ps.length ? ps : catalogs.parametrosByTipo?.[tipo] || [];
  }, [dataByTipoAndPoint, catalogs, tipo]);

  const puntoEff = useMemo(() => {
    if (punto === "Todos") return "Todos";
    if (!availablePoints.length) return "Todos";
    return availablePoints.includes(punto) ? punto : "Todos";
  }, [punto, availablePoints]);

  const paramEff = useMemo(() => {
    if (param === "Todos") return "Todos";
    if (!availableParams.length) return "Todos";
    return availableParams.includes(param) ? param : "Todos";
  }, [param, availableParams]);

  const filtered = useMemo(() => {
    if (!samples.length) return [];

    const maxDate = new Date(
      Math.max(...samples.map((s) => new Date(s.fecha).getTime())),
    );

    const minDate = new Date(maxDate);

    if (rangeDays) {
      minDate.setDate(maxDate.getDate() - rangeDays);
    }

    return dataByTipo
      .filter((s) => (puntoEff === "Todos" ? true : s.punto === puntoEff))
      .filter((s) => (paramEff === "Todos" ? true : s.parametro === paramEff))
      .filter((s) => {
        if (!rangeDays) return true;

        const d = new Date(s.fecha);
        return d >= minDate && d <= maxDate;
      })
      .map((s) => {
        const v = Number(
          String(s.valor).replace("<", "").replace(">", "").replace(",", "."),
        );

        const lim = limits[s.parametro] ?? null;

        return { ...s, _v: v, _lim: lim, estado: statusFrom(v, lim) };
      });
  }, [dataByTipo, puntoEff, paramEff, rangeDays, limits, samples]);

  const externos = useMemo(() => {
    return filtered.filter((s) => s.laboratorio === "Externo");
  }, [filtered]);

  // 3️⃣ internos (desde filtered)
  const internos = useMemo(
    () =>
      filtered.filter((s) => s.laboratorio === "Interno" && !s.duplicado_de),
    [filtered],
  );

  // ---------- SCORE + KPIs (solo Externo con límite disponible) ----------
  const complianceScore = useMemo(() => {
    const eligible = externos.filter(
      (s) => s._lim != null && Number.isFinite(s._v),
    );
    if (!eligible.length) return null;
    const pass = eligible.filter((s) => s._v <= s._lim).length;
    return (pass / eligible.length) * 100;
  }, [externos]);

  const scoreTone = useMemo(
    () => toneFromScore(complianceScore),
    [complianceScore],
  );

  const kpis = useMemo(() => {
    const exceeded = externos.filter((s) => s.estado === "Excedencia").length;
    const alerts = externos.filter((s) => s.estado === "Alerta").length;
    const ok = externos.filter((s) => s.estado === "OK").length;

    // crítico por punto/param
    const byPoint = new Map();
    const byParam = new Map();
    for (const s of externos) {
      if (s.estado !== "Excedencia") continue;
      byPoint.set(s.punto, (byPoint.get(s.punto) || 0) + 1);
      byParam.set(s.parametro, (byParam.get(s.parametro) || 0) + 1);
    }
    const topOf = (m) => {
      let best = null;
      let bestC = -1;
      for (const [k, c] of m.entries()) {
        if (c > bestC) {
          best = k;
          bestC = c;
        }
      }
      return { key: best ?? "—", count: bestC > 0 ? bestC : 0 };
    };

    const topPoint = topOf(byPoint);
    const topParam = topOf(byParam);

    // QA/QC pass rate (RPD<=20)
    // const byId = new Map(filtered.map((x) => [x.id, x]));
    const byId = new Map(filtered.map((x) => [x.idExcel, x]));
    let rpdTotal = 0;
    let rpdPass = 0;
    const rpds = [];
    for (const s of filtered) {
      if (!s.duplicado_de) continue;
      const orig = byId.get(s.duplicado_de);
      if (!orig) continue;
      const a = Number(orig._v);
      const b = Number(s._v);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a + b === 0) continue;
      const rpd = (Math.abs(a - b) / ((a + b) / 2)) * 100;
      rpdTotal += 1;
      if (rpd <= 20) rpdPass += 1;
      rpds.push(rpd);
    }
    const rpdPassRate = rpdTotal ? (rpdPass / rpdTotal) * 100 : null;
    const rpdP95 = rpds.length
      ? (() => {
          const arr = [...rpds].sort((x, y) => x - y);
          const idx = Math.floor(0.95 * (arr.length - 1));
          return arr[idx];
        })()
      : null;

    return {
      exceeded,
      alerts,
      ok,
      topPoint,
      topParam,
      rpdPassRate,
      rpdP95,
      externoN: externos.length,
      internoN: internos.length,
    };
  }, [externos, internos, filtered]);

  // ---------- Tendencia mensual (6 meses) de cumplimiento (solo Externo) ----------

  const monthlyCompliance = useMemo(() => {
    const eligible = externos.filter(
      (s) => s._lim != null && Number.isFinite(s._v),
    );

    const byMonth = new Map();

    for (const s of eligible) {
      const m = s.fecha.slice(0, 7);

      if (!byMonth.has(m)) {
        byMonth.set(m, { month: m, pass: 0, total: 0 });
      }

      const o = byMonth.get(m);

      o.total += 1;

      if (s._v <= s._lim) o.pass += 1;
    }

    const arr = Array.from(byMonth.values())
      .map((o) => ({
        month: o.month,
        compliance: o.total ? (o.pass / o.total) * 100 : null,
      }))
      .sort((a, b) => (a.month > b.month ? 1 : -1));

    return arr.slice(-6);
  }, [externos]);
  // ---------- Heatmap Punto x Parámetro (compliance Externo) ----------
  const heatmap = useMemo(() => {
    // matrix keys basadas en data visible
    const points = Array.from(new Set(externos.map((s) => s.punto))).sort();
    const params = Array.from(new Set(externos.map((s) => s.parametro))).sort();

    // stats cell
    const cell = new Map(); // `${p}||${param}` -> {pass,total}
    for (const s of externos) {
      if (s._lim == null || !Number.isFinite(s._v)) continue;
      const k = `${s.punto}||${s.parametro}`;
      if (!cell.has(k)) cell.set(k, { pass: 0, total: 0 });
      const o = cell.get(k);
      o.total += 1;
      if (s._v <= s._lim) o.pass += 1;
    }

    const rows = points.map((pt) => {
      const row = { punto: pt };
      for (const pa of params) {
        const o = cell.get(`${pt}||${pa}`);
        row[pa] = o && o.total ? (o.pass / o.total) * 100 : null;
      }
      return row;
    });

    return { points, params, rows };
  }, [externos]);

  // ---------- Rankings (Top 5) ----------
  const rankings = useMemo(() => {
    const byPoint = new Map();
    const byParam = new Map();

    // rank por excedencias (externo)
    for (const s of externos) {
      if (s.estado !== "Excedencia") continue;
      byPoint.set(s.punto, (byPoint.get(s.punto) || 0) + 1);
      byParam.set(s.parametro, (byParam.get(s.parametro) || 0) + 1);
    }

    const topN = (m, n = 5) =>
      Array.from(m.entries())
        .map(([k, c]) => ({ key: k, count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n);

    return {
      points: topN(byPoint),
      params: topN(byParam),
    };
  }, [externos]);

  // ---------- Alert feed (inteligente, simple pero útil) ----------
  const alertsFeed = useMemo(() => {
    // 1) Excedencias Externo (últimas 10)
    const exceed = externos
      .filter((s) => s.estado === "Excedencia")
      .slice()
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, 10)
      .map((s) => ({
        date: s.fecha,
        sev: "ROJO",
        title: "Excedencia (Externo)",
        detail: `${s.tipo} • ${s.punto} • ${s.parametro}: ${s.valor} ${s.unidad || ""} (Lím: ${s._lim})`,
      }));

    // 2) Anomalías Interno: z-score > 2 sobre baseline rolling 7
    // (para el filtro actual; si paramEff=Todos, igual puede detectar por parámetro, pero lo dejamos simple)
    const ints = internos
      .filter((s) => Number.isFinite(s._v))
      .map((s) => ({ ...s, _d: new Date(`${s.fecha}T00:00:00`) }))
      .sort((a, b) => a._d - b._d);

    const anomalies = [];
    const q = [];
    for (const s of ints) {
      q.push(s._v);
      if (q.length > baselineDays) q.shift();
      const m = mean(q);
      const sd = std(q);
      if (m != null && sd > 0) {
        const z = (s._v - m) / sd;
        if (Math.abs(z) >= 2.2) {
          anomalies.push({
            date: s.fecha,
            sev: Math.abs(z) >= 3 ? "ROJO" : "ÁMBAR",
            title: "Anomalía (Interno)",
            detail: `${s.tipo} • ${s.punto} • ${s.parametro}: z=${z.toFixed(1)} (v=${s._v})`,
          });
        }
      }
    }

    // 3) Persistencia: 3 excedencias seguidas por punto+param en Externo
    const keyOf = (s) => `${s.punto}||${s.parametro}`;
    const sortedExt = externos
      .filter((s) => Number.isFinite(s._v) && s._lim != null)
      .slice()
      .sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

    const pers = [];
    const streak = new Map();
    for (const s of sortedExt) {
      const k = keyOf(s);
      const isBad = s._v > s._lim;
      const prev = streak.get(k) || 0;
      const next = isBad ? prev + 1 : 0;
      streak.set(k, next);
      if (next === 3) {
        pers.push({
          date: s.fecha,
          sev: "ROJO",
          title: "Persistencia (3 seguidas)",
          detail: `${s.tipo} • ${s.punto} • ${s.parametro}: 3 excedencias consecutivas`,
        });
      }
    }

    const all = [...exceed, ...anomalies.slice(-10), ...pers.slice(-10)]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 12);

    return all;
  }, [externos, internos, baselineDays]);

  // ---------- BI Trend chart (baseline band) para vista operativa ----------
  const trendBI = useMemo(() => {
    if (paramEff === "Todos") return [];
    const byDate = new Map();
    for (const s of filtered) {
      if (!byDate.has(s.fecha))
        byDate.set(s.fecha, { fecha: s.fecha, i: [], e: [] });
      const o = byDate.get(s.fecha);
      if (
        s.laboratorio === "Interno" &&
        !s.duplicado_de &&
        Number.isFinite(s._v)
      )
        o.i.push(s._v);
      if (
        s.laboratorio === "Externo" &&
        !s.duplicado_de &&
        Number.isFinite(s._v)
      )
        o.e.push(s._v);
    }
    const dates = Array.from(byDate.keys()).sort();
    const rows = dates.map((d) => ({
      fecha: d,
      interno: mean(byDate.get(d).i),
      externo: mean(byDate.get(d).e),
    }));

    const q = [];
    return rows.map((r) => {
      if (Number.isFinite(r.interno)) q.push(r.interno);
      if (q.length > baselineDays) q.shift();
      const m = mean(q.filter(Number.isFinite));
      const sd = std(q.filter(Number.isFinite));
      const lower = m == null ? null : m - sd;
      const upper = m == null ? null : m + sd;
      return {
        ...r,
        baseline: m == null ? null : Number(m.toFixed(4)),
        bandBase: lower == null ? null : lower,
        band:
          lower == null || upper == null ? null : Math.max(0, upper - lower),
      };
    });
  }, [filtered, baselineDays, paramEff]);

  // ---------- actions ----------
  const exportCSV = () => {
    const csv = toCSV(externos); // reporte: Externo limpio
    downloadText(
      `reporte_ambiental_externo_${tipo}_${puntoEff}_${paramEff}.csv`,
      csv,
    );
    toast.success("¡Reporte generado correctamente!");
  };
  // ---------- UI ----------
  return (
    <main className="p-4 md:p-6 flex flex-col gap-6">
      {/* El contenedor principal ya no usa grid-cols-12 para evitar el desbordamiento rígido */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        {/* CONTENEDOR DE FILTROS Y ACCIONES */}
        {/* 'xl:flex-nowrap' asegura que en monitores grandes esté todo alineado, 
        pero en laptops/tablets permite el salto de línea (wrap) */}
        <div className="flex flex-wrap xl:flex-nowrap items-start justify-between gap-6">
          {/* COLUMNA IZQUIERDA: Selectores de Empresa e Importación */}
          <div className="flex flex-col gap-2 w-full lg:w-auto flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Filtrar por origen
            </span>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <select
                value={empresaFiltro}
                onChange={(e) => {
                  setEmpresaFiltro(e.target.value);
                  setImportacionSeleccionada("");
                }}
                className="w-full sm:w-[220px] px-4 py-2.5 rounded-xl border bg-white hover:bg-slate-50 font-semibold text-indigo-600 border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              >
                <option value="">Seleccionar Empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp.idEmpresa} value={emp.idEmpresa}>
                    {emp.razonSocial}
                  </option>
                ))}
              </select>

              <select
                value={importacionSeleccionada || ""}
                onChange={(e) => setImportacionSeleccionada(e.target.value)}
                disabled={!empresaFiltro}
                className={`w-full sm:w-[300px] px-4 py-2.5 rounded-xl border bg-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                  !empresaFiltro
                    ? "opacity-50 bg-slate-50 cursor-not-allowed border-slate-200"
                    : "hover:bg-slate-50 border-slate-200"
                }`}
              >
                <option value="">
                  {empresaFiltro
                    ? "Ver archivos subidos..."
                    : "Primero selecciona una empresa"}
                </option>
                {importaciones.map((imp) => (
                  <option key={imp.idImportacion} value={imp.idImportacion}>
                    {imp.nombreArchivo} (
                    {new Date(imp.fechaImportacion).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* COLUMNA DERECHA: Botones y Tabs */}
          <div className="flex flex-col items-start xl:items-end gap-4 w-full lg:w-auto">
            {/* FILA SUPERIOR: Botones de Acción Principal */}
            <div className="flex flex-wrap items-center gap-2 w-full justify-start xl:justify-end">
              <button
                className="flex-1 sm:flex-none px-6 py-2 whitespace-nowrap rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm font-semibold transition-all active:scale-95 text-sm"
                onClick={() => setOpenModal(true)}
              >
                + Nueva muestra
              </button>

              <button
                onClick={() => setShowEmpresaModal(true)}
                className="flex-1 sm:flex-none px-6 py-2 whitespace-nowrap rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm font-semibold transition-all active:scale-95 text-sm"
              >
                + Importar Excel
              </button>

              <button
                className="w-full sm:w-auto px-6 py-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition-all text-sm"
                onClick={exportCSV}
              >
                Exportar reporte (Externo)
              </button>
            </div>

            {/* FILA INFERIOR: Navegación (Tabs) */}
            <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto">
              {["Dashboard", "Operación", "QA/QC", "Reporte"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 sm:flex-none px-5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    tab === t
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* --- MODAL DE SELECCIÓN Y CARGA --- */}
      {showEmpresaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Nueva Importación
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Sigue los pasos para cargar los datos a la base de datos.
              </p>

              {/* PASO 1: SELECCIONAR EMPRESA */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  1. Selecciona la empresa destino:
                </label>
                <select
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={empresaSeleccionada}
                  onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  disabled={importing}
                >
                  <option value="">-- Seleccionar Empresa --</option>
                  {empresas.map((emp) => (
                    <option key={emp.idEmpresa} value={emp.idEmpresa}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* PASO 2: SELECCIONAR ARCHIVO (Habilitado solo si hay empresa) */}
              <div
                className={`transition-all duration-300 ${!empresaSeleccionada ? "opacity-30 pointer-events-none" : "opacity-100"}`}
              >
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  2. Cargar archivo Excel/CSV:
                </label>
                <EnvImportExcel onImport={ejecutarSubida} loading={importing} />
                {importing && (
                  <p className="text-xs text-indigo-600 mt-2 animate-pulse">
                    Procesando datos y subiendo al servidor...
                  </p>
                )}
              </div>
            </div>

            {/* PIE DEL MODAL */}
            <div className="bg-slate-50 p-4 flex justify-end">
              <button
                onClick={() => {
                  if (!importing) {
                    setShowEmpresaModal(false);
                    setEmpresaSeleccionada("");
                  }
                }}
                disabled={importing}
                className="px-4 py-2 text-slate-500 font-medium hover:text-slate-800 disabled:opacity-30"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* IMPORT STATUS */}
      {importStatus && (
        <div className="col-span-12">
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-3 ${
              importStatus.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <span>{importStatus.msg}</span>
            <button
              className="text-xs underline opacity-70 hover:opacity-100"
              onClick={() => setImportStatus(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="col-span-12">
        <Panel
          title="Filtros"
          subtitle="Los filtros se ajustan automáticamente (punto/parámetro válidos según tipo)"
          right={
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${scoreTone.cls}`}
            >
              {scoreTone.label}
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Tipo</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option>Agua</option>
                <option>Suelo</option>
                <option>Aire</option>
                <option>Ruido</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Punto</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={punto}
                onChange={(e) => setPunto(e.target.value)}
              >
                <option>Todos</option>
                {availablePoints.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Parámetro</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={param}
                onChange={(e) => setParam(e.target.value)}
              >
                <option>Todos</option>
                {availableParams.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Rango</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={rango}
                onChange={(e) => setRango(e.target.value)}
              >
                <option>Todos</option>
                <option>Últimos 7 días</option>
                <option>Últimos 30 días</option>
                <option>Últimos 60 días</option>
                <option>Último año</option>
                <option>Todo el historial</option>
              </select>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Límite (demo)</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {limit == null ? "—" : limit}
              </div>
              <div className="text-[11px] text-slate-500">Según parámetro</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* DASHBOARD */}
      {tab === "Dashboard" && (
        <>
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Kpi
              label="Environmental Compliance Score"
              value={
                complianceScore == null
                  ? "—"
                  : `${Math.round(complianceScore)}/100`
              }
              sub="Solo Externo con límite (según filtros)"
              accent={
                complianceScore == null
                  ? "slate"
                  : complianceScore >= 95
                    ? "emerald"
                    : complianceScore >= 85
                      ? "amber"
                      : "rose"
              }
            />
            <Kpi
              label="Excedencias (Externo)"
              value={fmtInt(kpis.exceeded)}
              sub="Último rango seleccionado"
              accent={
                kpis.exceeded === 0
                  ? "emerald"
                  : kpis.exceeded < 3
                    ? "amber"
                    : "rose"
              }
            />
            <Kpi
              label="Punto crítico"
              value={kpis.topPoint.key}
              sub={
                kpis.topPoint.count
                  ? `${kpis.topPoint.count} excedencia(s)`
                  : "—"
              }
              accent={kpis.topPoint.count ? "rose" : "slate"}
            />
            <Kpi
              label="Parámetro crítico"
              value={kpis.topParam.key}
              sub={
                kpis.topParam.count
                  ? `${kpis.topParam.count} excedencia(s)`
                  : "—"
              }
              accent={kpis.topParam.count ? "rose" : "slate"}
            />
          </div>

          <div className="col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="Cumplimiento mensual (6 meses)"
              subtitle="Solo Externo (sin duplicados) y con límite disponible"
            >
              {/* <div className="w-full h-72">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyCompliance}> */}
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyCompliance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine
                      y={95}
                      stroke="rgba(16,185,129,0.6)"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={85}
                      stroke="rgba(245,158,11,0.7)"
                      strokeDasharray="4 4"
                    />
                    <Line
                      dataKey="compliance"
                      name="Compliance %"
                      stroke="#4F46E5"
                      strokeWidth={3}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Rankings (Top 5 excedencias)"
              subtitle="Lo más crítico para priorizar acciones"
              right={<span className="text-xs text-slate-500">Externo</span>}
            >
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700">
                    Puntos
                  </div>
                  <div className="mt-2 space-y-2">
                    {rankings.points.length ? (
                      rankings.points.map((x) => (
                        <div
                          key={x.key}
                          className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2"
                        >
                          <div className="text-sm text-slate-900">{x.key}</div>
                          <div className="text-sm font-semibold text-rose-700">
                            {x.count}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Parámetros
                  </div>
                  <div className="mt-2 space-y-2">
                    {rankings.params.length ? (
                      rankings.params.map((x) => (
                        <div
                          key={x.key}
                          className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2"
                        >
                          <div className="text-sm text-slate-900">{x.key}</div>
                          <div className="text-sm font-semibold text-rose-700">
                            {x.count}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="Alertas"
              subtitle="Excedencias, anomalías (Interno) y persistencia"
              right={<span className="text-xs text-slate-500">Últimas 12</span>}
            >
              <div className="space-y-2">
                {alertsFeed.length ? (
                  alertsFeed.map((a, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">
                          {a.title}
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                            a.sev === "ROJO"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-amber-50 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {a.sev}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {/* {a.date} */}
                        {new Date(a.date).toLocaleDateString("es-PE", {
                          timeZone: "UTC",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        {a.detail}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">
                    Sin alertas en el rango actual.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <div className="col-span-12">
            <Panel
              title="Heatmap de cumplimiento (Externo)"
              subtitle="Punto × Parámetro (verde ≥95%, ámbar ≥85%, rojo <85%)"
              right={
                <span className="text-xs text-slate-500">
                  Solo celdas con límite
                </span>
              }
            >
              {heatmap.params.length === 0 || heatmap.points.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No hay datos Externo suficientes para construir el heatmap.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b">
                        <th className="py-2 pr-3 sticky left-0 bg-white">
                          Punto
                        </th>
                        {heatmap.params.map((p) => (
                          <th key={p} className="py-2 px-2 whitespace-nowrap">
                            {p}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.rows.map((r) => (
                        <tr key={r.punto} className="border-b last:border-b-0">
                          <td className="py-2 pr-3 sticky left-0 bg-white font-semibold text-slate-900">
                            {r.punto}
                          </td>
                          {heatmap.params.map((p) => (
                            <td key={p} className="py-2 px-2">
                              <HeatCell pct={r[p]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      {/* OPERACIÓN */}
      {tab === "Operación" && (
        <div className="col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel
            title="Tendencia BI (baseline ±1σ)"
            subtitle={`Banda = Interno (ventana ${baselineDays} días) • Límites = demo por parámetro`}
            right={
              <span className="text-xs text-slate-500">
                {tipo} · {puntoEff} · {paramEff}
              </span>
            }
          >
            {paramEff === "Todos" ? (
              <div className="py-10 text-center text-slate-500">
                Selecciona un <span className="font-semibold">parámetro</span>{" "}
                para ver la serie de tiempo (evitamos mezclar unidades).
              </div>
            ) : (
              // <div className="h-96">
              <div className="h-96 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendBI}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {limit != null && (
                      <ReferenceLine
                        y={limit}
                        stroke="rgba(244,63,94,0.7)"
                        strokeDasharray="4 4"
                      />
                    )}
                    {/* band (stacked): invisible base + band height */}
                    <Area
                      type="monotone"
                      dataKey="bandBase"
                      stackId="1"
                      stroke="none"
                      fill="transparent"
                    />
                    <Area
                      type="monotone"
                      dataKey="band"
                      stackId="1"
                      stroke="none"
                      fillOpacity={0.18}
                      fill="#4F46E5"
                      name="Baseline ±1σ"
                    />
                    <Line
                      type="monotone"
                      dataKey="interno"
                      dot={false}
                      stroke="#0F172A"
                      strokeWidth={2.5}
                      name="Interno"
                    />
                    <Line
                      type="monotone"
                      dataKey="externo"
                      dot
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      name="Externo"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel
            title="KPIs operativos"
            subtitle="Conteos y volumen de data"
            right={
              <span className="text-xs text-slate-500">según filtros</span>
            }
          >
            <div className="grid grid-cols-1 gap-3">
              <Kpi
                label="Muestras Interno"
                value={fmtInt(kpis.internoN)}
                sub="Sin duplicados"
                accent="slate"
              />
              <Kpi
                label="Muestras Externo"
                value={fmtInt(kpis.externoN)}
                sub="Sin duplicados"
                accent="indigo"
              />
              <Kpi
                label="RPD Pass Rate"
                value={fmtPct(kpis.rpdPassRate, 0)}
                sub={`p95: ${kpis.rpdP95 == null ? "—" : kpis.rpdP95.toFixed(1)}%`}
                accent="emerald"
              />
            </div>
          </Panel>

          <Panel
            title="Detalle rápido (últimos externos)"
            subtitle="Lista compacta para revisión"
            right={<span className="text-xs text-slate-500">Top 12</span>}
          >
            <div className="space-y-2">
              {externos
                .slice()
                .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
                .slice(0, 12)
                .map((s) => (
                  <div
                    key={s.idMuestra}
                    className="rounded-xl border bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(s.fecha).toLocaleDateString("es-PE", {
                          timeZone: "UTC",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                          s.estado === "Excedencia"
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : s.estado === "Alerta"
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : s.estado === "N/A"
                                ? "bg-slate-50 text-slate-700 border border-slate-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {s.estado}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {s.punto} • {s.parametro}
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      <span className="font-semibold">{s.valor}</span>{" "}
                      {s.unidad || ""}{" "}
                      {s._lim != null ? (
                        <span className="text-xs text-slate-500">
                          (Lím: {s._lim})
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              {!externos.length && (
                <div className="text-sm text-slate-500">
                  No hay Externo en el rango actual.
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* QA/QC (básico aquí; si ya tenías scatter/hist BI, lo podemos reinsertar) */}
      {tab === "QA/QC" && (
        <div className="col-span-12">
          <Panel
            title="QA/QC"
            subtitle="En esta vista dejamos lo esencial. Si quieres, reintegro el Scatter original-vs-duplicado + histograma BI como lo hicimos antes."
            right={<span className="text-xs text-slate-500">RPD ≤ 20%</span>}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Kpi
                label="RPD Pass Rate"
                value={fmtPct(kpis.rpdPassRate, 0)}
                sub="Duplicados vinculados"
                accent="indigo"
              />
              <Kpi
                label="RPD p95"
                value={kpis.rpdP95 == null ? "—" : `${kpis.rpdP95.toFixed(1)}%`}
                sub="Robustez de repetibilidad"
                accent="slate"
              />
              <Kpi
                label="Sugerencia auditoría"
                value="Adjuntar evidencia"
                sub="Certificados lab / cadena de custodia"
                accent="emerald"
              />
            </div>
          </Panel>
        </div>
      )}

      {/* REPORTE */}
      {tab === "Reporte" && (
        <div className="col-span-12">
          <Panel
            title="Reporte oficial (Estado-ready)"
            subtitle="Solo Laboratorio Externo, sin duplicados. Exporta CSV desde el botón superior."
            right={
              <span className="text-xs text-slate-500">
                {externos.length} filas
              </span>
            }
          >
            <div className="overflow-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Punto</th>
                    <th className="py-2 pr-3">Parámetro</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Límite</th>
                    <th className="py-2 pr-3">Cumple</th>
                    <th className="py-2">ID</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {externos
                    .slice()
                    .sort((a, b) => (a.fecha > b.fecha ? 1 : -1))
                    .map((s) => {
                      const ok = s._lim == null ? null : s._v <= s._lim;
                      return (
                        <tr
                          key={s.idMuestra}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2 pr-3">
                            {new Date(s.fecha).toLocaleDateString("es-PE", {
                              timeZone: "UTC",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 pr-3">{s.tipo}</td>
                          <td className="py-2 pr-3">{s.punto}</td>
                          <td className="py-2 pr-3">{s.parametro}</td>
                          <td className="py-2 pr-3">
                            <span className="font-semibold">{s.valor}</span>{" "}
                            {s.unidad || ""}
                          </td>
                          <td className="py-2 pr-3">
                            {s._lim == null ? "—" : s._lim}
                          </td>
                          <td className="py-2 pr-3">
                            {ok == null ? (
                              <span className="text-xs text-slate-500">—</span>
                            ) : ok ? (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Cumple
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                No cumple
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-xs text-slate-500">
                            {s.id}
                          </td>
                        </tr>
                      );
                    })}

                  {!externos.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-500"
                      >
                        No hay muestras Externo en el rango/filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
      {/* MODAL */}
      <EnvSampleModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSave={saveSample}
        catalogs={catalogs}
        defaultValues={{
          tipo,
          punto: puntoEff === "Todos" ? availablePoints[0] || "" : puntoEff,
          parametro: paramEff === "Todos" ? availableParams[0] || "" : paramEff,
          laboratorio: "Interno",
        }}
      />
    </main>
  );
}
