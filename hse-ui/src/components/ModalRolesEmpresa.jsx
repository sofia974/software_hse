import { useEffect, useState } from "react";

export default function ModalRolesEmpresa({
  open,
  onClose,
  empresa,
  getToken,
}) {
  const [tab, setTab] = useState("usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [rolesModulos, setRolesModulos] = useState([]);

  useEffect(() => {
    if (!open || !empresa) return;

    const load = async () => {
      const token = getToken();

      const [u, rm] = await Promise.all([
        fetch(
          `http://localhost:4000/api/admin/empresas/${empresa.idEmpresa}/usuarios`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ).then((r) => r.json()),

        fetch(
          `http://localhost:4000/api/admin/empresas/${empresa.idEmpresa}/roles-modulos`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ).then((r) => r.json()),
      ]);

      setUsuarios(u);
      setRolesModulos(rm);
    };

    load();
  }, [open, empresa]);

  const toggleModulo = async (idRol, idModulo) => {
    await fetch("http://localhost:4000/api/admin/roles-modulos/toggle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        idRol,
        idModulo,
        idEmpresa: empresa.idEmpresa,
      }),
    });

    setRolesModulos((prev) =>
      prev.map((r) =>
        r.idRol === idRol && r.idModulo === idModulo
          ? { ...r, activo: r.activo ? 0 : 1 }
          : r,
      ),
    );
  };

  const agrupar = () => {
    const map = {};
    rolesModulos.forEach((r) => {
      if (!map[r.idRol]) {
        map[r.idRol] = {
          rol: r.rol,
          modulos: [],
        };
      }
      map[r.idRol].modulos.push(r);
    });
    return Object.values(map);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white w-full max-w-3xl p-6 rounded-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-lg">Empresa: {empresa.razonSocial}</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4">
          <button onClick={() => setTab("usuarios")}>Usuarios</button>
          <button onClick={() => setTab("permisos")}>Permisos</button>
        </div>

        {/* USUARIOS */}
        {tab === "usuarios" && (
          <div className="space-y-2">
            {usuarios.map((u) => (
              <div key={u.idPersona} className="flex justify-between">
                <span>{u.nombre}</span>
                <span className="text-sm text-gray-500">{u.rol}</span>
              </div>
            ))}
          </div>
        )}

        {/* PERMISOS */}
        {tab === "permisos" && (
          <div className="space-y-4">
            {agrupar().map((rol, i) => (
              <div key={i}>
                <h3 className="font-semibold">{rol.rol}</h3>

                {rol.modulos.map((m) => (
                  <div key={m.idModulo} className="flex justify-between">
                    <span>{m.modulo}</span>

                    <input
                      type="checkbox"
                      checked={m.activo === 1}
                      onChange={() => toggleModulo(m.idRol, m.idModulo)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
