import { useState } from "react";
import logoSrc from "../assets/logo.png";
import iconIncidentes from "../assets/icons/incidente.png";
import iconRiesgos from "../assets/icons/riesgo.png";
import iconInspecciones from "../assets/icons/inspeccion.png";
import iconCapacitaciones from "../assets/icons/capacitacion_1.png";
import iconAmbiente from "../assets/icons/medioambiente.png";
import iconReportes from "../assets/icons/reporte_1.png";
// Íconos SVG inline
const EyeIcon = ({ open }) =>
  open ? (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ) : (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);
const MODULOS = [
  { icon: iconIncidentes, label: "Incidentes" },
  { icon: iconRiesgos, label: "Riesgos IPERC" },
  { icon: iconInspecciones, label: "Inspecciones" },
  { icon: iconCapacitaciones, label: "Capacitaciones" },
  { icon: iconAmbiente, label: "Medio Ambiente" },
  { icon: iconReportes, label: "Reportes PDF" },
];
export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(() => {
    return localStorage.getItem("hse_remember") === "true";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  // Setup
  const [setupMode, setSetupMode] = useState(false);
  const [setupData, setSetupData] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMsg, setSetupMsg] = useState(null);
  async function handleSubmit(e) {
    e.preventDefault();
    const u = usuario.trim();
    const p = password.trim();
    if (!u || !p) {
      setError("Completa usuario y contraseña.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error en el servidor");
      }
      const userData = {
        ...data.user,
        email: data.user.email || (u.includes("@") ? u : null),
      };
      const storage = recordar ? localStorage : sessionStorage;
      if (recordar) {
        sessionStorage.clear();
        localStorage.setItem("hse_remember", "true");
      } else {
        localStorage.clear();
      }
      storage.setItem("token", data.token);
      storage.setItem("hse_user", JSON.stringify(userData));
      onLogin(userData);
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }
  async function handleSetup(e) {
    e.preventDefault();
    if (!setupData.username || !setupData.email || !setupData.password) {
      setSetupMsg({ ok: false, msg: "Completa todos los campos." });
      return;
    }
    if (setupData.password !== setupData.confirm) {
      setSetupMsg({ ok: false, msg: "Las contraseñas no coinciden." });
      return;
    }
    setSetupLoading(true);
    setSetupMsg(null);
    try {
      const res = await fetch("http://localhost:4000/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: setupData.username.trim(),
          email: setupData.email.trim(),
          password: setupData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupMsg({
          ok: false,
          msg: data.error || "Error al crear usuario.",
        });
        return;
      }
      setSetupMsg({ ok: true, msg: data.message });
      setTimeout(() => {
        setSetupMode(false);
        setSetupMsg(null);
        setUsuario(setupData.username);
      }, 1500);
    } catch {
      setSetupMsg({ ok: false, msg: "No se pudo conectar con el servidor." });
    } finally {
      setSetupLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      {/* Grid de fondo */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148,163,184,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Orbes de color */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-0 right-1/3 w-64 h-64 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
        }}
      />
      {/* Contenedor principal */}
      <div
        className="relative z-10 w-full max-w-5xl mx-4 flex rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid rgba(148,163,184,0.12)" }}
      >
        {/* ── Panel izquierdo ── */}
        <div
          className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10"
          style={{
            background: "rgba(15,23,42,0.8)",
            borderRight: "1px solid rgba(148,163,184,0.1)",
          }}
        >
          {/* Logo + título */}
          <div>
            <div className="flex items-center gap-3 mb-10">
              <img
                src={logoSrc}
                alt="Logo"
                className="h-10 w-10 object-contain rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)", padding: "4px" }}
              />
              <div>
                <div className="text-white font-bold text-lg leading-tight">
                  Sistema HSE
                </div>
                <div className="text-slate-500 text-xs">
                  v2.0 · Plataforma de gestión
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              Gestión integral
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg,#3b82f6,#10b981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                de Seguridad HSE
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Plataforma unificada para el control de seguridad, salud
              ocupacional y medio ambiente.
            </p>
            {/* Módulos */}
            <div className="space-y-2">
              {MODULOS.map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 group transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* ICONO PNG */}
                  <img
                    src={icon}
                    alt={label}
                    className="w-5 h-5 object-contain"
                  />
                  <span className="text-slate-300 text-sm">{label}</span>
                  <svg
                    className="w-3 h-3 ml-auto text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
          {/* Footer */}
          <div className="text-xs text-slate-600 mt-8">
            Sistema HSE · Uso interno · Acceso restringido
          </div>
        </div>
        {/* ── Panel derecho ── */}
        <div
          className="flex-1 flex items-center justify-center p-8 lg:p-12"
          style={{
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="w-full max-w-sm">
            {/* Logo mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <img
                src={logoSrc}
                alt="Logo"
                className="h-9 w-9 object-contain"
              />
              <span className="text-white font-bold text-lg">Sistema HSE</span>
            </div>
            {!setupMode ? (
              /* ── Login form ── */
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Bienvenido
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Inicia sesión para continuar
                  </p>
                </div>
                {error && (
                  <div
                    className="mb-6 rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-3"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#fca5a5",
                    }}
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <DarkField
                    label="Usuario o correo electrónico"
                    type="text"
                    autoComplete="username"
                    placeholder="usuario o correo@empresa.com"
                    value={usuario}
                    onChange={(e) => {
                      setUsuario(e.target.value);
                      setError("");
                    }}
                  />

                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: "#94a3b8" }}
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all pr-11"
                        style={darkInputStyle}
                        onFocus={(e) =>
                          Object.assign(e.target.style, darkInputFocus)
                        }
                        onBlur={(e) =>
                          Object.assign(e.target.style, darkInputStyle)
                        }
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: "#64748b" }}
                      >
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setRecordar((v) => !v)}
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: recordar
                          ? "linear-gradient(135deg,#3b82f6,#10b981)"
                          : "rgba(255,255,255,0.05)",
                        border: recordar
                          ? "none"
                          : "1px solid rgba(148,163,184,0.2)",
                      }}
                    >
                      {recordar && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className="text-sm select-none cursor-pointer"
                      style={{ color: "#94a3b8" }}
                      onClick={() => setRecordar((v) => !v)}
                    >
                      Mantener sesión iniciada
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 mt-2"
                    style={{
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
                      boxShadow: "0 0 24px rgba(59,130,246,0.25)",
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <SpinnerIcon /> Verificando...
                      </span>
                    ) : (
                      "Ingresar al sistema →"
                    )}
                  </button>
                </form>

                <div
                  className="mt-8 pt-6 text-center"
                  style={{ borderTop: "1px solid rgba(148,163,184,0.08)" }}
                >
                  <p className="text-xs" style={{ color: "#475569" }}>
                    ¿Primera vez?{" "}
                    <button
                      onClick={() => {
                        setSetupMode(true);
                        setError("");
                      }}
                      className="font-semibold transition-colors hover:text-blue-400"
                      style={{ color: "#94a3b8" }}
                    >
                      Crear usuario administrador
                    </button>
                  </p>
                </div>
              </>
            ) : (
              /* ── Setup form ── */
              <>
                <div className="mb-8">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      color: "#93c5fd",
                      border: "1px solid rgba(59,130,246,0.3)",
                    }}
                  >
                    ✦ Primera configuración
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Crear administrador
                  </h3>
                  <p className="text-sm" style={{ color: "#64748b" }}>
                    Solo disponible cuando no hay usuarios registrados.
                  </p>
                </div>

                {setupMsg && (
                  <div
                    className="mb-5 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
                    style={
                      setupMsg.ok
                        ? {
                            background: "rgba(16,185,129,0.12)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            color: "#6ee7b7",
                          }
                        : {
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#fca5a5",
                          }
                    }
                  >
                    {setupMsg.ok ? "✓" : "⚠"} {setupMsg.msg}
                  </div>
                )}

                <form onSubmit={handleSetup} className="space-y-4">
                  <DarkField
                    label="Nombre de usuario"
                    type="text"
                    placeholder="admin"
                    value={setupData.username}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, username: e.target.value }))
                    }
                  />
                  <DarkField
                    label="Correo electrónico"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={setupData.email}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                  <DarkField
                    label="Contraseña"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={setupData.password}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                  <DarkField
                    label="Confirmar contraseña"
                    type="password"
                    placeholder="Repite la contraseña"
                    value={setupData.confirm}
                    onChange={(e) =>
                      setSetupData((p) => ({ ...p, confirm: e.target.value }))
                    }
                  />

                  <button
                    type="submit"
                    disabled={setupLoading}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 mt-2"
                    style={{
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
                      boxShadow: "0 0 24px rgba(59,130,246,0.25)",
                    }}
                  >
                    {setupLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <SpinnerIcon /> Creando...
                      </span>
                    ) : (
                      "Crear administrador →"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setSetupMode(false);
                      setSetupMsg(null);
                    }}
                    className="text-xs transition-colors hover:text-slate-300"
                    style={{ color: "#475569" }}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Estilos de input oscuro ──
const darkInputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(148,163,184,0.12)",
  color: "#f1f5f9",
};
const darkInputFocus = {
  background: "rgba(59,130,246,0.06)",
  border: "1px solid rgba(59,130,246,0.4)",
  color: "#f1f5f9",
  boxShadow: "0 0 0 3px rgba(59,130,246,0.1)",
};

function DarkField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "#94a3b8" }}
      >
        {label}
      </label>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
        style={darkInputStyle}
        onFocus={(e) => Object.assign(e.target.style, darkInputFocus)}
        onBlur={(e) => Object.assign(e.target.style, darkInputStyle)}
      />
    </div>
  );
}
