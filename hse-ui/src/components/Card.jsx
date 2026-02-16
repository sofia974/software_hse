export default function Card({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3 text-slate-800">{title}</h3>
      {children}
    </div>
  )
}
