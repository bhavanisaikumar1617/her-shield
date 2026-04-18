import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppContext from '../hooks/useAppContext'

function SOSButton() {
  const navigate = useNavigate()
  const { currentUser, triggerSOS, isTriggeringSOS, isSOSCooldown, sosCooldownRemaining } = useAppContext()
  const longPressTimerRef = useRef(null)

  const isUserRole = currentUser?.role === 'user'

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearLongPressTimer()
    }
  }, [])

  const handleSOS = () => {
    if (!isUserRole) {
      return
    }

    triggerSOS()
    navigate('/emergency')
  }

  const handleLongPressStart = () => {
    if (!isUserRole || isTriggeringSOS || isSOSCooldown) {
      return
    }

    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      handleSOS()
      clearLongPressTimer()
    }, 2000)
  }

  const handleLongPressEnd = () => {
    clearLongPressTimer()
  }

  if (!isUserRole) {
    return null
  }

  return (
    <div className="group fixed bottom-6 right-6 z-50">
      <motion.button
        type="button"
        aria-label="Trigger emergency assistance"
        onDoubleClick={handleSOS}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        disabled={isTriggeringSOS || isSOSCooldown}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        whileHover={{ scale: 1.08 }}
        className="relative overflow-visible rounded-full bg-linear-to-br from-red-500 via-red-600 to-red-800 px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_40px_6px_rgba(220,38,38,0.45)] ring-4 ring-red-300/60 transition-shadow hover:shadow-[0_0_55px_12px_rgba(220,38,38,0.55)] disabled:cursor-not-allowed disabled:from-red-400 disabled:to-red-500"
      >
        <span className="pointer-events-none absolute -inset-1 -z-10 rounded-full border border-red-400/70 animate-ping" />
        <span className="pointer-events-none absolute -inset-3 -z-20 rounded-full border border-red-300/40 animate-[ping_2s_ease-in-out_infinite]" />
        {isTriggeringSOS ? 'Locating...' : isSOSCooldown ? `${sosCooldownRemaining}s` : 'SOS'}
      </motion.button>
      <div className="pointer-events-none absolute -top-10 right-0 rounded-full border border-red-200 bg-white/95 px-3 py-1 text-[11px] font-semibold text-red-700 opacity-0 shadow-sm transition group-hover:opacity-100">
        Tap in emergency
      </div>
    </div>
  )
}

export default SOSButton
