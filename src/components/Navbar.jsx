import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import useAppContext from '../hooks/useAppContext'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { currentUser, logout } = useAppContext()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const emergencyRouteByRole = {
    user: '/emergency',
    volunteer: '/volunteer/emergency',
    admin: '/admin/emergency',
  }

  const profileRouteByRole = {
    user: '/profile',
    volunteer: '/volunteer/profile',
    // admin: '/admin/profile',
  }

  const emergencyRoute = currentUser?.role ? emergencyRouteByRole[currentUser.role] : null
  const profileRoute = currentUser?.role ? profileRouteByRole[currentUser.role] : null

  const navItems = [
    { label: 'Home', to: '/' },
    ...(currentUser?.role === 'user' ? [{ label: 'Dashboard', to: '/dashboard' }] : []),
    ...(currentUser && profileRoute ? [{ label: 'Profile', to: profileRoute }] : []),
    ...(currentUser && emergencyRoute ? [{ label: 'Emergency', to: emergencyRoute }] : []),
    ...(currentUser?.role === 'volunteer' ? [{ label: 'Volunteer', to: '/volunteer' }] : []),
    ...(currentUser?.role === 'admin' ? [{ label: 'Admin', to: '/admin' }] : []),
    ...(currentUser?.role === 'admin' ? [{ label: 'Volunteers', to: '/admin/volunteers' }] : []),
    ...(currentUser?.role === 'admin' ? [{ label: 'Reports', to: '/reports' }] : []),
    ...(!currentUser ? [{ label: 'Login', to: '/login' }] : []),
    ...(!currentUser ? [{ label: 'Signup', to: '/signup' }] : []),
  ]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? 'shadow-md' : 'shadow-none'
      }`}
    >
      <div className="mx-auto relative flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-bold tracking-tight text-[#0B3D91]">
          HerShield
        </Link>

        <nav className="hidden items-center gap-1 sm:gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0B3D91] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0B3D91]'
                }`
              }
            >
              <span className="inline-flex items-center gap-1">
                {item.label === 'Profile' && '👤'}
                {item.label === 'Volunteer' && '🛟'}
                {item.label === 'Admin' && '📊'}
                {item.label}
              </span>
            </NavLink>
          ))}
          {currentUser && (
            <button
              type="button"
              onClick={() => {
                logout()
              }}
              className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Logout
            </button>
          )}
        </nav>

        <button
          type="button"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((previous) => !previous)}
          className="md:hidden inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100"
        >
          <span className="text-lg leading-none">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>

        <div
          className={`absolute left-4 right-4 top-full md:hidden overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-md backdrop-blur transition-all duration-300 ease-out ${
            isMobileMenuOpen ? 'max-h-105 translate-y-2 opacity-100' : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'
          }`}
        >
          <nav className="flex w-full flex-col gap-1 p-2">
            {navItems.map((item) => (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0B3D91] text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0B3D91]'
                  }`
                }
              >
                <span className="inline-flex items-center gap-1">
                  {item.label === 'Profile' && '👤'}
                  {item.label === 'Volunteer' && '🛟'}
                  {item.label === 'Admin' && '📊'}
                  {item.label}
                </span>
              </NavLink>
            ))}

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  logout()
                }}
                className="w-full rounded-md bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Navbar
