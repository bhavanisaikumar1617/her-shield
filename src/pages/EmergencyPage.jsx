import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import ContactsForm from '../components/ContactsForm'
import EmptyState from '../components/EmptyState'
import AlertTimeline from '../components/AlertTimeline'
import LoadingSpinner from '../components/LoadingSpinner'
import LocationMap from '../components/LocationMap'
import PageTransition from '../components/PageTransition'
import SmartImage from '../components/SmartImage'
import useAppContext from '../hooks/useAppContext'

function EmergencyPage() {
  const [manualLatitude, setManualLatitude] = useState('')
  const [manualLongitude, setManualLongitude] = useState('')
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const {
    alerts,
    contacts,
    mapMarker,
    nearbyVolunteers,
    nearestVolunteer,
    safeZones,
    isTriggeringSOS,
    isSOSCooldown,
    sosCooldownRemaining,
    sosErrorMessage,
    setSOSErrorMessage,
    setMapMarker,
    triggerSOS,
  } = useAppContext()
  const recognitionRef = useRef(null)
  const latestAlert = alerts[0]
  const liveLatitude = mapMarker?.lat ?? latestAlert?.latitude
  const liveLongitude = mapMarker?.lng ?? latestAlert?.longitude
  const mapsUrl =
    typeof liveLatitude === 'number' && typeof liveLongitude === 'number'
      ? `https://www.google.com/maps?q=${liveLatitude},${liveLongitude}`
      : null

  const normalizedStatus =
    latestAlert?.status === 'Volunteer Assigned'
      ? 'Assigned'
      : latestAlert?.status === 'On the Way'
        ? 'On the way'
        : latestAlert?.status === 'Reached'
          ? 'Completed'
          : 'Searching'
  const mapVolunteers = nearbyVolunteers.map((volunteer) => ({
    id: volunteer.id,
    name: volunteer.name,
    lat: volunteer.latitude,
    lng: volunteer.longitude,
    distanceKm: volunteer.distanceKm,
  }))

  const handleManualSOS = () => {
    const latitude = Number(manualLatitude)
    const longitude = Number(manualLongitude)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setSOSErrorMessage('Enter valid latitude and longitude values for manual SOS.')
      return
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setSOSErrorMessage('Latitude must be between -90 and 90, and longitude between -180 and 180.')
      return
    }

    triggerSOS({ latitude, longitude })
  }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return undefined
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .toLowerCase()

      if (transcript.includes('help me') || transcript.includes('sos')) {
        triggerSOS()
      }
    }

    recognition.onerror = () => {}
    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [triggerSOS])

  const toggleVoiceSOS = () => {
    if (!recognitionRef.current) {
      setSOSErrorMessage('Voice SOS is not supported in this browser.')
      return
    }

    try {
      if (isVoiceListening) {
        recognitionRef.current.stop()
        setIsVoiceListening(false)
      } else {
        recognitionRef.current.start()
        setIsVoiceListening(true)
      }
    } catch {
      recognitionRef.current.stop()
      setIsVoiceListening(false)
    }
  }

  return (
    <PageTransition>
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative mb-5 overflow-hidden rounded-xl"
        >
          <SmartImage
            src="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1400&q=80"
            fallbackSrc="https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=1400&q=80"
            alt="Emergency assistance support banner"
            className="h-36 w-full object-cover sm:h-40"
          />
          <div className="absolute inset-0 bg-slate-900/45" />
          <p className="absolute inset-x-4 bottom-4 text-sm font-semibold text-white sm:text-base">
            Help is on the way. Stay calm.
          </p>
        </motion.div>

        <h1 className="text-2xl font-bold text-[#0B3D91] sm:text-3xl">Emergency Assistance</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use this page for immediate actions, direct calling, and priority incident updates.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-medium text-red-700">
            {isTriggeringSOS
              ? 'Capturing location and creating alert...'
              : isSOSCooldown
                ? `SOS cooldown active. Try again in ${sosCooldownRemaining}s.`
                : 'Press SOS or use Voice SOS to trigger emergency flow.'}
          </p>
        </motion.div>

        {sosErrorMessage && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            {sosErrorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={triggerSOS}
          disabled={isTriggeringSOS || isSOSCooldown}
          className="mt-4 rounded-md bg-[#D32F2F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
        >
          {isTriggeringSOS ? (
            <LoadingSpinner label="Locating..." size="sm" className="justify-center text-white [&>span:last-child]:text-white" />
          ) : isSOSCooldown ? (
            `Cooldown (${sosCooldownRemaining}s)`
          ) : (
            'Trigger SOS'
          )}
        </button>
        <button
          type="button"
          onClick={toggleVoiceSOS}
          className={`ml-3 mt-4 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition ${
            isVoiceListening ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isVoiceListening ? 'Stop Voice SOS' : 'Voice SOS'}
        </button>

        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-[#0B3D91]">Manual Location Fallback</h2>
          <p className="mt-1 text-xs text-slate-600">
            If location permission is denied, enter coordinates manually and trigger SOS.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              step="0.000001"
              placeholder="Latitude (e.g. 17.3850)"
              value={manualLatitude}
              onChange={(event) => setManualLatitude(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
            />
            <input
              type="number"
              step="0.000001"
              placeholder="Longitude (e.g. 78.4867)"
              value={manualLongitude}
              onChange={(event) => setManualLongitude(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
            />
          </div>
          <button
            type="button"
            onClick={handleManualSOS}
            disabled={isTriggeringSOS || isSOSCooldown}
            className="mt-3 rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Trigger SOS with Manual Location
          </button>
        </section>

        {latestAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
          >
            <p className="font-semibold text-slate-800">Status: {normalizedStatus}</p>
            <p>
              Assigned Volunteer:{' '}
              {latestAlert.assignedVolunteer ? latestAlert.assignedVolunteer : 'Not assigned yet'}
            </p>
            <p>Live location latitude: {typeof liveLatitude === 'number' ? liveLatitude.toFixed(6) : 'N/A'}</p>
            <p>Live location longitude: {typeof liveLongitude === 'number' ? liveLongitude.toFixed(6) : 'N/A'}</p>
            <p>Timestamp: {new Date(latestAlert.timestamp).toLocaleString()}</p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-md bg-[#0B3D91] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Open in Google Maps
              </a>
            )}
          </motion.div>
        )}

        {!latestAlert && (
          <div className="mt-4">
            <EmptyState
              title="No active emergency yet"
              description="Trigger SOS to start live assistance and volunteer assignment."
            />
          </div>
        )}

        {latestAlert && <AlertTimeline alert={latestAlert} />}

        {latestAlert && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0B3D91]">Nearby Volunteers (10 km)</h2>
              <span className="text-xs text-slate-500">Detected after SOS</span>
            </div>

            {nearbyVolunteers.length === 0 && (
              <div className="mt-3">
                <EmptyState title="No alerts yet" description="No verified volunteers were found nearby for this alert." />
              </div>
            )}

            <div className="mt-3 space-y-2">
              {nearbyVolunteers.map((volunteer) => {
                const isNearest = nearestVolunteer?.id === volunteer.id
                return (
                  <article
                    key={volunteer.id}
                    className={`rounded-lg border p-3 ${
                      isNearest
                        ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{volunteer.name}</p>
                    <p className="text-xs text-slate-600">Distance: {volunteer.distanceKm.toFixed(2)} km</p>
                    <p className="text-xs text-slate-500">Status: {isNearest ? 'Nearest volunteer' : 'Nearby'}</p>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {contacts.map((contact, index) => (
            <motion.article
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"
            >
              <h2 className="text-base font-semibold text-[#0B3D91]">{contact.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{contact.number}</p>
            </motion.article>
          ))}
        </div>

        <ContactsForm />
        <LocationMap
          location={mapMarker}
          onPick={setMapMarker}
          volunteers={mapVolunteers}
          safeZones={safeZones}
          nearestVolunteerId={nearestVolunteer?.id ?? null}
        />
      </section>
    </PageTransition>
  )
}

export default EmergencyPage
