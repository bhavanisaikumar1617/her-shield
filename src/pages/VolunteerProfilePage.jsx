import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AlertMap from '../components/AlertMap'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

function formatStatus(status) {
  if (status === 'Volunteer Assigned') return 'Assigned'
  if (status === 'Reached') return 'Completed'
  return status
}

function statusBadgeClass(status) {
  if (status === 'Completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'On the Way') return 'border-violet-200 bg-violet-50 text-violet-700'
  if (status === 'Assigned') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function responseDurationLabel(alert) {
  if (!alert?.assignedAt || !alert?.completedAt) {
    return 'N/A'
  }

  const start = new Date(alert.assignedAt).getTime()
  const end = new Date(alert.completedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 'N/A'
  }

  const minutes = Math.round((end - start) / 60000)
  return `${minutes} min`
}

function createInitialFormData(profile, currentUser) {
  return {
    name: profile?.name || currentUser?.name || '',
    phone: profile?.phone || profile?.phoneNumber || currentUser?.phone || '',
    bloodGroup: profile?.bloodGroup || currentUser?.bloodGroup || '',
    address: profile?.address || currentUser?.address || '',
    emergencyNotes: profile?.emergencyNotes || currentUser?.emergencyNotes || '',
  }
}

function VolunteerProfilePage() {
  const { authToken, currentUser, logout, saveSafetyProfile } = useAppContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [assignedAlerts, setAssignedAlerts] = useState([])
  const [completedAlerts, setCompletedAlerts] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [completingAlertId, setCompletingAlertId] = useState(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [formData, setFormData] = useState(() => createInitialFormData(null, currentUser))
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const parseApiResponse = async (response) => {
    const contentType = response.headers.get('content-type') || ''
    const rawBody = await response.text()

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(rawBody)
      } catch {
        return { message: 'Invalid JSON response from server.' }
      }
    }

    if (rawBody.includes('<!DOCTYPE html') || rawBody.includes('<html')) {
      if (response.status === 404) {
        return {
          message: 'Volunteer API endpoint not found (404). Please restart backend server to load latest routes.',
        }
      }
      return { message: 'Unexpected HTML response from server. Check backend logs.' }
    }

    return { message: rawBody || 'Unexpected server response.' }
  }

  const fetchVolunteerData = useCallback(async () => {
    if (!authToken) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const headers = { Authorization: `Bearer ${authToken}` }
      const [profileResponse, assignedResponse, completedResponse] = await Promise.all([
        fetch('http://localhost:4000/api/volunteer/profile', { headers }),
        fetch('http://localhost:4000/api/alerts/assigned', { headers }),
        fetch('http://localhost:4000/api/alerts/completed', { headers }),
      ])

      const [profileResult, assignedResult, completedResult] = await Promise.all([
        parseApiResponse(profileResponse),
        parseApiResponse(assignedResponse),
        parseApiResponse(completedResponse),
      ])

      if (!profileResponse.ok || !assignedResponse.ok || !completedResponse.ok) {
        throw new Error(
          profileResult.message || assignedResult.message || completedResult.message || 'Failed to load profile data.'
        )
      }

      setProfile(profileResult.profile || null)
      setFormData(createInitialFormData(profileResult.profile || null, currentUser))
      setAssignedAlerts(assignedResult.alerts || [])
      setCompletedAlerts(completedResult.alerts || [])
    } catch (error) {
      console.error('Volunteer profile load failed:', error)
      setErrorMessage(error.message || 'Unable to load volunteer profile.')
    } finally {
      setLoading(false)
    }
  }, [authToken, currentUser])

  useEffect(() => {
    fetchVolunteerData()
  }, [fetchVolunteerData])

  const handleCompleteAlert = async (alertId) => {
    if (!authToken) {
      return
    }

    setCompletingAlertId(alertId)
    setErrorMessage('')

    try {
      const response = await fetch(`http://localhost:4000/api/alerts/${alertId}/complete`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(result.message || 'Failed to complete alert.')
      }

      setAssignedAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
      setCompletedAlerts((prev) => [result.alert, ...prev.filter((alert) => alert.id !== result.alert.id)])
    } catch (error) {
      console.error('Complete alert failed:', error)
      setErrorMessage(error.message || 'Unable to mark alert as completed.')
    } finally {
      setCompletingAlertId(null)
    }
  }

  const handleProfileInput = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setProfileMessage('')
    setSavingProfile(true)

    const result = await saveSafetyProfile(formData)
    setProfileError(!result.success)
    setProfileMessage(result.message)

    if (result.success) {
      setIsEditingProfile(false)
      setProfile((prev) => ({
        ...(prev || {}),
        ...result.user,
      }))
    }

    setSavingProfile(false)
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
      const response = await fetch('http://localhost:4000/api/users/change-password', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
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
      console.error('Volunteer password change failed:', error)
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

  const mapAlerts = useMemo(
    () => assignedAlerts.map((alert) => ({ ...alert, status: formatStatus(alert.status) })),
    [assignedAlerts]
  )

  const totalAssignedAlerts = assignedAlerts.length + completedAlerts.length
  const completedCount = completedAlerts.length
  const activeCount = assignedAlerts.length
  const successRate = totalAssignedAlerts > 0 ? Math.round((completedCount / totalAssignedAlerts) * 100) : 0

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-96 items-center justify-center">
          <LoadingSpinner label="Loading volunteer profile..." size="lg" />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-[#0B3D91]">Volunteer Profile</h1>
          <p className="mt-1 text-sm text-slate-600">Manage your profile, assignments, and response history.</p>
        </header>

        {errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total Assigned Alerts</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{totalAssignedAlerts}</p>
          </article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed Alerts</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">{completedCount}</p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Active Alerts</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{activeCount}</p>
          </article>
          <article className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Success Rate</p>
            <p className="mt-2 text-3xl font-bold text-violet-900">{successRate}%</p>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#0B3D91]">Profile Details</h2>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => {
                  setFormData(createInitialFormData(profile, currentUser))
                  setIsEditingProfile(true)
                }}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Edit Profile
              </button>
            )}
          </div>

          {profileMessage && (
            <p
              className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                profileError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {profileMessage}
            </p>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="mt-4 grid gap-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleProfileInput}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileInput}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label htmlFor="bloodGroup" className="mb-1 block text-sm font-medium text-slate-700">Blood Group</label>
                  <input
                    id="bloodGroup"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleProfileInput}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleProfileInput}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="emergencyNotes" className="mb-1 block text-sm font-medium text-slate-700">Emergency Notes</label>
                <textarea
                  id="emergencyNotes"
                  name="emergencyNotes"
                  value={formData.emergencyNotes}
                  onChange={handleProfileInput}
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-md bg-[#0B3D91] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(createInitialFormData(profile, currentUser))
                    setIsEditingProfile(false)
                  }}
                  className="rounded-md bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Full Name</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{profile?.name || currentUser?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{profile?.email || currentUser?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Phone Number</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{profile?.phone || profile?.phoneNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Location</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number'
                    ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
                    : 'Not available'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Verification Status</p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    profile?.isVerified
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {profile?.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">ID Proof</p>
                {profile?.idProofUrl ? (
                  <a
                    href={profile.idProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
                  >
                    View / Download ID Proof
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-medium text-slate-900">Not uploaded</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md">
          <h2 className="text-xl font-semibold text-[#0B3D91]">Assigned Alerts</h2>
          <p className="mt-1 text-sm text-slate-600">Alerts currently assigned to you.</p>

          {assignedAlerts.length > 0 && (
            <div className="mt-4">
              <AlertMap alerts={mapAlerts} />
            </div>
          )}

          {assignedAlerts.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No assigned alerts yet" description="New emergency assignments will appear here." />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {assignedAlerts.map((alert) => {
                const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
                const status = formatStatus(alert.status)
                return (
                  <article
                    key={alert.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-md transition hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">User: {alert.userName || alert.userId || 'Unknown user'}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(status)}`}>
                        {status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                    <p className="mt-1 text-xs text-slate-500">Timestamp: {new Date(alert.timestamp).toLocaleString()}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        View on Map
                      </a>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Get Directions
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCompleteAlert(alert.id)}
                        disabled={completingAlertId === alert.id}
                        className="rounded-md bg-[#0B3D91] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {completingAlertId === alert.id ? 'Completing...' : 'Mark as Completed'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md">
          <h2 className="text-xl font-semibold text-[#0B3D91]">Completed Alerts History</h2>
          {completedAlerts.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No completed alerts yet" description="Completed emergency responses will appear here." />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {completedAlerts.map((alert) => (
                <article key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-md">
                  <p className="text-sm font-semibold text-slate-900">{alert.userName || alert.userId || 'Unknown user'}</p>
                  <p className="mt-2 text-sm text-slate-700">Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                  <p className="mt-1 text-xs text-slate-500">Completed: {new Date(alert.completedAt || alert.timestamp).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">Response duration: {responseDurationLabel(alert)}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md">
          <h2 className="text-xl font-semibold text-[#0B3D91]">Account Settings</h2>
          <p className="mt-1 text-sm text-slate-600">Change password and logout from your profile page.</p>

          {passwordMessage && (
            <p
              className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                passwordError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {passwordMessage}
            </p>
          )}

          <form onSubmit={handleChangePassword} className="mt-4 grid gap-4">
            <div>
              <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordInput}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInput}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInput}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-md bg-[#0B3D91] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Logout
              </button>
            </div>
          </form>
        </section>
      </section>
    </PageTransition>
  )
}

export default VolunteerProfilePage
