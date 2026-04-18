function EmptyState({ title = 'No alerts yet', description = 'No data available right now.' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  )
}

export default EmptyState
