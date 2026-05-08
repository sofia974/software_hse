import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

// ─── HELPERS ────────────────────────────────────────────────────────────────
function get(obj, ...keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return undefined;
}
function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return String(v).slice(0, 10);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent = "blue", loading }) {
  const cfg = {
    red: { border: "border-l-red-600", bg: "bg-red-50", num: "text-red-700" },
    green: {
      border: "border-l-green-600",
      bg: "bg-green-50",
      num: "text-green-700",
    },
    orange: {
      border: "border-l-orange-500",
      bg: "bg-orange-50",
      num: "text-orange-600",
    },
    blue: {
      border: "border-l-blue-600",
      bg: "bg-blue-50",
      num: "text-blue-700",
    },
    yellow: {
      border: "border-l-yellow-500",
      bg: "bg-yellow-50",
      num: "text-yellow-700",
    },
    slate: {
      border: "border-l-slate-500",
      bg: "bg-slate-50",
      num: "text-slate-700",
    },
  };
  const c = cfg[accent] ?? cfg.blue;
  return (
    <div
      className={`rounded-xl border border-slate-200 border-l-4 ${c.border} ${c.bg} shadow-sm p-5 flex flex-col gap-1`}
    >
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">
        {label}
      </span>
      {loading ? (
        <div className="h-10 w-20 bg-slate-200 animate-pulse rounded mt-1" />
      ) : (
        <span className={`text-4xl font-extrabold ${c.num} leading-none mt-1`}>
          {value}
        </span>
      )}
      {sub && (
        <span className="text-xs text-slate-500 mt-1 font-medium">{sub}</span>
      )}
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-5 py-3 bg-slate-800 border-b border-slate-700">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ text = "Sin datos disponibles" }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm gap-2 font-medium">
      <span className="text-2xl">📭</span>
      {text}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Completada: "bg-green-600 text-white",
    "En proceso": "bg-amber-500 text-white",
    Pendiente: "bg-red-600 text-white",
    Abierto: "bg-red-600 text-white",
    Cerrado: "bg-slate-500 text-white",
    Alta: "bg-red-700 text-white",
    Media: "bg-orange-500 text-white",
    Baja: "bg-green-600 text-white",
    Crítico: "bg-red-800 text-white",
  };
  const cls = map[status] ?? "bg-slate-400 text-white";
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${cls}`}
    >
      {status || "—"}
    </span>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [incidentes, setIncidentes] = useState([]);
  const [riesgos, setRiesgos] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSel, setEmpresaSel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function fetchAll() {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        setError("No se encontró una sesión activa.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      try {
        const [rInc, rRies, rInsp, rCap, rEmp] = await Promise.allSettled([
          fetch("http://localhost:4000/api/incidentes", { headers }).then(
            (r) => (r.ok ? r.json() : Promise.reject(r.status)),
          ),
          fetch("http://localhost:4000/api/riesgos", { headers }).then((r) =>
            r.ok ? r.json() : Promise.reject(r.status),
          ),
          fetch("http://localhost:4000/api/inspections", { headers }).then(
            (r) => (r.ok ? r.json() : Promise.reject(r.status)),
          ),
          fetch("http://localhost:4000/api/capacitaciones", { headers }).then(
            (r) => (r.ok ? r.json() : Promise.reject(r.status)),
          ),
          fetch("http://localhost:4000/api/empresas", { headers }).then((r) =>
            r.ok ? r.json() : Promise.reject(r.status),
          ),
        ]);

        if (rInc.status === "fulfilled")
          setIncidentes(Array.isArray(rInc.value) ? rInc.value : []);
        if (rRies.status === "fulfilled")
          setRiesgos(Array.isArray(rRies.value) ? rRies.value : []);
        if (rInsp.status === "fulfilled")
          setInspecciones(Array.isArray(rInsp.value) ? rInsp.value : []);
        if (rCap.status === "fulfilled")
          setCapacitaciones(Array.isArray(rCap.value) ? rCap.value : []);
        if (rEmp.status === "fulfilled")
          setEmpresas(Array.isArray(rEmp.value) ? rEmp.value : []);

        if ([rInc, rRies, rInsp, rCap, rEmp].some((r) => r.reason === 401)) {
          setError("Tu sesión ha expirado o no tienes permisos.");
        }
        console.log("EMPRESAS", rEmp.value);
      } catch (err) {
        setError("Error de conexión con el servidor.", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);
  // ── LÓGICA DE FILTRADO (NUEVO) ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const filterFn = (item) =>
      !empresaSel || String(get(item, "idEmpresa")) === String(empresaSel);
    return {
      incidentes: incidentes.filter(filterFn),
      riesgos: riesgos.filter(filterFn),
      inspecciones: inspecciones.filter(filterFn),
      capacitaciones: capacitaciones.filter(filterFn),
    };
  }, [empresaSel, incidentes, riesgos, inspecciones, capacitaciones]);
  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth();
    const anioActual = now.getFullYear();
    const incMes = filtered.incidentes.filter((inc) => {
      const f = new Date(get(inc, "Fecha", "fecha") ?? "");
      return (
        !isNaN(f) &&
        f.getMonth() === mesActual &&
        f.getFullYear() === anioActual
      );
    }).length;
    const accidentes = filtered.incidentes
      .map((inc) => new Date(get(inc, "Fecha", "fecha") ?? ""))
      .filter((d) => !isNaN(d))
      .sort((a, b) => b - a);

    const diasSinAcc = accidentes.length
      ? Math.floor((now - accidentes[0]) / 86400000)
      : null;
    const criticos = filtered.riesgos.filter((r) => {
      const prob = Number(
        get(r, "prob_res", "probabilidad_residual", "prob") ?? 0,
      );
      const sev = Number(
        get(r, "sev_res", "severidad_residual", "severidad") ?? 0,
      );
      return prob * sev > 15;
    }).length;
    const inspConCumpl = filtered.inspecciones.filter(
      (i) => get(i, "cumplimiento", "Cumplimiento") != null,
    );
    const avgCumpl = inspConCumpl.length
      ? Math.round(
          inspConCumpl.reduce(
            (sum, i) =>
              sum + Number(get(i, "cumplimiento", "Cumplimiento") ?? 0),
            0,
          ) / inspConCumpl.length,
        )
      : null;
    const capaPendientes = filtered.inspecciones.reduce(
      (sum, i) =>
        sum + Number(get(i, "openFindings", "hallazgos_abiertos") ?? 0),
      0,
    );
    const today = now.toISOString().slice(0, 10);
    const capVigentes = filtered.capacitaciones.filter((c) => {
      const vence = get(c, "fecha_vencimiento", "vencimiento", "FechaVence");
      return vence && String(vence).slice(0, 10) >= today;
    }).length;
    const pctCap = filtered.capacitaciones.length
      ? Math.round((capVigentes / filtered.capacitaciones.length) * 100)
      : null;
    return { incMes, diasSinAcc, criticos, avgCumpl, capaPendientes, pctCap };
  }, [filtered]);
  // ── Chart Logic ────────────────────────────────────────────────────────────
  const incidentesPorMes = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        label: MONTH_LABELS[d.getMonth()],
        mes: d.getMonth(),
        anio: d.getFullYear(),
        total: 0,
      };
    });
    filtered.incidentes.forEach((inc) => {
      const f = new Date(get(inc, "Fecha", "fecha") ?? "");
      if (isNaN(f)) return;
      const bucket = buckets.find(
        (b) => b.mes === f.getMonth() && b.anio === f.getFullYear(),
      );
      if (bucket) bucket.total += 1;
    });
    return buckets;
  }, [filtered.incidentes]);
  const riesgosDist = useMemo(() => {
    const counts = { Crítico: 0, Alto: 0, Medio: 0, Bajo: 0 };
    filtered.riesgos.forEach((r) => {
      const prob = Number(
        get(r, "prob_res", "probabilidad_residual", "prob") ?? 0,
      );
      const sev = Number(
        get(r, "sev_res", "severidad_residual", "severidad") ?? 0,
      );
      const score = prob * sev;
      if (score > 15) counts["Crítico"]++;
      else if (score > 9) counts["Alto"]++;
      else if (score > 4) counts["Medio"]++;
      else counts["Bajo"]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtered.riesgos]);
  const RISK_COLORS = {
    Crítico: "#ef4444",
    Alto: "#f97316",
    Medio: "#eab308",
    Bajo: "#22c55e",
  };
  const cumplByArea = useMemo(() => {
    const map = {};
    filtered.inspecciones.forEach((i) => {
      const area = get(i, "area", "Area") || "Sin área";
      const cumpl = Number(get(i, "cumplimiento", "Cumplimiento") ?? 0);
      if (!map[area]) map[area] = { sum: 0, count: 0 };
      map[area].sum += cumpl;
      map[area].count += 1;
    });
    return Object.entries(map)
      .map(([area, { sum, count }]) => ({ area, avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [filtered.inspecciones]);
  const capEstado = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let vigentes = 0,
      proximos = 0,
      vencidos = 0;
    filtered.capacitaciones.forEach((c) => {
      const vence = String(
        get(c, "fecha_vencimiento", "vencimiento", "FechaVence") ?? "",
      ).slice(0, 10);
      if (!vence) return;
      const diff = Math.floor((new Date(vence) - new Date(today)) / 86400000);
      if (diff < 0) vencidos++;
      else if (diff <= 30) proximos++;
      else vigentes++;
    });
    return {
      vigentes,
      proximos,
      vencidos,
      total: filtered.capacitaciones.length || 1,
    };
  }, [filtered.capacitaciones]);

  const ultimasInsp = useMemo(
    () =>
      [...filtered.inspecciones]
        .sort(
          (a, b) =>
            new Date(get(b, "fecha", "Fecha")) -
            new Date(get(a, "fecha", "Fecha")),
        )
        .slice(0, 6),
    [filtered.inspecciones],
  );
  const ultimosInc = useMemo(
    () =>
      [...filtered.incidentes]
        .sort(
          (a, b) =>
            new Date(get(b, "Fecha", "fecha")) -
            new Date(get(a, "Fecha", "fecha")),
        )
        .slice(0, 6),
    [filtered.incidentes],
  );

  return (
    <main className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* ── SELECTOR DE EMPRESA (Añadido al HTML) ── */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">
          DASHBOARD DE SEGURIDAD
        </h1>
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
          <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">
            Empresa:
          </label>

          <select
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 w-full sm:min-w-[250px] cursor-pointer"
            value={empresaSel}
            onChange={(e) => setEmpresaSel(e.target.value)}
          >
            <option value="">Todas las Empresas</option>
            {empresas.map((emp) => (
              <option key={emp.idEmpresa} value={emp.idEmpresa}>
                {emp.razonSocial}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-600 border border-red-700 text-white px-4 py-3 text-sm font-bold shadow-lg">
          ⚠️ ERROR: {error}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Incidentes del mes"
          value={kpis.incMes}
          sub="Todos los tipos"
          accent={kpis.incMes > 5 ? "red" : "orange"}
          loading={loading}
        />
        <KpiCard
          label="Días sin accidentes"
          value={kpis.diasSinAcc ?? "—"}
          sub="Desde último evento"
          accent={kpis.diasSinAcc > 30 ? "green" : "red"}
          loading={loading}
        />
        <KpiCard
          label="Riesgos críticos"
          value={kpis.criticos}
          sub="Score > 15"
          accent={kpis.criticos > 0 ? "red" : "green"}
          loading={loading}
        />
        <KpiCard
          label="Cumplimiento insp."
          value={kpis.avgCumpl != null ? `${kpis.avgCumpl}%` : "—"}
          sub="Promedio mensual"
          accent={kpis.avgCumpl > 80 ? "green" : "yellow"}
          loading={loading}
        />
        <KpiCard
          label="CAPA pendientes"
          value={kpis.capaPendientes}
          sub="Hallazgos abiertos"
          accent="orange"
          loading={loading}
        />
        <KpiCard
          label="Cursos Vigentes"
          value={kpis.pctCap != null ? `${kpis.pctCap}%` : "—"}
          sub={`${capEstado.vigentes} activos`}
          accent="blue"
          loading={loading}
        />
      </div>

      {/* ── Gráficos Fila 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Tendencia de Incidentes">
          {loading ? (
            <div className="h-48 bg-slate-100 animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentesPorMes}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Nivel de Riesgo Residual">
          {loading ? (
            <div className="h-48 bg-slate-100 animate-pulse rounded" />
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={riesgosDist}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {riesgosDist.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-1/2 space-y-2">
                {riesgosDist.map((d) => (
                  <div
                    key={d.name}
                    className="flex justify-between text-xs font-bold border-b pb-1"
                  >
                    <span className="text-slate-500">{d.name}:</span>
                    <span>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Gráficos Fila 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Cumplimiento por Área (%)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              layout="vertical"
              data={cumplByArea}
              margin={{ left: 20 }}
            >
              <XAxis type="number" domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="area"
                width={80}
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Bar dataKey="avg" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Estado de Capacitaciones">
          <div className="space-y-4">
            {[
              { l: "Vigentes", v: capEstado.vigentes, c: "bg-green-500" },
              { l: "Vencidos", v: capEstado.vencidos, c: "bg-red-500" },
            ].map((item) => (
              <div key={item.l}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{item.l}</span>
                  <span>{item.v}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className={`h-full ${item.c} rounded-full`}
                    style={{ width: `${(item.v / capEstado.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Tablas Recientes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Últimas Inspecciones">
          <div className="overflow-auto max-h-60">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Área</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ultimasInsp.map((i, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{fmtDate(get(i, "fecha", "Fecha"))}</td>
                    <td className="p-2 font-bold">{get(i, "area", "Area")}</td>
                    <td className="p-2">
                      <StatusBadge status={get(i, "estado", "Status")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Alertas de Incidentes">
          <div className="overflow-auto max-h-60">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Severidad</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ultimosInc.map((inc, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      {fmtDate(get(inc, "fecha", "Fecha"))}
                    </td>
                    <td className="p-2">{get(inc, "tipo", "Tipo")}</td>
                    <td className="p-2">
                      <StatusBadge
                        status={get(inc, "severidad", "Severidad")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
