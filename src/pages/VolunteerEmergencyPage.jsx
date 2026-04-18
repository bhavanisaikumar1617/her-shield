import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import AlertMap from '../components/AlertMap'
import AlertTimeline from '../components/AlertTimeline'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

function VolunteerEmergencyPage() {
  const {
    alerts,
    authToken,
    currentUser,
    acceptAlert,
    fetchAlerts,
  } = useAppContext()

  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const [trackingStatus, setTrackingStatus] = useState('idle')
  const [trackingPosition, setTrackingPosition] = useState(null)
  const watchIdRef = useRef(null)

  const nearbyAlerts = useMemo(() => alerts.filter((alert) => alert.status !== 'Reached'), [alerts])

  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) {
      return nearbyAlerts[0] || null
    }
    return alerts.find((alert) => alert.id === selectedAlertId) || null
  }, [alerts, nearbyAlerts, selectedAlertId])

  const selectedAccepted = selectedAlert?.assignedVolunteerId === currentUser?.id

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const startTracking = () => {
    if (!selectedAlert || !currentUser?.id || !authToken || !navigator.geolocation) {
      return
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setTrackingStatus('tracking')

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        setTrackingPosition({ latitude, longitude })

        try {
          await fetch(`http://localhost:4000/api/volunteers/${currentUser.id}/location`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          })
        } catch (error) {
          console.error('Volunteer movement update failed:', error)
        }
      },
      (error) => {
        console.error('Volunteer movement tracking failed:', error)
        setTrackingStatus('failed')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setTrackingStatus('idle')
  }

  const markCompleted = async () => {
    if (!selectedAlert || !authToken) {
      return
    }

    try {
      await fetch(`http://localhost:4000/api/alerts/${selectedAlert.id}/complete`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      stopTracking()
      await fetchAlerts()
    } catch (error) {
      console.error('Mark complete failed:', error)
    }
  }

  const openDirections = () => {
    if (!selectedAlert) {
      return
    }
    const destination = `${selectedAlert.latitude},${selectedAlert.longitude}`
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const volunteerMarkers = trackingPosition
    ? [{ id: currentUser?.id || 'volunteer', name: currentUser?.name || 'Volunteer', ...trackingPosition }]
    : []

  return (
    <PageTransition>
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#0B3D91]">Volunteer Emergency Center</h1>
          <p className="mt-1 text-sm text-slate-600">Accept nearby incidents, navigate quickly, and update real-time movement.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {nearbyAlerts.length === 0 && (
              <EmptyState title="No nearby alerts" description="Incoming alerts will appear here automatically." />
            )}

            {nearbyAlerts.map((alert, index) => (
              <Motion.article
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-xl border p-4 ${
                  selectedAlert?.id === alert.id ? 'border-[#0B3D91] bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => setSelectedAlertId(alert.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{alert.userName || 'Emergency user'}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{alert.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                  <p className="mt-1 text-xs text-slate-500">Distance: {typeof alert.distanceKm === 'number' ? `${alert.distanceKm.toFixed(2)} km` : 'N/A'}</p>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => acceptAlert(alert.id)}
                    disabled={alert.status !== 'Searching'}
                    className="rounded-md bg-[#0B3D91] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAlertId(alert.id)
                      openDirections()
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Get Directions
                  </button>
                </div>
              </Motion.article>
            ))}
          </div>

          <div className="space-y-4">
            {selectedAlert ? (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[#0B3D91]">Active Incident</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{selectedAlert.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    User: {selectedAlert.userName || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-600">{selectedAlert.latitude.toFixed(6)}, {selectedAlert.longitude.toFixed(6)}</p>

                  {selectedAccepted && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={startTracking}
                        disabled={trackingStatus === 'tracking'}
                        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {trackingStatus === 'tracking' ? 'Tracking Live' : 'Start Live Tracking'}
                      </button>
                      <button
                        type="button"
                        onClick={stopTracking}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Stop Tracking
                      </button>
                      <button
                        type="button"
                        onClick={markCompleted}
                        className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Mark Completed
                      </button>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <h3 className="mb-2 text-base font-semibold text-[#0B3D91]">Incident Map</h3>
                  <AlertMap alerts={[selectedAlert]} volunteerLocations={volunteerMarkers} />
                </section>

                <AlertTimeline alert={selectedAlert} />
              </>
            ) : (
              <EmptyState title="Select an alert" description="Pick an alert to start navigation and timeline tracking." />
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  )
}

export default VolunteerEmergencyPage
