import * as XLSX from "xlsx"

function normalizeStr(v) {
  return String(v ?? "").trim()
}

function normKey(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("á", "a")
    .replaceAll("é", "e")
    .replaceAll("í", "i")
    .replaceAll("ó", "o")
    .replaceAll("ú", "u")
    .replaceAll("ü", "u")
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^a-z0-9_]/g, "")
}

function normalizeTipo(raw) {
  const s = normKey(raw)
  if (s.includes("agua") || s.includes("water")) return "Agua"
  if (s.includes("suelo") || s.includes("soil")) return "Suelo"
  if (s.includes("aire") || s.includes("air")) return "Aire"
  if (s.includes("ruido") || s.includes("noise") || s.includes("sonido")) return "Ruido"
  return normalizeStr(raw)
}

function normalizeLab(raw) {
  const s = normKey(raw)
  if (!s) return ""
  if (s.includes("int") || s.includes("intern") || s.includes("inhouse") || s.includes("in_house")) return "Interno"
  if (s.includes("ext") || s.includes("extern") || s.includes("outs") || s.includes("tercer")) return "Externo"
  return normalizeStr(raw)
}

function canonicalizeRow(r) {
  // Mapea headers comunes (con/sin tildes / espacios) a un schema fijo.
  const out = {}
  for (const [k, v] of Object.entries(r || {})) {
    const nk = normKey(k)
    const mapped =
      nk === "id" ||
      nk === "codigo" ||
      nk === "codigo_muestra" ||
      nk === "sample_id" ||
      nk === "sampleid"
        ? "id"
        :
      nk === "fecha" || nk === "date" || nk === "sampling_date" || nk === "fecha_muestreo"
        ? "fecha"
        : nk === "tipo" || nk === "matriz" || nk === "medio" || nk === "muestra_tipo"
          ? "tipo"
          : nk === "punto" || nk === "estacion" || nk === "site" || nk === "punto_muestreo" || nk === "ubicacion"
            ? "punto"
            : nk === "parametro" || nk === "parameter" || nk === "analito" || nk === "analite"
              ? "parametro"
              : nk === "laboratorio" || nk === "lab" || nk === "laboratorio_tipo"
                ? "laboratorio"
                : nk === "valor" || nk === "resultado" || nk === "result" || nk === "value"
                  ? "valor"
                  : nk === "unidad" || nk === "units" || nk === "unit"
                    ? "unidad"
                    : nk === "preservante" || nk === "preservacion"
                      ? "preservante"
                      : nk === "filtro" || nk === "filter" || nk === "filtro_id"
                        ? "filtro"
                        : nk === "sensor" || nk === "sensor_id" || nk === "sonometro" || nk === "equipo"
                          ? "sensor"
                          : nk === "retenida_h" || nk === "retencion_h" || nk === "retencion" || nk === "hold_h" || nk === "hold_time_h"
                            ? "retenida_h"
                            : nk === "duplicado_de" || nk === "dup_de" || nk === "duplicate_of" || nk === "duplicateof" || nk === "duplicado"
                              ? "duplicado_de"
                              : null

    if (mapped) out[mapped] = v
  }
  return out
}

function toISODate(v) {
  // Acepta "YYYY-MM-DD", Date, o serial Excel
  if (v instanceof Date) return v.toISOString().slice(0, 10)

  // Excel serial number
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d && d.y && d.m && d.d) {
      const yyyy = String(d.y).padStart(4, "0")
      const mm = String(d.m).padStart(2, "0")
      const dd = String(d.d).padStart(2, "0")
      return `${yyyy}-${mm}-${dd}`
    }
  }

  const s = normalizeStr(v)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const dd = String(m[1]).padStart(2, "0")
    const mm = String(m[2]).padStart(2, "0")
    const yyyy = String(m[3]).padStart(4, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  const dt = new Date(s)
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)

  return ""
}

function parseValor(raw) {
  // Normaliza valores:
  // - coma decimal: "1,25" -> 1.25
  // - ND / NA / N/A / — -> null
  // - <0.01 -> half-LOD (0.005) y flag
  const s0 = normalizeStr(raw)
  const s = s0.toUpperCase()
  if (!s0) return { value: null, flag: "VACIO", raw: s0 }
  if (["ND", "N/D", "NA", "N/A", "N.A", "--", "—", "-"].includes(s)) return { value: null, flag: "ND", raw: s0 }

  const lt = s0.match(/^<\s*([0-9]+([.,][0-9]+)?)$/)
  if (lt) {
    const lim = Number(String(lt[1]).replaceAll(",", "."))
    if (Number.isFinite(lim)) return { value: lim * 0.5, flag: "<LOD", raw: s0 }
  }

  // quita espacios; cambia coma por punto cuando no hay punto
  let t = s0.replaceAll(" ", "")
  if (t.includes(",") && !t.includes(".")) t = t.replaceAll(",", ".")
  // si viene con separador de miles tipo 1,234.56 o 1.234,56
  if (t.includes(",") && t.includes(".")) {
    // heurística: si el último separador es coma, coma es decimal
    const lastComma = t.lastIndexOf(",")
    const lastDot = t.lastIndexOf(".")
    if (lastComma > lastDot) {
      t = t.replaceAll(".", "").replaceAll(",", ".")
    } else {
      t = t.replaceAll(",", "")
    }
  }

  const num = Number(t)
  if (!Number.isFinite(num)) return { value: null, flag: "NO_NUM", raw: s0 }
  return { value: num, flag: "OK", raw: s0 }
}

function unitFromParam(param) {
  const p = normalizeStr(param)
  if (!p) return ""

  // Agua
  if (p === "pH") return ""
  if (p.toLowerCase().includes("conduct")) return "µS/cm"
  if (p.toLowerCase().includes("turb")) return "NTU"
  if (p.toLowerCase().includes("oxigen") || p.toLowerCase().includes("od")) return "mg/L"
  if (p.toLowerCase().includes("dbo")) return "mg/L"
  if (p.toLowerCase().includes("dqo")) return "mg/L"
  if (p.toLowerCase().includes("sst") || p.toLowerCase().includes("tss") || p.toLowerCase().includes("solidos")) return "mg/L"
  if (p.toLowerCase().includes("nitr")) return "mg/L"
  if (p.toLowerCase().includes("amon")) return "mg/L"
  if (p.toLowerCase().includes("aceite") || p.toLowerCase().includes("grasa")) return "mg/L"

  // Aire
  if (p.toUpperCase() === "PM10" || p.toUpperCase() === "PM2.5") return "µg/m³"
  if (["SO2", "NO2", "CO", "O3"].includes(p.toUpperCase())) return "µg/m³"

  // Ruido
  if (p.toLowerCase().includes("laeq") || p.toLowerCase().includes("lmax") || p.toLowerCase().includes("db")) return "dB"

  // Suelo
  if (p.toLowerCase().includes("materia_organica") || p.toLowerCase().includes("materia organica")) return "%"
  if (p.toLowerCase().includes("tph") || p.toLowerCase().includes("hidrocar")) return "mg/kg"

  // Metales típicos (por defecto)
  return "mg/L"
}

export default function EnvImportExcel({ onImport }) {
  const handleFile = async (file) => {
    const name = (file?.name || "").toLowerCase()
    let rows = []

    // timestamp base para generar IDs consistentes durante una importación
    const baseTs = Date.now()

    try {
      if (name.endsWith(".csv")) {
        const text = await file.text()
        const wb = XLSX.read(text, { type: "string" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" })
      } else {
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" })
      }
    } catch (e) {
      console.error("Error leyendo Excel:", e)
      alert("No se pudo leer el archivo. Verifica que sea .xlsx o .csv válido.")
      return
    }

    // Columnas (mínimas): fecha, tipo, punto, parametro, laboratorio, valor
    const accepted = []
    const rejected = []

    // Detectar estrategia de IDs
    const canonRows = rows.map((r) => canonicalizeRow(r))
    const anyId = canonRows.some((r) => normalizeStr(r.id))
    const legacyDup = canonRows.some((r) => /^ENV-\d+$/i.test(normalizeStr(r.duplicado_de)))

    // Pre-asigna IDs y crea un mapping para duplicados
    const idMap = new Map() // oldId -> newId
    for (let i = 0; i < canonRows.length; i++) {
      const r = canonRows[i]
      const oldId = normalizeStr(r.id)
      const newId = anyId
        ? oldId
        : legacyDup
          ? `ENV-${i + 1}`
          : `ENV-${baseTs}-${i}`
      if (oldId) idMap.set(oldId, newId)
      // también mapea ids legacy (ENV-#) aunque no venga columna id
      if (!oldId && legacyDup) idMap.set(`ENV-${i + 1}`, `ENV-${i + 1}`)
    }

    for (let i = 0; i < rows.length; i++) {
      const raw = canonRows[i]

      const fecha = toISODate(raw.fecha)
      const tipo = normalizeTipo(raw.tipo)
      const punto = normalizeStr(raw.punto)
      const parametro = normalizeStr(raw.parametro)
      const laboratorio = normalizeLab(raw.laboratorio)
      const pv = parseValor(raw.valor)
      const valorNum = pv.value

      const unidad = normalizeStr(raw.unidad) || unitFromParam(parametro)
      const dupRaw = normalizeStr(raw.duplicado_de)
      const duplicado_de = dupRaw ? (idMap.get(dupRaw) || dupRaw) : null
      const retenida_h = raw.retenida_h === "" || raw.retenida_h == null ? 48 : Number(raw.retenida_h)

      const preservanteRaw = normalizeStr(raw.preservante)
      const filtroRaw = normalizeStr(raw.filtro)
      const sensorRaw = normalizeStr(raw.sensor)

      const ok =
        fecha &&
        tipo &&
        punto &&
        parametro &&
        (laboratorio === "Interno" || laboratorio === "Externo") &&
        Number.isFinite(valorNum)

      if (!ok) {
        let motivo = "Campos inválidos o faltantes"
        if (!fecha) motivo = "Fecha inválida"
        else if (!tipo) motivo = "Tipo inválido"
        else if (!punto) motivo = "Punto inválido"
        else if (!parametro) motivo = "Parámetro inválido"
        else if (!(laboratorio === "Interno" || laboratorio === "Externo")) motivo = "Laboratorio inválido"
        else if (!Number.isFinite(valorNum)) motivo = `Valor no numérico (${pv.flag})`
        rejected.push({ row: i + 2, motivo, data: rows[i] })
        continue
      }

      const rowId = anyId
        ? normalizeStr(raw.id)
        : legacyDup
          ? `ENV-${i + 1}`
          : `ENV-${baseTs}-${i}`

      accepted.push({
        id: rowId,
        fecha,
        tipo,
        punto,
        parametro,
        laboratorio,
        valor: valorNum,
        unidad,
        valor_raw: pv.raw,
        valor_flag: pv.flag,
        preservante: preservanteRaw || (tipo === "Agua" || tipo === "Suelo" ? "Preservante aplicado" : "—"),
        filtro: filtroRaw || (tipo === "Aire" ? "Filtro F-001" : "—"),
        sensor: sensorRaw || (tipo === "Ruido" ? "Sensor S-12" : "—"),
        retenida_h: Number.isFinite(retenida_h) ? retenida_h : 48,
        duplicado_de,
      })
    }

    onImport({ accepted, rejected })
  }

  return (
    <div className="flex items-center gap-2">
      <label className="px-4 py-2 rounded border hover:bg-slate-50 cursor-pointer">
        Importar Excel/CSV
        <input
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </label>
    </div>
  )
}
