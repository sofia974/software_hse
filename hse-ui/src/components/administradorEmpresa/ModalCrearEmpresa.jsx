import { useState } from "react";

export default function ModalCrearEmpresa({ open, onClose, onCreated }) {
  const [newEmpresa, setNewEmpresa] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
  });

  const handleCreateEmpresa = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      await fetch("http://localhost:4000/api/administrador/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEmpresa),
      });
      console.log("NEW EMPRESA", newEmpresa);
      setNewEmpresa({ nombre: "", ruc: "", direccion: "" });

      onClose();
      if (onCreated) onCreated();
    } catch (error) {
      console.error(error);
    }
  };

  // 🔴 IMPORTANTE: controlar visibilidad
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      {/* Caja del modal */}
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Nueva Empresa</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-4">
          <input
            className="w-full px-4 py-2 border rounded-xl"
            placeholder="Razón Social"
            value={newEmpresa.nombre}
            onChange={(e) =>
              setNewEmpresa({ ...newEmpresa, nombre: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              className="px-4 py-2 border rounded-xl"
              placeholder="RUC"
              value={newEmpresa.ruc}
              onChange={(e) =>
                setNewEmpresa({ ...newEmpresa, ruc: e.target.value })
              }
            />

            <input
              className="px-4 py-2 border rounded-xl"
              placeholder="Dirección"
              value={newEmpresa.direccion}
              onChange={(e) =>
                setNewEmpresa({
                  ...newEmpresa,
                  direccion: e.target.value,
                })
              }
            />
          </div>

          <button
            onClick={handleCreateEmpresa}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900"
          >
            Crear Empresa
          </button>
        </div>
      </div>
    </div>
  );
}
