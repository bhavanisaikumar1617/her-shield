import { createContext, useCallback, useMemo, useState } from 'react'

const EmergencyContext = createContext(null)

const statusSteps = ['Searching', 'Volunteer Assigned', 'Help On The Way']

function EmergencyProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [contacts, setContacts] = useState([
    { id: 'c1', name: 'City Emergency Helpline', number: '112' },
    { id: 'c2', name: 'Women Safety Cell', number: '1091' },
    { id: 'c3', name: 'Trusted Contact - Asha', number: '+91 90000 00001' },
  ])
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)

  const addContact = useCallback((name, number) => {
    setContacts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), number: number.trim() },
    ])
  }, [])

  const updateAlertStatus = useCallback((alertId, status) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, status } : alert)))
  }, [])

  const triggerSOS = useCallback(() => {
    if (!navigator.geolocation) {
      window.alert('Geolocation is not supported on this browser.')
      return
    }

    setIsTriggeringSOS(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        const alertId = crypto.randomUUID()
        const now = new Date().toISOString()

        setCurrentLocation(location)
        setAlerts((prev) => [
          {
            id: alertId,
            timestamp: now,
            location,
            status: 'Searching',
          },
          ...prev,
        ])
        window.alert('Emergency Alert Triggered')
        setIsTriggeringSOS(false)

        statusSteps.slice(1).forEach((status, index) => {
          window.setTimeout(() => {
            updateAlertStatus(alertId, status)
          }, (index + 1) * 5000)
        })
      },
      () => {
        window.alert('Unable to retrieve your location. Please enable location access.')
        setIsTriggeringSOS(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [updateAlertStatus])

  const value = useMemo(
    () => ({
      alerts,
      contacts,
      addContact,
      triggerSOS,
      isTriggeringSOS,
      currentLocation,
      statusSteps,
    }),
    [alerts, contacts, addContact, triggerSOS, isTriggeringSOS, currentLocation]
  )

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>
}

export { EmergencyContext, EmergencyProvider }
