import { Navigate, useLocation } from 'react-router-dom'
import useAppContext from '../hooks/useAppContext'
import LoadingSpinner from './LoadingSpinner'

function ProtectedRoute({ children }) {
  const { currentUser, isAuthLoading } = useAppContext()
  const location = useLocation()

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Restoring session..." />
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
