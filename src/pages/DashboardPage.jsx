import { motion } from 'framer-motion'
import EmptyState from '../components/EmptyState'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

function DashboardPage() {
  const { alerts } = useAppContext()
  const latestAlert = alerts[0]
  const myAlerts = alerts

  return (
    <PageTransition>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0B3D91]">User Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Monitor your emergency activity and response progress.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total Alerts</p>
            <p className="mt-1 text-3xl font-bold text-[#0B3D91]">{myAlerts.length}</p>
          </motion.article>
          <motion.article
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="rounded-lg bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">Latest Status</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{latestAlert?.status ?? 'No alerts yet'}</p>
          </motion.article>
          <motion.article
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="rounded-lg bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">Latest Time</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {latestAlert ? new Date(latestAlert.timestamp).toLocaleString() : '--'}
            </p>
          </motion.article>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-[#0B3D91]">Alert History</h2>
          <div className="mt-3 space-y-3">
            {myAlerts.length === 0 && (
              <EmptyState title="No alerts yet" description="Trigger SOS from the Emergency page to create your first alert." />
            )}
            {myAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="text-sm font-medium text-slate-800">
                  {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
                <p className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-[#0B3D91]">
                  {alert.status}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  )
}

export default DashboardPage
