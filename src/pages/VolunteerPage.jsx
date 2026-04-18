import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import heroBanner from '../assets/hero.png'
import AlertMap from '../components/AlertMap'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'
import SmartImage from '../components/SmartImage'
import useAppContext from '../hooks/useAppContext'

function normalizeVolunteerStatus(status) {
  if (status === 'Volunteer Assigned') {
    return 'Assigned'
  }
  if (status === 'On the Way') {
    return 'On the way'
  }
  if (status === 'Reached') {
    return 'Completed'
  }
  return 'Searching'
}

function statusPillClass(status) {
  if (status === 'On the Way') {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }
  if (status === 'Volunteer Assigned') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }
  if (status === 'Reached') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function VolunteerPage() {
  const { currentUser, alerts, acceptAlert, declineAlert } = useAppContext()
  const [dismissedAlertIds, setDismissedAlertIds] = useState(new Set())
  const [bannerSrc, setBannerSrc] = useState(heroBanner)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const isVerifiedVolunteer = Boolean(currentUser?.role === 'volunteer' && currentUser?.isVerified)
  const activeAlerts = alerts.filter((alert) => alert.status !== 'Reached' && !dismissedAlertIds.has(alert.id))

  const acceptedAlertIds = useMemo(
    () =>
      new Set(
        activeAlerts
          .filter((alert) => alert.assignedVolunteerId === currentUser?.id || alert.assignedVolunteer === currentUser?.name)
          .map((alert) => alert.id)
      ),
    [activeAlerts, currentUser?.id, currentUser?.name]
  )

  // Sort alerts by distance (nearest first)
  const sortedAlerts = useMemo(
    () => [...activeAlerts].sort((a, b) => {
      const distA = typeof a.distanceKm === 'number' ? a.distanceKm : Infinity
      const distB = typeof b.distanceKm === 'number' ? b.distanceKm : Infinity
      return distA - distB
    }),
    [activeAlerts]
  )

  const openAlertInMaps = (alert) => {
    const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDeclineRequest = async (alertId) => {
    setDismissedAlertIds((prev) => new Set(prev).add(alertId))
    await declineAlert(alertId)
  }

  return (
    <PageTransition>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative mb-5 overflow-hidden rounded-xl"
        >
          <SmartImage
            src={bannerSrc}
            alt="Volunteer support team illustration"
            onError={() => setBannerSrc('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80')}
            fallbackSrc="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
            className="h-32 w-full object-cover sm:h-36"
          />
          <div className="absolute inset-0 bg-slate-900/35" />
        </motion.div>

        <h1 className="text-2xl font-bold text-[#0B3D91]">Volunteer Dashboard</h1>
        <p className="mt-1 text-sm italic text-slate-700">"Be the reason someone feels safe today."</p>
        <p className="mt-1 text-sm text-slate-600">Nearby Emergency Requests update in real time.</p>

        {/* Map Section */}
        {isVerifiedVolunteer && activeAlerts.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Emergency Map</h2>
            <AlertMap
              alerts={activeAlerts}
              userLocation={currentUser ? { latitude: currentUser.latitude ?? 20.5937, longitude: currentUser.longitude ?? 78.9629 } : null}
              onMarkerClick={setSelectedAlert}
            />
          </div>
        )}

        {/* Alert List Section */}
        {isVerifiedVolunteer && sortedAlerts.length > 0 && (
          <h2 className="mt-6 text-lg font-semibold text-slate-800">Nearby Requests (Sorted by Distance)</h2>
        )}

        <div className="mt-5 space-y-3">
          {!isVerifiedVolunteer && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              Waiting for admin approval
            </p>
          )}

          {isVerifiedVolunteer && sortedAlerts.length === 0 && (
            <EmptyState title="No nearby emergency requests" description="You will see nearby user incidents here in real time." />
          )}

          {isVerifiedVolunteer &&
            sortedAlerts.map((alert, index) => (
              <motion.article
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">User: {alert.userName || alert.userId || 'Unknown user'}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(alert.status)}`}>
                    {normalizeVolunteerStatus(alert.status)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-700">
                  Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Distance: {typeof alert.distanceKm === 'number' ? `${alert.distanceKm.toFixed(2)} km` : 'N/A'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Time: {new Date(alert.timestamp).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Assigned volunteer: {alert.assignedVolunteer || 'Unassigned'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => acceptAlert(alert.id)}
                    disabled={alert.status !== 'Searching'}
                    className="rounded-md bg-[#0B3D91] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Accept request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineRequest(alert.id)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Decline request
                  </button>
                  {acceptedAlertIds.has(alert.id) && (
                    <button
                      type="button"
                      onClick={() => openAlertInMaps(alert)}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Open in Maps
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
        </div>
      </section>
    </PageTransition>
  )
}

export default VolunteerPage
