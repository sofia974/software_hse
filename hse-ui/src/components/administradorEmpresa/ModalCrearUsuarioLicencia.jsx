import { useEffect, useState } from "react";

export default function ModalCrearUsuarioLicencia({
  open,
  onClose,
  empresas,
  roles,
  onUserCreated,
}) {
  const [newUser, setNewUser] = useState({
    idEmpresa: "",
    nombre: "",
    username: "",
    password: "",
    email: "",
    idRol: "",
    activo: true,
  });

  const [licencia, setLicencia] = useState(null);
  const [error, setError] = useState("");

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    if (!newUser.idEmpresa) return;

    const fetchLicencia = async () => {
      const res = await fetch(
        `http://localhost:4000/api/licencias/validar-uso/${newUser.idEmpresa}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      const data = await res.json();
      setLicencia(data);
    };

    fetchLicencia();
  }, [newUser.idEmpresa]);

  const handleCreateUser = async () => {
    try {
      setError("");

      const res = await fetch(
        "http://localhost:4000/api/usuarios-con-licencia",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(newUser),
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      onUserCreated(data.user); // 🔥 clave
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Crear Usuario</h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* EMPRESA */}
          <select
            className="w-full px-4 py-2 border rounded-xl bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={newUser.idEmpresa}
            onChange={(e) =>
              setNewUser({ ...newUser, idEmpresa: e.target.value })
            }
          >
            <option value="">-- Seleccionar Empresa --</option>
            {empresas.map((e) => (
              <option key={e.idEmpresa} value={e.idEmpresa}>
                {e.razonSocial}
              </option>
            ))}
          </select>

          {/* LICENCIAS */}
          {licencia && (
            <div
              className={`p-3 rounded-lg text-sm ${
                licencia.disponibles > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              Licencias: {licencia.usados} / {licencia.total} —{" "}
              <b>{licencia.disponibles} disponibles</b>
            </div>
          )}

          {/* INPUT NOMBRE */}
          <input
            className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nombre completo"
            value={newUser.nombre}
            onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
          />

          {/* USERNAME + PASSWORD */}
          <div className="grid grid-cols-2 gap-4">
            <input
              className="px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
            />

            <input
              className="px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />
          </div>

          {/* EMAIL */}
          <input
            className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />

          {/* ROL */}
          <select
            className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={newUser.idRol}
            onChange={(e) => setNewUser({ ...newUser, idRol: e.target.value })}
          >
            <option value="">Seleccionar Rol...</option>
            {roles.map((r) => (
              <option key={r.idRol} value={r.idRol}>
                {r.nombre}
              </option>
            ))}
          </select>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg">
              {error}
            </div>
          )}

          {/* BOTÓN */}
          <button
            onClick={handleCreateUser}
            disabled={!licencia || licencia.disponibles <= 0}
            className={`w-full py-3 rounded-xl font-bold text-white transition ${
              !licencia || licencia.disponibles <= 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Crear Usuario
          </button>
        </div>
      </div>
    </div>
  );
}
// import { useEffect, useState } from "react";

// export default function ModalCrearUsuarioLicencia({
//   open,
//   onClose,
//   empresas,
//   roles,
//   onCreated,
// }) {
//   const [newUser, setNewUser] = useState({
//     idEmpresa: "",
//     nombre: "",
//     username: "",
//     password: "",
//     email: "",
//     idRol: "",
//     activo: true,
//   });

//   const [licencia, setLicencia] = useState(null);
//   const [loadingLicencia, setLoadingLicencia] = useState(false);
//   const [error, setError] = useState("");

//   const getToken = () =>
//     localStorage.getItem("token") || sessionStorage.getItem("token");

//   // 🔥 VALIDAR LICENCIA CUANDO CAMBIA EMPRESA
//   useEffect(() => {
//     if (!newUser.idEmpresa) {
//       setLicencia(null);
//       return;
//     }

//     const validar = async () => {
//       try {
//         setLoadingLicencia(true);
//         setError("");

//         const res = await fetch(
//           `http://localhost:4000/api/licencias/validar-uso/${newUser.idEmpresa}`,
//           {
//             headers: {
//               Authorization: `Bearer ${getToken()}`,
//             },
//           },
//         );

//         const data = await res.json();
//         setLicencia(data);
//       } catch (err) {
//         console.error(err);
//         setError("Error validando licencias");
//       } finally {
//         setLoadingLicencia(false);
//       }
//     };

//     validar();
//   }, [newUser.idEmpresa]);

//   // 🔥 CREAR USUARIO
//   const handleCreateUser = async () => {
//     try {
//       setError("");

//       if (!licencia || licencia.disponibles <= 0) {
//         setError("La empresa no tiene licencias disponibles");
//         return;
//       }

//       const res = await fetch(
//         "http://localhost:4000/api/usuarios-con-licencia",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${getToken()}`,
//           },
//           body: JSON.stringify(newUser),
//         },
//       );

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.error || "Error al crear usuario");
//       }

//       onCreated?.();
//       onClose();

//       setNewUser({
//         idEmpresa: "",
//         nombre: "",
//         username: "",
//         password: "",
//         email: "",
//         idRol: "",
//         activo: true,
//       });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <>
//       {!open && null}

//       {open && (
// <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
//   <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
//     {/* HEADER */}
//     <div className="flex justify-between items-center mb-6">
//       <h2 className="text-xl font-bold">
//         Registrar Usuario con Licencia
//       </h2>

//       <button
//         onClick={onClose}
//         className="text-gray-400 hover:text-gray-700"
//       >
//         ✕
//       </button>
//     </div>

//     {/* CONTENIDO */}
//     <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
//       {/* EMPRESA */}
//       <select
//         className="w-full px-4 py-2 border rounded-xl bg-blue-50"
//         value={newUser.idEmpresa}
//         onChange={(e) =>
//           setNewUser({ ...newUser, idEmpresa: e.target.value })
//         }
//       >
//         <option value="">-- Seleccionar Empresa --</option>
//         {empresas.map((e) => (
//           <option key={e.idEmpresa} value={e.idEmpresa}>
//             {e.razonSocial}
//           </option>
//         ))}
//       </select>

//       {/* LICENCIA */}
//       {loadingLicencia && (
//         <p className="text-sm text-gray-400">Validando licencias...</p>
//       )}

//       {licencia && (
//         <div
//           className={`p-3 rounded-lg text-sm ${
//             licencia.disponibles > 0
//               ? "bg-emerald-50 text-emerald-700"
//               : "bg-red-50 text-red-700"
//           }`}
//         >
//           Licencias: {licencia.usados} / {licencia.total} —{" "}
//           <b>{licencia.disponibles} disponibles</b>
//         </div>
//       )}

//       {/* INPUTS */}
//       <input
//         className="w-full px-4 py-2 border rounded-xl"
//         placeholder="Nombre completo"
//         value={newUser.nombre}
//         onChange={(e) =>
//           setNewUser({ ...newUser, nombre: e.target.value })
//         }
//       />

//       <div className="grid grid-cols-2 gap-4">
//         <input
//           className="px-4 py-2 border rounded-xl"
//           placeholder="Username"
//           value={newUser.username}
//           onChange={(e) =>
//             setNewUser({ ...newUser, username: e.target.value })
//           }
//         />
//         <input
//           className="px-4 py-2 border rounded-xl"
//           type="password"
//           placeholder="Password"
//           value={newUser.password}
//           onChange={(e) =>
//             setNewUser({ ...newUser, password: e.target.value })
//           }
//         />
//       </div>

//       <input
//         className="w-full px-4 py-2 border rounded-xl"
//         type="email"
//         placeholder="Email"
//         value={newUser.email}
//         onChange={(e) =>
//           setNewUser({ ...newUser, email: e.target.value })
//         }
//       />

//       <select
//         className="w-full px-4 py-2 border rounded-xl"
//         value={newUser.idRol}
//         onChange={(e) =>
//           setNewUser({ ...newUser, idRol: e.target.value })
//         }
//       >
//         <option value="">Seleccionar Rol...</option>
//         {roles.map((r) => (
//           <option key={r.idRol} value={r.idRol}>
//             {r.nombre}
//           </option>
//         ))}
//       </select>

//       {/* ERROR */}
//       {error && <p className="text-sm text-red-600">{error}</p>}

//       {/* BOTÓN */}
//       <button
//         onClick={handleCreateUser}
//         disabled={!licencia || licencia.disponibles <= 0}
//         className={`w-full py-3 rounded-xl font-bold text-white ${
//           !licencia || licencia.disponibles <= 0
//             ? "bg-gray-400 cursor-not-allowed"
//             : "bg-blue-600 hover:bg-blue-700"
//         }`}
//       >
//         Crear Cuenta
//       </button>
//     </div>
//   </div>
// </div>
//       )}
//     </>
//   );
// }
