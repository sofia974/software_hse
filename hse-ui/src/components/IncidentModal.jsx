import { useEffect, useMemo, useState } from "react";

export default function IncidentModal({
  open,
  onClose,
  onCreate,
  existingIds = [],
}) {
  const [id, setId] = useState("");
  const [fecha, setFecha] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("Incidente");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(suggestedId);
    setFecha(new Date().toISOString().slice(0, 10));
    setArea("");
    setTipo("Incidente");
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

  const handleSave = () => {
    const cleanId = (id || "").trim();
    if (!cleanId) return setError("El ID es obligatorio.");
    if (existingIds.includes(cleanId))
      return setError("Ese ID ya existe. Cambia el ID.");
    if (!fecha) return setError("La fecha es obligatoria.");
    if (!area.trim()) return setError("El área es obligatoria.");
    if (!responsable.trim()) return setError("El responsable es obligatorio.");
    if (!descripcion.trim()) return setError("La descripción es obligatoria.");

    const costoNum = costoEstimado === "" ? 0 : Number(costoEstimado);
    if (Number.isNaN(costoNum) || costoNum < 0)
      return setError("Costo estimado inválido.");

    const incident = {
      id: cleanId,
      fecha,
      tipo,
      area: area.trim(),
      sev,
      estado,
      responsable: responsable.trim(),
      costoEstimado: costoNum,
      descripcion: descripcion.trim(),
      fotos: fotos.map((f) => ({ name: f.name, url: f.url })),
    };

    onCreate?.(incident);
    close();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white w-full max-w-3xl rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Nuevo Incidente</h2>
          <p className="text-sm text-slate-500 mt-1">
            Completa los campos para registrar
          </p>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* ID / Fecha / Estado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">ID</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Sugerido: {suggestedId}
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-600">Fecha</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Estado</label>
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

          {/* Área / Tipo / Severidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">Área / Ubicación</label>
              <input
                placeholder="Ej: Taller, Almacén, Patio..."
                className="w-full border rounded px-3 py-2"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Tipo</label>
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
              <label className="text-xs text-slate-600">Severidad</label>
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

          {/* Responsable / Costo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Responsable</label>
              <input
                placeholder="Ej: Supervisor SSOMA"
                className="w-full border rounded px-3 py-2"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">
                Costo estimado (S/)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 350"
                className="w-full border rounded px-3 py-2"
                value={costoEstimado}
                onChange={(e) => setCostoEstimado(e.target.value)}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-slate-600">Descripción</label>
            <textarea
              placeholder="Describe qué pasó, acciones tomadas, etc."
              className="w-full border rounded px-3 py-2"
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {/* Fotos */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">
                Fotografías adjuntas
              </p>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm hover:bg-slate-50 cursor-pointer">
                Adjuntar fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickFiles}
                />
              </label>
            </div>

            {fotos.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">
                No hay fotos adjuntas.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {fotos.map((f, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={f.url}
                      alt={f.name}
                      className="h-28 w-full object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-xs bg-white/90 border rounded px-2 py-1 hover:bg-white"
                      onClick={() => removeFoto(idx)}
                      title="Quitar"
                    >
                      Quitar
                    </button>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {f.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button className="px-4 py-2 rounded border" onClick={close}>
            Cancelar
          </button>

          <button
            className="px-4 py-2 rounded bg-red-600 text-white"
            onClick={handleSave}
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
