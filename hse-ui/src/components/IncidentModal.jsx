import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast"; // No olvides importar
export default function IncidentModal({
  open,
  onClose,
  onCreate,
  existingIds = [],
}) {
  const [id, setId] = useState("");
  const [fecha, setFecha] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");
  const [sev, setSev] = useState("Baja");
  const [estado, setEstado] = useState("Abierto");
  const [responsable, setResponsable] = useState("");
  const [costoEstimado, setCostoEstimado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState([]); // [{ name, url, file }]
  const [error, setError] = useState("");

  const suggestedId = useMemo(() => {
    let max = 1000;
    for (const s of existingIds) {
      const m = String(s).match(/INC-(\d+)/i);
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) max = Math.max(max, n);
      }
    }
    return `INC-${max + 1}`;
  }, [existingIds]);

  useEffect(() => {
    if (!open) return;
    setId(suggestedId);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setFecha(`${year}-${month}-${day}`);
    setArea("");
    setTipo("Cercano a Pérdida");
    setSev("Baja");
    setEstado("Abierto");
    setResponsable("");
    setCostoEstimado("");
    setDescripcion("");
    setFotos([]);
    setError("");
  }, [open, suggestedId]);

  if (!open) return null;

  const close = () => {
    setError("");
    onClose?.();
  };

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const mapped = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));

    setFotos((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeFoto = (idx) => {
    setFotos((prev) => {
      const copy = [...prev];
      const removed = copy[idx];
      copy.splice(idx, 1);
      if (removed?.url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch {
          console.log("Error revoking object URL");
        }
      }
      return copy;
    });
  };

  // const handleSave = async () => {
  //   const cleanId = (id || "").trim();

  //   // 1. Validaciones: Usamos toast.error para feedback inmediato
  //   if (!cleanId) return toast.error("El ID es obligatorio.");
  //   if (existingIds.includes(cleanId)) return toast.error("Ese ID ya existe.");
  //   if (!fecha) return toast.error("La fecha es obligatoria.");
  //   if (!area.trim()) return toast.error("El área es obligatoria.");
  //   if (!responsable.trim())
  //     return toast.error("El responsable es obligatorio.");
  //   if (!descripcion.trim())
  //     return toast.error("La descripción es obligatoria.");

  //   // Preparamos el FormData antes de la promesa
  //   const token =
  //     localStorage.getItem("token") || sessionStorage.getItem("token");
  //   const formData = new FormData();
  //   formData.append("codigo", cleanId);
  //   formData.append("fecha", fecha);
  //   formData.append("tipo", tipo);
  //   formData.append("area", area.trim());
  //   formData.append("severidad", sev);
  //   formData.append("estado", estado);
  //   formData.append("descripcion", descripcion.trim());
  //   formData.append("responsable", responsable.trim());
  //   formData.append("tiempoParadaHoras", parseFloat(costoEstimado) || 0);
  //   fotos.forEach((f) => {
  //     if (f.file) formData.append("fotos", f.file);
  //   });

  //   // 2. Ejecutamos con toast.promise
  //   toast.promise(
  //     (async () => {
  //       const res = await fetch("http://localhost:4000/api/incidentes", {
  //         method: "POST",
  //         body: formData,
  //         headers: { Authorization: `Bearer ${token}` },
  //       });

  //       if (!res.ok) throw new Error("Error en el servidor");

  //       const data = await res.json();

  //       const formattedForTable = {
  //         id: data.Codigo || cleanId,
  //         nombreEmpresa: data.nombreEmpresa,
  //         fecha: data.Fecha ? data.Fecha.split("T")[0] : fecha,
  //         tipo: data.Tipo || tipo,
  //         area: data.Area || area,
  //         sev: data.Severidad || sev,
  //         estado: data.Estado || estado,
  //         descripcion: data.Descripcion || descripcion,
  //         responsable: data.Responsable || responsable,
  //         costoEstimado:
  //           data.TiempoParadaHoras || parseFloat(costoEstimado) || 0,
  //         fotos: (data.fotos || []).map((f) => ({
  //           name: f.Nombre,
  //           url: `http://localhost:4000${f.Url}`,
  //         })),
  //       };

  //       onCreate?.(formattedForTable);
  //       close();
  //     })(),
  //     {
  //       loading: "Registrando incidente...",
  //       success: "¡Incidente guardado correctamente!",
  //       error: "No se pudo guardar el incidente.",
  //     },
  //   );
  // };
  const handleSave = async () => {
    const cleanId = (id || "").trim();

    // Validaciones
    if (!cleanId) return setError("El ID es obligatorio.");
    if (existingIds.includes(cleanId)) return setError("Ese ID ya existe.");
    if (!fecha) return setError("La fecha es obligatoria.");
    if (!area.trim()) return setError("El área es obligatoria.");
    if (!responsable.trim()) return setError("El responsable es obligatorio.");
    if (!descripcion.trim()) return setError("La descripción es obligatoria.");

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const formData = new FormData();

      formData.append("codigo", cleanId);
      formData.append("fecha", fecha);
      formData.append("tipo", tipo);
      formData.append("area", area.trim());
      formData.append("severidad", sev);
      formData.append("estado", estado);
      formData.append("descripcion", descripcion.trim());
      formData.append("responsable", responsable.trim());
      formData.append("tiempoParadaHoras", parseFloat(costoEstimado) || 0);

      fotos.forEach((f) => {
        if (f.file) formData.append("fotos", f.file);
      });

      const res = await fetch("http://localhost:4000/api/incidentes", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Error al registrar incidente");

      // 1. OBTENER LA DATA REAL DEL BACKEND (con el nombre de la empresa)
      const data = await res.json();

      // 2. FORMATEAR PARA LA TABLA USANDO LOS DATOS QUE DEVOLVIÓ EL SERVIDOR
      // Nota: Usamos las propiedades que vienen de SQL (como Codigo, Fecha, etc.)
      const formattedForTable = {
        id: data.Codigo || cleanId,
        nombreEmpresa: data.nombreEmpresa, // <--- ¡Aquí ya vendrá el nombre real!
        fecha: data.Fecha ? data.Fecha.split("T")[0] : fecha,
        tipo: data.Tipo || tipo,
        area: data.Area || area,
        sev: data.Severidad || sev,
        estado: data.Estado || estado,
        descripcion: data.Descripcion || descripcion,
        responsable: data.Responsable || responsable,
        costoEstimado: data.TiempoParadaHoras || parseFloat(costoEstimado) || 0,
        fotos: (data.fotos || []).map((f) => ({
          name: f.Nombre,
          url: `http://localhost:4000${f.Url}`,
        })),
      };

      // 3. ENVIAR AL PADRE EL OBJETO FORMATEADO
      onCreate?.(formattedForTable);
      toast.success("¡Incidente guardado correctamente!");
      close();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el incidente.");
      toast.error("Hubo un problema al guardar el incidente.");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm "
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Cabecera Fija */}
        <div className="p-5 border-b bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Nuevo Incidente</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete los campos para registrar el evento en el sistema.
          </p>
        </div>

        {/* Cuerpo con Scroll (Aquí van tus inputs tal cual) */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Sección 1: Datos Generales */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">ID</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Sugerido: {suggestedId}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Fecha
                </label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Estado
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option>Abierto</option>
                  <option>En investigación</option>
                  <option>Cerrado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Área / Ubicación
                </label>
                <input
                  placeholder="Ej: Taller, Almacén..."
                  className="w-full border rounded px-3 py-2"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Tipo
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option>Cercano a Pérdida</option>
                  <option>Incidente</option>
                  <option>Accidente</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Severidad
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={sev}
                  onChange={(e) => setSev(e.target.value)}
                >
                  <option>Baja</option>
                  <option>Media</option>
                  <option>Alta</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sección 2: Detalles y Responsables */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Responsable
                </label>
                <input
                  placeholder="Ej: Supervisor SSOMA"
                  className="w-full border rounded px-3 py-2"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Tiempo estimado de parada (hrs)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 2.5H"
                  className="w-full border rounded px-3 py-2"
                  value={costoEstimado}
                  onChange={(e) => setCostoEstimado(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">
                Descripción
              </label>
              <textarea
                placeholder="Describe que paso, acciones tomadas, etc."
                className="w-full border rounded px-3 py-2"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>

          {/* Sección 3: Fotos (Más compacto) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">
                Evidencias
              </span>
              <label className="cursor-pointer bg-white border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 transition">
                Adjuntar fotos
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onPickFiles}
                />
              </label>
            </div>

            {fotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {fotos.map((f, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={f.url}
                      className="h-full w-full object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition"
                      onClick={() => removeFoto(idx)}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center">
                No hay fotos adjuntas.
              </p>
            )}
          </div>
        </div>

        {/* Footer Fijo */}
        <div className="flex justify-end items-center gap-3 p-4 border-t bg-slate-50">
          <button
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
            onClick={close}
          >
            Cancelar
          </button>

          <button
            className="px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-md transition active:scale-95"
            onClick={handleSave}
          >
            Registrar Incidente
          </button>
        </div>
      </div>
    </div>
  );
}
