import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSrc from "../assets/logo.png";
import toast from "react-hot-toast";

// ─── helpers ────────────────────────────────────────────────────────────────
function get(obj, ...keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return "";
}

function fmtDate(v) {
  if (!v) return "—";

  // 👇 evita problema de zona horaria
  const d = new Date(v + "T00:00:00");

  if (isNaN(d)) return String(v).slice(0, 10);

  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateLong(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function rangeStart(range) {
  const now = new Date();
  const map = {
    Hoy: 0,
    "Últimos 7 días": 7,
    "Últimos 30 días": 30,
    "Últimos 90 días": 90,
    "Este año": null,
    Todo: null,
  };
  if (range === "Este año") {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (map[range] == null || map[range] === null) return null;
  const d = new Date(now);
  d.setDate(d.getDate() - map[range]);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inRange(dateStr, start) {
  if (!start) return true;
  const d = new Date(dateStr);
  return !isNaN(d) && d >= start;
}

// ─── PDF builder: portada ────────────────────────────────────────────────────
function addCover(doc, title, subtitle, logoDataUrl, range) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Fondo header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pw, 52, "F");

  // Logo
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, 8, 36, 36);
    } catch (err) {
      console.error("Error cargando logo en PDF:", err);
    }
  }

  // Título empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Sistema HSE", pw / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Gestión de Seguridad, Salud y Medio Ambiente", pw / 2, 32, {
    align: "center",
  });

  // Línea separadora
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.line(14, 52, pw - 14, 52);

  // Título del reporte
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text(title, pw / 2, 80, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, pw / 2, 92, { align: "center" });

  // Recuadro de metadatos
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pw / 2 - 60, 104, 120, 44, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("PERIODO", pw / 2, 114, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(range, pw / 2, 122, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("GENERADO", pw / 2, 134, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(fmtDateLong(new Date()), pw / 2, 141, { align: "center" });

  // Footer portada
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento confidencial — Uso interno", pw / 2, ph - 10, {
    align: "center",
  });
}

// ─── PDF builder: sección KPI ────────────────────────────────────────────────
function addKpiSection(doc, kpis, startY) {
  const pw = doc.internal.pageSize.getWidth();
  const colW = (pw - 28) / kpis.length;

  kpis.forEach((k, i) => {
    const x = 14 + i * colW;
    // fondo
    doc.setFillColor(...(k.color ?? [241, 245, 249]));
    doc.roundedRect(x, startY, colW - 3, 26, 2, 2, "F");
    // label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(k.label.toUpperCase(), x + (colW - 3) / 2, startY + 7, {
      align: "center",
    });
    // valor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...(k.numColor ?? [30, 41, 59]));
    doc.text(String(k.value), x + (colW - 3) / 2, startY + 20, {
      align: "center",
    });
  });

  return startY + 32;
}

// ─── PDF builder: título de sección ──────────────────────────────────────────
function addSectionTitle(doc, title, y) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pw - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), 18, y + 5.5);
  return y + 12;
}

// ─── PDF builder: pie de página ──────────────────────────────────────────────
function addFooters(doc) {
  const total = doc.internal.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, ph - 14, pw - 14, ph - 14);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Sistema HSE — Documento confidencial", 14, ph - 8);
    doc.text(`Página ${i} de ${total}`, pw - 14, ph - 8, { align: "right" });
  }
}

// ─── Generar PDF Seguridad ────────────────────────────────────────────────────
async function generarPDFSeguridad({
  incidentes,
  riesgos,
  inspecciones,
  capacitaciones,
  range,
  logoDataUrl,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Portada ──
  addCover(
    doc,
    "Reporte de Seguridad HSE",
    "Incidentes · Riesgos · Inspecciones · Capacitaciones",
    logoDataUrl,
    range,
  );

  // ── Página 2: KPIs + tablas ──
  doc.addPage();

  const today = new Date().toISOString().slice(0, 10);
  const capVencidas = capacitaciones.filter((c) => {
    const v = String(
      get(c, "fecha_vencimiento", "vencimiento", "FechaVence") ?? "",
    ).slice(0, 10);
    return v && v < today;
  }).length;
  const riegosCrit = riesgos.filter((r) => {
    const prob = Number(
      get(r, "prob_res", "probabilidad_residual", "prob") ?? 0,
    );
    const sev = Number(
      get(r, "sev_res", "severidad_residual", "severidad") ?? 0,
    );
    return prob * sev > 15;
  }).length;

  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Resumen Ejecutivo", 14, y);
  y += 8;

  y = addKpiSection(
    doc,
    [
      {
        label: "Incidentes",
        value: incidentes.length,
        color: [254, 226, 226],
        numColor: [185, 28, 28],
      },
      {
        label: "Riesgos críticos",
        value: riegosCrit,
        color: [255, 237, 213],
        numColor: [194, 65, 12],
      },
      {
        label: "Inspecciones",
        value: inspecciones.length,
        color: [219, 234, 254],
        numColor: [29, 78, 216],
      },
      {
        label: "Capacitaciones vencidas",
        value: capVencidas,
        color: [254, 249, 195],
        numColor: [133, 77, 14],
      },
    ],
    y,
  );

  // ── Sección Incidentes ──
  y = addSectionTitle(doc, "Incidentes registrados", y);
  if (incidentes.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("No hay incidentes en el periodo seleccionado.", 18, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Código", "Fecha", "Tipo", "Área", "Severidad", "Descripción"]],
      body: incidentes.map((i) => [
        get(i, "Codigo", "codigo", "id") || "—",
        fmtDate(get(i, "Fecha", "fecha")),
        get(i, "Tipo", "tipo") || "—",
        get(i, "Area", "area") || "—",
        get(i, "Severidad", "severidad") || "—",
        String(
          get(i, "Descripcion", "descripcion", "description") || "—",
        ).slice(0, 60),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 5: { cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

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
  doc.save(
    `Reporte_Seguridad_HSE_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}

// ─── helpers ambiental ────────────────────────────────────────────────────────
function computeFlag(m) {
  if (m.valor === null || m.valor === undefined) return "SIN VALOR";
  if (m.duplicado_de) return "DUPLICADO";
  if (m.valor === 0) return "CERO";
  return "OK";
}

// ─── Generar PDF Ambiental ────────────────────────────────────────────────────
async function generarPDFAmbiental({
  importaciones,
  muestras,
  range,
  logoDataUrl,
}) {
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
  doc.save(
    `Reporte_Ambiental_HSE_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}

// ─── Generar PDF Residuos ─────────────────────────────────────────────────────
async function generarPDFResiduos({
  registros,
  documentos,
  range,
  logoDataUrl,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addCover(
    doc,
    "Reporte de Gestión de Residuos",
    "D.L. N°1278 · D.S. 014-2017-MINAM · D.S. 040-2014-EM",
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
  doc.save(`Reporte_Residuos_HSE_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function calcEstadoDocPdf(fechaVenc) {
  if (!fechaVenc) return "Sin fecha";
  const hoy = new Date();
  const venc = new Date(fechaVenc);
  const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "Vencido";
  if (dias <= 30) return "Por vencer";
  return "Vigente";
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Reports() {
  const [range, setRange] = useState("Últimos 30 días");
  const [loadingSeg, setLoadingSeg] = useState(false);
  const [loadingAmb, setLoadingAmb] = useState(false);
  const [loadingRes, setLoadingRes] = useState(false);
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  // Cargar logo como dataURL
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  // Seleccionar la Empresa
  const [selectedEmpresa, setSelectedEmpresa] = useState("Todas");
  const filtrarPorEmpresa = (data, campo = "nombreEmpresa") => {
    if (selectedEmpresa === "Todas") return data;
    return data.filter((item) => item[campo] === selectedEmpresa);
  };
  const capacitacionesFiltradas = filtrarPorEmpresa(
    preview?.capacitaciones || [],
  );
  const incidentesFiltrados = filtrarPorEmpresa(preview?.incidentes || []);
  const riesgosFiltrados = filtrarPorEmpresa(preview?.riesgos || []);
  const inspeccionesFiltradas = filtrarPorEmpresa(preview?.inspecciones || []);
  const registrosFiltrados = filtrarPorEmpresa(preview?.registros || []);
  const muestrasFiltradas = filtrarPorEmpresa(preview?.muestras || []);
  const importacionesFiltradas = filtrarPorEmpresa(
    preview?.importaciones || [],
  );
  // 1. Definimos una función auxiliar para no repetir código del token
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };
  const getEmpresasDisponibles = () => {
    if (!preview) return ["Todas"];
    let empresas = [];
    if (preview.type === "seguridad") {
      empresas = [
        ...(preview.incidentes?.map((i) => i.nombreEmpresa) || []),
        ...(preview.riesgos?.map((r) => r.nombreEmpresa) || []),
        ...(preview.inspecciones?.map((i) => i.nombreEmpresa) || []),
        ...(preview.capacitaciones?.map((c) => c.nombreEmpresa) || []),
      ];
    } else if (preview.type === "residuos") {
      empresas = [
        ...(preview.registros?.map((r) => r.nombreEmpresa) || []),
        ...(preview.documentos?.map((d) => d.nombreEmpresa) || []),
      ];
      console.log("REGISTROS:", preview.registros);
      console.log("DOCUMENTOS:", preview.documentos);
    } else if (preview.type === "ambiental") {
      empresas = [
        ...(preview.muestras?.map((i) => i.nombreEmpresa) || []),
        ...(preview.importaciones?.map((r) => r.nombreEmpresa) || []),
      ];
    }
    const unicas = [
      ...new Set(empresas.filter((e) => e && String(e).trim() !== "")),
    ];
    return ["Todas", ...unicas];
  };

  useEffect(() => {
    fetch(logoSrc)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => setLogoDataUrl(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => setLogoDataUrl(null));
  }, []);
  async function fetchSeguridad() {
    const res = await fetch("http://localhost:4000/api/reportes/seguridad", {
      headers: getAuthHeaders(),
    });

    const data = await res.json();

    const start = rangeStart(range);

    return {
      incidentes: (data.incidentes || []).filter((i) =>
        inRange(get(i, "Fecha"), start),
      ),
      riesgos: (data.riesgos || []).filter((i) =>
        inRange(get(i, "fecha_registro"), start),
      ),
      inspecciones: (data.inspecciones || []).filter((i) =>
        inRange(get(i, "Fecha"), start),
      ),
      capacitaciones: (data.capacitaciones || []).filter((i) =>
        inRange(get(i, "fecha"), start),
      ),
    };
  }
  async function fetchResiduos() {
    const res = await fetch("http://localhost:4000/api/reportes/residuos", {
      headers: getAuthHeaders(),
    });

    const data = await res.json();

    const start = rangeStart(range);

    const registros = (data.registros || []).filter((i) =>
      inRange(get(i, "fecha"), start),
    );

    const documentos = (data.documentos || []).filter((i) =>
      inRange(get(i, "fecha_emision"), start),
    );

    return { registros, documentos };
  }

  async function fetchAmbiental() {
    const res = await fetch("http://localhost:4000/api/reportes/ambiental", {
      headers: getAuthHeaders(),
    });

    const data = await res.json();

    const start = rangeStart(range);

    return {
      importaciones: (data.importaciones || []).filter((i) =>
        inRange(get(i, "fechaImportacion"), start),
      ),
      muestras: (data.muestras || []).filter((i) =>
        inRange(get(i, "fecha"), start),
      ),
    };
  }
  async function handlePreview(type) {
    setLoadingPreview(true);
    setPreview(null);

    try {
      let data;

      if (type === "seguridad") {
        data = await fetchSeguridad();
      } else if (type === "ambiental") {
        data = await fetchAmbiental();
      } else {
        data = await fetchResiduos(); // el tuyo ya funciona
      }

      setPreview({ type, ...data });
    } catch {
      setStatus({ ok: false, msg: "No se pudo cargar la vista previa." });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleGenerarSeguridad() {
    setLoadingSeg(true);
    setStatus(null);
    try {
      const dataFiltrada = {
        incidentes: filtrarPorEmpresa(preview?.incidentes || []),
        riesgos: filtrarPorEmpresa(preview?.riesgos || []),
        inspecciones: filtrarPorEmpresa(preview?.inspecciones || []),
        capacitaciones: filtrarPorEmpresa(preview?.capacitaciones || []),
      };
      await generarPDFSeguridad({
        ...dataFiltrada,
        range,
        logoDataUrl,
      });
      setStatus({
        ok: true,
        msg: "Reporte de Seguridad generado y descargado correctamente.",
      });
      toast.success(
        "¡Reporte de Seguridad generado y descargado correctamente.!",
      );
    } catch (err) {
      console.error(err);
      setStatus({
        ok: false,
        msg: "Error al generar el reporte. Verifica la conexión al servidor.",
      });
      toast.error("Hubo un error al intentar generar el reporte.");
    } finally {
      setLoadingSeg(false);
    }
  }

  async function handleGenerarResiduos() {
    setLoadingRes(true);
    setStatus(null);
    try {
      // const data = await fetchResiduos();
      const dataFiltrada = {
        registros: filtrarPorEmpresa(preview?.registros || []),
        documentos: filtrarPorEmpresa(preview?.documentos || []),
      };

      await generarPDFResiduos({ ...dataFiltrada, range, logoDataUrl });
      setStatus({
        ok: true,
        msg: "Reporte de Residuos generado y descargado correctamente.",
      });
      toast.success(
        "¡Reporte de Residuos generado y descargado correctamente.!",
      );
    } catch (err) {
      console.error(err);
      setStatus({
        ok: false,
        msg: "Error al generar el reporte. Verifica la conexión al servidor.",
      });
      toast.error("Hubo un error al intentar generar el reporte.");
    } finally {
      setLoadingRes(false);
    }
  }

  async function handleGenerarAmbiental() {
    setLoadingAmb(true);
    setStatus(null);
    try {
      // const data = await fetchAmbiental();
      const dataFiltrada = {
        importaciones: filtrarPorEmpresa(preview?.importaciones || []),
        muestras: filtrarPorEmpresa(preview?.muestras || []),
      };
      await generarPDFAmbiental({ ...dataFiltrada, range, logoDataUrl });
      setStatus({
        ok: true,
        msg: "Reporte Ambiental generado y descargado correctamente.",
      });
      toast.success("¡Reporte Ambiental generado y descargado correctamente.!");
    } catch (err) {
      console.error(err);
      setStatus({
        ok: false,
        msg: "Error al generar el reporte. Verifica la conexión al servidor.",
      });
      toast.error("Hubo un error al intentar generar el reporte.");
    } finally {
      setLoadingAmb(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes HSE</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Generación de reportes en PDF con datos reales del sistema
          </p>
        </div>
        {/* Filtro de periodo */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Periodo
          </span>
          <select
            className="border-0 text-sm font-medium text-slate-800 focus:ring-0 bg-transparent"
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setPreview(null);
            }}
          >
            <option>Hoy</option>
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Últimos 90 días</option>
            <option>Este año</option>
            <option>Todo</option>
          </select>
        </div>
      </div>

      {/* Status banner */}
      {status && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center justify-between ${
            status.ok ? "bg-green-700 text-white" : "bg-red-700 text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            {status.ok ? (
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            )}
            {status.msg}
          </span>
          <button
            onClick={() => setStatus(null)}
            className="ml-4 opacity-70 hover:opacity-100"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Cards de reporte */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2.5 rounded-lg">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Reporte de Seguridad
                </h3>
                <p className="text-slate-300 text-xs mt-0.5">
                  Incidentes · Riesgos IPERC · Inspecciones · Capacitaciones
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <ul className="text-sm text-slate-600 space-y-1.5">
              {[
                "Portada con logo de empresa",
                "KPIs resumen ejecutivo",
                "Tabla de incidentes del periodo",
                "Matriz de riesgos residuales",
                "Cumplimiento de inspecciones",
                "Estado de capacitaciones",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handlePreview("seguridad")}
                disabled={loadingPreview || loadingSeg}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Vista previa
              </button>
              <button
                onClick={handleGenerarSeguridad}
                disabled={loadingSeg || loadingAmb}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
              >
                {loadingSeg ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Generando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Descargar PDF
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Reporte Residuos ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className="px-5 py-4"
            style={{
              background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl bg-white/10 p-2 rounded-lg">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Reporte de Residuos
                </h3>
                <p className="text-green-200 text-xs mt-0.5">
                  D.L. 1278 · Registros · Documentos · Clasificación
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <ul className="text-sm text-slate-600 space-y-1.5">
              {[
                "Portada con logo y normativa vigente",
                "KPIs: total, peligrosos, aprovechables, RAEE",
                "Total generado en kg",
                "Tabla de registros de generación por periodo",
                "Top 5 tipos de residuos más frecuentes",
                "Estado de documentos (vigente / vencido)",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handlePreview("residuos")}
                disabled={loadingPreview || loadingRes}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Vista previa
              </button>
              <button
                onClick={handleGenerarResiduos}
                disabled={loadingRes || loadingSeg || loadingAmb}
                className="flex-1 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                style={{
                  background: "linear-gradient(135deg, #14532d, #166534)",
                }}
              >
                {loadingRes ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Generando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Descargar PDF
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Reporte Ambiental ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2.5 rounded-lg">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Reporte Ambiental
                </h3>
                <p className="text-emerald-200 text-xs mt-0.5">
                  Muestras de agua · suelo · aire · ruido
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <ul className="text-sm text-slate-600 space-y-1.5">
              {[
                "Portada con logo de empresa",
                "KPIs: conteo por Agua / Suelo / Aire / Ruido",
                "Alertas: muestras sin valor, duplicados, cero",
                "Registro de importaciones (archivo, fecha, filas)",
                "Tabla por tipo de matriz con estado de dato",
                "Detalle de parámetros y laboratorio",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handlePreview("ambiental")}
                disabled={loadingPreview || loadingAmb}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Vista previa
              </button>
              <button
                onClick={handleGenerarAmbiental}
                disabled={loadingAmb || loadingSeg}
                className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
              >
                {loadingAmb ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Generando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Descargar PDF
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vista previa */}
      {(loadingPreview || preview) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Selector de Empresa */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Filtrar por Empresa:
            </label>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              className=" border rounded-xl px-3 py-2"
            >
              {getEmpresasDisponibles().map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
              Vista previa —{" "}
              {preview?.type === "seguridad"
                ? "Seguridad"
                : preview?.type === "residuos"
                  ? "Residuos"
                  : "Ambiental"}
              <span className="ml-2 font-normal text-slate-400 normal-case">
                ({range})
              </span>
            </h3>
            <button
              onClick={() => setPreview(null)}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cerrar
            </button>
          </div>

          {loadingPreview ? (
            <div className="p-8 flex justify-center">
              <svg
                className="animate-spin h-6 w-6 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
          ) : preview?.type === "residuos" ? (
            <div className="p-3 md:p-5 space-y-6">
              {/* KPIs de Residuos: 1 col en móvil muy pequeño, 2 en móvil normal, 5 en monitores */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: "Total registros",
                    value: registrosFiltrados.length,
                    color: "text-blue-700 bg-blue-50 border-l-blue-600",
                  },
                  {
                    label: "Peligrosos",
                    value: registrosFiltrados.filter(
                      (r) => r.clasificacion === "Peligroso",
                    ).length,
                    color: "text-amber-700 bg-amber-50 border-l-amber-500",
                  },
                  {
                    label: "Aprovechables",
                    value: registrosFiltrados.filter(
                      (r) => r.clasificacion === "No Peligroso - Aprovechable",
                    ).length,
                    color: "text-green-700 bg-green-50 border-l-green-600",
                  },
                  {
                    label: "No aprovechables",
                    value: registrosFiltrados.filter(
                      (r) =>
                        r.clasificacion === "No Peligroso - No Aprovechable",
                    ).length,
                    color: "text-slate-700 bg-slate-50 border-l-slate-500",
                  },
                  {
                    label: "RAEE",
                    value: registrosFiltrados.filter(
                      (r) => r.clasificacion === "RAEE",
                    ).length,
                    color: "text-red-700 bg-red-50 border-l-red-600",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    /* He añadido 'max-w-xs' y 'aspect-square' opcionalmente si quieres cuadros perfectos, 
         pero con 'flex flex-col justify-center' se ven mucho mejor alineados */
                    className={`rounded-lg border border-l-4 p-3 shadow-sm transition-all flex flex-col justify-center min-h-[80px] ${k.color}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wide opacity-70 leading-tight">
                      {k.label}
                    </div>
                    <div className="text-xl md:text-2xl font-extrabold mt-1">
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Estado documentos: 1 col en móvil, 3 en pantallas medianas hacia arriba */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Docs. vigentes",
                    value: preview.documentos.filter(
                      (d) =>
                        calcEstadoDocPdf(d.fecha_vencimiento) === "Vigente",
                    ).length,
                    color: "text-green-700 bg-green-50 border-l-green-600",
                  },
                  {
                    label: "Por vencer",
                    value: preview.documentos.filter(
                      (d) =>
                        calcEstadoDocPdf(d.fecha_vencimiento) === "Por vencer",
                    ).length,
                    color: "text-amber-700 bg-amber-50 border-l-amber-500",
                  },
                  {
                    label: "Vencidos",
                    value: preview.documentos.filter(
                      (d) =>
                        calcEstadoDocPdf(d.fecha_vencimiento) === "Vencido",
                    ).length,
                    color: "text-red-700 bg-red-50 border-l-red-600",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className={`rounded-lg border border-l-4 p-3 shadow-sm transition-all flex flex-col justify-center min-h-[80px] ${k.color}`}
                  >
                    <div className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-tight sm:tracking-wide opacity-70 leading-tight">
                      {k.label}
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-extrabold mt-1">
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablas: Se asume que PreviewTable ya maneja su propio scroll horizontal o responsive */}
              <div className="grid grid-cols-1 gap-6">
                <PreviewTable
                  title={`Registros de residuos (${registrosFiltrados.length})`}
                  cols={["Fecha", "Empresa", "Área", "Tipo", "Cantidad"]}
                  rows={registrosFiltrados
                    .slice(0, 8)
                    .map((r) => [
                      fmtDate(r.fecha),
                      r.nombreEmpresa || "—",
                      r.area_generadora || "—",
                      String(r.tipo_residuo || "—").slice(0, 30),
                      `${r.cantidad} ${r.unidad}`,
                    ])}
                  total={registrosFiltrados.length}
                />

                <PreviewTable
                  title={`Documentos (${preview.documentos.length})`}
                  cols={["Documento", "Tipo", "Vencimiento", "Estado"]}
                  rows={preview.documentos
                    .slice(0, 8)
                    .map((d) => [
                      String(d.nombre || "—").slice(0, 40),
                      d.tipo || "—",
                      fmtDate(d.fecha_vencimiento),
                      calcEstadoDocPdf(d.fecha_vencimiento),
                    ])}
                  total={preview.documentos.length}
                />
              </div>
            </div>
          ) : preview?.type === "seguridad" ? (
            <div className="p-5 space-y-5">
              {/* KPIs preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Incidentes",
                    value: incidentesFiltrados.length,
                    color: "text-red-700 bg-red-50 border-l-red-600",
                  },
                  {
                    label: "Riesgos",
                    value: riesgosFiltrados.length,
                    color: "text-orange-700 bg-orange-50 border-l-orange-500",
                  },
                  {
                    label: "Inspecciones",
                    value: inspeccionesFiltradas.length,
                    color: "text-blue-700 bg-blue-50 border-l-blue-600",
                  },
                  {
                    label: "Capacitaciones",
                    value: capacitacionesFiltradas.length,
                    color: "text-slate-700 bg-slate-50 border-l-slate-500",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className={`rounded-lg border border-l-4 p-3 ${k.color}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide opacity-70">
                      {k.label}
                    </div>
                    <div className="text-2xl font-extrabold mt-1">
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              <PreviewTable
                title="Incidentes"
                cols={["Código", "Empresa", "Fecha", "Tipo"]}
                rows={incidentesFiltrados
                  .slice(0, 8)
                  .map((i) => [
                    get(i, "Codigo", "codigo") || "—",
                    i.nombreEmpresa || "—",
                    fmtDate(get(i, "Fecha", "fecha")),
                    get(i, "Tipo", "tipo") || "—",
                  ])}
                total={incidentesFiltrados.length}
              />
              <PreviewTable
                title="Riesgos"
                cols={["Área", "Peligro", "Score", "Nivel"]}
                rows={preview.riesgos.slice(0, 8).map((r) => {
                  const prob = Number(get(r, "prob_res", "prob") ?? 0);
                  const sev = Number(get(r, "sev_res", "severidad") ?? 0);
                  const score = prob * sev;
                  return [
                    get(r, "area", "Area") || "—",
                    String(
                      get(r, "peligro", "actividad", "descripcion") || "—",
                    ).slice(0, 35),
                    score || "—",
                    score > 15
                      ? "Crítico"
                      : score > 9
                        ? "Alto"
                        : score > 4
                          ? "Medio"
                          : "Bajo",
                  ];
                })}
                total={preview.riesgos.length}
              />
              <PreviewTable
                title="Inspecciones"
                cols={["Fecha", "Responsable", "Estado", "Cumplimiento"]}
                rows={inspeccionesFiltradas
                  .slice(0, 8)
                  .map((i) => [
                    fmtDate(get(i, "fecha")),
                    get(i, "responsable") || "—",
                    get(i, "status") || "—",
                    get(i, "cumplimiento") || "—",
                  ])}
                total={inspeccionesFiltradas.length}
              />
              <PreviewTable
                title="Capacitaciones"
                cols={[
                  "Persona",
                  "Curso",
                  "Fecha inicio",
                  "Vencimiento",
                  "Nota",
                ]}
                rows={capacitacionesFiltradas
                  .slice(0, 8)
                  .map((c) => [
                    get(c, "persona", "nombre", "Persona") || "—",
                    get(c, "curso", "nombre_curso", "Curso") || "—",
                    fmtDate(get(c, "fecha")),
                    fmtDate(get(c, "fechaVencimiento")),
                    get(c, "nota") || "—",
                  ])}
                total={capacitacionesFiltradas.length}
              />
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* KPIs por matriz */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  {
                    label: "Total muestras",
                    value: muestrasFiltradas.length,

                    color: "text-slate-700 bg-slate-50 border-l-slate-500",
                  },
                  {
                    label: "Agua",
                    value: muestrasFiltradas.filter((m) => m.tipo === "Agua")
                      .length,
                    color: "text-blue-700 bg-blue-50 border-l-blue-600",
                  },
                  {
                    label: "Suelo",
                    value: muestrasFiltradas.filter((m) => m.tipo === "Suelo")
                      .length,
                    color: "text-green-700 bg-green-50 border-l-green-600",
                  },
                  {
                    label: "Aire",
                    value: muestrasFiltradas.filter((m) => m.tipo === "Aire")
                      .length,
                    color: "text-slate-700 bg-slate-50 border-l-slate-400",
                  },
                  {
                    label: "Ruido",
                    value: muestrasFiltradas.filter((m) => m.tipo === "Ruido")
                      .length,
                    color: "text-yellow-700 bg-yellow-50 border-l-yellow-500",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className={`rounded-lg border border-l-4 p-3 ${k.color}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide opacity-70">
                      {k.label}
                    </div>
                    <div className="text-2xl font-extrabold mt-1">
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Alertas */}
              {(() => {
                const alertas = muestrasFiltradas.filter(
                  (m) => computeFlag(m) !== "OK",
                );
                if (alertas.length === 0)
                  return (
                    <div className="rounded-lg bg-green-50 border border-green-300 px-4 py-3 text-sm text-green-800 font-medium flex items-center gap-2">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Sin alertas — todas las muestras tienen valor registrado
                      correctamente.
                    </div>
                  );
                return (
                  <div>
                    <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-2 text-sm text-red-800 font-semibold mb-2 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                      </svg>
                      {alertas.length} alerta{alertas.length !== 1 ? "s" : ""}{" "}
                      detectada{alertas.length !== 1 ? "s" : ""}
                      {" — "}
                      {alertas.filter((m) => m.valor == null).length} sin valor,{" "}
                      {alertas.filter((m) => m.duplicado_de).length} duplicados,{" "}
                      {alertas.filter((m) => m.valor === 0).length} valor cero
                    </div>
                    <PreviewTable
                      title="Alertas de calidad de datos"
                      cols={[
                        "Tipo",
                        "Fecha",
                        "Punto",
                        "Parámetro",
                        "Lab.",
                        "Alerta",
                      ]}
                      rows={alertas
                        .slice(0, 8)
                        .map((m) => [
                          m.tipo || "—",
                          fmtDate(m.fecha),
                          m.punto || "—",
                          m.parametro || "—",
                          m.laboratorio || "—",
                          computeFlag(m),
                        ])}
                      total={alertas.length}
                    />
                  </div>
                );
              })()}

              {/* Importaciones */}
              <PreviewTable
                title={`Importaciones (${importacionesFiltradas.length})`}
                cols={["ID", "Archivo", "Fecha", "Filas"]}
                rows={importacionesFiltradas
                  .slice(0, 6)
                  .map((imp) => [
                    imp.idImportacion ?? "—",
                    imp.nombreArchivo ?? "—",
                    fmtDate(imp.fechaImportacion),
                    imp.totalFilas ?? "—",
                  ])}
                total={preview.importaciones.length}
              />

              {/* Muestras desglosadas por tipo */}
              {["Agua", "Suelo", "Aire", "Ruido"].map((tipo) => {
                const rows = muestrasFiltradas.filter((m) => m.tipo === tipo);
                if (rows.length === 0) return null;
                return (
                  <PreviewTable
                    key={tipo}
                    title={`${tipo} — ${rows.length} muestras`}
                    cols={[
                      "Fecha",
                      "Punto",
                      "Parámetro",
                      "Valor",
                      "Unidad",
                      "Lab.",
                      "Estado",
                    ]}
                    rows={rows.slice(0, 6).map((m) => {
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
                    })}
                    total={rows.length}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function PreviewTable({ title, cols, rows, total }) {
  if (rows.length === 0)
    return (
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          {title}
        </p>
        <p className="text-sm text-slate-400 italic">
          Sin registros en el periodo.
        </p>
      </div>
    );
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {title}
        </p>
        {total > rows.length && (
          <span className="text-xs text-slate-400">
            Mostrando {rows.length} de {total}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left font-semibold tracking-wide"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
