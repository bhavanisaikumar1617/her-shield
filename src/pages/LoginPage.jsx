import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAppContext from '../hooks/useAppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import PageTransition from '../components/PageTransition'
import SmartImage from '../components/SmartImage'

function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const { login, isLoginLoading } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  const signupSuccessMessage = location.state?.signupSuccess

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    const result = await login(identifier, password)
    setIsError(!result.success)
    setMessage(result.message)

    if (!result.success) {
      return
    }

    navigate('/')
  }

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative min-h-65 lg:min-h-full"
        >
          <SmartImage
            src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1200&q=80"
            fallbackSrc="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"
            alt="Women safety illustration style portrait"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/40" />
        </motion.div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-[#0B3D91]">Secure Login</h1>
          <p className="mt-2 text-sm italic text-slate-700">"Stay safe. Stay connected. Stay protected."</p>
          <p className="mt-2 text-sm text-slate-600">Sign in with your email or username and password to continue.</p>

          {signupSuccessMessage && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {signupSuccessMessage}
            </p>
          )}

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
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email or Username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Enter your email or username"
                disabled={isLoginLoading}
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
                placeholder="Enter your password"
                disabled={isLoginLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs font-semibold text-[#0B3D91] hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoginLoading ? <LoadingSpinner label="Signing in..." size="sm" className="justify-center" /> : 'Enter Platform'}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-[#0B3D91] hover:underline">
              Signup
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}

export default LoginPage
