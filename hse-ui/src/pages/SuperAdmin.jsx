import { useEffect, useMemo, useState } from "react";
import ConfiguracionEmpresa from "./PanelConfiguracionEmpresa";
import toast from "react-hot-toast";
import ModalCrearEmpresa from "../components/ModalCrearEmpresa";
import ModalCrearAdminEmpresa from "../components/ModalCrearAdminEmpresa";
import ModalRolesEmpresa from "../components/ModalRolesEmpresa";
// ---------------- ICONOS SVG (Nativos, sin librerías) ----------------
const IconBriefcase = () => (
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
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);
const IconUsers = () => (
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
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);
const IconActivity = () => (
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
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"
    />
  </svg>
);
const IconSettings = () => (
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
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// ---------------- COMPONENTES DE APOYO ----------------
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-slate-800">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon />
    </div>
  </div>
);

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-700">{title}</h2>
          <button
            onClick={onClose}
            className="hover:bg-slate-200 p-1 rounded-full transition-colors font-mono"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---------------- COMPONENTE PRINCIPAL ----------------
export default function SuperAdmin() {
  const [empresasTree, setEmpresasTree] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCreateEmpresa, setOpenCreateEmpresa] = useState(false);
  const [selectedEmpresaConfig, setSelectedEmpresaConfig] = useState(null);
  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const [licModal, setLicModal] = useState(false);
  const [empresaLic, setEmpresaLic] = useState(null);
  const [cantidadLic, setCantidadLic] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [openAdminModal, setOpenAdminModal] = useState(false);

  // MODAL: ROLES
  const [openRoles, setOpenRoles] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const openLicenciasModal = (empresa) => {
    // 🔥 Validar en frontend también
    if (empresa.idEmpresaPadre) {
      toast.error("Solo empresas principales pueden recibir licencias");
      return;
    }

    setEmpresaLic(empresa);
    setLicModal(true);
  };
  const guardarLicencias = async () => {
    if (!cantidadLic || cantidadLic <= 0) {
      return toast.error("Cantidad inválida");
    }

    if (!fechaInicio || !fechaFin) {
      return toast.error("Selecciona las fechas");
    }

    if (fechaFin < fechaInicio) {
      return toast.error("La fecha fin no puede ser menor a la inicio");
    }

    try {
      const res = await fetch("http://localhost:4000/api/licencias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          idEmpresa: empresaLic.idEmpresa,
          cantidadUsuarios: Number(cantidadLic),
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Licencias asignadas correctamente");
      setLicModal(false);
      setCantidadLic("");
      setFechaInicio("");
      setFechaFin("");
      console.log("DATA", data);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };
  useEffect(() => {
    if (licModal) {
      const hoy = new Date().toISOString().split("T")[0];
      setFechaInicio(hoy);
    }
  }, [licModal]);
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/admin/empresas", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setEmpresas(data || []);
      const tree = buildEmpresasTree(data || []);
      setEmpresasTree(tree);
      console.log("EMPRESAS TREE", tree);
    } catch (e) {
      toast.error("Error cargando datos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  const buildEmpresasTree = (empresas) => {
    const map = {};
    const roots = [];
    // crear mapa
    empresas.forEach((e) => {
      map[e.idEmpresa] = { ...e, children: [] };
    });

    // armar jerarquía
    empresas.forEach((e) => {
      if (e.idEmpresaPadre) {
        if (map[e.idEmpresaPadre]) {
          map[e.idEmpresaPadre].children.push(map[e.idEmpresa]);
        }
      } else {
        roots.push(map[e.idEmpresa]);
      }
    });

    return roots;
  };
  // Métricas del Dashboard
  const stats = useMemo(() => {
    const total = empresas.length;

    const principales = empresas.filter((e) => !e.idEmpresaPadre).length;

    const licenciasT = empresas.reduce(
      (acc, curr) => acc + (Number(curr.cantidadLicencias) || 0),
      0,
    );

    const licenciasU = empresas.reduce(
      (acc, curr) => acc + (Number(curr.licenciasUsadas) || 0),
      0,
    );

    return { total, principales, licenciasT, licenciasU };
  }, [empresas]);

  return (
    <main className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Super Admin
          </h1>
          <p className="text-slate-500">
            Gestión de estructura corporativa y licencias
          </p>
        </div>
        <div className="flex justify-end gap-6">
          <button
            onClick={() => setOpenCreateEmpresa(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200"
          >
            Nueva Empresa
          </button>
          <button
            onClick={() => setOpenAdminModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200"
          >
            Crear Admin Empresa
          </button>
        </div>
      </div>

      {selectedEmpresaConfig ? (
        <ConfiguracionEmpresa
          empresa={selectedEmpresaConfig}
          onBack={() => setSelectedEmpresaConfig(null)}
        />
      ) : (
        <div className="space-y-8">
          {/* SECCIÓN DASHBOARD (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Empresas"
              value={stats.total}
              icon={IconBriefcase}
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              title="Principales"
              value={stats.principales}
              icon={IconSettings}
              color="bg-purple-100 text-purple-600"
            />
            <StatCard
              title="Licencias Globales"
              value={stats.licenciasT}
              icon={IconUsers}
              color="bg-emerald-100 text-emerald-600"
            />
            <StatCard
              title="Ocupación"
              value={`${((stats.licenciasU / stats.licenciasT) * 100 || 0).toFixed(1)}%`}
              icon={IconActivity}
              color="bg-orange-100 text-orange-600"
            />
          </div>

          {/* LISTA DETALLADA */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-slate-700">
              Jerarquía del Sistema
            </h2>

            {loading ? (
              <div className="flex justify-center py-10 text-slate-400 animate-pulse">
                Cargando información...
              </div>
            ) : (
              <div className="grid gap-6">
                {empresasTree.map((empresa) => (
                  <div
                    key={empresa.idEmpresa}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-800">
                            {empresa.razonSocial}
                          </h3>
                          <span className="bg-blue-50 text-blue-700 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border border-blue-100">
                            Principal
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1 uppercase font-medium">
                          RUC: {empresa.ruc || "No definido"}
                        </p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            Estado Licencias
                          </p>
                          <p className="text-sm font-bold text-slate-700">
                            {empresa.licenciasUsadas || 0} /{" "}
                            {empresa.cantidadLicencias || 0}
                          </p>
                          <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-1">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{
                                width: `${
                                  empresa.cantidadLicencias > 0
                                    ? (empresa.licenciasUsadas /
                                        empresa.cantidadLicencias) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        {/* <button
                          onClick={() => setSelectedEmpresaConfig(empresa)}
                          className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                        >
                          Configurar
                        </button> */}
                        <button
                          onClick={() => openLicenciasModal(empresa)}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Licencias
                        </button>
                        <button
                          onClick={() => {
                            setEmpresaSeleccionada(empresa);
                            setOpenRoles(true);
                          }}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Roles
                        </button>
                      </div>
                    </div>

                    {/* SUB-EMPRESAS */}
                    {empresa.children.length > 0 && (
                      <div className="p-6 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {empresa.children.map((sub) => (
                          <div
                            key={sub.idEmpresa}
                            className="bg-white p-4 rounded-xl border border-slate-200"
                          >
                            <p className="font-bold text-slate-700">
                              {sub.razonSocial}
                            </p>
                            <p className="text-xs text-slate-400 mb-3 italic">
                              Subempresa
                            </p>
                            <div className="flex justify-between items-end border-t pt-3">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                  Licencias
                                </p>
                                <p className="text-xs font-semibold">
                                  {sub.licenciasUsadas || 0} de{" "}
                                  {sub.licenciasTotal || 0}
                                </p>
                              </div>
                              <button
                                onClick={() => setSelectedEmpresaConfig(sub)}
                                className="text-blue-600 hover:underline text-sm font-bold"
                              >
                                Gestionar →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {/* MODAL LICENCIAS */}
      <Modal
        open={licModal}
        onClose={() => setLicModal(false)}
        title="Asignar Licencias"
      >
        <div className="space-y-4">
          <p className="text-sm">
            Empresa: <b>{empresaLic?.razonSocial}</b>
          </p>

          <input
            type="number"
            value={cantidadLic}
            onChange={(e) => setCantidadLic(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Cantidad de usuarios"
          />

          {/* FECHA INICIO */}
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />

          {/* FECHA FIN */}
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />

          <button
            onClick={guardarLicencias}
            className="w-full bg-emerald-600 text-white py-2 rounded"
          >
            Guardar
          </button>
        </div>
      </Modal>

      <ModalCrearEmpresa
        open={openCreateEmpresa}
        onClose={() => setOpenCreateEmpresa(false)}
        onCreated={loadData}
      />
      <ModalCrearAdminEmpresa
        open={openAdminModal}
        onClose={() => setOpenAdminModal(false)}
        onCreated={loadData}
        empresas={empresas}
      />
      <ModalRolesEmpresa
        open={openRoles}
        onClose={() => setOpenRoles(false)}
        empresa={empresaSeleccionada}
        getToken={getToken}
      />
    </main>
  );
}
