import { useState, useEffect, useMemo, useCallback } from "react";
import ModalCrearChecklist from "../components/ModalCrearChecklist";
import ModalCrearChecklistAdmin from "../components/ModalCrearChecklistAdmin";
export default function ConfiguracionEmpresa({ empresa, onBack }) {
  const [activeTab, setActiveTab] = useState("areas");
  const [loading, setLoading] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // --- ESTADO CENTRALIZADO DE DATOS ---
  const [data, setData] = useState({
    areas: [],
    peligros: [],
    jerarquias: [],
    checklists: [],
    cursos: [],
    roles: [],
  });

  // --- ESTADO DE FORMULARIOS ---
  const [formData, setFormData] = useState({
    areaNom: "",
    pTipo: "",
    pNom: "",
    jTipo: "",
    cNom: "",
    cVig: "",
    cObl: false,
    showChecklistModal: false,
  });
  useEffect(() => {
    // Al cambiar de empresa, limpiamos los datos antiguos inmediatamente
    setData({
      areas: [],
      peligros: [],
      jerarquias: [],
      checklists: [],
      cursos: [],
      roles: [],
    });
    // Luego cargamos los nuevos
    fetchDatosEmpresa();
  }, [empresa?.idEmpresa]);

  // --- CARGA DE DATOS (API) ---
  const fetchDatosEmpresa = useCallback(async () => {
    if (!empresa?.idEmpresa) return;
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const api = (path) =>
        fetch(`http://localhost:4000/api${path}`, { headers })
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []);

      // CAMBIO CRÍTICO: Usar la ruta específica por empresa para Áreas
      const [areas, peligros, jerarquias, checklists, cursos, roles] =
        await Promise.all([
          api(`/empresas/${empresa.idEmpresa}/areas`), // <--- Ruta corregida
          api(`/riesgos-peligro?idEmpresa=${empresa.idEmpresa}`),
          api(`/riesgos-jerarquia?idEmpresa=${empresa.idEmpresa}`),
          api(`/checklists?idEmpresa=${empresa.idEmpresa}`),
          api(`/cursos?idEmpresa=${empresa.idEmpresa}`),
          api(`/roles`),
        ]);

      setData({ areas, peligros, jerarquias, checklists, cursos, roles });
    } catch (e) {
      console.error("Error cargando configuración:", e);
    } finally {
      setLoading(false);
    }
  }, [empresa?.idEmpresa, token]);

  useEffect(() => {
    fetchDatosEmpresa();
  }, [fetchDatosEmpresa]);

  // --- ACCIONES GENÉRICAS (POST, DELETE, etc.) ---
  const handleAction = async (method, endpoint, payload = null) => {
    try {
      const cleanEndpoint = endpoint.replace(/^\//, "");
      const config = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (payload) {
        config.body = JSON.stringify({
          ...payload,
          idEmpresa: empresa.idEmpresa, // Esto evita que se guarde en la empresa 1 por defecto
        });
      }

      const res = await fetch(
        `http://localhost:4000/api/${cleanEndpoint}`,
        config,
      );

      // PRIMERO: Verificamos si la respuesta es JSON antes de parsear
      const contentType = res.headers.get("content-type");
      if (res.ok) {
        await fetchDatosEmpresa();
        return true;
      } else {
        // Si no es OK y es HTML, es un error de ruta (404)
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await res.json();
          alert(
            "Error: " + (errorData.error || "No se pudo realizar la acción"),
          );
        } else {
          console.error("Respuesta no es JSON:", await res.text());
          alert(
            `Error técnico: ${res.status} - Ruta no encontrada en el servidor.`,
          );
        }
      }
    } catch (e) {
      console.error("Error en la acción:", e);
    }
    return false;
  };

  // --- HANDLERS ESPECÍFICOS ---
  // Función para registrar
  const agregarArea = async () => {
    if (!formData.areaNom.trim()) return;

    // CAMBIO: Ahora llamamos a "areas" a secas, no a la ruta larga
    const ok = await handleAction("POST", "areas", {
      Nombre: formData.areaNom,
    });

    if (ok) setFormData({ ...formData, areaNom: "" });
  };

  // Función para eliminar
  const eliminarArea = async (idArea) => {
    if (!confirm("¿Seguro que quieres eliminar esta área?")) return;

    // Llamamos al endpoint: /empresas/1/areas/5
    await handleAction(
      "DELETE",
      `empresas/${empresa.idEmpresa}/areas/${idArea}`,
    );
  };

  // FUNCION PARA REGISTRAR RIESGO - PELIGRO
  const agregarPeligro = async () => {
    if (!formData.pNom.trim()) return;

    // No necesitas pasar idEmpresa aquí manualmente porque handleAction ya lo pone
    const ok = await handleAction("POST", "riesgos-peligro", {
      Peligro: formData.pNom,
    });

    if (ok) setFormData({ ...formData, pNom: "" });
  };

  const eliminarPeligro = async (id) => {
    if (!confirm("¿Eliminar este peligro?")) return;
    await handleAction("DELETE", `riesgos-peligro/${id}`);
  };

  const eliminarJerarquia = async (id) => {
    if (!confirm("¿Eliminar este nivel de jerarquía?")) return;
    await handleAction("DELETE", `riesgos-jerarquia/${id}`);
  };

  //INSPECCIONES

  // --- MEMOS PARA FILTRADO ---
  const filteredAreas = useMemo(() => {
    return data.areas.filter((a) =>
      a.Nombre?.toLowerCase().includes(areaSearch.toLowerCase()),
    );
  }, [data.areas, areaSearch]);
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* HEADER SUPERADMIN */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border-l-4 border-blue-600 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                {empresa.nombre}
              </h2>
              <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-black uppercase">
                Admin Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              RUC: {empresa.ruc} | ID: {empresa.idEmpresa}
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        {["areas", "riesgos", "inspeccion", "capacitacion"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
              activeTab === tab
                ? "bg-white shadow text-blue-600"
                : "text-slate-500 hover:bg-white/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 font-medium animate-pulse">
            Sincronizando parámetros de empresa...
          </div>
        ) : (
          <>
            {/* TAB: ÁREAS */}
            {activeTab === "areas" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-slate-800 mb-4">
                    📍 Nueva Área
                  </h3>
                  <input
                    className="w-full mb-4 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del área..."
                    value={formData.areaNom}
                    onChange={(e) =>
                      setFormData({ ...formData, areaNom: e.target.value })
                    }
                  />
                  <button
                    onClick={agregarArea}
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Registrar Área
                  </button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      Listado de Áreas: {empresa.nombre}
                    </span>
                    <input
                      className="text-xs border-b border-slate-300 bg-transparent outline-none focus:border-blue-500"
                      placeholder="Buscar área..."
                      value={areaSearch}
                      onChange={(e) => setAreaSearch(e.target.value)}
                    />
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {filteredAreas.length > 0 ? (
                        filteredAreas.map((a) => (
                          <tr
                            key={a.idArea}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4 font-semibold text-slate-700">
                              {a.Nombre}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => eliminarArea(a.idArea)}
                                className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="p-10 text-center text-slate-400 italic"
                          >
                            No hay áreas registradas para esta empresa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: RIESGOS (Adaptado con handleAction) */}
            {activeTab === "riesgos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Matriz de Peligros */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    ⚠️ Matriz de Peligros
                  </h3>

                  <input
                    className="w-full border p-2 rounded-xl text-sm outline-none"
                    placeholder="Descripción del peligro"
                    value={formData.pNom}
                    onChange={(e) =>
                      setFormData({ ...formData, pNom: e.target.value })
                    }
                  />
                  <button
                    onClick={agregarPeligro}
                    className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700"
                  >
                    Agregar Peligro
                  </button>

                  {/* Listado de Peligros */}
                  <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-1">
                    {data.peligros.map((p) => (
                      <div
                        key={p.idPeligro}
                        className="text-[11px] p-2 bg-slate-50 rounded border flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700">
                          {p.tipoPeligro}
                        </span>
                        <button
                          onClick={() => eliminarPeligro(p.idPeligro)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                    {data.peligros.length === 0 && (
                      <p className="text-center text-slate-400 text-xs italic py-4">
                        No hay peligros registrados.
                      </p>
                    )}
                  </div>
                </div>

                {/* Jerarquía de Controles */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
                  <h3 className="font-bold text-slate-800">
                    🛡️ Jerarquía de Controles
                  </h3>
                  <input
                    className="w-full border p-2 rounded-xl text-sm outline-none"
                    placeholder="Ej: EPP, Ingeniería, Eliminación..."
                    value={formData.jTipo}
                    onChange={(e) =>
                      setFormData({ ...formData, jTipo: e.target.value })
                    }
                  />
                  <button
                    onClick={async () => {
                      if (!formData.jTipo) return;
                      const ok = await handleAction(
                        "POST",
                        "riesgos-jerarquia",
                        {
                          tipoJerarquia: formData.jTipo,
                        },
                      );
                      if (ok) setFormData({ ...formData, jTipo: "" });
                    }}
                    className="w-full bg-slate-900 text-white py-2 rounded-xl font-bold hover:bg-slate-800"
                  >
                    Añadir Nivel
                  </button>

                  <div className="mt-4 space-y-1">
                    {data.jerarquias.map((j, i) => (
                      <div
                        key={j.idJerarquia}
                        className="text-[11px] p-2 bg-slate-100 rounded text-slate-600 font-medium flex justify-between items-center"
                      >
                        <span>
                          Nivel {i + 1}: {j.tipoJerarquia}
                        </span>
                        <button
                          onClick={() => eliminarJerarquia(j.idJerarquia)}
                          className="text-red-400 hover:text-red-600"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INSPECCIÓN */}
            {/* {activeTab === "inspeccion" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold text-slate-800">
                    Checklists de Empresa
                  </h3>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, showChecklistModal: true })
                    }
                    className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm"
                  >
                    {" "}
                    + Nuevo Checklist{" "}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.checklists.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-700 text-sm">
                          {c.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {c.id}
                        </p>
                      </div>
                      <span className="text-lg">📋</span>
                    </div>
                  ))}
                </div>
                <ModalCrearChecklist
                  open={formData.showChecklistModal}
                  onClose={() =>
                    setFormData({ ...formData, showChecklistModal: false })
                  }
                  onSave={() => {
                    fetchDatosEmpresa();
                    setFormData({ ...formData, showChecklistModal: false });
                  }}
                />
              </div>
            )} */}

            {/* TAB: INSPECCIÓN */}
            {activeTab === "inspeccion" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center px-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      Checklists de Empresa
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Formatos configurados para:{" "}
                      <span className="text-blue-600">{empresa.nombre}</span>
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, showChecklistModal: true })
                    }
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                  >
                    <span>+</span> Nuevo Checklist
                  </button>
                </div>

                {/* Grid de Checklists filtrados por Empresa */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.checklists && data.checklists.length > 0 ? (
                    data.checklists.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                      >
                        {/* Cabecera del Checklist */}
                        <div className="p-4 border-b bg-slate-50/80 flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-slate-700 text-sm uppercase tracking-tight">
                              {c.nombre}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">
                              ID: {c.id} | Empresa: {empresa.idEmpresa}
                            </p>
                          </div>
                          <span className="bg-white p-2 rounded-lg border shadow-xs text-xl">
                            📋
                          </span>
                        </div>

                        {/* Listado de Items (Preguntas) */}
                        <div className="p-4 flex-1 bg-white">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                              Preguntas Configuradas ({c.items?.length || 0})
                            </span>
                          </div>

                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                            {c.items && c.items.length > 0 ? (
                              c.items.map((item, idx) => (
                                <div
                                  key={item.idItem}
                                  className="group flex gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 transition-all"
                                >
                                  <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-400 mt-0.5">
                                    {String(idx + 1).padStart(2, "0")}
                                  </span>
                                  <p className="text-[12px] text-slate-600 leading-snug font-medium">
                                    {item.pregunta}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                                <p className="text-[11px] text-slate-400 italic">
                                  No hay preguntas en este formato
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones del Checklist */}
                        <div className="px-4 py-3 bg-slate-50 border-t flex justify-between items-center">
                          <button
                            onClick={() =>
                              alert("Función para editar items en desarrollo")
                            }
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Gestionar Items
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                confirm(`¿Eliminar checklist: ${c.nombre}?`)
                              ) {
                                await handleAction(
                                  "DELETE",
                                  `checklists/${c.id}`,
                                );
                              }
                            }}
                            className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Estado Vacío: Cuando la empresa no tiene checklists */
                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-inner">
                      <div className="text-5xl mb-4 grayscale opacity-20">
                        📋
                      </div>
                      <h4 className="text-slate-500 font-bold text-sm">
                        Sin Checklists registrados
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-1">
                        La empresa con ID {empresa.idEmpresa} aún no tiene
                        formatos de inspección.
                      </p>
                      <button
                        onClick={() =>
                          setFormData({ ...formData, showChecklistModal: true })
                        }
                        className="mt-4 text-blue-600 font-bold text-xs hover:underline"
                      >
                        Crear el primer checklist ahora
                      </button>
                    </div>
                  )}
                </div>

                {/* Modal de Creación */}
                {/* <ModalCrearChecklist
                  open={formData.showChecklistModal}
                  onClose={() =>
                    setFormData({ ...formData, showChecklistModal: false })
                  }
                  onSave={() => {
                    fetchDatosEmpresa();
                    setFormData({ ...formData, showChecklistModal: false });
                  }}
                  idEmpresa={empresa.idEmpresa} // Importante pasar el ID actual al modal
                /> */}
                <ModalCrearChecklistAdmin
                  open={formData.showChecklistModal}
                  onClose={() =>
                    setFormData({ ...formData, showChecklistModal: false })
                  }
                  onSave={() => {
                    fetchDatosEmpresa(); // Esto refrescará la lista de checklists de la empresa actual
                    setFormData({ ...formData, showChecklistModal: false });
                  }}
                  idEmpresa={empresa.idEmpresa} // <--- Este es el punto clave
                />
              </div>
            )}

            {/* TAB: CAPACITACIÓN */}
            {activeTab === "capacitacion" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                <section className="space-y-4">
                  <h3 className="font-bold text-slate-800 border-b pb-2">
                    Registrar Curso
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">
                        Nombre
                      </label>
                      <input
                        className="w-full border p-2 rounded-lg text-sm"
                        placeholder="Curso..."
                        value={formData.cNom}
                        onChange={(e) =>
                          setFormData({ ...formData, cNom: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">
                        Vigencia (Meses)
                      </label>
                      <input
                        className="w-full border p-2 rounded-lg text-sm"
                        type="number"
                        value={formData.cVig}
                        onChange={(e) =>
                          setFormData({ ...formData, cVig: e.target.value })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm pb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.cObl}
                        onChange={(e) =>
                          setFormData({ ...formData, cObl: e.target.checked })
                        }
                      />{" "}
                      Obligatorio
                    </label>
                    <button
                      onClick={async () => {
                        await handleAction("POST", "cursos", {
                          nombre: formData.cNom,
                          vigenciaMeses: formData.cVig,
                          obligatorio: formData.cObl,
                        });
                        setFormData({
                          ...formData,
                          cNom: "",
                          cVig: "",
                          cObl: false,
                        });
                      }}
                      className="bg-blue-600 text-white py-2 rounded-lg font-bold"
                    >
                      {" "}
                      Guardar{" "}
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-bold text-slate-800">
                    Matriz Cursos vs Roles
                  </h3>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-4 text-left font-bold text-slate-400">
                            Curso
                          </th>
                          {data.roles.map((r) => (
                            <th
                              key={r.idRol}
                              className="p-4 text-center text-[10px] uppercase font-black"
                            >
                              {r.nombre}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.cursos.map((c) => (
                          <tr key={c.idCurso} className="hover:bg-slate-50/50">
                            <td className="p-4">
                              <p className="font-bold text-slate-700">
                                {c.nombre}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {c.vigenciaMeses} meses
                              </p>
                            </td>
                            {data.roles.map((r) => (
                              <td key={r.idRol} className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-600"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
