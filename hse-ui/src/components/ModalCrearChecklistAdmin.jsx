import { useEffect, useState } from "react";

const EMPTY_ITEM = (orden) => ({ id: Date.now() + orden, pregunta: "" });

// Agregamos idEmpresa a las props
export default function ModalCrearChecklist({
  open,
  onClose,
  onSave,
  idEmpresa,
}) {
  const [nombre, setNombre] = useState("");
  const [items, setItems] = useState([
    EMPTY_ITEM(0),
    EMPTY_ITEM(1),
    EMPTY_ITEM(2),
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre("");
      setItems([EMPTY_ITEM(0), EMPTY_ITEM(1), EMPTY_ITEM(2)]);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const addItem = () => setItems((prev) => [...prev, EMPTY_ITEM(prev.length)]);

  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateItem = (id, value) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, pregunta: value } : it)),
    );

  const moveItem = (index, dir) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setItems(copy);
  };

  const validate = () => {
    if (!nombre.trim()) return "El nombre del checklist es obligatorio.";
    const filled = items.filter((it) => it.pregunta.trim());
    if (filled.length === 0) return "Agrega al menos una pregunta.";
    if (!idEmpresa) return "Error: No se detectó el ID de la empresa.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      // Modificamos el payload para incluir el idEmpresa que recibimos por props
      const payload = {
        nombre: nombre.trim(),
        idEmpresa: idEmpresa, // <--- Enviamos el ID de la empresa seleccionada
        items: items
          .filter((it) => it.pregunta.trim())
          .map((it, i) => ({ pregunta: it.pregunta.trim(), orden: i + 1 })),
      };

      const res = await fetch("http://localhost:4000/api/checklists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar el checklist.");
        return;
      }

      onSave?.(data);
      onClose?.();
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const filledCount = items.filter((it) => it.pregunta.trim()).length;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <h2 className="text-xl font-semibold text-slate-800">
            Crear checklist personalizado
          </h2>
          <p className="text-xs text-blue-600 font-bold mt-1 uppercase tracking-wider">
            Asignando a Empresa ID: {idEmpresa}
          </p>
        </div>

        {/* ... Resto del JSX del Modal (el que ya tienes está perfecto) ... */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
          {/* (Aquí va el mismo contenido de Nombre e Items que ya tenías) */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Nombre del checklist <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: Inspección de EPP..."
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setError("");
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Preguntas ({filledCount} completadas)
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors"
              >
                + Agregar pregunta
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, index) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200"
                >
                  <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0 font-mono">
                    {index + 1}.
                  </span>
                  <input
                    className="flex-1 border rounded px-3 py-2 text-sm focus:border-blue-400 outline-none transition-colors"
                    placeholder={`Pregunta ${index + 1}...`}
                    value={it.pregunta}
                    onChange={(e) => updateItem(it.id, e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="text-red-400 hover:text-red-600 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center bg-slate-50/50">
          <span className="text-xs text-slate-400 italic">
            Configurando formato para ID {idEmpresa}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-200 transition-all"
            >
              {loading ? "Guardando..." : "Guardar checklist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
