import { useEffect, useMemo, useState } from "react";
import ConfiguracionEmpresa from "./PanelConfiguracionEmpresa";
import ModalCrearRol from "../components/ModalCrearRol";
import UserModal from "../components/UserModal";
import ModalCrearEmpresa from "../components/administradorEmpresa/ModalCrearEmpresa";
import ModalDistribuirLicencias from "../components/administradorEmpresa/ModalDistribuirLicencias";
import ModalCrearUsuarioLicencia from "../components/administradorEmpresa/ModalCrearUsuarioLicencia";
import toast from "react-hot-toast";
// ---------------- COMPONENTE MODAL REUTILIZABLE ----------------
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-700">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---------------- COMPONENTE PRINCIPAL ADMINISTRADOR ----------------
export default function Administrador() {
  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // --- ESTADOS DE DATOS ---
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [cursos, setCursos] = useState([]);

  // --- ESTADOS DE UI ---
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [view, setView] = useState("personas"); // "personas", "roles", "empresas"
  const [loading, setLoading] = useState(false);
  const [selectedEmpresaConfig, setSelectedEmpresaConfig] = useState(null);

  // --- ESTADOS DE MODALES ---
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [openCreateEmpresa, setOpenCreateEmpresa] = useState(false);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  // --- ESTADOS DE FORMULARIOS ---
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleModules, setRoleModules] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  // Administrador.jsx
  const [openModalRol, setOpenModalRol] = useState(false);
  // Distribucion.jsx
  const [openDistribuir, setOpenDistribuir] = useState(false);
  // Crear Usuario con Licencia.jsx
  const fetchRoles = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRoles(data);
      } else {
        console.error("Error al obtener roles:", data);
        setRoles([]);
      }
    } catch (err) {
      console.error("Error de red:", err);
      setRoles([]);
    }
  };
  useEffect(() => {
    if (view === "roles") {
      fetchRoles();
    }
  }, [view]);
  // --- CARGA DE DATOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const apiFetch = async (path) => {
        const res = await fetch(`http://localhost:4000/api${path}`, {
          headers,
        });
        if (!res.ok) throw new Error(`Error en ${path}: ${res.statusText}`);
        return res.json();
      };

      const [uData, rData, mData, eData, aData, cData] = await Promise.all([
        // CAMBIO AQUÍ: Cambiamos "/usuarios" por la nueva ruta que creaste
        apiFetch("/usuarios-detalle"),
        apiFetch("/roles"),
        apiFetch("/modulos"),
        apiFetch("/empresas"),
        apiFetch("/areas"),
        apiFetch("/cursos"),
      ]);

      setUsers(uData || []);
      setRoles(rData || []);
      setModulos(mData || []);
      setEmpresas(eData || []);
      setAreas(aData || []);
      setCursos(cData || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(
    () => ({
      total: users.length,
      // activos: users.filter((u) => u.activo).length,
      activos: users.filter((u) => Number(u.is_active) === 1).length,
      admins: users.filter((u) => u.rol === "Administrador").length,
    }),
    [users],
  );
  const openPermissions = async (role) => {
    setSelectedRole(role);
    try {
      const res = await fetch(
        `http://localhost:4000/api/roles/${role.idRol}/modulos`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      const data = await res.json();
      setRoleModules(data || []);
      setOpenRoleModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleModulo = async (idModulo) => {
    const exists = roleModules.includes(idModulo);

    try {
      const res = await fetch("http://localhost:4000/api/roles-modulos", {
        method: exists ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          idRol: selectedRole.idRol,
          idModulo,
        }),
      });

      if (res.ok) {
        setRoleModules((prev) =>
          exists ? prev.filter((id) => id !== idModulo) : [...prev, idModulo],
        );

        // ← RECARGAR TODO
        await loadData();
      }

      toast.success("¡Rol modificado correctamente!");
    } catch (e) {
      console.error(e);
      toast.error("Hubo un error al intentar modificar el rol.");
    }
  };

  const usersByEmpresa = useMemo(() => {
    const groups = {};

    if (!Array.isArray(users)) return groups;

    users.forEach((user) => {
      const id = user.idEmpresa;
      const nombre = user.empresa || "Sin Empresa";

      if (!groups[id]) {
        groups[id] = {
          nombre,
          usuarios: [],
        };
      }

      groups[id].usuarios.push(user);
    });

    return groups;
  }, [users]);

  // ARBOL DE EMPRESAS
  const empresasJerarquicas = useMemo(() => {
    if (!Array.isArray(empresas)) return [];

    const map = new Map();

    // 1. Crear nodos
    empresas.forEach((e) => {
      map.set(e.idEmpresa, { ...e, subempresas: [] });
    });

    const roots = [];

    // 2. Relacionar hijos
    empresas.forEach((e) => {
      if (e.idEmpresaPadre) {
        const parent = map.get(e.idEmpresaPadre);
        if (parent) {
          parent.subempresas.push(map.get(e.idEmpresa));
        }
      } else {
        roots.push(map.get(e.idEmpresa));
      }
    });

    return roots;
  }, [empresas]);
  return (
    <>
      <main className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-5 text-slate-800">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Panel de Administración
            </h1>
            <p className="text-slate-500">
              Gestión global de entidades y accesos.
            </p>
          </div>
          {!selectedEmpresaConfig && (
            <div className="flex gap-3">
              <button
                onClick={() => setOpenCreateEmpresa(true)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition-all"
              >
                + Nueva Empresa
              </button>
              <button
                onClick={() => setOpenCreateUser(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Registrar Usuario
              </button>
              <button
                onClick={() => setOpenDistribuir(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-all"
              >
                Distribuir Licencias
              </button>
            </div>
          )}
        </div>

        {/* Si hay una empresa seleccionada para configurar, mostramos el componente de configuración */}
        {selectedEmpresaConfig ? (
          <ConfiguracionEmpresa
            empresa={selectedEmpresaConfig}
            onBack={() => {
              setSelectedEmpresaConfig(null);
              loadData();
            }}
          />
        ) : (
          <>
            {/* ESTADÍSTICAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Usuarios</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Activos</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.activos}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Empresas</p>
                <p className="text-3xl font-bold text-blue-600">
                  {empresas.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-3">
                  Licencias
                </p>

              <div className="flex items-center justify-between">
                {/* Totales */}
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-400">Totales</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {empresas.reduce(
                      (acc, e) => acc + (e.licenciasTotales || 0),
                      0,
                    )}
                  </p>
                </div>

                  {/* Separador */}
                  <div className="h-10 w-px bg-slate-200 mx-4" />

                {/* Usadas */}
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-400">Usadas</p>
                  <p className="text-2xl font-bold text-red-500">
                    {empresas.reduce(
                      (acc, e) => acc + (e.licenciasUsadas || 0),
                      0,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

            {/* SELECTOR DE VISTA */}
            <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
              {/* INPUT: Ahora ocupa todo el ancho en móvil y se reparte en desktop */}
              <input
                placeholder="Buscar..."
                className="w-full sm:flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* CONTENEDOR DE TABS: Ahora es responsivo */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto sm:overflow-visible">
                {["personas", "roles", "empresas"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`flex-1 sm:flex-none px-3 min-[400px]:px-6 py-1.5 rounded-lg text-xs min-[400px]:text-sm font-medium transition-all capitalize whitespace-nowrap ${
                      view === v
                        ? "bg-white shadow text-blue-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {/* VISTA: USUARIOS AGRUPADOS POR EMPRESA */}
            {view === "personas" && (
              <div>
                {Object.keys(usersByEmpresa).length === 0 ? (
                  <p className="text-slate-500">
                    No se encontraron empresas ni usuarios.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(usersByEmpresa).map(([idEmpresa, data]) => (
                      <button
                        key={idEmpresa}
                        onClick={() =>
                          setSelectedEmpresa({
                            nombre: data.nombre,
                            usuarios: data.usuarios,
                          })
                        }
                        className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left"
                      >
                        <div className="flex flex-col gap-2">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 text-lg">
                            🏢 {data.nombre}
                          </h3>

                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full w-fit">
                            {data.usuarios.length} Colaboradores
                          </span>

                          <p className="text-xs text-slate-400 mt-2">
                            Haz clic para ver detalles →
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedEmpresa && (
                  <UserModal
                    data={selectedEmpresa}
                    onClose={() => setSelectedEmpresa(null)}
                  />
                )}
              </div>
            )}

            {/* VISTA: ROLES */}
            {view === "roles" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800">
                    Roles del Sistema
                  </h2>
                  <button
                    onClick={() => setOpenModalRol(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm"
                  >
                    + Nuevo Rol
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                          Rol
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {/* USAMOS EL ENCADENAMIENTO OPCIONAL ?. O VALIDAMOS ARRAY */}
                      {Array.isArray(roles) && roles.length > 0 ? (
                        roles.map((r) => (
                          <tr key={r.idRol} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-semibold">
                              {r.nombre}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openPermissions(r)}
                                className="text-blue-600 font-bold text-sm hover:underline"
                              >
                                Configurar Permisos
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="px-6 py-8 text-center text-slate-400 text-sm"
                          >
                            No se encontraron roles o no tienes permisos para
                            verlos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA: EMPRESAS (NUEVA) */}
            {view === "empresas" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {empresasJerarquicas.map((empresa) => (
                  <div
                    key={empresa.idEmpresa}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                  >
                    {/* EMPRESA PRINCIPAL */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">
                          🏢 {empresa.razonSocial}
                        </h3>
                        <p className="text-sm text-slate-500 font-mono">
                          RUC: {empresa.ruc}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedEmpresaConfig(empresa)}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-sm font-bold"
                      >
                        ⚙️ Configurar
                      </button>
                    </div>

                    {/* SUBEMPRESAS */}
                    {empresa.subempresas?.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <p className="text-xs font-bold text-slate-400 mb-2">
                          Subempresas
                        </p>

                        <div className="space-y-2">
                          {empresa.subempresas.map((sub) => (
                            <div
                              key={sub.idEmpresa}
                              className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border"
                            >
                              <div>
                                <p className="font-medium text-slate-700">
                                  └ {sub.razonSocial}
                                </p>
                                <p className="text-xs text-slate-400">
                                  RUC: {sub.ruc}
                                </p>
                              </div>

                              <button
                                onClick={() => setSelectedEmpresaConfig(sub)}
                                className="text-xs px-2 py-1 bg-white border rounded-md hover:bg-blue-50"
                              >
                                Ver
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {/* MODAL: NUEVA EMPRESA */}
      <ModalCrearEmpresa
        open={openCreateEmpresa}
        onClose={() => setOpenCreateEmpresa(false)}
        onCreated={loadData}
      />

      <ModalCrearUsuarioLicencia
        open={openCreateUser}
        onClose={() => setOpenCreateUser(false)}
        empresas={empresas}
        roles={roles}
        // onUserCreated={(user) => {
        //   setUsers((prev) => [...prev, user]);
        // }}
        onUserCreated={async () => {
          await loadData();
        }}
      />

      {/* MODAL: PERMISOS */}
      <Modal
        open={openRoleModal}
        onClose={() => setOpenRoleModal(false)}
        title={`Permisos: ${selectedRole?.nombre}`}
      >
        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
          {modulos.map((m) => {
            const isChecked = roleModules.includes(m.idModulo);
            return (
              <div
                key={m.idModulo}
                onClick={() => toggleModulo(m.idModulo)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? "border-blue-500 bg-blue-50" : "border-slate-100"}`}
              >
                <span className="font-bold text-slate-700">{m.ruta}</span>
                <div
                  className={`w-10 h-5 rounded-full relative ${isChecked ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <div
                    className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isChecked ? "left-6" : "left-1"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      <ModalDistribuirLicencias
        open={openDistribuir}
        onClose={() => setOpenDistribuir(false)}
      />
      {/* Agrega el componente del modal aquí al final */}
      <ModalCrearRol
        open={openModalRol}
        onClose={() => setOpenModalRol(false)}
        onSave={fetchRoles}
      />
    </>
  );
}
