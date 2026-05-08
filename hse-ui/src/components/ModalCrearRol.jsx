import { useState, useEffect } from "react";
import toast from "react-hot-toast";
export default function ModalCrearRol({ open, onClose, onSave }) {
  const [nombre, setNombre] = useState("");
  const [modulos, setModulos] = useState([]); // Garantizamos que inicie como array
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetchModulos();
      setNombre("");
      setSeleccionados([]);
      setError("");
    }
  }, [open]);

  const fetchModulos = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/modulos", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // VALIDACIÓN CLAVE: Solo setear si es un array
      if (res.ok && Array.isArray(data)) {
        setModulos(data);
      } else {
        console.error("Error de API:", data);
        setModulos([]); // Si hay error, mantenemos el array vacío
        setError("No tienes permiso para ver los módulos.");
      }
    } catch (err) {
      console.error("Error cargando módulos:", err);
      setModulos([]);
    }
  };

  if (!open) return null;

  const toggleModulo = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!nombre.trim()) return setError("El nombre del rol es obligatorio.");
    if (seleccionados.length === 0)
      return setError("Selecciona al menos un módulo.");

    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          modulos: seleccionados,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Error al crear el rol");
      onSave();
      toast.success("¡Rol creado correctamente!");
      onClose();
    } catch (err) {
      setError(err.message);
      toast.error("Hubo un error al intentar guardar el rol.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Crear Nuevo Rol</h3>
          <p className="text-xs text-slate-500">
            Define el nombre y los accesos
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="text-xs bg-red-50 text-red-600 p-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Nombre
            </label>
            <input
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Permisos
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {/* RENDERIZADO SEGURO: Usamos Array.isArray */}
              {Array.isArray(modulos) && modulos.length > 0 ? (
                modulos.map((m) => (
                  <label
                    key={m.idModulo}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      seleccionados.includes(m.idModulo)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={seleccionados.includes(m.idModulo)}
                      onChange={() => toggleModulo(m.idModulo)}
                    />
                    <span className="text-xs font-medium">{m.nombre}</span>
                  </label>
                ))
              ) : (
                <div className="col-span-2 text-center text-xs text-slate-400 py-4">
                  Cargando módulos o acceso denegado...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Crear Rol"}
          </button>
        </div>
      </div>
    </div>
  );
}
