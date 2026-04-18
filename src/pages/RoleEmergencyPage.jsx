import EmergencyPage from './EmergencyPage'
import VolunteerPage from './VolunteerPage'
import AdminPage from './AdminPage'
import useAppContext from '../hooks/useAppContext'

function RoleEmergencyPage() {
  const { currentUser } = useAppContext()

  if (!currentUser) {
    return null
  }

  if (currentUser.role === 'volunteer') {
    return <VolunteerPage />
  }

  if (currentUser.role === 'admin') {
    return <AdminPage />
  }

  return <EmergencyPage />
}

export default RoleEmergencyPage
