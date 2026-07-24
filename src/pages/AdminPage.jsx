import { motion as Motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AlertMap from '../components/AlertMap'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

const statusOptions = ['Searching', 'Volunteer Assigned', 'On the Way', 'Reached']

function toDateInputValue(dateLike) {
  const date = new Date(dateLike)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeStatusLabel(status) {
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

function statusBadgeClass(status) {
  if (status === 'Reached') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'On the Way') {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }
  if (status === 'Volunteer Assigned') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function AdminPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [verificationUpdatingId, setVerificationUpdatingId] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [safeZoneSaving, setSafeZoneSaving] = useState(false)
  const [safeZoneError, setSafeZoneError] = useState('')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [safeZoneDraft, setSafeZoneDraft] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radiusKm: '1',
  })
  const {
    users,
    alerts,
    volunteers,
    isVolunteersLoading,
    updateAlertStatus,
    updateVolunteerVerification,
    safeZones,
    fetchSafeZones,
    authToken,
    logout,
  } = useAppContext()

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const statusMatch = statusFilter === 'all' || alert.status === statusFilter
      if (!statusMatch) {
        return false
      }

      if (!dateFilter) {
        return true
      }

      return toDateInputValue(alert.timestamp) === dateFilter
    })
  }, [alerts, dateFilter, statusFilter])

  const summary = useMemo(() => {
    const activeCount = alerts.filter((alert) => alert.status !== 'Reached').length
    const resolvedCount = alerts.filter((alert) => alert.status === 'Reached').length
    return {
      activeCount,
      resolvedCount,
      volunteerCount: users.filter((user) => user.role === 'volunteer').length,
      userCount: users.filter((user) => user.role === 'user').length,
    }
  }, [alerts, users])

  const handleStatusChange = async (alertId, status) => {
    setActionLoadingId(`${alertId}-${status}`)
    try {
      await updateAlertStatus(alertId, status)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReassignVolunteer = async (alert) => {
    if (!authToken) {
      return
    }

    setActionLoadingId(`${alert.id}-reassign`)
    try {
      await fetch('https://her-shield-production.up.railway.app/api/alerts/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          alertId: alert.id,
          latitude: alert.latitude,
          longitude: alert.longitude,
          minRadiusKm: 0,
          maxRadiusKm: 10,
        }),
      })
    } catch (error) {
      console.error('Alert reassignment failed:', error)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCloseIncident = async (alertId) => {
    await handleStatusChange(alertId, 'Reached')
  }

  const handleVerificationToggle = async (volunteer) => {
    setVerificationUpdatingId(volunteer.id)
    try {
      await updateVolunteerVerification(volunteer.id, !volunteer.isVerified)
    } catch (error) {
      console.error('Failed to update volunteer verification:', error)
    } finally {
      setVerificationUpdatingId(null)
    }
  }

  const handleSafeZoneCreate = async (event) => {
    event.preventDefault()
    const latitude = Number(safeZoneDraft.latitude)
    const longitude = Number(safeZoneDraft.longitude)
    const radiusKm = Number(safeZoneDraft.radiusKm)

    if (!safeZoneDraft.name.trim() || Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radiusKm)) {
      setSafeZoneError('Name, latitude, longitude, and radius are required.')
      return
    }

    setSafeZoneSaving(true)
    try {
      const response = await fetch('https://her-shield-production.up.railway.app/api/safe-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: safeZoneDraft.name,
          description: safeZoneDraft.description,
          latitude,
          longitude,
          radiusKm,
        }),
      })

      if (!response.ok) {
        throw new Error('Safe zone create failed')
      }

      setSafeZoneDraft({ name: '', description: '', latitude: '', longitude: '', radiusKm: '1' })
      setSafeZoneError('')
      await fetchSafeZones()
    } catch (error) {
      console.error('Safe zone creation failed:', error)
      setSafeZoneError('Unable to create safe zone.')
    } finally {
      setSafeZoneSaving(false)
    }
  }

  const handleSafeZoneDelete = async (safeZoneId) => {
    try {
      const response = await fetch(`https://her-shield-production.up.railway.app/api/safe-zones/${safeZoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (!response.ok) {
        throw new Error('Safe zone delete failed')
      }

      await fetchSafeZones()
    } catch (error) {
      console.error('Safe zone delete failed:', error)
    }
  }

  const handlePasswordInput = (event) => {
    const { name, value } = event.target
    setPasswordData((previous) => ({ ...previous, [name]: value }))
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordMessage('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(true)
      setPasswordMessage('New password and confirmation must match.')
      return
    }

    setSavingPassword(true)
    try {
      const response = await fetch('https://her-shield-production.up.railway.app/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(passwordData),
      })

      const result = await response.json().catch(() => null)
      setPasswordError(!response.ok)
      setPasswordMessage(result?.message || (response.ok ? 'Password updated successfully.' : 'Unable to update password.'))

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error) {
      console.error('Admin password change failed:', error)
      setPasswordError(true)
      setPasswordMessage('Unable to update password right now.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <PageTransition>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3D91]">All Emergency Alerts</h1>
            <p className="mt-1 text-sm text-slate-600">Central monitoring for active incidents, assignments, and closures.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            Real-time updates enabled
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total active alerts</p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{summary.activeCount}</p>
          </article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resolved alerts</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{summary.resolvedCount}</p>
          </article>
          <article className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Users</p>
            <p className="mt-2 text-2xl font-bold text-blue-800">{summary.userCount}</p>
          </article>
          <article className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Volunteers</p>
            <p className="mt-2 text-2xl font-bold text-violet-800">{summary.volunteerCount}</p>
          </article>
        </div>

        {/* Emergency Map */}
        {filteredAlerts.length > 0 && (
          <div className="relative z-0 mt-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Real-time Emergency Map</h2>
            <AlertMap alerts={filteredAlerts} />
          </div>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-[#0B3D91]">Filters</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {normalizeStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Date
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
              />
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-[#0B3D91]">Alerts Control Panel</h2>

          {filteredAlerts.length === 0 && (
            <div className="mt-3">
              <EmptyState title="No alerts" description="No emergency alerts match the selected filters." />
            </div>
          )}

          <div className="mt-3 space-y-3">
            {filteredAlerts.map((alert, index) => (
              <Motion.article
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">User: {alert.userName || alert.userId || 'Unknown user'}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(alert.status)}`}>
                    {normalizeStatusLabel(alert.status)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-700">
                  Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Timestamp: {new Date(alert.timestamp).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-600">Assigned volunteer: {alert.assignedVolunteer || 'Unassigned'}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(alert.id, status)}
                      disabled={Boolean(actionLoadingId)}
                      className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                        alert.status === status
                          ? 'bg-[#0B3D91] text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {actionLoadingId === `${alert.id}-${status}` ? 'Updating...' : normalizeStatusLabel(status)}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleReassignVolunteer(alert)}
                    disabled={Boolean(actionLoadingId)}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actionLoadingId === `${alert.id}-reassign` ? 'Reassigning...' : 'Reassign volunteer'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCloseIncident(alert.id)}
                    disabled={Boolean(actionLoadingId) || alert.status === 'Reached'}
                    className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Close incident
                  </button>
                </div>
              </Motion.article>
            ))}
          </div>
        </section>

        <article className="mt-6 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-[#0B3D91]">Volunteer Verification</h2>
          <div className="mt-3 space-y-3">
            {isVolunteersLoading && <LoadingSpinner label="Loading volunteers..." />}

            {volunteers.length === 0 && <EmptyState title="No volunteers" description="No volunteers are registered yet." />}

            {volunteers.map((volunteer) => (
              <div
                key={volunteer.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{volunteer.name}</p>
                  <p className="text-xs text-slate-600">Status: {volunteer.isVerified ? 'Verified' : 'Pending'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleVerificationToggle(volunteer)}
                  disabled={verificationUpdatingId === volunteer.id}
                  className={`rounded-md px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                    volunteer.isVerified ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {verificationUpdatingId === volunteer.id
                    ? 'Updating...'
                    : volunteer.isVerified
                      ? 'Reject'
                      : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="mt-6 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-[#0B3D91]">Safe Zones</h2>
          {safeZoneError && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{safeZoneError}</p>
          )}
          <form onSubmit={handleSafeZoneCreate} className="mt-3 grid gap-3 md:grid-cols-5">
            <input
              value={safeZoneDraft.name}
              onChange={(event) => setSafeZoneDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={safeZoneDraft.description}
              onChange={(event) => setSafeZoneDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={safeZoneDraft.latitude}
              onChange={(event) => setSafeZoneDraft((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="Latitude"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={safeZoneDraft.longitude}
              onChange={(event) => setSafeZoneDraft((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="Longitude"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={safeZoneDraft.radiusKm}
              onChange={(event) => setSafeZoneDraft((prev) => ({ ...prev, radiusKm: event.target.value }))}
              placeholder="Radius km"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={safeZoneSaving}
              className="rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white md:col-span-5"
            >
              {safeZoneSaving ? 'Saving...' : 'Create Safe Zone'}
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {safeZones.map((safeZone) => (
              <div key={safeZone.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{safeZone.name}</p>
                  <p className="text-xs text-slate-600">
                    {safeZone.description || 'Safe zone'} | {safeZone.latitude.toFixed(4)}, {safeZone.longitude.toFixed(4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSafeZoneDelete(safeZone.id)}
                  className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="mt-6 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-[#0B3D91]">Settings Options</h2>
          <p className="mt-1 text-sm text-slate-600">Manage account password and session directly from the admin dashboard.</p>

          {passwordMessage && (
            <p
              className={`mt-3 rounded-md border p-2 text-xs ${
                passwordError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {passwordMessage}
            </p>
          )}

          <form onSubmit={handleChangePassword} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordInput}
              placeholder="Current Password"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordInput}
              placeholder="New Password"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInput}
              placeholder="Confirm Password"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Logout
              </button>
            </div>
          </form>
        </article>
      </section>
    </PageTransition>
  )
}

export default AdminPage
