# Architecture Deep Dive: Critical Flows

## 🚨 Emergency Alert Flow (Complete)

```
USER TRIGGERS SOS
  ↓ (Manual button or "help me" voice)
Frontend: getCurrentPosition() + triggerSOS()
  ↓
POST /api/create-alert { user, latitude, longitude }
  ↓
Backend:
  1. Validate auth (JWT)
  2. Create Alert doc in MongoDB
  3. Find all verified volunteers within 10km (Haversine)
  4. Emit 'alert-updated' to rooms:
     - user:{userId}
     - role:volunteer
     - role:admin
  ↓
Real-Time Socket Updates:
VOLUNTEER sees: "New alert 2.5km away"
USER sees: "Alert created"
ADMIN sees: "Alert from user123"
  ↓
INIT LIVE LOCATION TRACKING:
setInterval() every 8 seconds:
  1. navigator.geolocation.getCurrentPosition()
  2. PATCH /api/alerts/{id}/location { latitude, longitude }
  3. Emit 'location-update' to audience rooms
  ↓
VOLUNTEER SEES LIVE LOCATION:
  - Location updated every 8 seconds
  - Map polyline shows path
  - Distance to alert calculated
  ↓
VOLUNTEER ACCEPTS:
POST /api/alerts/{id}/auto-assign
  ↓
Backend:
  1. Update alert.assignedVolunteer = volunteerId
  2. Update alert.status = "Assigned"
  3. Emit 'volunteer-assigned' to user room
  4. Emit 'alert-updated' to all rooms
  ↓
USER SEES: "Volunteer [Name] accepted - ETA: ~5 mins"
  - Volunteer location appears on map
  - Can see volunteer approaching in real-time
  ↓
CONTINUING LIVE UPDATES:
  - Every 8 seconds: both user and volunteer update location
  - Both see each other's locations on map
  - Distance updates in real-time
  ↓
VOLUNTEER ARRIVES:
  - Sets alert.status = "Reached"
  - Location polling stops
  - Alert marked as completed
  ↓
FLOW COMPLETE
```

---

## 📱 Contact Management Flow

```
USER: "Add Trusted Contact"
  ↓
Form Input:
  - Name: "Mom"
  - Phone: "+1-555-1234"
  - Relationship: "Parent"
  ↓
Frontend: addContact()
  ↓
POST /api/contacts
{
  name: "Mom",
  number: "+1-555-1234",
  relationship: "Parent"
}
  ↓
Backend:
  1. Verify JWT token (verifyToken middleware)
  2. Validate: name & number required
  3. Create Contact:
     {
       user: req.user._id,
       name: "Mom",
       number: "+1-555-1234",
       relationship: "Parent",
       createdAt, updatedAt
     }
  4. Save to MongoDB
  5. Return contact with id
  ↓
Frontend:
  1. setContacts([...prev, newContact])
  2. Clear form
  3. Show success toast
  ↓
USER VIEWS CONTACTS:
GET /api/contacts
  ↓
Backend:
  1. Verify JWT
  2. Query: Contact.find({ user: req.user._id })
  3. Sort by createdAt descending
  4. Return array
  ↓
Frontend:
  1. setContacts(result.contacts)
  2. Render list with edit/delete buttons
  ↓
USER EDITS CONTACT:
  - Click "Edit" button
  - Form appears with current values
  - Modify name/number/relationship
  - Click "Save"
  ↓
PATCH /api/contacts/{contactId}
{
  name: "Mom Updated",
  number: "+1-555-5678"
}
  ↓
Backend:
  1. Verify JWT
  2. Find contact by ID
  3. Ownership check: contact.user === req.user._id
  4. Update fields
  5. Save
  6. Return updated contact
  ↓
Frontend:
  1. Update contacts array
  2. Exit edit mode
  3. Show success
  ↓
USER DELETES CONTACT:
  - Click "Delete" button
  ↓
DELETE /api/contacts/{contactId}
  ↓
Backend:
  1. Verify JWT
  2. Find contact
  3. Ownership check
  4. Delete from MongoDB
  5. Return success
  ↓
Frontend:
  1. Remove from contacts array
  2. Show success toast
  ↓
CONTACT REMOVED FROM SYSTEM
```

---

## 🗺️ Safe Zone Management Flow (Admin)

```
ADMIN: "Create Safe Zone"
  ↓
Form Input:
  - Name: "Police Station East"
  - Description: "Safe zone with 24/7 police presence"
  - Latitude: 17.365
  - Longitude: 78.415
  - Radius (km): 2
  ↓
Frontend: (in AdminPage.jsx)
  1. Validate inputs
  2. POST /api/safe-zones {name, description, lat, lng, radiusKm}
  ↓
Backend:
  1. Verify JWT (verifyToken middleware)
  2. Check role (requireRole('admin') middleware)
  3. Validate: name required, coordinates valid (±90, ±180)
  4. Create SafeZone:
     {
       name: "Police Station East",
       description: "...",
       latitude: 17.365,
       longitude: 78.415,
       radiusKm: 2,
       createdBy: adminUserId,
       createdAt, updatedAt
     }
  5. Save to MongoDB
  ↓
Frontend:
  1. Show success: "Safe zone created"
  2. Call fetchSafeZones()
  3. Refresh UI
  ↓
USERS/VOLUNTEERS VIEW SAFE ZONES:
GET /api/safe-zones (with user location)
  ↓
Backend:
  1. Verify JWT
  2. Get user location from request or profile
  3. Query: SafeZone.find()
  4. For each zone:
     - Calculate distance: haversineDistance(user, zone)
     - Add distanceKm to response
  5. Return [ { id, name, lat, lng, radiusKm, distanceKm } ]
  ↓
Frontend:
  1. setSafeZones(result.safeZones)
  2. Pass to LocationMap component
  3. Map renders circles:
     - center: [latitude, longitude]
     - radius: radiusKm * 1000 (meters)
     - color: green
     - opacity: 0.18
  4. Click circle → Popup:
     "Police Station East"
     "Safe zone with 24/7 police presence"
     "Distance: ~1.2 km"
  ↓
USER IN EMERGENCY:
  1. SOS triggered
  2. Map shows:
     - User location (red marker)
     - Nearby safe zones (green circles)
     - Assigned volunteer (blue marker)
  3. User can navigate manually to nearest safe zone
  ↓
ADMIN DELETES ZONE:
DELETE /api/safe-zones/{zoneId}
  ↓
Backend:
  1. Verify admin
  2. Find zone
  3. Check createdBy === admin (optional, or allow any admin)
  4. Delete from MongoDB
  ↓
Frontend:
  1. Remove from safeZones array
  2. Zone disappears from all maps
  3. Show success
```

---

## 🔐 Socket.io Room-Based Broadcasting

```
USER LOGS IN:
POST /api/login { phone, password }
  ↓
Backend returns JWT token
  ↓
Frontend stores token
  ↓
Frontend: socket.emit('register-auth', { token })
  ↓
Backend: socket.on('register-auth')
  1. Verify JWT token
  2. Extract user._id and user.role
  3. Join rooms:
     socket.join(`user:${user._id}`)     // e.g., "user:123abc"
     socket.join(`role:${user.role}`)    // e.g., "role:admin"
  4. Store in socket data for future use
  ↓
SOCKET RECONNECTS:
  - Client auto-reconnects
  - Emits 'register-auth' again
  - Rejoin all rooms
  ↓
ALERT CREATED:
function emitToAlertAudience(io, 'alert-updated', payload)
  rooms = [
    `user:${alert.userId}`,  // User who created alert
    'role:admin',             // All admins
    'role:volunteer'          // All volunteers
  ]
  io.to('user:123').to('role:admin').to('role:volunteer').emit('alert-updated', payload)
  ↓
RESULT:
  - User 123 receives the event (own room)
  - All admins receive (role room)
  - All volunteers receive (role room)
  - User 456 (different user) does NOT receive (not in any listed room)
  ✅ NO INFORMATION LEAKAGE
  ✅ NO GLOBAL BROADCASTS
  ✅ ROOM-TARGETED ONLY
  ↓
LOCATION UPDATE:
function emitLocationUpdate(io, { userId, alertId, lat, lng })
  rooms = [`user:${userId}`, 'role:admin', 'role:volunteer']
  io.to(...).emit('location-update', { alertId, latitude: lat, longitude: lng })
  ↓
EACH USER UPDATES THEIR OWN MAP:
  socket.on('location-update', ({ alertId, latitude, longitude }) => {
    setAlerts(prev => 
      prev.map(a => 
        a.id === alertId 
          ? { ...a, latitude, longitude }
          : a
      )
    )
  })
  ✅ UI updates automatically
  ✅ No manual refresh needed
  ✅ Real-time visualization
```

---

## 🎤 Voice SOS Flow

```
USER: "Enable Voice SOS"
  ↓
Frontend: useEffect initialization
  1. Create new SpeechRecognition instance
  2. Set language: 'en-US'
  3. Set continuous: true (keeps listening)
  4. Set interimResults: true
  ↓
JavaScript Web Speech API starts listening
  ↓
USER SPEAKS: "Help me please"
  ↓
Backend (Browser):
Speech Recognition processes audio
  ↓
onresult event fires:
  transcript = "help me please"
  ↓
Frontend: Check for magic words
```javascript
if (transcript.toLowerCase().includes('help me') || 
    transcript.toLowerCase().includes('sos')) {
  triggerSOS()  // Auto-trigger emergency flow
}
```
  ↓
triggerSOS() called:
  1. Get current location
  2. POST /api/create-alert { latitude, longitude }
  3. Start live tracking
  4. Show alert UI
  ↓
USER EXPERIENCE:
  1. Clicks "Enable Voice"
  2. Browser shows microphone icon (listening)
  3. Speaks "help me" or "SOS"
  4. System immediately triggers SOS
  5. (No need for button press)
  ✅ HANDS-FREE EMERGENCY
  ↓
SUPPORTED BROWSERS:
✅ Chrome 25+
✅ Edge 79+
⚠️ Firefox (limited support)
❌ Safari (not supported)
  ↓
FALLBACK:
<!if browser not supported:>
  "Voice SOS not supported in your browser. Use the button below."
  Manual SOS button always available
```

---

## 🔄 Live Location Tracking Flow

```
SOS TRIGGERED:
POST /api/create-alert { latitude, longitude }
  ↓
Backend creates Alert doc
  ↓
Frontend: startLiveLocationTracking(alertId)
  ↓
Create setInterval(async () => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      refreshActiveAlertLocation(alertId, lat, lng)
    },
    null,  // error callback (ignore if denied)
    { enableHighAccuracy: true, timeout: 8000 }
  )
}, 8000)  // Every 8 seconds
  ↓
EVERY 8 SECONDS:
  1. Get device location (GPS or network)
  2. PATCH /api/alerts/{alertId}/location { latitude, longitude }
  ↓
Backend:
  1. Find alert
  2. Update: alert.latitude = lat, alert.longitude = lng
  3. Save
  4. Emit 'location-update' to audience rooms
  ↓
Frontend listeners:
  socket.on('location-update', ({ alertId, latitude, longitude }) => {
    // Update local alert in state
  })
  ↓
MAP UPDATES:
  1. User marker moves to new coordinates
  2. Polyline extends to show path
  3. Volunteer sees location changing
  ↓
WHEN ALERT COMPLETES:
  alert.status = "Reached"
  ↓
Frontend detects:
  stopLiveLocationTracking()
  ↓
clearInterval(liveLocationIntervalRef)
  ↓
GPS polling stops
✅ Battery saved
✅ No more location broadcasts
```

---

## 🔑 JWT Authentication Flow

```
USER REGISTERS:
POST /api/register { name, phone, password, role }
  ↓
Backend:
  1. Validate input
  2. Check if phone exists
  3. Hash password: bcrypt.hash(password, 10)
  4. Create User doc
  5. Generate JWT:
     token = jwt.sign(
       { _id: user._id, role: user.role },
       JWT_SECRET,
       { expiresIn: '8h' }
     )
  ↓
Frontend stores: localStorage.setItem('token', token)
  ↓
USER MAKES REQUEST:
GET /api/my-alerts
  with header: Authorization: Bearer {token}
  ↓
Backend: verifyToken middleware
  1. Extract token from header
  2. jwt.verify(token, JWT_SECRET)
  3. If valid → req.user = { _id, role }
  4. If invalid → return 401 Unauthorized
  5. Proceed to route handler
  ↓
ROLE-BASED ACCESS:
requireRole('volunteer') middleware
  1. Check req.user.role === 'volunteer'
  2. If match → allow
  3. If not → return 403 Forbidden
  ↓
TOKEN EXPIRY:
  All tokens valid for 8 hours
  ↓
IF TOKEN EXPIRED:
POST /api/refresh-token (uses refresh token if implemented)
  ↓
OR:
  User forced to login again
  ↓
ON LOGOUT:
  1. Frontend: localStorage.removeItem('token')
  2. setUser(null)
  3. setAlerts([])
  4. setContacts([])
  5. setSafeZones([])
  6. stopLiveLocationTracking()
  7. Redirect to /login
  ✅ TOKEN CLEARED
  ✅ STATE RESET
  ✅ SAFE FOR SHARED DEVICES
```

---

## 📊 Real-Time Analytics Update

```
ADMIN VIEWS DASHBOARD:
GET /api/all-alerts
  ↓
Backend calculates:
  - Total alerts: 24
  - Active alerts: 5
  - Resolved: 19
  - Avg response time: 8.2 mins
  - Active volunteers: 12
  ↓
Frontend renders Recharts:
  - Bar chart: Alerts over time
  - Pie chart: Status distribution
  - Line chart: Response times
  ↓
REAL-TIME UPDATES:
socket.on('alert-updated', (alert) => {
  // Recalculate metrics
  // Update charts
})
  ↓
USER TRIGGERS SOS:
  ↓
Metrics update instantly:
  - "Active alerts" count increases
  ↓
VOLUNTEER ACCEPTS:
  ↓
Metrics update instantly:
  - "Active volunteers" count decreases (shows available)
  ↓
ALERT COMPLETED:
  ↓
Metrics update instantly:
  - "Resolved" count increases
  - "Active" count decreases
  - Average response time recalculated
  ✅ LIVE DASHBOARD
  ✅ NO PAGE REFRESH NEEDED
```

---

This document explains the complete data flows from user action to system completion. Each flow ensures:
- ✅ Ownership verification
- ✅ Role-based access control
- ✅ Error handling
- ✅ Real-time updates
- ✅ Database persistence
- ✅ User feedback
