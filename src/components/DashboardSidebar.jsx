import { NavLink } from 'react-router-dom'

const items = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Emergency', to: '/emergency' },
  { label: 'Account', to: '/login' },
]

function DashboardSidebar() {
  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:w-64">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Dashboard</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-[#0B3D91] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default DashboardSidebar
