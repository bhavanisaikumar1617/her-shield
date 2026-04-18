import { motion as Motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import AlertMap from '../components/AlertMap'
import AlertTimeline from '../components/AlertTimeline'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

const statusGroups = [
  { key: 'all', label: 'All' },
  { key: 'Searching', label: 'Searching' },
  { key: 'Volunteer Assigned', label: 'Assigned' },
  { key: 'On the Way', label: 'On the Way' },
  { key: 'Reached', label: 'Completed' },
]

function AdminEmergencyPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const { alerts, users, volunteers } = useAppContext()

  const visibleAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return alerts.filter((alert) => {
      const statusMatch = statusFilter === 'all' || alert.status === statusFilter
      if (!statusMatch) {
        return false
      }

      if (!q) {
        return true
      }

      const matchesUser = String(alert.userName || '').toLowerCase().includes(q)
      const matchesVolunteer = String(alert.assignedVolunteer || '').toLowerCase().includes(q)
      const matchesStatus = String(alert.status || '').toLowerCase().includes(q)
      return matchesUser || matchesVolunteer || matchesStatus
    })
  }, [alerts, searchQuery, statusFilter])

  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) {
      return visibleAlerts[0] || null
    }
    return alerts.find((alert) => alert.id === selectedAlertId) || null
  }, [alerts, selectedAlertId, visibleAlerts])

  const selectedUser = useMemo(() => {
    if (!selectedAlert?.userId) {
      return null
    }
    return users.find((user) => user.id === selectedAlert.userId) || null
  }, [selectedAlert, users])

  const selectedVolunteer = useMemo(() => {
    if (!selectedAlert?.assignedVolunteerId) {
      return null
    }
    return volunteers.find((volunteer) => volunteer.id === selectedAlert.assignedVolunteerId) || null
  }, [selectedAlert, volunteers])

  const volunteerMarkers = useMemo(() => {
    if (!selectedVolunteer || typeof selectedVolunteer.latitude !== 'number' || typeof selectedVolunteer.longitude !== 'number') {
      return []
    }

    return [
      {
        id: selectedVolunteer.id,
        name: selectedVolunteer.name,
        latitude: selectedVolunteer.latitude,
        longitude: selectedVolunteer.longitude,
      },
    ]
  }, [selectedVolunteer])

  return (
    <PageTransition>
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3D91]">Admin Emergency Control</h1>
            <p className="mt-1 text-sm text-slate-600">Track all incidents, monitor volunteer movement, and inspect full alert journeys.</p>
          </div>
          <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Live dashboard
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by user, volunteer, or status"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
          />
          <div className="flex flex-wrap gap-2">
            {statusGroups.map((status) => (
              <button
                key={status.key}
                type="button"
                onClick={() => setStatusFilter(status.key)}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                  statusFilter === status.key
                    ? 'bg-[#0B3D91] text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {visibleAlerts.length === 0 && (
              <EmptyState title="No alerts found" description="No alert matches the current search and status filters." />
            )}

            {visibleAlerts.map((alert, index) => (
              <Motion.article
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  selectedAlert?.id === alert.id
                    ? 'border-[#0B3D91] bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                onClick={() => setSelectedAlertId(alert.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{alert.userName || 'Unknown user'}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{alert.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
              </Motion.article>
            ))}
          </div>

          <div className="space-y-4">
            {selectedAlert ? (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="text-base font-semibold text-[#0B3D91]">Alert Detail Panel</h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">User:</span> {selectedUser?.name || selectedAlert.userName || 'Unknown user'}</p>
                    <p><span className="font-semibold">Email:</span> {selectedUser?.email || 'N/A'}</p>
                    <p><span className="font-semibold">Volunteer:</span> {selectedVolunteer?.name || selectedAlert.assignedVolunteer || 'Unassigned'}</p>
                    <p><span className="font-semibold">Volunteer Email:</span> {selectedVolunteer?.email || 'N/A'}</p>
                    <p><span className="font-semibold">Coordinates:</span> {selectedAlert.latitude.toFixed(6)}, {selectedAlert.longitude.toFixed(6)}</p>
                    <p><span className="font-semibold">Status:</span> {selectedAlert.status}</p>
                  </div>
                </section>

                <AlertTimeline alert={selectedAlert} />

                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <h3 className="mb-2 text-base font-semibold text-[#0B3D91]">Map Tracking</h3>
                  <AlertMap alerts={[selectedAlert]} volunteerLocations={volunteerMarkers} />
                </section>
              </>
            ) : (
              <EmptyState title="Select an alert" description="Choose an alert from the list to see full tracking details." />
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  )
}

export default AdminEmergencyPage
