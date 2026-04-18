import { useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import PageTransition from '../components/PageTransition'
import FileUploadPreview from '../components/FileUploadPreview'
import SmartImage from '../components/SmartImage'
import useAppContext from '../hooks/useAppContext'

function SignupPage() {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [idProofFile, setIdProofFile] = useState(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const { signup, isSignupLoading } = useAppContext()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    // Validate ID proof for volunteers
    if (role === 'volunteer' && !idProofFile) {
      setIsError(true)
      setMessage('Please upload your ID proof to register as a volunteer.')
      return
    }

    // Create FormData for file upload
    const formData = new FormData()
    formData.append('name', name)
    formData.append('username', username)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('role', role)
    if (idProofFile) {
      formData.append('idProof', idProofFile)
    }

    const result = await signup(formData, role)
    setIsError(!result.success)
    setMessage(result.message)

    if (!result.success) {
      return
    }

    navigate('/login', {
      state: {
        signupSuccess: 'Signup successful. Your volunteer ID will be verified by admins. You can sign in and wait for approval.',
      },
    })
  }

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative min-h-65 lg:min-h-full"
        >
          <SmartImage
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"
            fallbackSrc="https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?auto=format&fit=crop&w=1200&q=80"
            alt="Women safety support illustration"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/40" />
        </Motion.div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-[#0B3D91]">Create Account</h1>
          <p className="mt-2 text-sm text-slate-600">Sign up as a user or volunteer to access the platform.</p>
          <p className="mt-1 text-xs text-slate-500">Admin accounts are created internally and cannot be registered here.</p>

          {message && (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                required
                disabled={isSignupLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required
                disabled={isSignupLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                required
                disabled={isSignupLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
                disabled={isSignupLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={isSignupLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="user">User</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>

            {role === 'volunteer' && (
              <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Note:</span> Volunteers need to upload valid ID proof. Your profile will be verified by admins before you can respond to emergencies.
                </p>
              </div>
            )}

            {role === 'volunteer' && (
              <FileUploadPreview
                file={idProofFile}
                setFile={setIdProofFile}
                label="Upload ID Proof (Required for Volunteers)"
              />
            )}

            <button
              type="submit"
              disabled={isSignupLoading}
              className="w-full rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSignupLoading ? <LoadingSpinner label="Creating account..." size="sm" className="justify-center" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0B3D91] hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}

export default SignupPage
