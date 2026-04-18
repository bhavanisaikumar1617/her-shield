import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import socket from '../lib/socket'

const AppContext = createContext(null)
const tokenStorageKey = 'herShieldAuthToken'

function playNotificationSound() {
  if (typeof window === 'undefined') {
    return
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    return
  }

  const audioContext = new AudioContextClass()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 920
  gainNode.gain.value = 0.001

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  const now = audioContext.currentTime
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.03)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

  oscillator.start(now)
  oscillator.stop(now + 0.38)
}

function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [authToken, setAuthToken] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isSignupLoading, setIsSignupLoading] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [contacts, setContacts] = useState([])
  const [users, setUsers] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [isVolunteersLoading, setIsVolunteersLoading] = useState(false)
  const [nearbyVolunteers, setNearbyVolunteers] = useState([])
  const [nearestVolunteer, setNearestVolunteer] = useState(null)
  const [safeZones, setSafeZones] = useState([])
  const [notifications, setNotifications] = useState([])
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false)
  const [isSOSCooldown, setIsSOSCooldown] = useState(false)
  const [sosCooldownRemaining, setSOSCooldownRemaining] = useState(0)
  const [sosErrorMessage, setSOSErrorMessage] = useState('')
  const [activeAlertId, setActiveAlertId] = useState(null)
  const [modalState, setModalState] = useState({ open: false, title: '', message: '' })
  const [mapMarker, setMapMarker] = useState(null)
  const [safetyProfile, setSafetyProfile] = useState({
    fullName: '',
    phoneNumber: '',
    bloodGroup: '',
    address: '',
    emergencyNotes: '',
  })
  const notifiedEventsRef = useRef(new Set())
  const cooldownTimeoutRef = useRef(null)
  const cooldownIntervalRef = useRef(null)
  const liveLocationIntervalRef = useRef(null)

  const upsertUserLists = useCallback((user) => {
    if (!user) {
      return null
    }

    setUsers((prev) => {
      const exists = prev.some((item) => item.id === user.id)
      if (exists) {
        return prev.map((item) => (item.id === user.id ? { ...item, ...user } : item))
      }
      return [...prev, user]
    })

    if (user.role === 'volunteer') {
      setVolunteers((prev) => {
        const exists = prev.some((item) => item.id === user.id)
        if (exists) {
          return prev.map((item) => (item.id === user.id ? { ...item, ...user } : item))
        }
        return [...prev, user]
      })
    }

    return user
  }, [])

  const syncAuthenticatedUser = useCallback(
    (user) => {
      if (!user) {
        return null
      }

      upsertUserLists(user)
      setCurrentUser(user)
      setUserRole(user.role)
      setSafetyProfile({
        fullName: user.name || '',
        phoneNumber: user.phone || '',
        bloodGroup: user.bloodGroup || '',
        address: user.address || '',
        emergencyNotes: user.emergencyNotes || '',
      })

      return user
    },
    [upsertUserLists]
  )

  const refreshCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem(tokenStorageKey)

    if (!storedToken) {
      return null
    }

    try {
      const response = await fetch('http://localhost:4000/api/users/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(tokenStorageKey)
          setAuthToken(null)
          setCurrentUser(null)
          setUserRole(null)
        }
        return null
      }

      const result = await response.json()
      setAuthToken(storedToken)
      return syncAuthenticatedUser(result.user)
    } catch (error) {
      console.error('Current user refresh failed:', error)
      return null
    }
  }, [syncAuthenticatedUser])

  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        window.clearTimeout(cooldownTimeoutRef.current)
      }
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current)
      }
      if (liveLocationIntervalRef.current) {
        window.clearInterval(liveLocationIntervalRef.current)
      }
    }
  }, [])

  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId))
  }, [])

  const pushNotification = useCallback(
    ({ message, type = 'info', playSound = false }) => {
      const notificationId = crypto.randomUUID()
      setNotifications((prev) => [...prev, { id: notificationId, message, type }])
      if (playSound && isSoundEnabled) {
        playNotificationSound()
      }

      window.setTimeout(() => {
        removeNotification(notificationId)
      }, 4500)
    },
    [isSoundEnabled, removeNotification]
  )

  const authFetch = useCallback(
    (url, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      }

      const token = authToken || localStorage.getItem(tokenStorageKey)
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      return fetch(url, {
        ...options,
        headers,
      })
    },
    [authToken]
  )

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(tokenStorageKey)
      if (!storedToken) {
        setIsAuthLoading(false)
        return
      }

      try {
        await refreshCurrentUser()
      } catch (error) {
        console.error('Auth restore failed:', error)
        localStorage.removeItem(tokenStorageKey)
      } finally {
        setIsAuthLoading(false)
      }
    }

    initializeAuth()
  }, [refreshCurrentUser])

  useEffect(() => {
    const registerSocketAuth = () => {
      if (authToken && currentUser?.id && currentUser?.role) {
        socket.emit('register-auth', { token: authToken })
      }
    }

    registerSocketAuth()
    socket.on('connect', registerSocketAuth)

    return () => {
      socket.off('connect', registerSocketAuth)
    }
  }, [authToken, currentUser?.id, currentUser?.role])

  const fetchAlerts = useCallback(async () => {
    if (!currentUser || !authToken) {
      setAlerts([])
      return
    }

    const endpointByRole = {
      user: 'http://localhost:4000/api/alerts/my-alerts',
      volunteer: 'http://localhost:4000/api/alerts/nearby',
      admin: 'http://localhost:4000/api/alerts/all',
    }

    const endpoint = endpointByRole[currentUser.role]
    if (!endpoint) {
      setAlerts([])
      return
    }

    try {
      const response = await authFetch(endpoint)
      if (!response.ok) {
        return
      }

      const result = await response.json()
      setAlerts(result.alerts ?? [])
    } catch (error) {
      console.error('Alert fetch failed:', error)
    }
  }, [authFetch, authToken, currentUser])

  const fetchContacts = useCallback(async () => {
    if (!currentUser || !authToken) {
      setContacts([])
      return
    }

    try {
      const response = await authFetch('http://localhost:4000/api/contacts')
      if (!response.ok) {
        return
      }

      const result = await response.json()
      setContacts(result.contacts ?? [])
    } catch (error) {
      console.error('Contact fetch failed:', error)
    }
  }, [authFetch, authToken, currentUser])

  const fetchSafeZones = useCallback(async () => {
    if (!currentUser || !authToken) {
      setSafeZones([])
      return
    }

    try {
      const response = await authFetch('http://localhost:4000/api/safe-zones')
      if (!response.ok) {
        return
      }

      const result = await response.json()
      setSafeZones(result.safeZones ?? [])
    } catch (error) {
      console.error('Safe zone fetch failed:', error)
    }
  }, [authFetch, authToken, currentUser])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    fetchSafeZones()
  }, [fetchSafeZones])

  useEffect(() => {
    const handleNewAlert = (incomingAlert) => {
      fetchAlerts()

      if (currentUser?.role !== 'volunteer' && currentUser?.role !== 'admin') {
        return
      }

      const newAlertKey = `new-${incomingAlert.id}`
      if (!notifiedEventsRef.current.has(newAlertKey)) {
        notifiedEventsRef.current.add(newAlertKey)
        pushNotification({
          message: '🚨 New Emergency Alert Nearby!',
          type: 'danger',
          playSound: true,
        })
      }
    }

    const handleAlertUpdated = (payload) => {
      fetchAlerts()

      if (payload?.status === 'Volunteer Assigned' && payload?.assignedVolunteer) {
        const assignedKey = `assigned-${payload.id}`
        if (!notifiedEventsRef.current.has(assignedKey)) {
          notifiedEventsRef.current.add(assignedKey)
          pushNotification({
            message: `Alert assigned to ${payload.assignedVolunteer}`,
            type: 'success',
            playSound: false,
          })
        }
      }
    }

    const handleAlertAssigned = (payload) => {
      fetchAlerts()

      if (payload?.assignedVolunteer) {
        pushNotification({
          message: `Volunteer assigned: ${payload.assignedVolunteer}`,
          type: 'success',
          playSound: false,
        })
      }
    }

    const handleLocationUpdate = (payload) => {
      if (!payload) {
        return
      }

      if (payload.id === activeAlertId || payload.userId === currentUser?.id) {
        setMapMarker({ lat: payload.latitude, lng: payload.longitude })
        setAlerts((prev) => prev.map((alert) => (alert.id === payload.id ? payload : alert)))
      }
    }

    socket.on('new-alert', handleNewAlert)
    socket.on('alert-updated', handleAlertUpdated)
    socket.on('alert-assigned', handleAlertAssigned)
    socket.on('location-update', handleLocationUpdate)
    socket.on('volunteer-location-update', handleLocationUpdate)

    return () => {
      socket.off('new-alert', handleNewAlert)
      socket.off('alert-updated', handleAlertUpdated)
      socket.off('alert-assigned', handleAlertAssigned)
      socket.off('location-update', handleLocationUpdate)
      socket.off('volunteer-location-update', handleLocationUpdate)
    }
  }, [activeAlertId, currentUser?.id, currentUser?.role, fetchAlerts, pushNotification])

  const fetchVolunteers = useCallback(async () => {
    setIsVolunteersLoading(true)
    try {
      const response = await fetch('http://localhost:4000/api/volunteers')
      if (!response.ok) {
        throw new Error('Failed to fetch volunteers')
      }
      const result = await response.json()
      setVolunteers(result.volunteers ?? [])
    } catch (error) {
      console.error('Volunteer fetch failed:', error)
    } finally {
      setIsVolunteersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVolunteers()
  }, [fetchVolunteers])

  const showModal = useCallback((title, message) => {
    setModalState({ open: true, title, message })
  }, [])

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, open: false }))
  }, [])

  const startSOSCooldown = useCallback((durationMs = 10000) => {
    if (cooldownTimeoutRef.current) {
      window.clearTimeout(cooldownTimeoutRef.current)
    }
    if (cooldownIntervalRef.current) {
      window.clearInterval(cooldownIntervalRef.current)
    }

    const cooldownUntil = Date.now() + durationMs
    setIsSOSCooldown(true)
    setSOSCooldownRemaining(Math.ceil(durationMs / 1000))

    cooldownIntervalRef.current = window.setInterval(() => {
      const remainingMs = Math.max(cooldownUntil - Date.now(), 0)
      const remainingSeconds = Math.ceil(remainingMs / 1000)
      setSOSCooldownRemaining(remainingSeconds)
      if (remainingMs <= 0) {
        window.clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
    }, 250)

    cooldownTimeoutRef.current = window.setTimeout(() => {
      setIsSOSCooldown(false)
      setSOSCooldownRemaining(0)
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current)
        cooldownIntervalRef.current = null
      }
    }, durationMs)
  }, [])

  const updateVolunteerLocation = useCallback(async (volunteerId, latitude, longitude) => {
    try {
      const response = await authFetch(`http://localhost:4000/api/volunteers/${volunteerId}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude, longitude }),
      })
      if (!response.ok) {
        return
      }
      const result = await response.json()
      setVolunteers((prev) =>
        prev.map((volunteer) => (volunteer.id === result.volunteer.id ? result.volunteer : volunteer))
      )
    } catch (error) {
      console.error('Volunteer location sync failed:', error)
    }
  }, [authFetch])

  const login = useCallback(
    async (identifier, password) => {
      setIsLoginLoading(true)
      try {
        const response = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        })

        const result = await response.json()

        if (!response.ok) {
          return { success: false, message: result.message || 'Invalid credentials' }
        }

        const token = result.token
        const user = result.user

        localStorage.setItem(tokenStorageKey, token)
        setAuthToken(token)
        syncAuthenticatedUser(user)

        showModal('Welcome to HerShield', `Logged in as ${user.role}.`)

        if (user.role === 'volunteer' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const latitude = position.coords.latitude
              const longitude = position.coords.longitude
              updateVolunteerLocation(user.id, latitude, longitude)
              setCurrentUser((prev) => (prev?.id === user.id ? { ...prev, latitude, longitude } : prev))
              setUsers((prev) =>
                prev.map((item) => (item.id === user.id ? { ...item, latitude, longitude } : item))
              )
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
          )
        }

        return { success: true, user }
      } catch (error) {
        console.error('Login failed:', error)
        return { success: false, message: 'Unable to authenticate. Please try again.' }
      } finally {
        setIsLoginLoading(false)
      }
    },
    [showModal, syncAuthenticatedUser, updateVolunteerLocation]
  )

  const signup = useCallback(async (formDataOrObj) => {
    setIsSignupLoading(true)
    try {
      let body
      
      if (formDataOrObj instanceof FormData) {
        // Extract FormData entries and convert base64 file if present
        const obj = {
          name: formDataOrObj.get('name'),
          username: formDataOrObj.get('username'),
          email: formDataOrObj.get('email'),
          password: formDataOrObj.get('password'),
          role: formDataOrObj.get('role'),
        }
        
        const idProof = formDataOrObj.get('idProof')
        if (idProof) {
          // Read file as base64
          await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              obj.idProofBase64 = reader.result // Data URL format
              resolve()
            }
            reader.onerror = reject
            reader.readAsDataURL(idProof)
          })
        }
        
        body = JSON.stringify(obj)
      } else {
        body = JSON.stringify(formDataOrObj)
      }

      const response = await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      let result = null
      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        return {
          success: false,
          message:
            result?.message ||
            `Signup failed (${response.status}). Please check that the backend and database are running.`,
        }
      }

      const user = result.user
      upsertUserLists(user)

      return { success: true, message: result.message || 'Signup successful.' }
    } catch (error) {
      console.error('Signup failed:', error)
      return { success: false, message: 'Unable to reach signup service. Please start the backend server.' }
    } finally {
      setIsSignupLoading(false)
    }
  }, [upsertUserLists])

  const logout = useCallback(() => {
    localStorage.removeItem(tokenStorageKey)
    setAuthToken(null)
    setCurrentUser(null)
    setUserRole(null)
    setAlerts([])
    setContacts([])
    setSafeZones([])
    setNearbyVolunteers([])
    setNearestVolunteer(null)
    if (liveLocationIntervalRef.current) {
      window.clearInterval(liveLocationIntervalRef.current)
      liveLocationIntervalRef.current = null
    }
    setActiveAlertId(null)
  }, [])

  const addContact = useCallback(
    async (name, number, relationship = '') => {
      const response = await authFetch('http://localhost:4000/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ name, number, relationship }),
      })

      if (!response.ok) {
        throw new Error('Unable to create contact')
      }

      const result = await response.json()
      setContacts((prev) => [result.contact, ...prev.filter((contact) => contact.id !== result.contact.id)])
      return result.contact
    },
    [authFetch]
  )

  const updateContact = useCallback(
    async (contactId, updates) => {
      const response = await authFetch(`http://localhost:4000/api/contacts/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Unable to update contact')
      }

      const result = await response.json()
      setContacts((prev) => prev.map((contact) => (contact.id === result.contact.id ? result.contact : contact)))
      return result.contact
    },
    [authFetch]
  )

  const deleteContact = useCallback(
    async (contactId) => {
      const response = await authFetch(`http://localhost:4000/api/contacts/${contactId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Unable to delete contact')
      }

      setContacts((prev) => prev.filter((contact) => contact.id !== contactId))
    },
    [authFetch]
  )

  const refreshActiveAlertLocation = useCallback(
    async (alertId, latitude, longitude) => {
      if (!alertId) {
        return
      }

      const response = await authFetch(`http://localhost:4000/api/alerts/${alertId}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude, longitude }),
      })

      if (!response.ok) {
        return
      }

      const result = await response.json()
      const updatedAlert = result.alert
      setAlerts((prev) => prev.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert)))
      setMapMarker({ lat: updatedAlert.latitude, lng: updatedAlert.longitude })
    },
    [authFetch]
  )

  const stopLiveLocationTracking = useCallback(() => {
    if (liveLocationIntervalRef.current) {
      window.clearInterval(liveLocationIntervalRef.current)
      liveLocationIntervalRef.current = null
    }
    setActiveAlertId(null)
  }, [])

  const startLiveLocationTracking = useCallback(
    (alertId) => {
      stopLiveLocationTracking()
      setActiveAlertId(alertId)

      liveLocationIntervalRef.current = window.setInterval(() => {
        if (!navigator.geolocation) {
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setMapMarker({ lat: latitude, lng: longitude })
            refreshActiveAlertLocation(alertId, latitude, longitude)
          },
          () => {
            console.error('Live location tracking skipped: geolocation unavailable.')
          },
          { enableHighAccuracy: true, timeout: 8000 }
        )
      }, 8000)
    },
    [refreshActiveAlertLocation, stopLiveLocationTracking]
  )

  const saveSafetyProfile = useCallback(
    async (profileData) => {
      const response = await authFetch('http://localhost:4000/api/users/update', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileData.name ?? profileData.fullName ?? '',
          phone: profileData.phone ?? profileData.phoneNumber ?? '',
          bloodGroup: profileData.bloodGroup ?? '',
          address: profileData.address ?? '',
          emergencyNotes: profileData.emergencyNotes ?? '',
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        return {
          success: false,
          message: result?.message || 'Unable to update profile.',
        }
      }

      syncAuthenticatedUser(result.user)

      return {
        success: true,
        message: result.message || 'Profile updated successfully.',
        user: result.user,
      }
    },
    [authFetch, syncAuthenticatedUser]
  )

  const updateVolunteerAvailability = useCallback(async (volunteerId, isAvailable) => {
    if (!volunteerId) {
      return
    }

    try {
      const response = await authFetch(`http://localhost:4000/api/volunteers/${volunteerId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      })

      if (!response.ok) {
        return
      }

      const result = await response.json()
      setVolunteers((prev) =>
        prev.map((volunteer) => (volunteer.id === result.volunteer.id ? result.volunteer : volunteer))
      )
    } catch (error) {
      console.error('Volunteer availability sync failed:', error)
    }
  }, [authFetch])

  const updateAlertStatus = useCallback(async (alertId, status) => {
    try {
      const response = await authFetch(`http://localhost:4000/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        return
      }

      const result = await response.json()
      const updatedAlert = result.alert

      setAlerts((prev) =>
        prev.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert))
      )

      if (status === 'Reached') {
        stopLiveLocationTracking()
      }

      if (status === 'Reached' && updatedAlert?.assignedVolunteerId) {
        updateVolunteerAvailability(updatedAlert.assignedVolunteerId, true)
      }

      return updatedAlert
    } catch (error) {
      console.error('Alert status update failed:', error)
      return null
    }
  }, [authFetch, stopLiveLocationTracking, updateVolunteerAvailability])

  const executeSOSFlow = useCallback(
    async (latitude, longitude) => {
      try {
        setMapMarker({ lat: latitude, lng: longitude })
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                latitude,
                longitude,
              }
            : prev
        )
        setUsers((prev) =>
          prev.map((user) =>
            user.id === currentUser?.id
              ? {
                  ...user,
                  latitude,
                  longitude,
                }
              : user
          )
        )
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`
        const smsMessage = `Emergency! ${currentUser?.name || 'User'} needs help. Location: ${mapsLink}`
        await authFetch('http://localhost:4000/api/users/location', {
          method: 'POST',
          body: JSON.stringify({
            latitude,
            longitude,
          }),
        })

        const createAlertResponse = await authFetch('http://localhost:4000/api/alerts', {
          method: 'POST',
          body: JSON.stringify({ latitude, longitude }),
        })

        if (!createAlertResponse.ok) {
          throw new Error('Alert creation failed')
        }

        const createdAlertResult = await createAlertResponse.json()
        const createdAlert = createdAlertResult.alert
        setActiveAlertId(createdAlert.id)

        const assignmentResponse = await authFetch('http://localhost:4000/api/alerts/auto-assign', {
          method: 'POST',
          body: JSON.stringify({
            alertId: createdAlert.id,
            latitude,
            longitude,
            minRadiusKm: 0,
            maxRadiusKm: 10,
          }),
        })

        if (!assignmentResponse.ok) {
          throw new Error('Automatic volunteer assignment failed')
        }

        const assignmentResult = await assignmentResponse.json()
        setNearbyVolunteers(assignmentResult.volunteers ?? [])
        setNearestVolunteer(assignmentResult.nearestVolunteer ?? null)

        const alertWithAssignment = assignmentResult.alert ?? createdAlert

        setAlerts((prev) => [alertWithAssignment, ...prev.filter((alert) => alert.id !== alertWithAssignment.id)])

        startLiveLocationTracking(alertWithAssignment.id)

        const response = await authFetch('http://localhost:4000/api/send-contact-alerts', {
          method: 'POST',
          body: JSON.stringify({
            userName: currentUser?.name || 'User',
            contacts,
            latitude,
            longitude,
          }),
        })

        if (!response.ok) {
          throw new Error('Mock contact alert request failed')
        }

        const result = await response.json()
        console.log('[MOCK SMS SENT]', result)
        setSOSErrorMessage('')
        showModal('Emergency Alert Triggered', `Alert sent to contacts (${result.sentCount}). ${smsMessage}`)
      } catch (error) {
        console.error('Contact alert simulation failed:', error)
        setSOSErrorMessage('Unable to complete SOS flow right now. Please check your internet connection.')
        showModal(
          'Emergency Alert Triggered',
          'Alert creation failed due to a network or server issue. Please retry or use manual location.'
        )
      } finally {
        setIsTriggeringSOS(false)
      }
    },
    [authFetch, contacts, currentUser?.id, currentUser?.name, showModal, startLiveLocationTracking]
  )

  const triggerSOS = useCallback(
    (manualLocation = null) => {
      if (!currentUser || currentUser.role !== 'user') {
        setSOSErrorMessage('SOS is available only for users.')
        showModal('Unauthorized Action', 'Only user accounts can trigger SOS.')
        return
      }

      if (isTriggeringSOS || isSOSCooldown) {
        const remaining = Math.max(sosCooldownRemaining, 1)
        setSOSErrorMessage(`Please wait ${remaining}s before triggering SOS again.`)
        return
      }

      if (!navigator.onLine) {
        setSOSErrorMessage('No internet connection. Please reconnect and try again.')
        showModal('No Internet Connection', 'You are offline. Connect to the internet and retry SOS.')
        return
      }

      startSOSCooldown(10000)
      setSOSErrorMessage('')

      if (manualLocation && typeof manualLocation.latitude === 'number' && typeof manualLocation.longitude === 'number') {
        setIsTriggeringSOS(true)
        executeSOSFlow(manualLocation.latitude, manualLocation.longitude)
        return
      }

      if (!navigator.geolocation) {
        setSOSErrorMessage('Geolocation is not supported on this device. Use manual location input.')
        showModal('Location Not Available', 'Geolocation is not supported in this browser. Use manual location input.')
        return
      }

      setIsTriggeringSOS(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          executeSOSFlow(position.coords.latitude, position.coords.longitude)
        },
        (geoError) => {
          setIsTriggeringSOS(false)
          if (geoError?.code === 1) {
            setSOSErrorMessage('Location permission denied. Please allow location or use manual input.')
            showModal(
              'Location Permission Denied',
              'Permission was denied. Please allow location access or enter location manually.'
            )
            return
          }

          if (geoError?.code === 2) {
            setSOSErrorMessage('Location unavailable. Please try again or use manual input.')
            showModal('Location Unavailable', 'Unable to detect your location. Try again or enter it manually.')
            return
          }

          if (geoError?.code === 3) {
            setSOSErrorMessage('Location request timed out. Please retry or use manual input.')
            showModal('Location Timeout', 'Location request timed out. Retry or use manual location input.')
            return
          }

          setSOSErrorMessage('Unable to get location. Please use manual location input.')
          showModal('Location Error', 'Could not access current location. Please use manual location input.')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    },
    [currentUser, executeSOSFlow, isSOSCooldown, isTriggeringSOS, showModal, sosCooldownRemaining, startSOSCooldown]
  )

  const acceptAlert = useCallback(
    async (alertId) => {
      if (!currentUser || currentUser.role !== 'volunteer' || !currentUser.isVerified) {
        return
      }

      const assignedAlert = await updateAlertStatus(alertId, 'Volunteer Assigned')
      if (!assignedAlert) {
        return
      }

      await updateVolunteerAvailability(currentUser.id, false)
      await updateAlertStatus(alertId, 'On the Way')
    },
    [currentUser, updateAlertStatus, updateVolunteerAvailability]
  )

  const declineAlert = useCallback(
    async (alertId) => {
      if (!currentUser || currentUser.role !== 'volunteer' || !currentUser.isVerified) {
        return
      }

      await updateAlertStatus(alertId, 'Searching')
      await updateVolunteerAvailability(currentUser.id, true)
    },
    [currentUser, updateAlertStatus, updateVolunteerAvailability]
  )

  const updateVolunteerVerification = useCallback(async (volunteerId, isVerified) => {
    const response = await authFetch(`http://localhost:4000/api/volunteers/${volunteerId}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    })

    if (!response.ok) {
      throw new Error('Volunteer verification update failed')
    }

    const result = await response.json()
    const updatedVolunteer = result.volunteer

    setVolunteers((prev) =>
      prev.map((volunteer) => (volunteer.id === updatedVolunteer.id ? updatedVolunteer : volunteer))
    )

    setUsers((prev) =>
      prev.map((user) =>
        user.id === updatedVolunteer.id && user.role === 'volunteer'
          ? { ...user, isVerified: updatedVolunteer.isVerified }
          : user
      )
    )

    setCurrentUser((prev) => {
      if (!prev || prev.id !== updatedVolunteer.id || prev.role !== 'volunteer') {
        return prev
      }
      return { ...prev, isVerified: updatedVolunteer.isVerified }
    })

    return updatedVolunteer
  }, [authFetch])

  const value = useMemo(
    () => ({
      currentUser,
      userRole,
      authToken,
      isAuthLoading,
      isLoginLoading,
      isSignupLoading,
      isAuthenticated: Boolean(currentUser && authToken),
      alerts,
      contacts,
      safeZones,
      users,
      volunteers,
      isVolunteersLoading,
      nearbyVolunteers,
      nearestVolunteer,
      notifications,
      isSoundEnabled,
      isSOSCooldown,
      sosCooldownRemaining,
      sosErrorMessage,
      mapMarker,
      activeAlertId,
      safetyProfile,
      isTriggeringSOS,
      modalState,
      login,
      signup,
      logout,
      triggerSOS,
      addContact,
      updateContact,
      deleteContact,
      saveSafetyProfile,
      acceptAlert,
      declineAlert,
      updateAlertStatus,
      updateVolunteerVerification,
      updateVolunteerAvailability,
      fetchAlerts,
      fetchContacts,
      fetchSafeZones,
      fetchVolunteers,
      refreshCurrentUser,
      removeNotification,
      setIsSoundEnabled,
      setSOSErrorMessage,
      closeModal,
      setMapMarker,
    }),
    [
      currentUser,
      userRole,
      authToken,
      isAuthLoading,
      isLoginLoading,
      isSignupLoading,
      alerts,
      contacts,
      safeZones,
      users,
      volunteers,
      isVolunteersLoading,
      nearbyVolunteers,
      nearestVolunteer,
      notifications,
      isSoundEnabled,
      isSOSCooldown,
      sosCooldownRemaining,
      sosErrorMessage,
      mapMarker,
      activeAlertId,
      safetyProfile,
      isTriggeringSOS,
      modalState,
      login,
      signup,
      logout,
      triggerSOS,
      addContact,
      updateContact,
      deleteContact,
      saveSafetyProfile,
      acceptAlert,
      declineAlert,
      updateAlertStatus,
      updateVolunteerVerification,
      updateVolunteerAvailability,
      fetchAlerts,
      fetchContacts,
      fetchSafeZones,
      fetchVolunteers,
      refreshCurrentUser,
      removeNotification,
      closeModal,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export { AppContext, AppProvider }
