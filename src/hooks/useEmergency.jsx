import { useContext } from 'react'
import { EmergencyContext } from '../context/EmergencyContext'

function useEmergency() {
  const context = useContext(EmergencyContext)
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider')
  }
  return context
}

export default useEmergency
