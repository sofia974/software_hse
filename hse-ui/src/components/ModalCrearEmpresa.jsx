import { useState } from "react";
import toast from "react-hot-toast";

export default function ModalCrearEmpresa({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
  });

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const handleSubmit = async () => {
    if (!form.nombre) {
      return toast.error("El nombre es obligatorio");
    }

    try {
      const res = await fetch("http://localhost:4000/api/admin/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form), // 🔥 sin idUsuarioAdmin
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Empresa creada correctamente");

      setForm({
        nombre: "",
        ruc: "",
        direccion: "",
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white p-6 rounded-xl w-[400px] space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold">Crear Empresa</h2>

        <input
          className="w-full border p-2 rounded"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="RUC"
          value={form.ruc}
          onChange={(e) => setForm({ ...form, ruc: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="Dirección"
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancelar</button>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleSubmit}
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
