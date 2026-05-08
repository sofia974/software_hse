import { useMemo, useState, useEffect } from "react";
import Card from "../components/Card";
import IncidentModal from "../components/IncidentModal";

export default function Incidents({ search }) {
  //Listar incidentes
  const [incidents, setIncidents] = useState([]);

  // modal nuevo
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    // 1. Obtener el token de autorización
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    fetch("http://localhost:4000/api/incidentes", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Envío del token
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los incidentes");
        return res.json();
      })
      .then((data) => {
        // 2. Validar que 'data' sea un Array antes de transformar
        if (!Array.isArray(data)) {
          console.warn("La respuesta de incidentes no es un array:", data);
          setIncidents([]);
          return;
        }

        const formatted = data.map((x) => ({
          id: x.Codigo,
          nombreEmpresa: x.nombreEmpresa,
          fecha: x.Fecha?.split("T")[0] || "Sin fecha",
          tipo: x.Tipo,
          area: x.Area,
          sev: x.Severidad,
          estado: x.Estado,
          descripcion: x.Descripcion,
          responsable: x.Responsable,
          costoEstimado: x.TiempoParadaHoras,
          fotos: (x.fotos || []).map((f) => ({
            name: f.Nombre,
            url: `http://localhost:4000${f.Url}`,
          })),
        }));

        setIncidents(formatted);
      })
      .catch((err) => {
        console.error("Error cargando incidentes:", err);
        setIncidents([]); // Limpiar estado en caso de error
      });
  }, []);
  const handleCreateIncident = (newIncident) => {
    setIncidents((prev) => [newIncident, ...prev]);
    setOpenModal(false);
  };

  // modal detalle
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState(null);

  // buscador local
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t1 = (search || "").trim().toLowerCase();
    const t2 = (q || "").trim().toLowerCase();
    const t = [t1, t2].filter(Boolean).join(" ").trim();

    if (!t) return incidents;

    return incidents.filter((x) =>
      [
        x.id,
        x.fecha,
        x.tipo,
        x.area,
        x.sev,
        x.estado,
        x.descripcion,
        x.responsable,
        x.costoEstimado,
        (x.fotos || []).length,
      ].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(t),
      ),
    );
  }, [incidents, search, q]);

  const badge = (sev) => {
    const base = "text-xs px-2 py-1 rounded";
    if (sev === "Alta")
      return <span className={`${base} bg-red-100 text-red-700`}>Alta</span>;
    if (sev === "Media")
      return (
        <span className={`${base} bg-yellow-100 text-yellow-800`}>Media</span>
      );
    return <span className={`${base} bg-green-100 text-green-700`}>Baja</span>;
  };

  const shortText = (s, n = 70) => {
    const txt = String(s || "");
    if (txt.length <= n) return txt;
    return txt.slice(0, n) + "...";
  };

  const openDetailModal = (row) => {
    setSelected(row);
    setOpenDetail(true);
  };

  const closeDetailModal = () => {
    setOpenDetail(false);
    setSelected(null);
  };

  return (
    <main className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Incidentes</h1>
          <p className="text-sm text-slate-500">
            Registro, seguimiento y cierre
          </p>
        </div>

        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          onClick={() => setOpenModal(true)}
        >
          + Nuevo Incidente
        </button>
      </div>

      <div className="col-span-12">
        <Card title="Búsqueda y listado">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <input
              className="border rounded px-3 py-2 w-full md:w-1/3"
              placeholder="Buscar por ID, área, tipo, severidad, estado..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div className="text-sm text-slate-500">
              Mostrando{" "}
              <span className="font-semibold text-slate-700">
                {filtered.length}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-slate-700">
                {incidents.length}
              </span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Empresa</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Área</th>
                  <th className="py-2 pr-3">Severidad</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Descripción</th>
                  <th className="py-2 pr-3">Fotos</th>
                  <th className="py-2 pr-3">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-700">
                {filtered.map((x) => (
                  <tr key={x.id} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-3 font-semibold">{x.id}</td>
                    <td className="py-2 pr-3 text-xs font-medium text-slate-500 uppercase">
                      {x.nombreEmpresa || "General"}
                    </td>
                    <td className="py-2 pr-3">{x.fecha}</td>
                    <td className="py-2 pr-3">{x.tipo}</td>
                    <td className="py-2 pr-3">{x.area}</td>
                    <td className="py-2 pr-3">{badge(x.sev)}</td>
                    <td className="py-2 pr-3">{x.estado}</td>

                    <td className="py-2 pr-3 text-slate-600">
                      {shortText(x.descripcion, 70)}
                    </td>

                    <td className="py-2 pr-3">
                      {x.fotos && x.fotos.length > 0 ? (
                        <img
                          src={x.fotos[0].url}
                          className="h-12 w-16 object-cover rounded"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">Sin foto</span>
                      )}
                    </td>

                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm hover:bg-slate-50"
                        onClick={() => openDetailModal(x)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={9}>
                      No hay resultados para “{q || search}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <IncidentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={handleCreateIncident}
        existingIds={incidents.map((i) => i.id)}
      />
      {openDetail && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 "
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetailModal();
          }}
        >
          <div className="absolute inset-0 bg-black/40 " />

          <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-lg overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Detalle del incidente
                </h2>
                <p className="text-sm text-slate-500">
                  {selected.id} • {selected.fecha} • {selected.area}
                </p>
              </div>

              <button
                type="button"
                className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50"
                onClick={closeDetailModal}
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Tipo</p>
                  <p className="font-medium text-slate-800">
                    {selected.tipo || "—"}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Severidad</p>
                  <div className="mt-1">{badge(selected.sev)}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="font-medium text-slate-800">
                    {selected.estado || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Responsable</p>
                  <p className="font-medium text-slate-800">
                    {selected.responsable || "—"}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">
                    Tiempo estimado de parada de actividad
                  </p>
                  <p className="font-medium text-slate-800">
                    {typeof selected.costoEstimado === "number"
                      ? `${selected.costoEstimado % 1 === 0 ? selected.costoEstimado : selected.costoEstimado.toFixed(1)} horas`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500 mb-1">Descripción</p>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {selected.descripcion || "—"}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-slate-500 mb-3">
                  Fotografías adjuntas
                </p>

                {Array.isArray(selected.fotos) && selected.fotos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selected.fotos.map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                        title={f.name}
                      >
                        <img
                          src={f.url}
                          alt={f.name || `Foto ${i + 1}`}
                          className="h-28 w-full object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No hay fotografías adjuntas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
