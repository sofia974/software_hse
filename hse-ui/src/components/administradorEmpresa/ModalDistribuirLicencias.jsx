import { useEffect, useState } from "react";

export default function ModalDistribuirLicencias({ open, onClose }) {
  const [empresaPadre, setEmpresaPadre] = useState(null);
  const [subempresas, setSubempresas] = useState([]);
  const [totalLicencias, setTotalLicencias] = useState(0);
  const [idLicencia, setIdLicencia] = useState(null);
  const [distribucion, setDistribucion] = useState({});

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const getUser = () => {
    const token = getToken();
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  };

  // 🔥 CARGA COMPLETA
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        const token = getToken();
        const user = getUser();

        if (!user) return;

        // 1. EMPRESAS
        const resEmp = await fetch("http://localhost:4000/api/empresas", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const empresas = await resEmp.json();

        const padre = empresas.find(
          (e) => e.idEmpresa === Number(user.idEmpresa),
        );

        if (!padre) return;

        setEmpresaPadre(padre);

        const subs = empresas.filter(
          (e) => e.idEmpresaPadre === Number(user.idEmpresa),
        );

        setSubempresas(subs);

        // 2. LICENCIA ACTIVA
        const resLic = await fetch(
          `http://localhost:4000/api/licencias/empresa/${user.idEmpresa}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // const lic = await resLic.json();
        if (!resLic.ok) {
          const text = await resLic.text();
          console.error("Error licencia:", text);
          return;
        }

        const lic = await resLic.json();
        setIdLicencia(lic.idLicencia);
        console.log("Licencias de la empresa Totales", lic);
        // 3. DISPONIBLE REAL
        const resDisp = await fetch(
          `http://localhost:4000/api/licencias/disponibles/${user.idEmpresa}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // const disp = await resDisp.json();
        // setTotalLicencias(disp.total);
        const disp = await resDisp.json();

        const disponibles = disp.total;

        setTotalLicencias(disponibles);

        console.log("Total de Licencias Disponibles", disp);
        // 4. DISTRIBUCIÓN EXISTENTE
        const resDist = await fetch(
          `http://localhost:4000/api/licencias/distribucion/${lic.idLicencia}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const dist = await resDist.json();

        const inicial = {};

        dist.forEach((d) => {
          inicial[d.idEmpresa] = d.cantidadAsignada;
        });

        // TOTAL DISTRIBUIDO A HIJAS
        const totalDistribuidoHijas = dist
          .filter((d) => d.idEmpresa !== padre.idEmpresa)
          .reduce((acc, d) => acc + d.cantidadAsignada, 0);

        // EMPRESA PRINCIPAL = TOTAL - DISTRIBUIDO
        inicial[padre.idEmpresa] = disp.total - totalDistribuidoHijas;

        // ASEGURAR SUBEMPRESAS
        subs.forEach((e) => {
          inicial[e.idEmpresa] = inicial[e.idEmpresa] || 0;
        });

        setDistribucion(inicial);
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [open]);

  // const handleChange = (idEmpresa, value) => {
  //   setDistribucion((prev) => ({
  //     ...prev,
  //     [idEmpresa]: Number(value),
  //   }));
  // };
  const handleChange = (idEmpresa, value) => {
    let nuevoValor = Number(value);

    // NO NEGATIVOS
    if (nuevoValor < 0) {
      nuevoValor = 0;
    }

    setDistribucion((prev) => {
      const nuevaDistribucion = {
        ...prev,
        [idEmpresa]: nuevoValor,
      };

      // SUMAR SOLO HIJAS
      const totalHijas = subempresas.reduce((acc, sub) => {
        return acc + (Number(nuevaDistribucion[sub.idEmpresa]) || 0);
      }, 0);

      // PRINCIPAL = TOTAL - HIJAS
      nuevaDistribucion[empresaPadre.idEmpresa] = Math.max(
        totalLicencias - totalHijas,
        0,
      );

      return nuevaDistribucion;
    });
  };

  // const totalAsignado = Object.values(distribucion).reduce((a, b) => a + b, 0);
  const totalAsignado = subempresas.reduce(
    (acc, sub) => acc + (Number(distribucion[sub.idEmpresa]) || 0),
    0,
  );
  const guardar = async () => {
    if (totalAsignado > totalLicencias) {
      alert("Excedes el total de licencias");
      return;
    }

    const data = Object.entries(distribucion).map(([id, cantidad]) => ({
      idEmpresa: Number(id),
      cantidad,
    }));

    try {
      const token = getToken();

      await fetch("http://localhost:4000/api/licencias/distribuir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idLicencia,
          distribucion: data,
        }),
      });

      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Distribuir Licencias</h2>
            <p className="text-sm text-gray-400">
              Total disponible: {totalLicencias}
            </p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* PADRE */}
        {empresaPadre && (
          <div className="mb-4 p-4 border rounded-xl bg-gray-50">
            <p className="text-sm text-gray-500">Empresa Principal</p>
            <p className="font-bold">{empresaPadre.razonSocial}</p>

            {/* <input
              type="number"
              className="w-full mt-2 border rounded px-2 py-1"
              value={distribucion[empresaPadre.idEmpresa] || 0}
              onChange={(e) =>
                handleChange(empresaPadre.idEmpresa, e.target.value)
              }
            /> */}
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 font-bold text-emerald-700">
              {distribucion[empresaPadre.idEmpresa] || 0} licencias
            </div>
          </div>
        )}

        {/* SUBEMPRESAS */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {subempresas.map((e) => (
            <div key={e.idEmpresa} className="border p-3 rounded">
              <p>{e.razonSocial}</p>
              <input
                type="number"
                className="w-full mt-1 border rounded px-2 py-1"
                value={distribucion[e.idEmpresa] || 0}
                onChange={(ev) => handleChange(e.idEmpresa, ev.target.value)}
              />
            </div>
          ))}
        </div>

        {/* PROGRESO */}
        <div className="mt-4 text-sm">
          {totalAsignado} / {totalLicencias}
        </div>

        {/* BOTONES */}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="w-full border py-2 rounded">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={totalAsignado > totalLicencias}
            className="w-full bg-emerald-600 text-white py-2 rounded"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
