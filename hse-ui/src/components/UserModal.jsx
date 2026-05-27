import React from "react";

const UserModal = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">
              {data.nombre}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Gestión de personal y accesos al sistema
            </p>
          </div>
          {/* <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-400"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button> */}
        </div>

        {/* Tabla de Usuarios */}
        <div className="flex-1 overflow-auto p-6">
          <div className="border rounded-xl overflow-hidden border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-slate-600 uppercase text-[11px]">
                    Usuario / Email
                  </th>
                  <th className="px-4 py-4 text-left font-bold text-slate-600 uppercase text-[11px]">
                    Rol / Nivel
                  </th>
                  <th className="px-4 py-4 text-left font-bold text-slate-600 uppercase text-[11px]">
                    Módulos Permitidos
                  </th>
                  <th className="px-4 py-4 text-center font-bold text-slate-600 uppercase text-[11px]">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {u.username}
                        </span>
                        <span className="text-xs text-slate-500">
                          {u.email || "Sin correo"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700">
                          {u.rol || "Sin Rol"}
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-1">
                          {u.nivel_acceso || "ESTÁNDAR"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {u.modulos_nombres ? (
                          u.modulos_nombres.split(", ").map((mod, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100"
                            >
                              {mod}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Sin módulos asignados
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Estado (Validación robusta) */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                          u.is_active === 1 ||
                          u.is_active === "1" ||
                          u.is_active === true
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-700 border border-red-200"
                        }`}
                      >
                        {u.is_active === 1 ||
                        u.is_active === "1" ||
                        u.is_active === true
                          ? "ACTIVO"
                          : "INACTIVO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-bold text-sm tracking-widest shadow-lg"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
