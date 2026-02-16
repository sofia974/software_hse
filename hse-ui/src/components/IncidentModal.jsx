export default function IncidentModal({ open, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Nuevo Incidente</h2>

        <div className="space-y-3">
          <input
            placeholder="Área / Ubicación"
            className="w-full border rounded px-3 py-2"
          />

          <select className="w-full border rounded px-3 py-2">
            <option>Tipo de incidente</option>
            <option>Cercano a Pérdida</option>
            <option>Incidente</option>
            <option>Accidente</option>
          </select>

          <select className="w-full border rounded px-3 py-2">
            <option>Severidad</option>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
          </select>

          <textarea
            placeholder="Descripción"
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 rounded border"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="px-4 py-2 rounded bg-red-600 text-white"
            onClick={() => {
              console.log("Incidente registrado")
              onClose()
            }}
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}
