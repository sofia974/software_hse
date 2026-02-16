import { useEffect, useMemo, useState } from "react"

function normalizeStr(v) {
  return String(v ?? "").trim()
}

function parseValor(raw) {
  // Lógica:
  // - coma decimal
  // - <0.01 => half-LOD
  // - ND/NA => inválido
  const s0 = normalizeStr(raw)
  const s = s0.toUpperCase()
  if (!s0) return { value: null, flag: "VACIO", raw: s0 }
  if (["ND", "N/D", "NA", "N/A", "N.A", "--", "—", "-"].includes(s)) return { value: null, flag: "ND", raw: s0 }

  const lt = s0.match(/^<\s*([0-9]+([.,][0-9]+)?)$/)
  if (lt) {
    const lim = Number(String(lt[1]).replaceAll(",", "."))
    if (Number.isFinite(lim)) return { value: lim * 0.5, flag: "<LOD", raw: s0 }
  }

  let t = s0.replaceAll(" ", "")
  if (t.includes(",") && !t.includes(".")) t = t.replaceAll(",", ".")
  if (t.includes(",") && t.includes(".")) {
    const lastComma = t.lastIndexOf(",")
    const lastDot = t.lastIndexOf(".")
    if (lastComma > lastDot) t = t.replaceAll(".", "").replaceAll(",", ".")
    else t = t.replaceAll(",", "")
  }

  const num = Number(t)
  if (!Number.isFinite(num)) return { value: null, flag: "NO_NUM", raw: s0 }
  return { value: num, flag: "OK", raw: s0 }
}

export default function EnvSampleModal({ open, onClose, onSave, catalogs, defaultValues }) {
  const [tipo, setTipo] = useState("Agua")
  const [punto, setPunto] = useState("Punto A-01")
  const [parametro, setParametro] = useState("Arsénico")
  const [laboratorio, setLaboratorio] = useState("Interno")
  const [fecha, setFecha] = useState("")
  const [valor, setValor] = useState("")
  const [unidad, setUnidad] = useState("")
  const [preservante, setPreservante] = useState("")
  const [filtroId, setFiltroId] = useState("")
  const [sensorId, setSensorId] = useState("")
  const [duplicadoDe, setDuplicadoDe] = useState("")
  const [retenidaH, setRetenidaH] = useState(48)

  useEffect(() => {
    if (!open) return

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    setFecha(`${yyyy}-${mm}-${dd}`)

    setTipo(defaultValues?.tipo || "Agua")
    setPunto(defaultValues?.punto || "Punto A-01")
    setParametro(defaultValues?.parametro || "pH")
    setLaboratorio(defaultValues?.laboratorio || "Interno")
    setValor("")
    setDuplicadoDe("")
    setRetenidaH(48)
  }, [open, defaultValues])

  const puntos = useMemo(() => {
    const byTipo = catalogs?.puntosByTipo?.[tipo]
    return (byTipo && byTipo.length ? byTipo : catalogs?.puntos) || ["Punto A-01"]
  }, [catalogs, tipo])

  const parametros = useMemo(() => {
    const byTipo = catalogs?.parametrosByTipo?.[tipo]
    return (byTipo && byTipo.length ? byTipo : catalogs?.parametros) || ["pH"]
  }, [catalogs, tipo])

  // Corrige selections si el tipo cambia y el valor actual queda fuera del catálogo
  useEffect(() => {
    if (!open) return
    if (puntos.length && !puntos.includes(punto)) setPunto(puntos[0])
  }, [open, puntos, punto])

  useEffect(() => {
    if (!open) return
    if (parametros.length && !parametros.includes(parametro)) setParametro(parametros[0])
  }, [open, parametros, parametro])

  function unitFromParam(p) {
    const s = String(p || "").trim()
    const lower = s.toLowerCase()

    // Agua
    if (s === "pH") return ""
    if (lower.includes("conduct")) return "µS/cm"
    if (lower.includes("turb")) return "NTU"
    if (lower.includes("oxigen") || lower === "od") return "mg/L"
    if (lower.includes("dbo")) return "mg/L"
    if (lower.includes("dqo")) return "mg/L"
    if (lower.includes("sst") || lower.includes("tss") || lower.includes("solidos")) return "mg/L"
    if (lower.includes("nitr")) return "mg/L"
    if (lower.includes("amon")) return "mg/L"
    if (lower.includes("aceite") || lower.includes("grasa")) return "mg/L"

    // Aire
    if (s.toUpperCase() === "PM10" || s.toUpperCase() === "PM2.5") return "µg/m³"
    if (["SO2", "NO2", "CO", "O3"].includes(s.toUpperCase())) return "µg/m³"

    // Ruido
    if (lower.includes("laeq") || lower.includes("lmax") || lower.includes("db")) return "dB"

    // Suelo
    if (lower.includes("materia organica") || lower.includes("materia_organica")) return "%"
    if (lower.includes("tph") || lower.includes("hidrocar")) return "mg/kg"

    // Por defecto
    return "mg/L"
  }

  const computedUnit = useMemo(() => unitFromParam(parametro), [parametro])

  useEffect(() => {
    setUnidad(computedUnit)
  }, [computedUnit])

  // Reglas UX: preservante / filtro / sensor según tipo
  useEffect(() => {
    if (tipo === "Agua" || tipo === "Suelo") {
      setPreservante("Preservante aplicado")
      setFiltroId("")
      setSensorId("")
    } else if (tipo === "Aire") {
      setPreservante("")
      setFiltroId("Filtro F-001")
      setSensorId("")
    } else if (tipo === "Ruido") {
      setPreservante("")
      setFiltroId("")
      setSensorId("Sensor S-12")
    }
  }, [tipo])

  const canSave = fecha && punto && parametro && laboratorio && String(valor).trim() !== ""

  const handleSave = () => {
    if (!canSave) return
    const pv = parseValor(valor)
    const v = pv.value
    if (!Number.isFinite(v)) {
      alert(`Valor inválido (${pv.flag}). Ingresa un número (ej: 1.25, 1,25 o <0.01).`)
      return
    }

    const id = `ENV-${Date.now()}`
    onSave({
      id,
      tipo,
      punto,
      parametro,
      laboratorio,
      fecha,
      valor: v,
      unidad,
      valor_raw: pv.raw,
      valor_flag: pv.flag,
      preservante: preservante || "—",
      filtro: filtroId || "—",
      sensor: sensorId || "—",
      retenida_h: Number(retenidaH) || 48,
      duplicado_de: duplicadoDe || null,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Nueva muestra ambiental</div>
            <div className="text-xs text-slate-500">Registro para tendencia y reporte</div>
          </div>
          <button className="px-3 py-1 rounded border hover:bg-slate-50" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Tipo</div>
            <select className="w-full border rounded px-3 py-2" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Agua</option>
              <option>Suelo</option>
              <option>Aire</option>
              <option>Ruido</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Laboratorio</div>
            <select className="w-full border rounded px-3 py-2" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)}>
              <option>Interno</option>
              <option>Externo</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Punto</div>
            <select className="w-full border rounded px-3 py-2" value={punto} onChange={(e) => setPunto(e.target.value)}>
              {puntos.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Parámetro</div>
            <select className="w-full border rounded px-3 py-2" value={parametro} onChange={(e) => setParametro(e.target.value)}>
              {parametros.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Fecha</div>
            <input className="w-full border rounded px-3 py-2" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Valor</div>
            <div className="flex gap-2">
              <input
                className="w-full border rounded px-3 py-2"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ej: 0.008"
              />
              <div className="min-w-20 border rounded px-3 py-2 bg-slate-50 text-slate-600 text-sm flex items-center justify-center">
                {unidad}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Retención (horas)</div>
            <input className="w-full border rounded px-3 py-2" value={retenidaH} onChange={(e) => setRetenidaH(e.target.value)} placeholder="48" />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Duplicado de (opcional)</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={duplicadoDe}
              onChange={(e) => setDuplicadoDe(e.target.value)}
              placeholder="ID de muestra original (auditoría)"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Detalles (auto según tipo)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="border rounded px-3 py-2 bg-slate-50 text-sm">
                <div className="text-xs text-slate-500">Preservante</div>
                <div className="text-slate-700">{preservante || "—"}</div>
              </div>
              <div className="border rounded px-3 py-2 bg-slate-50 text-sm">
                <div className="text-xs text-slate-500">Filtro</div>
                <div className="text-slate-700">{filtroId || "—"}</div>
              </div>
              <div className="border rounded px-3 py-2 bg-slate-50 text-sm">
                <div className="text-xs text-slate-500">Sensor</div>
                <div className="text-slate-700">{sensorId || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button className="px-4 py-2 rounded border hover:bg-slate-50" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`px-4 py-2 rounded text-white ${canSave ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-300 cursor-not-allowed"}`}
            onClick={handleSave}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
