import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── HELPERS DE FORMATEO ──────────────────────────────────────────────────
export const get = (obj, ...keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return "";
};

export const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v).slice(0, 10);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fmtDateLong = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const rangeStart = (range) => {
  const now = new Date();
  const map = {
    Hoy: 0,
    "Últimos 7 días": 7,
    "Últimos 30 días": 30,
    "Últimos 90 días": 90,
    "Este año": null,
    Todo: null,
  };
  if (range === "Este año") return new Date(now.getFullYear(), 0, 1);
  if (map[range] == null) return null;
  const d = new Date(now);
  d.setDate(d.getDate() - map[range]);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const inRange = (dateStr, start) => {
  if (!start) return true;
  const d = new Date(dateStr);
  return !isNaN(d) && d >= start;
};

// ─── COMPONENTES INTERNOS DEL PDF (UI REUTILIZABLE) ────────────────────────
const addCover = (doc, title, subtitle, logoDataUrl, range) => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Header Oscuro
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 52, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, 8, 36, 36);
    } catch (err) {
      console.error("Error al cargar logo en PDF:", err);
    }
  }

  doc
    .setFont("helvetica", "bold")
    .setFontSize(20)
    .setTextColor(255)
    .text("Sistema HSE", pw / 2, 22, { align: "center" });
  doc
    .setFontSize(11)
    .setFont("helvetica", "normal")
    .setTextColor(203, 213, 225)
    .text("Gestión de Seguridad, Salud y Medio Ambiente", pw / 2, 32, {
      align: "center",
    });

  doc
    .setDrawColor(71, 85, 105)
    .setLineWidth(0.5)
    .line(14, 52, pw - 14, 52);

  // Título Central
  doc
    .setFont("helvetica", "bold")
    .setFontSize(22)
    .setTextColor(30, 41, 59)
    .text(title, pw / 2, 80, { align: "center" });
  doc
    .setFont("helvetica", "normal")
    .setFontSize(13)
    .setTextColor(100, 116, 139)
    .text(subtitle, pw / 2, 92, { align: "center" });

  // Cuadro de Periodo
  doc
    .setFillColor(241, 245, 249)
    .setDrawColor(203, 213, 225)
    .roundedRect(pw / 2 - 60, 104, 120, 44, 3, 3, "FD");
  doc
    .setFont("helvetica", "bold")
    .setFontSize(9)
    .setTextColor(71, 85, 105)
    .text("PERIODO SELECCIONADO", pw / 2, 114, { align: "center" });
  doc
    .setFont("helvetica", "normal")
    .setFontSize(11)
    .setTextColor(30, 41, 59)
    .text(range, pw / 2, 122, { align: "center" });
  doc
    .setFont("helvetica", "bold")
    .setFontSize(9)
    .setTextColor(71, 85, 105)
    .text("FECHA DE GENERACIÓN", pw / 2, 134, { align: "center" });
  doc
    .setFont("helvetica", "normal")
    .setFontSize(10)
    .setTextColor(30, 41, 59)
    .text(fmtDateLong(new Date()), pw / 2, 141, { align: "center" });

  doc
    .setFontSize(8)
    .setTextColor(148, 163, 184)
    .text("Documento confidencial — Uso interno", pw / 2, ph - 10, {
      align: "center",
    });
};

const addFooters = (doc) => {
  const total = doc.internal.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc
      .setDrawColor(203, 213, 225)
      .setLineWidth(0.3)
      .line(14, ph - 14, pw - 14, ph - 14);
    doc
      .setFontSize(8)
      .setTextColor(148, 163, 184)
      .text("Sistema HSE — Reporte Automático", 14, ph - 8);
    doc.text(`Página ${i} de ${total}`, pw - 14, ph - 8, { align: "right" });
  }
};

const addKpiSection = (doc, kpis, startY) => {
  const pw = doc.internal.pageSize.getWidth();
  const colW = (pw - 28) / kpis.length;
  kpis.forEach((k, i) => {
    const x = 14 + i * colW;
    doc
      .setFillColor(...(k.color || [241, 245, 249]))
      .roundedRect(x, startY, colW - 3, 26, 2, 2, "F");
    doc
      .setFont("helvetica", "bold")
      .setFontSize(7)
      .setTextColor(71, 85, 105)
      .text(k.label.toUpperCase(), x + (colW - 3) / 2, startY + 7, {
        align: "center",
      });
    doc
      .setFont("helvetica", "bold")
      .setFontSize(18)
      .setTextColor(...(k.numColor || [30, 41, 59]))
      .text(String(k.value), x + (colW - 3) / 2, startY + 20, {
        align: "center",
      });
  });
  return startY + 32;
};

const addSectionTitle = (doc, title, y) => {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(30, 41, 59).rect(14, y, pw - 28, 8, "F");
  doc
    .setFont("helvetica", "bold")
    .setFontSize(9)
    .setTextColor(255)
    .text(title.toUpperCase(), 18, y + 5.5);
  return y + 12;
};

// ─── GENERADORES PRINCIPALES ───────────────────────────────────────────────

export const generarPDFSeguridad = async ({
  incidentes,
  riesgos,
  inspecciones,
  capacitaciones,
  range,
  logoDataUrl,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addCover(
    doc,
    "Reporte de Seguridad HSE",
    "Incidentes · Riesgos · Inspecciones · Capacitaciones",
    logoDataUrl,
    range,
  );
  doc.addPage();

  let y = 20;
  const kpis = [
    {
      label: "Incidentes",
      value: incidentes.length,
      color: [254, 242, 242],
      numColor: [185, 28, 28],
    },
    {
      label: "Riesgos Crit.",
      value: riesgos.filter((r) => get(r, "nivel_riesgo") === "Crítico").length,
      color: [255, 251, 235],
      numColor: [180, 83, 9],
    },
    { label: "Insp. Totales", value: inspecciones.length },
    { label: "Capacitaciones", value: capacitaciones.length },
  ];
  y = addKpiSection(doc, kpis, y);

  // Tabla Incidentes
  y = addSectionTitle(doc, "Resumen de Incidentes", y);
  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Tipo", "Lugar", "Estado"]],
    body: incidentes.map((i) => [
      fmtDate(get(i, "fecha")),
      get(i, "tipo"),
      get(i, "lugar"),
      get(i, "estado"),
    ]),
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  // ── Sección Riesgos ──
  if (y > 230) {
    doc.addPage();
    y = 16;
  }
  y = addSectionTitle(doc, "Riesgos (IPERC)", y);
  if (riesgos.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay riesgos registrados.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [
        [
          "Área",
          "Peligro / Actividad",
          "Prob.",
          "Sev.",
          "Score",
          "Nivel",
          "Medida de control",
        ],
      ],
      body: riesgos.map((r) => {
        const prob = Number(get(r, "prob_res", "prob") ?? 0);
        const sev = Number(get(r, "sev_res", "severidad") ?? 0);
        const score = prob * sev;
        const nivel =
          score > 15
            ? "Crítico"
            : score > 9
              ? "Alto"
              : score > 4
                ? "Medio"
                : "Bajo";
        return [
          get(r, "area", "Area") || "—",
          String(get(r, "peligro", "actividad", "descripcion") || "—").slice(
            0,
            40,
          ),
          prob || "—",
          sev || "—",
          score || "—",
          nivel,
          String(get(r, "medida_control", "medidas", "control") || "—").slice(
            0,
            40,
          ),
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 5) {
          const v = data.cell.raw;
          if (v === "Crítico") data.cell.styles.textColor = [185, 28, 28];
          else if (v === "Alto") data.cell.styles.textColor = [194, 65, 12];
          else if (v === "Medio") data.cell.styles.textColor = [133, 77, 14];
          else data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Sección Inspecciones ──
  if (y > 230) {
    doc.addPage();
    y = 16;
  }
  y = addSectionTitle(doc, "Inspecciones", y);
  if (inspecciones.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay inspecciones registradas.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [
        ["Fecha", "Área", "Checklist / Responsable", "Estado", "Cumplimiento"],
      ],
      body: inspecciones.map((i) => {
        const cumpl = get(i, "cumplimiento", "Cumplimiento");
        return [
          fmtDate(get(i, "fecha", "Fecha")),
          get(i, "area", "Area") || "—",
          get(i, "checklist", "responsable", "Responsable") || "—",
          get(i, "status", "Status", "estado") || "—",
          cumpl != null ? `${Math.round(Number(cumpl))}%` : "—",
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Sección Capacitaciones ──
  if (y > 230) {
    doc.addPage();
    y = 16;
  }
  const today = new Date().toISOString().slice(0, 10);
  y = addSectionTitle(doc, "Capacitaciones", y);
  if (capacitaciones.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay capacitaciones registradas.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Persona", "Curso", "Fecha inicio", "Vencimiento", "Estado"]],
      body: capacitaciones.map((c) => {
        const vence = String(
          get(c, "fecha_vencimiento", "vencimiento", "FechaVence") ?? "",
        ).slice(0, 10);
        const estado = !vence
          ? "Sin fecha"
          : vence < today
            ? "Vencido"
            : "Vigente";
        return [
          get(c, "persona", "nombre", "Persona") || "—",
          get(c, "curso", "nombre_curso", "Curso") || "—",
          fmtDate(get(c, "fecha_inicio", "FechaInicio")),
          fmtDate(vence),
          estado,
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 4) {
          const v = data.cell.raw;
          if (v === "Vencido") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          } else if (v === "Vigente") {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });
  }

  addFooters(doc);
  doc.save(`Reporte_Seguridad_${new Date().getTime()}.pdf`);
};
// ─── helpers ambiental ────────────────────────────────────────────────────────
function computeFlag(m) {
  if (m.valor === null || m.valor === undefined) return "SIN VALOR";
  if (m.duplicado_de) return "DUPLICADO";
  if (m.valor === 0) return "CERO";
  return "OK";
}
export const generarPDFAmbiental = async ({
  importaciones,
  muestras,
  range,
  logoDataUrl,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addCover(
    doc,
    "Reporte Ambiental HSE",
    "Monitoreo de Calidad Ambiental",
    logoDataUrl,
    range,
  );
  doc.addPage();

  let y = 16;

  // ── Conteo por tipo (campos en minúsculas de la BD) ──
  const TIPOS = ["Agua", "Suelo", "Aire", "Ruido"];
  const porTipo = { Agua: 0, Suelo: 0, Aire: 0, Ruido: 0 };
  muestras.forEach((m) => {
    if (m.tipo in porTipo) porTipo[m.tipo]++;
  });

  const colorsMap = {
    Agua: { bg: [219, 234, 254], num: [29, 78, 216] },
    Suelo: { bg: [220, 252, 231], num: [22, 101, 52] },
    Aire: { bg: [241, 245, 249], num: [51, 65, 85] },
    Ruido: { bg: [254, 249, 195], num: [133, 77, 14] },
  };

  // ── Alertas ──
  const alertas = muestras.filter((m) => computeFlag(m) !== "OK");
  const alertasSinValor = alertas.filter(
    (m) => m.valor === null || m.valor === undefined,
  );
  const alertasDuplicado = alertas.filter((m) => m.duplicado_de);
  const alertasCero = alertas.filter((m) => m.valor === 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Resumen de Monitoreo Ambiental", 14, y);
  y += 8;

  // KPIs: total + 4 matrices
  y = addKpiSection(
    doc,
    [
      {
        label: "Total muestras",
        value: muestras.length,
        color: [241, 245, 249],
        numColor: [30, 41, 59],
      },
      ...TIPOS.map((t) => ({
        label: t,
        value: porTipo[t],
        color: colorsMap[t].bg,
        numColor: colorsMap[t].num,
      })),
    ],
    y,
  );

  // KPIs alertas
  y = addKpiSection(
    doc,
    [
      {
        label: "Total alertas",
        value: alertas.length,
        color: alertas.length > 0 ? [254, 226, 226] : [220, 252, 231],
        numColor: alertas.length > 0 ? [185, 28, 28] : [22, 101, 52],
      },
      {
        label: "Sin valor",
        value: alertasSinValor.length,
        color: [254, 226, 226],
        numColor: [185, 28, 28],
      },
      {
        label: "Duplicados (QC)",
        value: alertasDuplicado.length,
        color: [254, 249, 195],
        numColor: [133, 77, 14],
      },
      {
        label: "Valor cero",
        value: alertasCero.length,
        color: [255, 237, 213],
        numColor: [194, 65, 12],
      },
      {
        label: "Importaciones",
        value: importaciones.length,
        color: [241, 245, 249],
        numColor: [30, 41, 59],
      },
    ],
    y,
  );

  // ── Sección: Alertas ──
  if (alertas.length > 0) {
    if (y > 210) {
      doc.addPage();
      y = 16;
    }
    y = addSectionTitle(
      doc,
      `Alertas de calidad de datos (${alertas.length})`,
      y,
    );
    autoTable(doc, {
      startY: y,
      head: [["Tipo", "Fecha", "Punto", "Parámetro", "Laboratorio", "Alerta"]],
      body: alertas.map((m) => [
        m.tipo || "—",
        fmtDate(m.fecha),
        m.punto || "—",
        m.parametro || "—",
        m.laboratorio || "—",
        computeFlag(m),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 5) {
          const v = data.cell.raw;
          if (v === "SIN VALOR") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "DUPLICADO") {
            data.cell.styles.textColor = [133, 77, 14];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "CERO") {
            data.cell.styles.textColor = [194, 65, 12];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Sección: Importaciones ──
  if (y > 220) {
    doc.addPage();
    y = 16;
  }
  y = addSectionTitle(doc, "Importaciones registradas", y);
  if (importaciones.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay importaciones registradas.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["ID", "Archivo", "Fecha importación", "Total filas"]],
      body: importaciones.map((imp) => [
        imp.idImportacion ?? "—",
        imp.nombreArchivo ?? "—",
        fmtDate(imp.fechaImportacion),
        imp.totalFilas ?? "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Sección: detalle por tipo de matriz ──
  for (const tipo of TIPOS) {
    const rows = muestras.filter((m) => m.tipo === tipo);
    if (rows.length === 0) continue;

    if (y > 210) {
      doc.addPage();
      y = 16;
    }
    y = addSectionTitle(doc, `Muestras — ${tipo} (${rows.length})`, y);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Fecha",
          "Punto de muestreo",
          "Parámetro",
          "Valor",
          "Unidad",
          "Laboratorio",
          "Estado",
        ],
      ],
      body: rows.map((m) => {
        const flag = computeFlag(m);
        return [
          fmtDate(m.fecha),
          m.punto || "—",
          m.parametro || "—",
          m.valor != null ? String(m.valor) : "—",
          m.unidad || "—",
          m.laboratorio || "—",
          flag === "OK" ? "✓" : flag,
        ];
      }),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 6) {
          const v = data.cell.raw;
          if (v === "✓") {
            data.cell.styles.textColor = [22, 101, 52];
          }
          if (v === "SIN VALOR") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "DUPLICADO") {
            data.cell.styles.textColor = [133, 77, 14];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "CERO") {
            data.cell.styles.textColor = [194, 65, 12];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  addFooters(doc);
  doc.save(`Reporte_Ambiental_${new Date().getTime()}.pdf`);
};
function calcEstadoDocPdf(fechaVenc) {
  if (!fechaVenc) return "Sin fecha";
  const hoy = new Date();
  const venc = new Date(fechaVenc);
  const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "Vencido";
  if (dias <= 30) return "Por vencer";
  return "Vigente";
}
export const generarPDFResiduos = async ({
  registros,
  documentos,
  range,
  logoDataUrl,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addCover(
    doc,
    "Reporte de Gestión de Residuos",
    "Residuos Peligrosos y No Peligrosos",
    logoDataUrl,
    range,
  );
  doc.addPage();

  let y = 16;

  // ── Conteo por clasificación ──
  const porClasif = {
    Peligroso: 0,
    "No Peligroso - Aprovechable": 0,
    "No Peligroso - No Aprovechable": 0,
    RAEE: 0,
  };
  registros.forEach((r) => {
    if (r.clasificacion in porClasif) porClasif[r.clasificacion]++;
  });

  const totalKg = registros.reduce((s, r) => {
    if (r.unidad === "ton") return s + Number(r.cantidad) * 1000;
    if (r.unidad === "kg") return s + Number(r.cantidad);
    return s;
  }, 0);

  const docsVigentes = documentos.filter(
    (d) => calcEstadoDocPdf(d.fecha_vencimiento) === "Vigente",
  ).length;
  const docsPorVencer = documentos.filter(
    (d) => calcEstadoDocPdf(d.fecha_vencimiento) === "Por vencer",
  ).length;
  const docsVencidos = documentos.filter(
    (d) => calcEstadoDocPdf(d.fecha_vencimiento) === "Vencido",
  ).length;

  // ── Título resumen ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Resumen Ejecutivo — Gestión de Residuos", 14, y);
  y += 8;

  // KPI fila 1: total registros + clasificaciones
  y = addKpiSection(
    doc,
    [
      {
        label: "Total registros",
        value: registros.length,
        color: [219, 234, 254],
        numColor: [29, 78, 216],
      },
      {
        label: "Peligrosos",
        value: porClasif["Peligroso"],
        color: [254, 249, 195],
        numColor: [133, 77, 14],
      },
      {
        label: "Aprovechables",
        value: porClasif["No Peligroso - Aprovechable"],
        color: [220, 252, 231],
        numColor: [22, 101, 52],
      },
      {
        label: "No aprovechables",
        value: porClasif["No Peligroso - No Aprovechable"],
        color: [241, 245, 249],
        numColor: [51, 65, 85],
      },
      {
        label: "RAEE",
        value: porClasif["RAEE"],
        color: [254, 226, 226],
        numColor: [185, 28, 28],
      },
    ],
    y,
  );

  // KPI fila 2: total kg + documentos
  y = addKpiSection(
    doc,
    [
      {
        label: "Total generado (kg)",
        value: totalKg.toFixed(1),
        color: [237, 233, 254],
        numColor: [91, 33, 182],
      },
      {
        label: "Docs. vigentes",
        value: docsVigentes,
        color: [220, 252, 231],
        numColor: [22, 101, 52],
      },
      {
        label: "Docs. por vencer",
        value: docsPorVencer,
        color: [254, 249, 195],
        numColor: [133, 77, 14],
      },
      {
        label: "Docs. vencidos",
        value: docsVencidos,
        color: [254, 226, 226],
        numColor: [185, 28, 28],
      },
      {
        label: "Total documentos",
        value: documentos.length,
        color: [241, 245, 249],
        numColor: [30, 41, 59],
      },
    ],
    y,
  );

  // ── Tabla de registros de residuos ──
  if (y > 220) {
    doc.addPage();
    y = 16;
  }
  y = addSectionTitle(
    doc,
    `Registros de generación de residuos (${registros.length})`,
    y,
  );

  if (registros.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay registros en el periodo seleccionado.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [
        [
          "Fecha",
          "Área",
          "Tipo de residuo",
          "Clasificación",
          "Cantidad",
          "Transportista (EO-RS)",
          "N° Manifiesto",
        ],
      ],
      body: registros.map((r) => [
        fmtDate(r.fecha),
        r.area_generadora || "—",
        String(r.tipo_residuo || "—").slice(0, 35),
        r.clasificacion || "—",
        `${r.cantidad} ${r.unidad}`,
        String(r.empresa_transportista || "—").slice(0, 30),
        r.nro_manifiesto || "—",
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: {
        fillColor: [20, 83, 45],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 3) {
          const v = data.cell.raw;
          if (v === "Peligroso") {
            data.cell.styles.textColor = [133, 77, 14];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "RAEE") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
          if (
            v &&
            v.includes("Aprovechable") &&
            !v.includes("No Peligroso - No")
          ) {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
      columnStyles: { 2: { cellWidth: 45 }, 5: { cellWidth: 38 } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Top tipos de residuos ──
  const topMap = {};
  registros.forEach((r) => {
    topMap[r.tipo_residuo] = (topMap[r.tipo_residuo] || 0) + 1;
  });
  const top5 = Object.entries(topMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (top5.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 16;
    }
    y = addSectionTitle(doc, "Top 5 residuos más generados", y);
    autoTable(doc, {
      startY: y,
      head: [["#", "Tipo de residuo", "N° registros", "% del total"]],
      body: top5.map(([tipo, count], i) => [
        i + 1,
        tipo,
        count,
        `${((count / registros.length) * 100).toFixed(1)}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [20, 83, 45],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 12 },
        2: { halign: "center" },
        3: { halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Tabla de documentos ──
  if (y > 220) {
    doc.addPage();
    y = 16;
  }
  y = addSectionTitle(
    doc,
    `Documentos de gestión de residuos (${documentos.length})`,
    y,
  );

  if (documentos.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay documentos registrados.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [
        [
          "Documento",
          "Tipo",
          "N° Código",
          "Emisión",
          "Vencimiento",
          "Entidad",
          "Estado",
        ],
      ],
      body: documentos.map((d) => {
        const estado = calcEstadoDocPdf(d.fecha_vencimiento);
        return [
          String(d.nombre || "—").slice(0, 45),
          d.tipo || "—",
          d.numero_doc || "—",
          fmtDate(d.fecha_emision),
          fmtDate(d.fecha_vencimiento),
          String(d.entidad || "—").slice(0, 25),
          estado,
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [20, 83, 45],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 6) {
          const v = data.cell.raw;
          if (v === "Vigente") {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "Por vencer") {
            data.cell.styles.textColor = [133, 77, 14];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "Vencido") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
          if (v === "Sin fecha") {
            data.cell.styles.textColor = [100, 116, 139];
          }
        }
      },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 50 } },
    });
  }

  addFooters(doc);
  doc.save(`Reporte_Residuos_${new Date().getTime()}.pdf`);
};
