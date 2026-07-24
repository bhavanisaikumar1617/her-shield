import { useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

function createInitialFormData(user) {
  return {
    name: user?.name || '',
    phone: user?.phone || '',
    bloodGroup: user?.bloodGroup || '',
    address: user?.address || '',
    emergencyNotes: user?.emergencyNotes || '',
  }
}

function ProfilePage() {
  const { authToken, currentUser, refreshCurrentUser, saveSafetyProfile, logout } = useAppContext()
  const navigate = useNavigate()
  const [formData, setFormData] = useState(() => createInitialFormData(currentUser))
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  useEffect(() => {
    setFormData(createInitialFormData(currentUser))
  }, [currentUser])

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      if (!authToken) {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      setLoading(true)
      await refreshCurrentUser()
      if (isMounted) {
        setLoading(false)
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [authToken, refreshCurrentUser])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handlePasswordInput = (event) => {
    const { name, value } = event.target
    setPasswordData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setProfileMessage('')
    setSavingProfile(true)

    const result = await saveSafetyProfile(formData)
    setProfileError(!result.success)
    setProfileMessage(result.message)
    if (result.success) {
      setIsEditing(false)
    }
    setSavingProfile(false)
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
      console.error('Password change failed:', error)
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

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-96 items-center justify-center">
          <LoadingSpinner label="Loading profile..." size="lg" />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <section className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3D91]">Profile</h1>
            <p className="mt-1 text-sm text-slate-600">Your account information is loaded from the server and saved back to the same user.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setFormData(createInitialFormData(currentUser))
                  setIsEditing(true)
                }}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Edit Profile
              </button>
            )}
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {currentUser?.role || 'user'} account
            </div>
          </div>
        </div>

        {profileMessage && (
          <p
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              profileError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {profileMessage}
          </p>
        )}

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{currentUser?.username || 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{currentUser?.email || 'Not set'}</p>
          </div>
        </div>

        {isEditing ? (
          <Motion.form
            onSubmit={handleSave}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                placeholder="Enter your name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label htmlFor="bloodGroup" className="mb-1 block text-sm font-medium text-slate-700">
                  Blood Group
                </label>
                <input
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                  placeholder="O+"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                placeholder="Current address"
              />
            </div>

            <div>
              <label htmlFor="emergencyNotes" className="mb-1 block text-sm font-medium text-slate-700">
                Emergency Notes
              </label>
              <textarea
                id="emergencyNotes"
                name="emergencyNotes"
                value={formData.emergencyNotes}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
                placeholder="Allergies, medications, instructions..."
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
                  setFormData(createInitialFormData(currentUser))
                  setIsEditing(false)
                }}
                className="rounded-md bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </Motion.form>
        ) : (
          <Motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-[#0B3D91]">Saved Profile Details</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p><span className="font-medium">Full Name:</span> {currentUser?.name || '--'}</p>
              <p><span className="font-medium">Phone:</span> {currentUser?.phone || '--'}</p>
              <p><span className="font-medium">Blood Group:</span> {currentUser?.bloodGroup || '--'}</p>
            </div>
            <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Address:</span> {currentUser?.address || '--'}</p>
            <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Emergency Notes:</span> {currentUser?.emergencyNotes || '--'}</p>
          </Motion.article>
        )}

        {passwordMessage && (
          <p
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              passwordError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {passwordMessage}
          </p>
        )}

        <Motion.form onSubmit={handleChangePassword} className="grid gap-4 rounded-xl border border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0B3D91]">Account Settings</h2>
            <p className="mt-1 text-sm text-slate-600">Change password and logout from your profile page.</p>
          </div>

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
        </Motion.form>
      </section>
    </PageTransition>
  )
}

export default ProfilePage
