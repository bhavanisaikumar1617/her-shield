import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import { useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#D32F2F;border:3px solid #fff;box-shadow:0 0 0 4px rgba(211,47,47,0.35);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const nearestVolunteerIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#059669;border:3px solid #fff;box-shadow:0 0 0 4px rgba(5,150,105,0.3);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function MarkerPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function MapScrollActivator({ onEnable }) {
  useMapEvents({
    click() {
      onEnable()
    },
  })

  return null
}

function getDistanceKm(from, to) {
  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function LocationMap({ location, onPick, volunteers = [], nearestVolunteerId = null, safeZones = [] }) {
  const [mapZoomEnabled, setMapZoomEnabled] = useState(false)
  const center = location ? [location.lat, location.lng] : [20.5937, 78.9629]

  return (
    <div
      className="relative mt-6 overflow-hidden rounded-xl border border-slate-200 shadow-md"
      onMouseLeave={() => setMapZoomEnabled(false)}
    >
      {!mapZoomEnabled && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-md bg-slate-900/80 px-3 py-1 text-xs font-medium text-white">
          Click map to enable zoom
        </div>
      )}
      <MapContainer
        center={center}
        zoom={location ? 14 : 5}
        scrollWheelZoom={mapZoomEnabled}
        className="h-full w-full"
        style={{ height: '300px' }}
      >
        <MapScrollActivator onEnable={() => setMapZoomEnabled(true)} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerPicker onPick={onPick} />
        {location && (
          <Marker position={[location.lat, location.lng]} icon={userIcon}>
            <Popup>Your location</Popup>
          </Marker>
        )}
        {safeZones.map((safeZone) => (
          <Circle
            key={safeZone.id}
            center={[safeZone.latitude, safeZone.longitude]}
            radius={(safeZone.radiusKm || 1) * 1000}
            pathOptions={{ color: '#16A34A', fillColor: '#86EFAC', fillOpacity: 0.18 }}
          >
            <Popup>
              <p className="font-medium">{safeZone.name}</p>
              <p>{safeZone.description || 'Safe zone'}</p>
              {typeof safeZone.distanceKm === 'number' && <p>Distance: ~{safeZone.distanceKm.toFixed(2)} km</p>}
            </Popup>
          </Circle>
        ))}
        {volunteers.map((volunteer) => {
          const distance = location
            ? getDistanceKm(location, { lat: volunteer.lat, lng: volunteer.lng }).toFixed(2)
            : null
          const isNearest = nearestVolunteerId === volunteer.id
          return (
            <Marker
              key={volunteer.id}
              position={[volunteer.lat, volunteer.lng]}
              icon={isNearest ? nearestVolunteerIcon : undefined}
            >
              <Popup>
                <p className="font-medium">{volunteer.name}</p>
                <p>Status: Available</p>
                {isNearest && <p>Nearest volunteer</p>}
                {distance && <p>Distance: ~{distance} km</p>}
              </Popup>
            </Marker>
          )
        })}
        {location &&
          volunteers.map((volunteer) => (
            <Polyline
              key={`line-${volunteer.id}`}
              positions={[
                [location.lat, location.lng],
                [volunteer.lat, volunteer.lng],
              ]}
              pathOptions={{ color: '#0B3D91', opacity: 0.5, weight: 2, dashArray: '4 6' }}
            />
          ))}
      </MapContainer>
    </div>
  )
}

export default LocationMap
