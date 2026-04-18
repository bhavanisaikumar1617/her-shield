import { useMemo, useState } from 'react'
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'

const filterOptions = ['Today', 'Weekly', 'Monthly']
const statusOrder = ['Searching', 'Volunteer Assigned', 'On the Way', 'Reached']
const statusColors = ['#F59E0B', '#2563EB', '#8B5CF6', '#16A34A']

function getFilterStartDate(filter) {
  const now = new Date()

  if (filter === 'Today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start
  }

  if (filter === 'Weekly') {
    return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  }

  return new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
}

function formatDayLabel(date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function ReportsPage() {
  const [activeFilter, setActiveFilter] = useState('Weekly')
  const { alerts } = useAppContext()

  const filteredAlerts = useMemo(() => {
    const startDate = getFilterStartDate(activeFilter)
    return alerts.filter((alert) => new Date(alert.timestamp) >= startDate)
  }, [activeFilter, alerts])

  const alertsPerDayData = useMemo(() => {
    const counts = new Map()

    filteredAlerts.forEach((alert) => {
      const day = formatDayLabel(new Date(alert.timestamp))
      counts.set(day, (counts.get(day) ?? 0) + 1)
    })

    return [...counts.entries()].map(([day, count]) => ({ day, count }))
  }, [filteredAlerts])

  const statusDistributionData = useMemo(() => {
    const counts = statusOrder.reduce((acc, status) => {
      acc[status] = 0
      return acc
    }, {})

    filteredAlerts.forEach((alert) => {
      if (counts[alert.status] !== undefined) {
        counts[alert.status] += 1
      }
    })

    return statusOrder.map((status) => ({ name: status, value: counts[status] }))
  }, [filteredAlerts])

  const averageResponseTimeMinutes = useMemo(() => {
    const responseTimes = filteredAlerts
      .filter((alert) => alert.assignedAt)
      .map((alert) => {
        const createdAt = new Date(alert.timestamp).getTime()
        const assignedAt = new Date(alert.assignedAt).getTime()
        return Math.max((assignedAt - createdAt) / 60000, 0)
      })

    if (responseTimes.length === 0) {
      return null
    }

    const total = responseTimes.reduce((sum, value) => sum + value, 0)
    return total / responseTimes.length
  }, [filteredAlerts])

  return (
    <PageTransition>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0B3D91]">Reports & Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">Track emergency trends and response performance.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeFilter === filter
                    ? 'bg-[#0B3D91] text-white'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-[#0B3D91]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Alerts</p>
            <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{filteredAlerts.length}</p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Avg Response Time</p>
            <p className="mt-2 text-3xl font-bold text-[#0B3D91]">
              {averageResponseTimeMinutes === null ? '--' : `${averageResponseTimeMinutes.toFixed(1)} min`}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Assigned Alerts</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {filteredAlerts.filter((alert) => alert.status === 'Volunteer Assigned').length}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Reached Alerts</p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">
              {filteredAlerts.filter((alert) => alert.status === 'Reached').length}
            </p>
          </article>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 p-5 shadow-sm xl:col-span-2">
            <h2 className="text-lg font-semibold text-[#0B3D91]">Alerts Per Day</h2>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={280}>
                <LineChart data={alertsPerDayData}>
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0B3D91]">Status Distribution</h2>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
                <PieChart>
                  <Pie data={statusDistributionData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </section>
    </PageTransition>
  )
}

export default ReportsPage