import { useState, useEffect } from "react";
import toast from "react-hot-toast"; // Importante
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM = {
  peligro: "",
  tipo_peligro: "Físico",
  consecuencia: "",
  area: "",
  ubicacion: "",
  proceso: "",
  tarea: "",
  puesto: "",
  responsable: "",
  fecha_registro: "",
  fecha_revision: "",
  estado: "Activo",
  prob_inh: "",
  sev_inh: "",
  prob_res: "",
  sev_res: "",
};

export default function ModalRegistrarRiesgo({
  open,
  onClose,
  onSave,
  riskConfig,
}) {
  const [matrixMode, setMatrixMode] = useState("inherente");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState([]);
  const [peligro, setPeligro] = useState([]);
  const [newPeligro, setNewPeligro] = useState({
    idPeligro: "",
    tipoPeligro: "",
  });

  // --- LÓGICA DINÁMICA DE MATRIZ ---
  // Usamos la prop 'riskConfig' que viene de Risks.jsx
  const matrixSize = riskConfig?.matrixSize || 5;
  const levels = riskConfig?.levels || [];

  const sevAxis = Array.from({ length: matrixSize }, (_, i) => i + 1);
  const probAxis = Array.from({ length: matrixSize }, (_, i) => matrixSize - i);

  function getColor(value) {
    if (!value || !levels.length) {
      return "bg-slate-100 text-slate-400 border-slate-200";
    }

    const level = levels.find(
      (l) => Number(value) >= Number(l.min) && Number(value) <= Number(l.max),
    );

    if (!level) return "bg-slate-100 text-slate-400 border-slate-200";

    switch (level.tone) {
      case "green":
        return "bg-green-100 text-green-700 border-green-200";
      case "yellow":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "red":
        return "bg-red-100 text-red-700 border-red-200";
      case "slate":
        return "bg-slate-200 text-slate-700 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  function getLevelLabel(value) {
    if (!value || !levels.length) return null;

    const level = levels.find(
      (l) => Number(value) >= Number(l.min) && Number(value) <= Number(l.max),
    );

    if (!level) return null;

    let color = "text-slate-700";
    if (level.tone === "green") color = "text-green-700";
    if (level.tone === "yellow") color = "text-yellow-800";
    if (level.tone === "red") color = "text-red-700";
    if (level.tone === "slate") color = "text-slate-700";

    return { label: level.name, color };
  }

  // --- EFECTOS DE CARGA ---
  useEffect(() => {
    if (!open) return;
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    // Peligros
    fetch("http://localhost:4000/api/riesgoPeligro", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPeligro(data);
      })
      .catch((err) => console.error("Error peligros:", err));

    // Áreas
    fetch("http://localhost:4000/api/areas", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAreas(data);
      })
      .catch((err) => console.error("Error áreas:", err));
  }, [open]);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, fecha_registro: todayISO() });
      setError("");
      setMatrixMode("inherente");
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const score = (p, s) => Number(p) * Number(s);

  const handleMatrixSelect = (p, s) => {
    if (matrixMode === "inherente") {
      setForm((prev) => ({ ...prev, prob_inh: p, sev_inh: s }));
    } else {
      setForm((prev) => ({ ...prev, prob_res: p, sev_res: s }));
    }
    setError("");
  };

  const isSelected = (p, s) => {
    if (matrixMode === "inherente")
      return form.prob_inh === p && form.sev_inh === s;
    return form.prob_res === p && form.sev_res === s;
  };

  const handleSubmit = async () => {
    if (
      !form.peligro.trim() ||
      !form.area ||
      !form.prob_inh ||
      !form.prob_res
    ) {
      return setError(
        "Por favor completa los campos obligatorios y selecciona ambos riesgos en la matriz.",
      );
    }

    setLoading(true);
    try {
      const areaSeleccionada = areas.find(
        (a) => String(a.idArea) === String(form.area),
      );
      const payload = {
        ...form,
        area: areaSeleccionada ? areaSeleccionada.Nombre : form.area,
      };

      const res = await fetch("http://localhost:4000/api/riesgos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");
      onSave?.(data);
      toast.success("!Riesgo registrado correctamente!");
      onClose?.();
    } catch (err) {
      setError(err.message);
      toast.error("Hubo un error al intentar guardar el riesgo.");
    } finally {
      setLoading(false);
    }
  };

  const inhScore =
    form.prob_inh && form.sev_inh ? score(form.prob_inh, form.sev_inh) : null;
  const resScore =
    form.prob_res && form.sev_res ? score(form.prob_res, form.sev_res) : null;
  const inhLevel = getLevelLabel(inhScore);
  const resLevel = getLevelLabel(resScore);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">
            Registrar Riesgo
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Completa los campos para registrar el riesgo en el IPERC
          </p>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          {/* Identificación del peligro */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Identificación del peligro
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600">
                  Peligro <span className="text-red-500">*</span>
                </label>
                <input
                  name="peligro"
                  value={form.peligro}
                  placeholder="Ej: Piso resbaloso"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <div>
                  <label className="text-xs text-slate-600">
                    Tipo de peligro <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={newPeligro.idPeligro || ""}
                    onChange={(e) =>
                      setNewPeligro((x) => ({
                        ...x,
                        idPeligro: Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">Seleccionar área</option>

                    {peligro.map((a) => (
                      <option key={a.idPeligro} value={a.idPeligro}>
                        {a.tipoPeligro}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  Consecuencia / Daño potencial
                </label>
                <input
                  name="consecuencia"
                  value={form.consecuencia}
                  placeholder="Ej: Fractura, caída, quemadura"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </section>
          {/* Contexto */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Contexto
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600">
                  Área <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.area || ""} // Cambiado de newInspection.idArea a form.area
                  onChange={(e) =>
                    setForm((x) => ({
                      // Cambiado a setForm
                      ...x,
                      area: e.target.value, // Guardamos el valor (puedes usar Number() si el backend espera ID)
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
              <div>
                <label className="text-xs text-slate-600">Ubicación</label>
                <input
                  name="ubicacion"
                  value={form.ubicacion}
                  placeholder="Ej: Zona de carga"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  Proceso <span className="text-red-500">*</span>
                </label>
                <input
                  name="proceso"
                  value={form.proceso}
                  placeholder="Ej: Manipulación de materiales"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Tarea</label>
                <input
                  name="tarea"
                  value={form.tarea}
                  placeholder="Ej: Carga manual"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Puesto</label>
                <input
                  name="puesto"
                  value={form.puesto}
                  placeholder="Ej: Operario"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </section>
          {/* Gestión */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Gestión
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600">
                  Responsable <span className="text-red-500">*</span>
                </label>
                <input
                  name="responsable"
                  value={form.responsable}
                  placeholder="Ej: Supervisor SSOMA"
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  Fecha de registro <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fecha_registro"
                  value={form.fecha_registro}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  Fecha de revisión
                </label>
                <input
                  type="date"
                  name="fecha_revision"
                  value={form.fecha_revision}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Estado</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Activo">Activo</option>
                  <option value="En seguimiento">En seguimiento</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>
            </div>
          </section>
          {/* Evaluación de riesgo */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Evaluación de riesgo — Matriz 5×5{" "}
              <span className="text-red-500">*</span>
            </p>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMatrixMode("inherente")}
                className={`px-3 py-1.5 text-sm rounded border ${
                  matrixMode === "inherente"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Inherente
              </button>
              <button
                type="button"
                onClick={() => setMatrixMode("residual")}
                className={`px-3 py-1.5 text-sm rounded border ${
                  matrixMode === "residual"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Residual
              </button>
              <span className="text-xs text-slate-500 self-center ml-1">
                {matrixMode === "inherente"
                  ? "Sin controles aplicados"
                  : "Con controles aplicados"}
              </span>
            </div>

            <div
              className="grid gap-1.5 items-center"
              style={{
                gridTemplateColumns: `56px repeat(${matrixSize}, minmax(0, 1fr))`,
              }}
            >
              <div />
              {sevAxis.map((s) => (
                <div
                  key={s}
                  className="text-xs text-center text-slate-500 font-medium"
                >
                  Sev {s}
                </div>
              ))}
              {probAxis.map((p) => (
                <div key={p} className="contents">
                  <div className="text-xs text-slate-500 font-medium">
                    Prob {p}
                  </div>
                  {sevAxis.map((s) => {
                    const value = score(p, s);
                    const selected = isSelected(p, s);
                    return (
                      <div
                        key={`${p}-${s}`}
                        onClick={() => handleMatrixSelect(p, s)}
                        className={`h-10 border rounded flex items-center justify-center cursor-pointer text-xs font-semibold select-none transition-all
                          ${getColor(value)}
                          ${selected ? "ring-2 ring-slate-900 ring-offset-1 scale-105 shadow-md" : "hover:opacity-75"}`}
                      >
                        {value}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {/* Resumen de puntajes */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div
                className={`rounded-lg border p-3 ${inhScore !== null ? getColor(inhScore) : "border-slate-200 bg-slate-50"}`}
              >
                <p className="text-xs font-medium mb-0.5">Riesgo Inherente</p>
                <p className="text-2xl font-bold">
                  {inhScore !== null ? inhScore : "—"}
                </p>
                {inhScore !== null && (
                  <p className="text-xs mt-0.5">
                    {form.prob_inh} × {form.sev_inh} ={" "}
                    <span className={`font-semibold ${inhLevel?.color}`}>
                      {inhLevel?.label}
                    </span>
                  </p>
                )}
              </div>
              <div
                className={`rounded-lg border p-3 ${resScore !== null ? getColor(resScore) : "border-slate-200 bg-slate-50"}`}
              >
                <p className="text-xs font-medium mb-0.5">Riesgo Residual</p>
                <p className="text-2xl font-bold">
                  {resScore !== null ? resScore : "—"}
                </p>
                {resScore !== null && (
                  <p className="text-xs mt-0.5">
                    {form.prob_res} × {form.sev_res} ={" "}
                    <span className={`font-semibold ${resLevel?.color}`}>
                      {resLevel?.label}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
        {/* FOOTER */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Registrar riesgo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// import { useState, useEffect } from "react";

// function todayISO() {
//   const d = new Date();
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// }

// const EMPTY_FORM = {
//   peligro: "",
//   tipo_peligro: "Físico",
//   consecuencia: "",
//   area: "",
//   ubicacion: "",
//   proceso: "",
//   tarea: "",
//   puesto: "",
//   responsable: "",
//   fecha_registro: "",
//   fecha_revision: "",
//   estado: "Activo",
//   prob_inh: "",
//   sev_inh: "",
//   prob_res: "",
//   sev_res: "",
// };

// export default function ModalRegistrarRiesgo({ open, onClose, onSave, riskConfig }) {
//   const [matrixMode, setMatrixMode] = useState("inherente");
//   const [form, setForm] = useState({ ...EMPTY_FORM });
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [areas, setAreas] = useState([]);
//   const [peligro, setPeligro] = useState([]);
//   const [newPeligro, setNewPeligro] = useState({
//     idPeligro: "",
//     tipoPeligro: "",
//   });

//   // --- LÓGICA DINÁMICA DE MATRIZ ---
//   // Usamos la prop 'riskConfig' que viene de Risks.jsx
//   const matrixSize = riskConfig?.matrixSize || 5;
//   const levels = riskConfig?.levels || [];

//   const sevAxis = Array.from({ length: matrixSize }, (_, i) => i + 1);
//   const probAxis = Array.from({ length: matrixSize }, (_, i) => matrixSize - i);

//   function getColor(value) {
//     if (!value || !levels.length) {
//       return "bg-slate-100 text-slate-400 border-slate-200";
//     }

//     const level = levels.find(
//       (l) => Number(value) >= Number(l.min) && Number(value) <= Number(l.max),
//     );

//     if (!level) return "bg-slate-100 text-slate-400 border-slate-200";

//     switch (level.tone) {
//       case "green": return "bg-green-100 text-green-700 border-green-200";
//       case "yellow": return "bg-yellow-100 text-yellow-800 border-yellow-200";
//       case "red": return "bg-red-100 text-red-700 border-red-200";
//       case "slate": return "bg-slate-200 text-slate-700 border-slate-300";
//       default: return "bg-slate-100 text-slate-700 border-slate-200";
//     }
//   }

//   function getLevelLabel(value) {
//     if (!value || !levels.length) return null;

//     const level = levels.find(
//       (l) => Number(value) >= Number(l.min) && Number(value) <= Number(l.max),
//     );

//     if (!level) return null;

//     let color = "text-slate-700";
//     if (level.tone === "green") color = "text-green-700";
//     if (level.tone === "yellow") color = "text-yellow-800";
//     if (level.tone === "red") color = "text-red-700";
//     if (level.tone === "slate") color = "text-slate-700";

//     return { label: level.name, color };
//   }

//   // --- EFECTOS DE CARGA ---
//   useEffect(() => {
//     if (!open) return;
//     const token = localStorage.getItem("token") || sessionStorage.getItem("token");

//     // Peligros
//     fetch("http://localhost:4000/api/riesgoPeligro", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (Array.isArray(data)) setPeligro(data);
//       })
//       .catch((err) => console.error("Error peligros:", err));

//     // Áreas
//     fetch("http://localhost:4000/api/areas", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (Array.isArray(data)) setAreas(data);
//       })
//       .catch((err) => console.error("Error áreas:", err));
//   }, [open]);

//   useEffect(() => {
//     if (open) {
//       setForm({ ...EMPTY_FORM, fecha_registro: todayISO() });
//       setError("");
//       setMatrixMode("inherente");
//     }
//   }, [open]);

//   if (!open) return null;

//   const handleChange = (e) => {
//     setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//     setError("");
//   };

//   const score = (p, s) => Number(p) * Number(s);

//   const handleMatrixSelect = (p, s) => {
//     if (matrixMode === "inherente") {
//       setForm((prev) => ({ ...prev, prob_inh: p, sev_inh: s }));
//     } else {
//       setForm((prev) => ({ ...prev, prob_res: p, sev_res: s }));
//     }
//     setError("");
//   };

//   const isSelected = (p, s) => {
//     if (matrixMode === "inherente")
//       return form.prob_inh === p && form.sev_inh === s;
//     return form.prob_res === p && form.sev_res === s;
//   };

//   const handleSubmit = async () => {
//     if (!form.peligro.trim() || !form.area || !form.prob_inh || !form.prob_res) {
//       return setError("Por favor completa los campos obligatorios y selecciona ambos riesgos en la matriz.");
//     }

//     setLoading(true);
//     try {
//       const areaSeleccionada = areas.find((a) => String(a.idArea) === String(form.area));
//       const payload = { ...form, area: areaSeleccionada ? areaSeleccionada.Nombre : form.area };

//       const res = await fetch("http://localhost:4000/api/riesgos", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token")}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Error al registrar");

//       onSave?.(data);
//       onClose?.();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const inhScore = form.prob_inh && form.sev_inh ? score(form.prob_inh, form.sev_inh) : null;
//   const resScore = form.prob_res && form.sev_res ? score(form.prob_res, form.sev_res) : null;
//   const inhLevel = getLevelLabel(inhScore);
//   const resLevel = getLevelLabel(resScore);

//   return (
//     <div
//       className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
//       onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
//     >
//       <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
//         {/* HEADER */}
//         <div className="px-6 py-4 border-b">
//           <h2 className="text-xl font-semibold text-slate-800">Registrar Riesgo</h2>
//           <p className="text-sm text-slate-500 mt-1">Completa los campos para registrar el riesgo en el IPERC</p>
//         </div>

//         <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
//           {error && (
//             <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
//           )}

//           {/* Identificación del peligro */}
//           <section>
//             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Identificación del peligro</p>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//               <div>
//                 <label className="text-xs text-slate-600">Peligro <span className="text-red-500">*</span></label>
//                 <input name="peligro" value={form.peligro} placeholder="Ej: Piso resbaloso" onChange={handleChange} className="w-full border rounded px-3 py-2" />
//               </div>
//               <div>
//                 <label className="text-xs text-slate-600">Tipo de peligro <span className="text-red-500">*</span></label>
//                 <select
//                   className="w-full border rounded px-3 py-2"
//                   value={form.tipo_peligro}
//                   name="tipo_peligro"
//                   onChange={handleChange}
//                 >
//                   <option value="">Seleccionar tipo</option>
//                   {peligro.map((a) => (<option key={a.idPeligro} value={a.tipoPeligro}>{a.tipoPeligro}</option>))}
//                 </select>
//               </div>
//               <div>
//                 <label className="text-xs text-slate-600">Consecuencia / Daño potencial</label>
//                 <input name="consecuencia" value={form.consecuencia} placeholder="Ej: Fractura, caída" onChange={handleChange} className="w-full border rounded px-3 py-2" />
//               </div>
//             </div>
//           </section>

//           {/* Contexto */}
//           <section>
//             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contexto</p>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//               <div>
//                 <label className="text-xs text-slate-600">Área <span className="text-red-500">*</span></label>
//                 <select className="w-full border rounded px-3 py-2" value={form.area} name="area" onChange={handleChange}>
//                   <option value="">Seleccionar área</option>
//                   {areas.map((a) => (<option key={a.idArea} value={a.idArea}>{a.Nombre}</option>))}
//                 </select>
//               </div>
//               <div>
//                 <label className="text-xs text-slate-600">Ubicación</label>
//                 <input name="ubicacion" value={form.ubicacion} onChange={handleChange} className="w-full border rounded px-3 py-2" />
//               </div>
//               <div>
//                 <label className="text-xs text-slate-600">Proceso <span className="text-red-500">*</span></label>
//                 <input name="proceso" value={form.proceso} onChange={handleChange} className="w-full border rounded px-3 py-2" />
//               </div>
//             </div>
//           </section>

//           {/* Evaluación de riesgo */}
//           <section>
//             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
//               Evaluación de riesgo — Matriz {matrixSize}×{matrixSize} <span className="text-red-500">*</span>
//             </p>

//             <div className="flex gap-2 mb-3">
//               <button type="button" onClick={() => setMatrixMode("inherente")} className={`px-3 py-1.5 text-sm rounded border ${matrixMode === "inherente" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>Inherente</button>
//               <button type="button" onClick={() => setMatrixMode("residual")} className={`px-3 py-1.5 text-sm rounded border ${matrixMode === "residual" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>Residual</button>
//             </div>

//             <div
//               className="grid gap-1.5 items-center"
//               style={{ gridTemplateColumns: `56px repeat(${matrixSize}, minmax(0, 1fr))` }}
//             >
//               <div />
//               {sevAxis.map((s) => (
//                 <div key={s} className="text-xs text-center text-slate-500 font-medium">Sev {s}</div>
//               ))}
//               {probAxis.map((p) => (
//                 <div key={p} className="contents">
//                   <div className="text-xs text-slate-500 font-medium">Prob {p}</div>
//                   {sevAxis.map((s) => {
//                     const value = score(p, s);
//                     const selected = isSelected(p, s);
//                     return (
//                       <div
//                         key={`${p}-${s}`}
//                         onClick={() => handleMatrixSelect(p, s)}
//                         className={`h-10 border rounded flex items-center justify-center cursor-pointer text-xs font-semibold select-none transition-all
//                           ${getColor(value)}
//                           ${selected ? "ring-2 ring-slate-900 ring-offset-1 scale-105 shadow-md" : "hover:opacity-75"}`}
//                       >
//                         {value}
//                       </div>
//                     );
//                   })}
//                 </div>
//               ))}
//             </div>

//             <div className="mt-3 grid grid-cols-2 gap-3">
//               <div className={`rounded-lg border p-3 ${inhScore !== null ? getColor(inhScore) : "border-slate-200 bg-slate-50"}`}>
//                 <p className="text-xs font-medium mb-0.5">Riesgo Inherente</p>
//                 <p className="text-2xl font-bold">{inhScore !== null ? inhScore : "—"}</p>
//                 {inhScore !== null && (
//                   <p className="text-xs mt-0.5">{form.prob_inh} × {form.sev_inh} = <span className={`font-semibold ${inhLevel?.color}`}>{inhLevel?.label}</span></p>
//                 )}
//               </div>
//               <div className={`rounded-lg border p-3 ${resScore !== null ? getColor(resScore) : "border-slate-200 bg-slate-50"}`}>
//                 <p className="text-xs font-medium mb-0.5">Riesgo Residual</p>
//                 <p className="text-2xl font-bold">{resScore !== null ? resScore : "—"}</p>
//                 {resScore !== null && (
//                   <p className="text-xs mt-0.5">{form.prob_res} × {form.sev_res} = <span className={`font-semibold ${resLevel?.color}`}>{resLevel?.label}</span></p>
//                 )}
//               </div>
//             </div>
//           </section>
//         </div>

//         {/* FOOTER */}
//         <div className="px-6 py-4 border-t flex justify-end gap-3">
//           <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">Cancelar</button>
//           <button type="button" onClick={handleSubmit} disabled={loading} className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50">
//             {loading ? "Guardando..." : "Registrar riesgo"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
