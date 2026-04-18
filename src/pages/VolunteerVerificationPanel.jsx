import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import SmartImage from '../components/SmartImage'

function VolunteerVerificationPanel() {
  const { authToken } = useAppContext()
  const [pendingVolunteers, setPendingVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Fetch pending volunteers
  useEffect(() => {
    const fetchPendingVolunteers = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/admin/volunteers/pending', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch volunteers')
        }

        setPendingVolunteers(data.data || [])
      } catch (error) {
        console.error('Error fetching volunteers:', error)
        setIsError(true)
        setMessage(error.message || 'Failed to load pending volunteers.')
      } finally {
        setLoading(false)
      }
    }

    if (authToken) {
      fetchPendingVolunteers()
    }
  }, [authToken])

  const handleApprove = async (volunteerId) => {
    setActionLoading(volunteerId)
    try {
      const response = await fetch(`http://localhost:4000/api/admin/volunteer/approve/${volunteerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })

      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'Failed to approve volunteer')

      // Remove from pending list
      setPendingVolunteers((prev) => prev.filter((v) => v.id !== volunteerId))
      setMessage('Volunteer approved successfully! ✓')
      setIsError(false)
      setShowModal(false)

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error approving volunteer:', error)
      setMessage('Failed to approve volunteer.')
      setIsError(true)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (volunteerId) => {
    setActionLoading(volunteerId)
    try {
      const response = await fetch(`http://localhost:4000/api/admin/volunteer/reject/${volunteerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })

      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'Failed to reject volunteer')

      // Remove from pending list
      setPendingVolunteers((prev) => prev.filter((v) => v.id !== volunteerId))
      setMessage('Volunteer rejected.')
      setIsError(false)
      setShowModal(false)

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error rejecting volunteer:', error)
      setMessage('Failed to reject volunteer.')
      setIsError(true)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-96 items-center justify-center">
          <LoadingSpinner label="Loading volunteers..." size="lg" />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0B3D91]">Volunteer Verification</h1>
          <p className="mt-1 text-slate-600">Review and approve pending volunteer registrations.</p>
        </div>

        {message && (
          <Motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message}
          </Motion.div>
        )}

        {pendingVolunteers.length === 0 ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center"
          >
            <p className="text-lg font-medium text-slate-700">No pending volunteers</p>
            <p className="mt-1 text-sm text-slate-600">All volunteer registrations have been processed.</p>
          </Motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingVolunteers.map((volunteer) => (
              <Motion.div
                key={volunteer.id || volunteer._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">{volunteer.name}</h3>
                  <p className="mt-1 text-xs text-slate-600">{volunteer.email}</p>
                  <p className="mt-1 text-xs text-slate-500">@{volunteer.username || 'unknown'}</p>
                </div>

                <div className="space-y-2 p-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase">Registered</p>
                    <p className="text-sm text-slate-700">
                      {new Date(volunteer.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {volunteer.idProofUrl && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 uppercase">ID Proof Submitted</p>
                      <p className="text-xs text-emerald-600">✓ File uploaded</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleReject(volunteer.id)}
                      disabled={actionLoading === volunteer.id}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === volunteer.id ? 'Rejecting...' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(volunteer.id)}
                      disabled={actionLoading === volunteer.id}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === volunteer.id ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVolunteer(volunteer)
                      setShowModal(true)
                    }}
                    className="w-full rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Review Profile
                  </button>
                </div>
              </Motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && selectedVolunteer && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <Motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
          >
            {/* Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0B3D91]">Volunteer Profile</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-2xl text-slate-400 transition hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 px-6 py-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Name</h3>
                <p className="mt-1 text-lg text-slate-900">{selectedVolunteer.name}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Email</h3>
                <p className="mt-1 text-base text-slate-900">{selectedVolunteer.email}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Username</h3>
                <p className="mt-1 text-base text-slate-900">@{selectedVolunteer.username || 'unknown'}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Phone</h3>
                <p className="mt-1 text-base text-slate-900">{selectedVolunteer.phoneNumber || selectedVolunteer.phone || 'N/A'}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Location</h3>
                <p className="mt-1 text-base text-slate-900">
                  {typeof selectedVolunteer.latitude === 'number' && typeof selectedVolunteer.longitude === 'number'
                    ? `${selectedVolunteer.latitude.toFixed(5)}, ${selectedVolunteer.longitude.toFixed(5)}`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Verification Status</h3>
                <p className="mt-1 text-base text-slate-900">{selectedVolunteer.isVerified ? 'Verified' : 'Pending / Rejected'}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase">Registration Date</h3>
                <p className="mt-1 text-base text-slate-900">
                  {new Date(selectedVolunteer.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {selectedVolunteer.idProofUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase">ID Proof</h3>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {selectedVolunteer.idProofUrl.includes('.pdf') ? (
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={selectedVolunteer.idProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                          View PDF
                        </a>
                        <a
                          href={selectedVolunteer.idProofUrl}
                          download
                          className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <SmartImage
                          src={selectedVolunteer.idProofUrl}
                          fallbackSrc="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80"
                          alt="ID Proof"
                          className="max-h-64 rounded-md border border-slate-200"
                        />
                        <a
                          href={selectedVolunteer.idProofUrl}
                          download
                          className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          Download image
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex gap-3">
              <button
                type="button"
                onClick={() => handleReject(selectedVolunteer.id)}
                disabled={actionLoading === selectedVolunteer.id}
                className="flex-1 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === selectedVolunteer.id ? (
                  <LoadingSpinner label="Rejecting..." size="sm" className="justify-center" />
                ) : (
                  '❌ Reject'
                )}
              </button>
              <button
                type="button"
                onClick={() => handleApprove(selectedVolunteer.id)}
                disabled={actionLoading === selectedVolunteer.id}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === selectedVolunteer.id ? (
                  <LoadingSpinner label="Approving..." size="sm" className="justify-center" />
                ) : (
                  '✅ Approve'
                )}
              </button>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </PageTransition>
  )
}

export default VolunteerVerificationPanel
