import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const searchingAlertIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const assignedAlertIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const completedAlertIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const volunteerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function iconForStatus(status) {
  if (status === 'Volunteer Assigned' || status === 'On the Way' || status === 'Assigned') {
    return assignedAlertIcon
  }
  if (status === 'Reached' || status === 'Completed') {
    return completedAlertIcon
  }
  return searchingAlertIcon
}

function MapScrollActivator({ onEnable }) {
  useMapEvents({
    click() {
      onEnable()
    },
  })

  return null
}

function AlertMap({ alerts, defaultCenter = [20.5937, 78.9629], userLocation = null, volunteerLocations = [], onMarkerClick = null }) {
  const mapRef = useRef()
  const [mapZoomEnabled, setMapZoomEnabled] = useState(false)

  // Calculate bounds to fit all markers
  useEffect(() => {
    if (mapRef.current && (alerts.length > 0 || volunteerLocations.length > 0)) {
      const map = mapRef.current
      const coordinates = [
        ...alerts.map((alert) => [alert.latitude, alert.longitude]),
        ...volunteerLocations
          .filter((item) => typeof item?.latitude === 'number' && typeof item?.longitude === 'number')
          .map((item) => [item.latitude, item.longitude]),
      ]

      if (coordinates.length === 0) {
        return
      }

      const bounds = L.latLngBounds(coordinates)
      
      // Add user location to bounds if available
      if (userLocation) {
        bounds.extend([userLocation.latitude, userLocation.longitude])
      }
      
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [alerts, userLocation, volunteerLocations])

  const openDirections = (latitude, longitude) => {
    const destination = `${latitude},${longitude}`
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      className="relative z-0 w-full overflow-hidden rounded-xl border border-slate-200 shadow-md"
      style={{ height: '500px' }}
      onMouseLeave={() => setMapZoomEnabled(false)}
    >
      {!mapZoomEnabled && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-md bg-slate-900/80 px-3 py-1 text-xs font-medium text-white">
          Click map to enable zoom
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={5}
        ref={mapRef}
        scrollWheelZoom={mapZoomEnabled}
        className="z-0 h-full w-full"
      >
        <MapScrollActivator onEnable={() => setMapZoomEnabled(true)} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            })}
          >
            <Popup>
              <div className="text-sm font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Alert markers */}
        {alerts.map((alert) => {
          const icon = iconForStatus(alert.status)
          const marker = (
            <Marker
              key={alert.id || alert._id}
              position={[alert.latitude, alert.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick?.(alert),
              }}
            >
              <Popup minWidth={280}>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold">Name:</span> {alert.userName}
                  </div>
                  <div>
                    <span className="font-semibold">Location:</span> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </div>
                  <div>
                    <span className="font-semibold">Status:</span>{' '}
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      alert.status === 'Searching'
                        ? 'bg-red-100 text-red-700'
                        : alert.status === 'Volunteer Assigned'
                          ? 'bg-blue-100 text-blue-700'
                          : alert.status === 'On the Way'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-green-100 text-green-700'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Time:</span> {formatTime(alert.timestamp)}
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span> {formatDate(alert.timestamp)}
                  </div>
                  {alert.assignedVolunteer && (
                    <div>
                      <span className="font-semibold">Volunteer:</span> {alert.assignedVolunteer}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openDirections(alert.latitude, alert.longitude)}
                    className="mt-1 rounded bg-[#0B3D91] px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Get Directions
                  </button>
                </div>
              </Popup>
            </Marker>
          )

          return marker
        })}

        {volunteerLocations
          .filter((item) => typeof item?.latitude === 'number' && typeof item?.longitude === 'number')
          .map((item) => (
            <Marker key={`volunteer-${item.id || item.name}`} position={[item.latitude, item.longitude]} icon={volunteerIcon}>
              <Popup>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="font-semibold">Volunteer Movement</div>
                  <div>{item.name || 'Volunteer'}</div>
                  <div>
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}

export default AlertMap
