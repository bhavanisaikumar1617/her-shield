import { Navigate } from 'react-router-dom'
import useAppContext from '../hooks/useAppContext'
import LoadingSpinner from './LoadingSpinner'

function RoleRoute({ role, children }) {
  const { currentUser, isAuthLoading } = useAppContext()

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading your access..." />
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== role) {
    if (currentUser.role === 'volunteer') return <Navigate to="/volunteer" replace />
    if (currentUser.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RoleRoute
