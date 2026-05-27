import { useEffect } from "react";

export default function ModalConfigurarMatriz({
  open,
  onClose,
  draftMatrixSize,
  draftMaxScore,
  draftWarnings,
  draftLevels,
  canSaveConfig,
  riskConfig,

  setDraftConfig,
  updateDraftLevel,
  addDraftLevel,
  deleteDraftLevel,
  autoFillDraftLevels,
  saveDraft,

  clampInt,
  Badge,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* CONTENEDOR EXTERNO */}
      <div className="w-full max-w-3xl px-4">
        {/* MODAL */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
            <div className="font-semibold text-slate-800">
              Configurar matriz y niveles
            </div>

            <button
              className="rounded border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-12 gap-4">
              {/* IZQUIERDA */}
              <div className="col-span-12 md:col-span-4">
                <div className="mb-1 text-xs text-slate-500">
                  Tamaño de matriz
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={3}
                    max={7}
                    value={draftMatrixSize}
                    onChange={(e) =>
                      setDraftConfig((x) => ({
                        ...x,
                        matrixSize: clampInt(e.target.value, 3, 7),
                      }))
                    }
                    className="w-full"
                  />

                  <span className="w-14 text-right text-sm font-semibold text-slate-800">
                    {draftMatrixSize}×{draftMatrixSize}
                  </span>
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Puntaje máximo: {draftMaxScore}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={autoFillDraftLevels}
                  >
                    Auto-rangos
                  </button>

                  <button
                    className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={addDraftLevel}
                  >
                    + Nivel
                  </button>
                </div>
              </div>

              {/* DERECHA */}
              <div className="col-span-12 md:col-span-8">
                {(draftWarnings.gaps.length > 0 ||
                  draftWarnings.overlaps.length > 0) && (
                  <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    {draftWarnings.gaps.length > 0 && (
                      <div className="mb-1">
                        <span className="font-semibold">Gaps:</span>

                        {draftWarnings.gaps.map((g, i) => (
                          <span key={i} className="ml-2">
                            {g.from}–{g.to}
                          </span>
                        ))}
                      </div>
                    )}

                    {draftWarnings.overlaps.length > 0 && (
                      <div>
                        <span className="font-semibold">Solapes:</span>

                        {draftWarnings.overlaps.slice(0, 3).map((o, i) => (
                          <span key={i} className="ml-2">
                            [{o.a}] con [{o.b}]
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2">
                      No se puede guardar hasta corregir rangos.
                    </div>
                  </div>
                )}

                {/* TABLA */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-600">
                        <th className="py-2 pr-3">Nombre</th>
                        <th className="py-2 pr-3">Min</th>
                        <th className="py-2 pr-3">Max</th>
                        <th className="py-2 pr-3">Color</th>
                        <th className="py-2 pr-3">Vista</th>
                        <th className="py-2">Acción</th>
                      </tr>
                    </thead>

                    <tbody className="text-slate-700">
                      {draftLevels.map((l) => (
                        <tr key={l.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-3">
                            <input
                              className="w-full rounded border border-slate-200 px-2 py-1"
                              value={l.name}
                              onChange={(e) =>
                                updateDraftLevel(l.id, {
                                  name: e.target.value,
                                })
                              }
                            />
                          </td>

                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={1}
                              max={draftMaxScore}
                              className="w-24 rounded border border-slate-200 px-2 py-1"
                              value={l.min}
                              onChange={(e) =>
                                updateDraftLevel(l.id, {
                                  min: clampInt(
                                    e.target.value,
                                    1,
                                    draftMaxScore,
                                  ),
                                })
                              }
                            />
                          </td>

                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={1}
                              max={draftMaxScore}
                              className="w-24 rounded border border-slate-200 px-2 py-1"
                              value={l.max}
                              onChange={(e) =>
                                updateDraftLevel(l.id, {
                                  max: clampInt(
                                    e.target.value,
                                    1,
                                    draftMaxScore,
                                  ),
                                })
                              }
                            />
                          </td>

                          <td className="py-2 pr-3">
                            <select
                              className="rounded border border-slate-200 px-2 py-1"
                              value={l.tone}
                              onChange={(e) =>
                                updateDraftLevel(l.id, {
                                  tone: e.target.value,
                                })
                              }
                            >
                              <option value="green">Verde</option>
                              <option value="yellow">Amarillo</option>
                              <option value="red">Rojo</option>
                              <option value="slate">Gris</option>
                            </select>
                          </td>

                          <td className="py-2 pr-3">
                            <Badge tone={l.tone}>
                              {l.name} ({l.min})
                            </Badge>
                          </td>

                          <td className="py-2">
                            <button
                              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                              onClick={() => deleteDraftLevel(l.id)}
                              disabled={draftLevels.length <= 1}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER */}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    className="rounded border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                    onClick={() => setDraftConfig(riskConfig)}
                  >
                    Descartar
                  </button>

                  <button
                    className={`rounded px-4 py-2 text-sm ${
                      canSaveConfig
                        ? "bg-slate-900 text-white hover:bg-slate-700"
                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                    }`}
                    disabled={!canSaveConfig}
                    onClick={saveDraft}
                  >
                    Guardar configuración
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
