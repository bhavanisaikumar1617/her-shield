import { Link, useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import useAppContext from '../hooks/useAppContext'
import SmartImage from '../components/SmartImage'
import laptopImage from '../assets/side-view-woman-holding-laptop_23-2149954896.avif'
import nightSafetyImage from '../assets/nightsafety.webp'

const quickActions = [
  {
    id: 'action-sos',
    icon: '🚨',
    title: 'Trigger SOS',
    description: 'Send an emergency alert to volunteers and admins instantly.',
    variant: 'border-red-200 bg-red-50 text-red-800',
    href: null,
  },
  {
    id: 'action-call',
    icon: '📞',
    title: 'Call Emergency',
    description: 'Connect with emergency helpline in one tap.',
    variant: 'border-blue-200 bg-blue-50 text-blue-800',
    href: 'tel:112',
  },
  {
    id: 'action-location',
    icon: '📍',
    title: 'Share Location',
    description: 'Open maps quickly to share your location with trusted contacts.',
    variant: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    href: 'https://www.google.com/maps',
  },
]

const safetyNews = [
  {
    id: 'news-1',
    image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1400&q=80',
    title: 'Emergency Helpline Response Time Reduced in Urban Zones',
    description: 'Local emergency teams report improved average response times through new dispatch coordination.',
    date: 'Apr 17, 2026',
  },
  {
    id: 'news-2',
    image:
      'https://images.unsplash.com/photo-1459183885421-5cc683b8dbba?auto=format&fit=crop&w=1400&q=80',
    title: 'Public Safety Teams Launch New Awareness Drive',
    description: 'Awareness campaigns now focus on prevention, emergency planning, and safe route practices.',
    date: 'Apr 16, 2026',
  },
  {
    id: 'news-3',
    image:
      'https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?auto=format&fit=crop&w=1400&q=80',
    title: 'Location Sharing Adoption Increases During Night Commutes',
    description: 'More users are using live tracking and trusted contact sharing during vulnerable travel periods.',
    date: 'Apr 15, 2026',
  },
]

const platformHighlights = [
  {
    icon: '⚡',
    title: 'Real-time alerts',
    description: 'Emergency incidents are broadcast instantly to the nearest response network.',
  },
  {
    icon: '🛡️',
    title: 'Verified volunteers',
    description: 'Trained and verified volunteers provide trusted support in critical moments.',
  },
  {
    icon: '📡',
    title: 'Live location tracking',
    description: 'Track alerts and movements accurately for quicker and safer interventions.',
  },
]

function ActionCard({ action, onPrimaryAction }) {
  if (action.href) {
    return (
      <a
        href={action.href}
        target={action.href.startsWith('http') ? '_blank' : undefined}
        rel={action.href.startsWith('http') ? 'noreferrer' : undefined}
        className={`rounded-xl border p-5 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl ${action.variant}`}
      >
        <p className="text-2xl">{action.icon}</p>
        <h3 className="mt-2 text-lg font-semibold">{action.title}</h3>
        <p className="mt-2 text-sm opacity-90">{action.description}</p>
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onPrimaryAction}
      className={`w-full rounded-xl border p-5 text-left shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl ${action.variant}`}
    >
      <p className="text-2xl">{action.icon}</p>
      <h3 className="mt-2 text-lg font-semibold">{action.title}</h3>
      <p className="mt-2 text-sm opacity-90">{action.description}</p>
    </button>
  )
}

function NewsCard({ item }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <SmartImage
        src={item.image}
        fallbackSrc="https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1400&q=80"
        alt={item.title}
        className="h-44 w-full rounded-xl object-cover shadow-md"
      />
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.date}</p>
        <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{item.description}</p>
      </div>
    </article>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const { currentUser, triggerSOS } = useAppContext()

  const dashboardPath =
    currentUser?.role === 'admin'
      ? '/admin'
      : currentUser?.role === 'volunteer'
        ? '/volunteer'
        : currentUser
          ? '/dashboard'
          : '/login'

  const handleQuickSOS = () => {
    if (currentUser?.role === 'user') {
      triggerSOS()
      navigate('/emergency')
      return
    }

    if (!currentUser) {
      navigate('/login')
      return
    }

    if (currentUser.role === 'volunteer') {
      navigate('/volunteer')
      return
    }

    navigate('/admin')
  }

  return (
    <PageTransition>
      <section className="relative overflow-hidden rounded-xl shadow-md">
        <SmartImage
          src="src/assets/katherine-hanlon-bHhEJAXyFOg-unsplash.jpg"
          fallbackSrc="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=2000&q=80"
          alt="Safety and emergency assistance visual"
          className="h-[58vh] min-h-105 w-full rounded-xl object-cover shadow-md"
        />
        <div className="absolute inset-0 rounded-xl bg-slate-950/58" />
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center sm:p-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-100 sm:text-sm">Women Safety & Emergency Assistance</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">Your Safety, Our Priority</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-100 sm:text-lg">
              Instant emergency assistance when you need it most.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleQuickSOS}
                className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition duration-300 hover:bg-red-700 hover:shadow-lg"
              >
                🔴 Quick SOS
              </button>
              <Link
                to={dashboardPath}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition duration-300 hover:bg-blue-700 hover:shadow-lg"
              >
                🔵 Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Quick Actions</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">Take immediate safety actions with one tap.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <ActionCard key={action.id} action={action} onPrimaryAction={handleQuickSOS} />
          ))}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-md lg:grid-cols-2">
        <SmartImage
          src="src/assets/safetywomen.jpeg"
          fallbackSrc="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1600&q=80"
          alt="Emergency siren and safety response scene"
          className="h-72 w-full rounded-xl object-cover shadow-md"
        />
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Safety Awareness</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Quick emergency response can save critical minutes when every second matters. Staying aware of your surroundings, preparing trusted contacts, and using SOS tools early can significantly improve safety outcomes.
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-md lg:grid-cols-2">
        <SmartImage
          src={laptopImage}
          fallbackSrc="https://images.unsplash.com/photo-1462899006636-339e08d1844e?auto=format&fit=crop&w=1600&q=80"
          alt="Map and location tracking interface"
          className="h-72 w-full rounded-xl object-cover shadow-md"
        />
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Live Location Tracking</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Real-time tracking helps responders and trusted contacts locate users during emergencies. Live location sharing increases visibility, reduces delays, and supports faster, coordinated rescue assistance.
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-md lg:grid-cols-2">
        <SmartImage
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
          fallbackSrc="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80"
          alt="Community volunteer response team"
          className="h-72 w-full rounded-xl object-cover shadow-md"
        />
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Volunteer Support System</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Verified volunteers form the backbone of rapid community assistance. They help bridge the gap between alert generation and on-ground support, ensuring users are never isolated during critical moments.
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-md lg:grid-cols-2">
        <SmartImage
          src={nightSafetyImage}
          fallbackSrc="https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1600&q=80"
          alt="Night road and low-light visibility"
          className="h-72 w-full rounded-xl object-cover shadow-md"
        />
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Night Safety</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Stay alert and protected in low-light environments.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Latest News & Safety Posts</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">Live community updates and awareness highlights.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {safetyNews.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Core Safety Features</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {platformHighlights.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <p className="text-2xl">{feature.icon}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </PageTransition>
  )
}

export default HomePage
