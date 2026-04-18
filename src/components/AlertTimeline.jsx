import { motion as Motion } from 'framer-motion'

function formatTimelineTime(value) {
  if (!value) {
    return 'Pending'
  }
  const date = new Date(value)
  return date.toLocaleString()
}

function buildTimelineItems(alert) {
  const status = alert?.status || 'Searching'

  const isAssigned = ['Volunteer Assigned', 'On the Way', 'Reached'].includes(status)
  const isOnTheWay = ['On the Way', 'Reached'].includes(status)
  const isCompleted = status === 'Reached'

  return [
    {
      key: 'sos',
      label: 'SOS Triggered',
      tone: 'emerald',
      completed: true,
      time: alert?.timestamp,
      volunteer: null,
    },
    {
      key: 'assigned',
      label: 'Volunteer Assigned',
      tone: 'amber',
      completed: isAssigned,
      time: isAssigned ? alert?.assignedAt : null,
      volunteer: alert?.assignedVolunteer || null,
    },
    {
      key: 'on-the-way',
      label: 'On the Way',
      tone: 'sky',
      completed: isOnTheWay,
      time: isOnTheWay ? alert?.onTheWayAt || alert?.updatedAt : null,
      volunteer: alert?.assignedVolunteer || null,
    },
    {
      key: 'completed',
      label: 'Completed',
      tone: 'green',
      completed: isCompleted,
      time: isCompleted ? alert?.reachedAt || alert?.updatedAt : null,
      volunteer: alert?.assignedVolunteer || null,
    },
  ]
}

function itemStyle(tone, completed) {
  if (!completed) {
    return {
      dot: 'border-slate-300 bg-white',
      line: 'bg-slate-200',
      title: 'text-slate-500',
      card: 'border-slate-200 bg-white',
    }
  }

  if (tone === 'emerald' || tone === 'green') {
    return {
      dot: 'border-emerald-500 bg-emerald-500',
      line: 'bg-emerald-200',
      title: 'text-emerald-700',
      card: 'border-emerald-200 bg-emerald-50',
    }
  }

  if (tone === 'amber') {
    return {
      dot: 'border-amber-500 bg-amber-500',
      line: 'bg-amber-200',
      title: 'text-amber-700',
      card: 'border-amber-200 bg-amber-50',
    }
  }

  return {
    dot: 'border-sky-500 bg-sky-500',
    line: 'bg-sky-200',
    title: 'text-sky-700',
    card: 'border-sky-200 bg-sky-50',
  }
}

function AlertTimeline({ alert }) {
  const items = buildTimelineItems(alert)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-[#0B3D91]">Alert Timeline</h3>
      <div className="mt-4 space-y-4">
        {items.map((item, index) => {
          const style = itemStyle(item.tone, item.completed)
          const isLast = index === items.length - 1

          return (
            <Motion.div
              key={item.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="relative flex gap-3"
            >
              <div className="relative flex w-6 justify-center">
                <span className={`mt-1 h-4 w-4 rounded-full border-2 ${style.dot}`} />
                {!isLast && <span className={`absolute left-1/2 top-6 h-[calc(100%+4px)] w-0.5 -translate-x-1/2 ${style.line}`} />}
              </div>
              <article className={`flex-1 rounded-lg border p-3 ${style.card}`}>
                <p className={`text-sm font-semibold ${style.title}`}>{item.label}</p>
                <p className="mt-1 text-xs text-slate-600">Time: {formatTimelineTime(item.time)}</p>
                <p className="mt-1 text-xs text-slate-600">Volunteer: {item.volunteer || 'Not assigned yet'}</p>
              </article>
            </Motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default AlertTimeline
