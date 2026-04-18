import { AnimatePresence, motion } from 'framer-motion'
import useAppContext from '../hooks/useAppContext'

function ToastNotifications() {
  const { notifications, removeNotification } = useAppContext()

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[70] w-[min(92vw,360px)] space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => {
          const variantClass =
            notification.type === 'danger'
              ? 'border-red-300 bg-red-50 text-red-900'
              : notification.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-slate-300 bg-white text-slate-800'

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 24, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24 }}
              className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg ${variantClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-5">{notification.message}</p>
                <button
                  type="button"
                  onClick={() => removeNotification(notification.id)}
                  className="rounded bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default ToastNotifications
