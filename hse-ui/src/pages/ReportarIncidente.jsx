import { useEffect, useState } from "react";

const API = "http://localhost:4000";

const TIPOS = ["Cercano a Pérdida", "Incidente", "Accidente"];
const SEVERIDADES = ["Baja", "Media", "Alta"];

export default function ReportarIncidente() {
  // Empresas disponibles
  const [empresas, setEmpresas] = useState([]);

  // Campos del formulario
  const [idEmpresa, setIdEmpresa] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState("Incidente");
  const [area, setArea] = useState("");
  const [severidad, setSeveridad] = useState("Baja");
  const [responsable, setResponsable] = useState("");
  const [tiempoParada, setTiempoParada] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState([]); // [{ name, url, file }]

  // Estado UI
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState("");

  useEffect(() => {
    fetch(`${API}/api/publico/empresas`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEmpresas(data);
      })
      .catch(() => setEmpresas([]));
  }, []);

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
      if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!area.trim()) return setError("El área o ubicación es obligatoria.");
    if (!responsable.trim()) return setError("El nombre del responsable es obligatorio.");
    if (!descripcion.trim()) return setError("La descripción del incidente es obligatoria.");

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("fecha", fecha);
      formData.append("tipo", tipo);
      formData.append("area", area.trim());
      formData.append("severidad", severidad);
      formData.append("descripcion", descripcion.trim());
      formData.append("responsable", responsable.trim());
      formData.append("tiempoParadaHoras", parseFloat(tiempoParada) || 0);
      if (idEmpresa) formData.append("idEmpresa", idEmpresa);
      fotos.forEach((f) => {
        if (f.file) formData.append("fotos", f.file);
      });

      const res = await fetch(`${API}/api/publico/incidentes`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo registrar el incidente.");
      } else {
        setCodigoGenerado(data.codigo);
        setExito(true);
      }
    } catch {
      setError("Error de conexión. Verifica tu red e intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleNuevoReporte = () => {
    setExito(false);
    setCodigoGenerado("");
    setArea("");
    setResponsable("");
    setTiempoParada("");
    setDescripcion("");
    setFotos([]);
    setTipo("Incidente");
    setSeveridad("Baja");
    setIdEmpresa("");
    setFecha(new Date().toISOString().slice(0, 10));
    setError("");
  };

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Incidente registrado
          </h2>
          <p className="text-slate-500 mb-4">
            Tu reporte fue enviado exitosamente. El equipo HSE tomará las acciones correspondientes.
          </p>
          <div className="bg-slate-50 rounded-xl border px-4 py-3 mb-6">
            <p className="text-xs text-slate-500 mb-1">Código asignado</p>
            <p className="text-2xl font-mono font-bold text-slate-800">
              {codigoGenerado}
            </p>
            <p className="text-xs text-slate-400 mt-1">Guarda este código para dar seguimiento</p>
          </div>
          <button
            onClick={handleNuevoReporte}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
          >
            Reportar otro incidente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Reporte de Incidente HSE</h1>
            <p className="text-xs text-slate-500">Sistema de Gestión de Seguridad, Salud y Medio Ambiente</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Registrar un incidente</h2>
            <p className="text-sm text-slate-500 mt-1">
              Completa el formulario con la información del incidente. Todos los campos marcados son obligatorios.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Empresa */}
            {empresas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Empresa
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={idEmpresa}
                  onChange={(e) => setIdEmpresa(e.target.value)}
                >
                  <option value="">— Selecciona tu empresa —</option>
                  {empresas.map((emp) => (
                    <option key={emp.idEmpresa} value={emp.idEmpresa}>
                      {emp.razonSocial}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fecha / Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fecha del incidente <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tipo de evento <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Área / Severidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Área / Ubicación <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Almacén, Taller, Patio..."
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Severidad <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {SEVERIDADES.map((s) => {
                    const colors = {
                      Baja: severidad === s
                        ? "bg-green-100 border-green-500 text-green-800 font-semibold"
                        : "border-slate-200 text-slate-500 hover:border-green-300",
                      Media: severidad === s
                        ? "bg-yellow-100 border-yellow-500 text-yellow-800 font-semibold"
                        : "border-slate-200 text-slate-500 hover:border-yellow-300",
                      Alta: severidad === s
                        ? "bg-red-100 border-red-500 text-red-800 font-semibold"
                        : "border-slate-200 text-slate-500 hover:border-red-300",
                    };
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`flex-1 py-2.5 rounded-xl border text-sm transition-colors ${colors[s]}`}
                        onClick={() => setSeveridad(s)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Responsable / Tiempo parada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Responsable / Reportado por <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez, Supervisor SSOMA..."
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tiempo estimado de parada (horas)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Ej: 2.5"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  value={tiempoParada}
                  onChange={(e) => setTiempoParada(e.target.value)}
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Descripción del incidente <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                placeholder="Describe detalladamente qué ocurrió, las circunstancias, las personas involucradas y las acciones inmediatas tomadas..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Entre más detalle brindes, mejor podrá gestionarse el incidente.
              </p>
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Fotografías del incidente
              </label>

              <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-xl py-4 cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-slate-500">
                  {fotos.length === 0 ? "Adjuntar fotografías" : `Agregar más (${fotos.length} adjunta${fotos.length !== 1 ? "s" : ""})`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickFiles}
                />
              </label>

              {fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {fotos.map((f, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={f.url}
                        alt={f.name}
                        className="h-24 w-full object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-white/90 border rounded-full w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white shadow text-xs"
                        onClick={() => removeFoto(idx)}
                        title="Quitar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón enviar */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {enviando ? "Enviando reporte..." : "Enviar reporte de incidente"}
            </button>

            <p className="text-center text-xs text-slate-400">
              Este reporte será recibido y gestionado por el equipo de HSE.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
