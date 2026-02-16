export default function Topbar({ search, setSearch, page }) {
  const enabled = ["Incidentes", "Capacitaciones"].includes(page)

  return (
    <header className="bg-white shadow px-6 py-3 flex justify-between items-center">
      <input
        type="text"
        placeholder={
          enabled ? `Buscar en ${page.toLowerCase()}...` : "Buscar..."
        }
        className="border rounded px-3 py-2 w-1/3 disabled:bg-slate-100"
        value={search}
        disabled={!enabled}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-700">Admin</span>
        <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
          A
        </div>
      </div>
    </header>
  )
}
