function LoadingSpinner({ label = 'Loading...', size = 'md', className = '' }) {
  const sizeClass =
    size === 'sm'
      ? 'h-4 w-4 border-2'
      : size === 'lg'
        ? 'h-8 w-8 border-4'
        : 'h-6 w-6 border-2'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-live="polite">
      <span className={`inline-block animate-spin rounded-full border-slate-300 border-t-[#0B3D91] ${sizeClass}`} />
      {label ? <span className="text-sm font-medium text-slate-600">{label}</span> : null}
    </span>
  )
}

export default LoadingSpinner
