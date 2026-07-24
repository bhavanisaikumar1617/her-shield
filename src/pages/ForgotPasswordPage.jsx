import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import LoadingSpinner from '../components/LoadingSpinner'

function ForgotPasswordPage() {
  const authBaseUrl = 'https://her-shield-production.up.railway.app/api/auth'
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const tokenFromQuery = params.get('token')
    if (tokenFromQuery) {
      setToken(tokenFromQuery)
    }
  }, [])

  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type') || ''
    const rawBody = await response.text()

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(rawBody)
      } catch {
        return { message: 'Invalid JSON response from server.' }
      }
    }

    // Hide raw HTML 404 pages and return a user-friendly message.
    if (rawBody.includes('<!DOCTYPE html') || rawBody.includes('<html')) {
      if (response.status === 404) {
        return {
          message:
            'Auth endpoint not found (404). Restart backend and ensure latest server code is running on port 4000.',
        }
      }
      return { message: 'Unexpected server response. Please check backend logs.' }
    }

    return { message: rawBody || 'Unexpected server response.' }
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    if (loading) {
      return
    }
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${authBaseUrl}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await parseResponse(response)

      if (!response.ok) {
        setIsError(true)
        setMessage(result.message || 'Failed to generate reset token. Ensure backend is restarted and route exists.')
        return
      }

      setIsError(false)
      setMessage(result.message || 'If an account exists, a reset email has been sent.')
    } catch (error) {
      console.error('Forgot password request failed:', error)
      setIsError(true)
      setMessage('Unable to process request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (resetLoading) {
      return
    }
    setResetLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${authBaseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: newPassword,
        }),
      })
      const result = await parseResponse(response)

      if (!response.ok) {
        setIsError(true)
        setMessage(result.message || 'Password reset failed.')
        return
      }

      setIsError(false)
      setToken('')
      setNewPassword('')
      setMessage('Password reset successful. You can now log in with your new password.')
    } catch (error) {
      console.error('Reset password failed:', error)
      setIsError(true)
      setMessage('Unable to reset password right now.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0B3D91]">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your email to receive a reset token, then set a new password.</p>
        <p className="mt-1 text-xs text-slate-500">Check your inbox (and spam folder) for the reset email.</p>

        {message && (
          <p
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleForgotPassword} className="mt-6 space-y-3">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your account email"
            disabled={loading}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? <LoadingSpinner label="Sending reset email..." size="sm" className="justify-center" /> : 'Send Reset Email'}
          </button>
        </form>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-3 border-t border-slate-200 pt-6">
          <label htmlFor="token" className="block text-sm font-medium text-slate-700">
            Reset Token
          </label>
          <input
            id="token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste reset token"
            disabled={resetLoading}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter new password"
            disabled={resetLoading}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {resetLoading ? <LoadingSpinner label="Resetting password..." size="sm" className="justify-center" /> : 'Reset Password'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Back to{' '}
          <Link to="/login" className="font-semibold text-[#0B3D91] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </PageTransition>
  )
}

export default ForgotPasswordPage
