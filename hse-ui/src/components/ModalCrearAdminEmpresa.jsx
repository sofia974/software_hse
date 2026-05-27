import { useState } from "react";
import toast from "react-hot-toast";

export default function ModalCrearAdminEmpresa({
  open,
  onClose,
  onCreated,
  empresas,
}) {
  const [form, setForm] = useState({
    nombre: "",
    username: "",
    email: "",
    password: "",
    idEmpresa: "",
    idRol: "",
  });

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.nombre || !form.username || !form.password || !form.idEmpresa) {
      return toast.error("Completa los campos obligatorios");
    }

    try {
      const res = await fetch("http://localhost:4000/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Admin empresa creado");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="bg-white rounded-2xl p-6 w-full max-w-md z-10">
        <h2 className="text-xl font-bold mb-4">Crear Admin Empresa</h2>

        <div className="space-y-3">
          <input
            name="nombre"
            placeholder="Nombre"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="username"
            placeholder="Usuario"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <select
            name="idEmpresa"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Seleccionar empresa</option>
            {empresas.map((e) => (
              <option key={e.idEmpresa} value={e.idEmpresa}>
                {e.razonSocial}
              </option>
            ))}
          </select>

          <select
            name="idRol"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Rol (opcional)</option>
            <option value="5">Administrador</option>
          </select>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
