import cors from 'cors'
import { resolve } from 'node:path'
import express from 'express'
import { createServer } from 'http'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { config as loadEnv } from 'dotenv'
import Alert from './models/Alert.js'
import Contact from './models/Contact.js'
import User from './models/User.js'
import SafeZone from './models/SafeZone.js'
import { connectToDatabase, getMongoUri } from './utils/db.js'

loadEnv({ path: resolve(globalThis.process?.cwd?.() || '.', 'server/.env') })
loadEnv()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

const jwtSecret = String(globalThis.process?.env?.JWT_SECRET || '').trim()
const jwtExpiresIn = '8h'
const frontendBaseUrl = globalThis.process?.env?.FRONTEND_URL || 'http://localhost:5173'
const smtpHost = globalThis.process?.env?.SMTP_HOST || ''
const smtpPort = Number(globalThis.process?.env?.SMTP_PORT || 587)
const smtpUser = globalThis.process?.env?.SMTP_USER || ''
const smtpPass = globalThis.process?.env?.SMTP_PASS || ''
const smtpFrom = globalThis.process?.env?.SMTP_FROM || 'no-reply@hershield.local'

const signupRoles = ['user', 'volunteer']
const rateLimitBuckets = new Map()

const allowedOrigins = [
  frontendBaseUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
].filter(Boolean)
const uniqueAllowedOrigins = [...new Set(allowedOrigins)]

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isDatabaseUnavailableError(error) {
  const errorName = String(error?.name || '')
  const errorMessage = String(error?.message || '')

  return (
    errorName === 'MongooseServerSelectionError' ||
    errorName === 'MongoServerError' ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.toLowerCase().includes('authentication failed') ||
    errorMessage.toLowerCase().includes('bad auth')
  )
}

function createRateLimiter({ windowMs, maxRequests }) {
  return (request, response, next) => {
    const key = `${request.ip}:${request.path}`
    const now = Date.now()
    const bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs }

    if (now > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + windowMs
    }

    bucket.count += 1
    rateLimitBuckets.set(key, bucket)

    if (bucket.count > maxRequests) {
      response.status(429).json({ ok: false, message: 'Too many requests. Please try again later.' })
      return
    }

    next()
  }
}

const authRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 8 })
const sosRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 12 })

function hasSmtpConfig() {
  return Boolean(smtpHost && smtpUser && smtpPass)
}

async function sendPasswordResetEmail({ toEmail, userName, token, expiresAt }) {
  const resetUrl = `${frontendBaseUrl}/forgot-password?token=${encodeURIComponent(token)}`

  if (!hasSmtpConfig()) {
    // Development fallback: do not expose token in API responses.
    console.warn('SMTP is not configured. Password reset email was not sent via SMTP.')
    console.warn(`Password reset fallback for ${toEmail}: token=${token}, expiresAt=${expiresAt.toISOString()}, url=${resetUrl}`)
    return
  }

  let mailer = null
  try {
    const module = await import('nodemailer')
    mailer = module.default
  } catch {
    console.warn('nodemailer is not installed. Falling back to server log reset token output.')
    console.warn(`Password reset fallback for ${toEmail}: token=${token}, expiresAt=${expiresAt.toISOString()}, url=${resetUrl}`)
    return
  }

  const transporter = mailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const safeName = String(userName || 'User').trim() || 'User'
  const expiresMinutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000))

  await transporter.sendMail({
    from: smtpFrom,
    to: toEmail,
    subject: 'HerShield Password Reset Request',
    text: [
      `Hello ${safeName},`,
      '',
      'We received a request to reset your password.',
      `Reset token: ${token}`,
      `This token expires in about ${expiresMinutes} minutes.`,
      `You can also open: ${resetUrl}`,
      '',
      'If you did not request this, please ignore this email.',
    ].join('\n'),
  })
}

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  )
}

function verifyToken(request, response, next) {
  const authHeader = request.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ ok: false, message: 'Missing or invalid authorization token.' })
    return
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    request.auth = decoded
  } catch {
    response.status(401).json({ ok: false, message: 'Invalid or expired token.' })
    return
  }

  Promise.resolve()
    .then(async () => {
      await connectToDatabase()
      const authUserId = request.auth?.userId || request.auth?.id || request.auth?.sub
      const user = await User.findById(authUserId).select('-password')

      if (!user) {
        response.status(401).json({ ok: false, message: 'User not found.' })
        return
      }

      request.user = {
        ...publicUser(user),
        _id: user._id,
      }
      next()
    })
    .catch((error) => {
      console.error('Token verification failed:', error)
      response.status(500).json({ ok: false, message: 'Authentication service unavailable.' })
    })
}

function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ ok: false, message: 'Forbidden: role not allowed.' })
      return
    }
    next()
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase()
}

function normalizeProfileUpdate(body = {}) {
  return {
    name: String(body.name || '').trim(),
    phone: String(body.phone || '').trim(),
    bloodGroup: String(body.bloodGroup || '').trim(),
    address: String(body.address || '').trim(),
    emergencyNotes: String(body.emergencyNotes || '').trim(),
  }
}

function publicUser(user) {
  if (!user) {
    return null
  }

  const plainUser = typeof user.toObject === 'function' ? user.toObject() : user
  const { __v, _id, password: _password, ...safeUser } = plainUser
  return {
    ...safeUser,
    id: safeUser.id || _id?.toString(),
  }
}

function createUserToken(user) {
  return createAuthToken({
    id: user._id.toString(),
    name: user.name,
    role: user.role,
  })
}

function publicAlert(alert) {
  if (!alert) {
    return null
  }

  const plainAlert = typeof alert.toObject === 'function' ? alert.toObject() : alert
  const { __v, _id, user, assignedVolunteerId, ...safeAlert } = plainAlert

  return {
    ...safeAlert,
    id: _id?.toString() || safeAlert.id,
    userId: user?.toString?.() || user || null,
    assignedVolunteerId: assignedVolunteerId?.toString?.() || assignedVolunteerId || null,
    timestamp: safeAlert.timestamp ? new Date(safeAlert.timestamp).toISOString() : new Date().toISOString(),
    assignedAt: safeAlert.assignedAt ? new Date(safeAlert.assignedAt).toISOString() : null,
    onTheWayAt: safeAlert.onTheWayAt ? new Date(safeAlert.onTheWayAt).toISOString() : null,
    reachedAt: safeAlert.reachedAt ? new Date(safeAlert.reachedAt).toISOString() : null,
  }
}

function publicVolunteerAlert(alert) {
  if (!alert) {
    return null
  }

  const safeAlert = publicAlert(alert)
  return {
    ...safeAlert,
    status: safeAlert.status === 'Volunteer Assigned' ? 'Assigned' : safeAlert.status === 'Reached' ? 'Completed' : safeAlert.status,
    userName: alert?.user?.name || safeAlert.userName || null,
    completedAt: alert?.updatedAt ? new Date(alert.updatedAt).toISOString() : null,
  }
}

function publicContact(contact) {
  if (!contact) {
    return null
  }

  const plainContact = typeof contact.toObject === 'function' ? contact.toObject() : contact
  const { __v, _id, user, ...safeContact } = plainContact
  return {
    ...safeContact,
    id: _id?.toString() || safeContact.id,
    userId: user?.toString?.() || user || null,
  }
}

function publicSafeZone(safeZone) {
  if (!safeZone) {
    return null
  }

  const plainSafeZone = typeof safeZone.toObject === 'function' ? safeZone.toObject() : safeZone
  const { __v, _id, createdBy, ...safeZoneData } = plainSafeZone
  return {
    ...safeZoneData,
    id: _id?.toString() || safeZoneData.id,
    createdBy: createdBy?.toString?.() || createdBy || null,
  }
}

function emitToAlertAudience(ioInstance, eventName, alertPayload) {
  const rooms = []

  if (alertPayload?.userId) {
    rooms.push(`user:${alertPayload.userId}`)
  }

  rooms.push('role:admin', 'role:volunteer')
  const uniqueRooms = [...new Set(rooms)]
  let scopedIo = ioInstance
  uniqueRooms.forEach((room) => {
    scopedIo = scopedIo.to(room)
  })
  scopedIo.emit(eventName, alertPayload)
}

function emitAlertUpdated(ioInstance, alertPayload) {
  emitToAlertAudience(ioInstance, 'alert-updated', alertPayload)
  if (alertPayload?.status === 'Volunteer Assigned') {
    emitToAlertAudience(ioInstance, 'alert-assigned', alertPayload)
  }
}

function emitLocationUpdate(ioInstance, payload) {
  const rooms = []

  if (payload?.userId) {
    rooms.push(`user:${payload.userId}`)
  }

  rooms.push('role:admin', 'role:volunteer')
  const uniqueRooms = [...new Set(rooms)]
  let scopedIo = ioInstance
  uniqueRooms.forEach((room) => {
    scopedIo = scopedIo.to(room)
  })
  scopedIo.emit('location-update', payload)
  scopedIo.emit('volunteer-location-update', payload)
}

function toRadians(value) {
  return (value * Math.PI) / 180
}

function haversineDistanceKm(from, to) {
  const earthRadiusKm = 6371
  const dLat = toRadians(to.latitude - from.latitude)
  const dLng = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

app.get('/health', (_, response) => {
  response.json({ ok: true, service: 'her-shield-socket-server' })
})

app.post('/api/auth/signup', authRateLimiter, async (request, response) => {
  try {
    await connectToDatabase()
    const { name, email, username, password, role, idProofBase64 } = request.body
    const normalizedRole = String(role || '').trim().toLowerCase()
    const normalizedEmail = normalizeEmail(email)
    const normalizedUsername = normalizeUsername(username)
    const trimmedName = String(name || '').trim()

    if (!trimmedName || !normalizedEmail || !normalizedUsername || !password) {
      response.status(400).json({ ok: false, message: 'Name, username, email, and password are required.' })
      return
    }

    if (!signupRoles.includes(normalizedRole)) {
      response.status(400).json({ ok: false, message: 'Invalid role. Admin signup is not allowed.' })
      return
    }

    if (normalizedRole === 'volunteer' && !idProofBase64) {
      response.status(400).json({ ok: false, message: 'ID proof is required for volunteer registration.' })
      return
    }

    const existingUserByEmail = await User.findOne({ email: normalizedEmail })
    if (existingUserByEmail) {
      response.status(409).json({ ok: false, message: 'Email is already registered.' })
      return
    }

    const existingUserByUsername = await User.findOne({ username: normalizedUsername })
    if (existingUserByUsername) {
      response.status(409).json({ ok: false, message: 'Username is already taken.' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      username: normalizedUsername,
      password: hashedPassword,
      role: normalizedRole,
      isVerified: normalizedRole === 'volunteer' ? false : true,
      isAvailable: true,
      idProofUrl: normalizedRole === 'volunteer' ? idProofBase64 : null,
    })

    response.status(201).json({
      ok: true,
      message: 'Signup successful.',
      user: publicUser(user),
    })
  } catch (error) {
    console.error('Signup failed:', error)
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({
        ok: false,
        message: 'Database unavailable. Configure MONGO_URI and ensure MongoDB is reachable.',
      })
      return
    }

    response.status(500).json({ ok: false, message: 'Unable to complete signup right now.' })
  }
})

const handleForgotPassword = async (request, response) => {
  try {
    await connectToDatabase()
    const normalizedEmail = normalizeEmail(request.body?.email)

    if (!normalizedEmail) {
      response.status(400).json({ ok: false, message: 'Email is required.' })
      return
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+resetPasswordToken +resetPasswordExpiresAt')

    // Return the same response shape whether the account exists or not.
    if (!user) {
      response.json({
        ok: true,
        message: 'If an account with that email exists, a password reset email has been sent.',
      })
      return
    }

    const resetToken = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15)

    user.resetPasswordToken = resetToken
    user.resetPasswordExpiresAt = expiresAt
    await user.save()

    try {
      await sendPasswordResetEmail({
        toEmail: user.email,
        userName: user.name,
        token: resetToken,
        expiresAt,
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      response.status(500).json({ ok: false, message: 'Failed to send reset email. Please try again later.' })
      return
    }

    response.json({
      ok: true,
      message: 'If an account with that email exists, a password reset email has been sent.',
    })
  } catch (error) {
    console.error('Forgot password failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to process forgot password request.' })
  }
}

app.post('/api/auth/forgot-password', authRateLimiter, handleForgotPassword)
app.post('/auth/forgot-password', authRateLimiter, handleForgotPassword)

const handleResetPassword = async (request, response) => {
  try {
    await connectToDatabase()
    const token = String(request.body?.token || '').trim()
    const newPassword = String(request.body?.password || '')

    if (!token || !newPassword) {
      response.status(400).json({ ok: false, message: 'Token and new password are required.' })
      return
    }

    if (newPassword.length < 6) {
      response.status(400).json({ ok: false, message: 'Password must be at least 6 characters long.' })
      return
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpiresAt')

    if (!user) {
      response.status(400).json({ ok: false, message: 'Invalid or expired reset token.' })
      return
    }

    user.password = await bcrypt.hash(newPassword, 10)
    user.resetPasswordToken = null
    user.resetPasswordExpiresAt = null
    await user.save()

    response.json({ ok: true, message: 'Password has been reset successfully.' })
  } catch (error) {
    console.error('Reset password failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to reset password right now.' })
  }
}

app.post('/api/auth/reset-password', authRateLimiter, handleResetPassword)
app.post('/auth/reset-password', authRateLimiter, handleResetPassword)

app.post('/api/auth/login', authRateLimiter, async (request, response) => {
  try {
    await connectToDatabase()
    const { identifier, email, username, password } = request.body
    const rawIdentifier = String(identifier || email || username || '').trim()
    const normalizedIdentifier = rawIdentifier.includes('@') ? normalizeEmail(rawIdentifier) : normalizeUsername(rawIdentifier)

    if (!normalizedIdentifier || !password) {
      response.status(400).json({ ok: false, message: 'Email or username and password are required.' })
      return
    }

    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    }).select('+password')
    if (!user) {
      response.status(401).json({ ok: false, message: 'Invalid credentials' })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      response.status(401).json({ ok: false, message: 'Invalid credentials' })
      return
    }

    const token = createUserToken(user)
    response.json({
      ok: true,
      token,
      user: publicUser(user),
    })
  } catch (error) {
    console.error('Login failed:', error)
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({
        ok: false,
        message: 'Database unavailable. Configure MONGO_URI and ensure MongoDB is reachable.',
      })
      return
    }

    response.status(500).json({ ok: false, message: 'Unable to login right now.' })
  }
})

app.get('/api/auth/me', verifyToken, (request, response) => {
  response.json({ ok: true, user: request.user })
})

app.get('/api/users/me', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const user = await User.findById(request.user._id).select('-password')

    if (!user) {
      response.status(404).json({ ok: false, message: 'User not found.' })
      return
    }

    response.json({ ok: true, user: publicUser(user) })
  } catch (error) {
    console.error('User profile fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load user profile.' })
  }
})

app.put('/api/users/update', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const updates = normalizeProfileUpdate(request.body)

    if (!updates.name) {
      response.status(400).json({ ok: false, message: 'Name is required.' })
      return
    }

    const user = await User.findByIdAndUpdate(
      request.user._id,
      {
        name: updates.name,
        phone: updates.phone,
        bloodGroup: updates.bloodGroup,
        address: updates.address,
        emergencyNotes: updates.emergencyNotes,
      },
      { new: true, runValidators: true }
    ).select('-password')

    if (!user) {
      response.status(404).json({ ok: false, message: 'User not found.' })
      return
    }

    response.json({ ok: true, message: 'Profile updated successfully.', user: publicUser(user) })
  } catch (error) {
    console.error('User profile update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update profile.' })
  }
})

app.put('/api/users/change-password', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const currentPassword = String(request.body?.currentPassword || '')
    const newPassword = String(request.body?.newPassword || '')
    const confirmPassword = String(request.body?.confirmPassword || '')

    if (!currentPassword || !newPassword || !confirmPassword) {
      response.status(400).json({ ok: false, message: 'Current password, new password, and confirmation are required.' })
      return
    }

    if (newPassword !== confirmPassword) {
      response.status(400).json({ ok: false, message: 'New password and confirmation do not match.' })
      return
    }

    if (newPassword.length < 6) {
      response.status(400).json({ ok: false, message: 'New password must be at least 6 characters long.' })
      return
    }

    const user = await User.findById(request.user._id).select('+password')
    if (!user) {
      response.status(404).json({ ok: false, message: 'User not found.' })
      return
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      response.status(400).json({ ok: false, message: 'Current password is incorrect.' })
      return
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    response.json({ ok: true, message: 'Password updated successfully.' })
  } catch (error) {
    console.error('Password change failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to change password.' })
  }
})

app.get('/api/contacts', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const contacts = await Contact.find({ user: request.user._id }).sort({ createdAt: -1 }).lean()
    response.json({ ok: true, contacts: contacts.map((contact) => publicContact(contact)) })
  } catch (error) {
    console.error('Contact fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load contacts.' })
  }
})

app.post('/api/contacts', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const name = String(request.body?.name || '').trim()
    const number = String(request.body?.number || '').trim()
    const relationship = String(request.body?.relationship || '').trim()

    if (!name || !number) {
      response.status(400).json({ ok: false, message: 'Contact name and number are required.' })
      return
    }

    const contact = await Contact.create({
      user: request.user._id,
      name,
      number,
      relationship,
    })

    response.status(201).json({ ok: true, contact: publicContact(contact) })
  } catch (error) {
    console.error('Contact creation failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to create contact.' })
  }
})

app.patch('/api/contacts/:id', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const contact = await Contact.findById(id)

    if (!contact) {
      response.status(404).json({ ok: false, message: 'Contact not found.' })
      return
    }

    if (contact.user.toString() !== request.user._id.toString()) {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot edit another user contact.' })
      return
    }

    const name = String(request.body?.name || contact.name).trim()
    const number = String(request.body?.number || contact.number).trim()
    const relationship = String(request.body?.relationship || contact.relationship || '').trim()

    contact.name = name
    contact.number = number
    contact.relationship = relationship
    await contact.save()

    response.json({ ok: true, contact: publicContact(contact) })
  } catch (error) {
    console.error('Contact update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update contact.' })
  }
})

app.delete('/api/contacts/:id', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const contact = await Contact.findById(id)

    if (!contact) {
      response.status(404).json({ ok: false, message: 'Contact not found.' })
      return
    }

    if (contact.user.toString() !== request.user._id.toString()) {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot delete another user contact.' })
      return
    }

    await contact.deleteOne()
    response.json({ ok: true })
  } catch (error) {
    console.error('Contact delete failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to delete contact.' })
  }
})

app.get('/api/safe-zones', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const allSafeZones = await SafeZone.find({}).sort({ createdAt: -1 }).lean()

    if (request.user.role === 'admin') {
      response.json({ ok: true, safeZones: allSafeZones.map((safeZone) => publicSafeZone(safeZone)) })
      return
    }

    const currentUser = await User.findById(request.user._id).lean()
    if (!currentUser || !isFiniteNumber(currentUser.latitude) || !isFiniteNumber(currentUser.longitude)) {
      response.json({ ok: true, safeZones: allSafeZones.map((safeZone) => publicSafeZone(safeZone)) })
      return
    }

    const nearbySafeZones = allSafeZones
      .map((safeZone) => {
        const distanceKm = haversineDistanceKm(
          { latitude: currentUser.latitude, longitude: currentUser.longitude },
          { latitude: safeZone.latitude, longitude: safeZone.longitude }
        )

        return {
          ...publicSafeZone(safeZone),
          distanceKm: Number(distanceKm.toFixed(2)),
        }
      })
      .filter((safeZone) => safeZone.distanceKm <= (safeZone.radiusKm || 10))
      .sort((a, b) => a.distanceKm - b.distanceKm)

    response.json({ ok: true, safeZones: nearbySafeZones })
  } catch (error) {
    console.error('Safe zones fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load safe zones.' })
  }
})

app.post('/api/safe-zones', verifyToken, requireRole('admin'), async (request, response) => {
  try {
    await connectToDatabase()
    const name = String(request.body?.name || '').trim()
    const description = String(request.body?.description || '').trim()
    const latitude = toNumber(request.body?.latitude)
    const longitude = toNumber(request.body?.longitude)
    const radiusKm = toNumber(request.body?.radiusKm) ?? 1

    if (!name || latitude === null || longitude === null) {
      response.status(400).json({ ok: false, message: 'name, latitude, and longitude are required.' })
      return
    }

    const safeZone = await SafeZone.create({
      name,
      description,
      latitude,
      longitude,
      radiusKm,
      createdBy: request.user._id,
    })

    response.status(201).json({ ok: true, safeZone: publicSafeZone(safeZone) })
  } catch (error) {
    console.error('Safe zone creation failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to create safe zone.' })
  }
})

app.delete('/api/safe-zones/:id', verifyToken, requireRole('admin'), async (request, response) => {
  try {
    await connectToDatabase()
    const removed = await SafeZone.findByIdAndDelete(request.params.id)
    if (!removed) {
      response.status(404).json({ ok: false, message: 'Safe zone not found.' })
      return
    }

    response.json({ ok: true })
  } catch (error) {
    console.error('Safe zone delete failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to delete safe zone.' })
  }
})

app.get('/api/volunteers', async (_, response) => {
  try {
    await connectToDatabase()
    const volunteers = await User.find({ role: 'volunteer' }).sort({ createdAt: -1 }).select('-password').lean()
    response.json({ ok: true, volunteers: volunteers.map((volunteer) => publicUser(volunteer)) })
  } catch (error) {
    console.error('Failed to fetch volunteers:', error)
    response.status(500).json({ ok: false, message: 'Unable to load volunteers.' })
  }
})

app.patch('/api/volunteers/:id/location', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const { latitude, longitude } = request.body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      response.status(400).json({ ok: false, message: 'latitude and longitude are required.' })
      return
    }

    if (request.user.role === 'volunteer' && request.user._id.toString() !== id) {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot update other volunteers.' })
      return
    }

    const volunteer = await User.findOneAndUpdate(
      { _id: id, role: 'volunteer' },
      { latitude, longitude },
      { new: true }
    ).select('-password')

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    const activeAlert = await Alert.findOne({
      assignedVolunteerId: volunteer._id,
      status: { $in: ['Volunteer Assigned', 'On the Way'] },
    })
      .sort({ updatedAt: -1 })
      .lean()

    if (activeAlert) {
      emitLocationUpdate(io, {
        id: activeAlert._id.toString(),
        userId: activeAlert.user?.toString() || null,
        assignedVolunteerId: volunteer._id.toString(),
        assignedVolunteer: volunteer.name,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      })
    }

    response.json({ ok: true, volunteer: publicUser(volunteer) })
  } catch (error) {
    console.error('Volunteer location update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update volunteer location.' })
  }
})

app.patch('/api/volunteers/:id/verification', verifyToken, requireRole('admin'), async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const { isVerified } = request.body

    if (typeof isVerified !== 'boolean') {
      response.status(400).json({ ok: false, message: 'isVerified must be a boolean.' })
      return
    }

    const volunteer = await User.findOneAndUpdate(
      { _id: id, role: 'volunteer' },
      { isVerified, rejectionReason: isVerified ? null : 'Rejected by admin review.' },
      { new: true }
    ).select('-password')

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    response.json({ ok: true, volunteer: publicUser(volunteer) })
  } catch (error) {
    console.error('Volunteer verification update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update volunteer verification.' })
  }
})

app.patch('/api/volunteers/:id/verify', verifyToken, requireRole('admin'), async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const { isVerified } = request.body

    if (typeof isVerified !== 'boolean') {
      response.status(400).json({ ok: false, message: 'isVerified must be a boolean.' })
      return
    }

    const volunteer = await User.findOneAndUpdate(
      { _id: id, role: 'volunteer' },
      { isVerified, rejectionReason: isVerified ? null : 'Rejected by admin review.' },
      { new: true }
    ).select('-password')

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    response.json({ ok: true, volunteer: publicUser(volunteer) })
  } catch (error) {
    console.error('Volunteer verify endpoint failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to verify volunteer.' })
  }
})

app.patch('/api/volunteers/:id/availability', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const { isAvailable } = request.body

    if (request.user.role === 'volunteer' && request.user._id.toString() !== id) {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot update other volunteers.' })
      return
    }

    if (typeof isAvailable !== 'boolean') {
      response.status(400).json({ ok: false, message: 'isAvailable must be a boolean.' })
      return
    }

    const volunteer = await User.findOneAndUpdate(
      { _id: id, role: 'volunteer' },
      { isAvailable },
      { new: true }
    ).select('-password')

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    response.json({ ok: true, volunteer: publicUser(volunteer) })
  } catch (error) {
    console.error('Volunteer availability update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update volunteer availability.' })
  }
})

// Admin volunteer verification endpoints
const adminRoutes = express.Router()
adminRoutes.use(verifyToken, requireRole('admin'))

adminRoutes.get('/volunteers/pending', async (_, response) => {
  try {
    await connectToDatabase()
    const volunteers = await User.find({
      role: 'volunteer',
      isVerified: false,
      $or: [{ rejectionReason: null }, { rejectionReason: { $exists: false } }],
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean()

    response.json({
      success: true,
      data: volunteers.map((v) => publicUser(v)),
    })
  } catch (error) {
    console.error('Failed to fetch pending volunteers:', error)
    response.status(500).json({ success: false, message: 'Unable to load pending volunteers.' })
  }
})

adminRoutes.put('/volunteer/approve/:id', async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params

    const volunteer = await User.findOneAndUpdate(
      { _id: id, role: 'volunteer' },
      { isVerified: true, rejectionReason: null },
      { new: true }
    ).select('-password')

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    response.json({
      ok: true,
      message: 'Volunteer approved successfully.',
      volunteer: publicUser(volunteer),
    })
  } catch (error) {
    console.error('Failed to approve volunteer:', error)
    response.status(500).json({ ok: false, message: 'Unable to approve volunteer.' })
  }
})

adminRoutes.put('/volunteer/reject/:id', async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params

    const volunteer = await User.findOneAndUpdate(
      { _id: id, role: 'volunteer' },
      { isVerified: false, rejectionReason: 'Rejected by admin review.' },
      { new: true }
    ).select('-password')

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    response.json({
      ok: true,
      message: 'Volunteer rejected successfully.',
      volunteer: publicUser(volunteer),
    })
  } catch (error) {
    console.error('Failed to reject volunteer:', error)
    response.status(500).json({ ok: false, message: 'Unable to reject volunteer.' })
  }
})

app.use('/api/admin', adminRoutes)

app.post('/api/users/location', verifyToken, requireRole('user'), async (request, response) => {
  try {
    await connectToDatabase()
    const { latitude, longitude } = request.body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      response.status(400).json({ ok: false, message: 'latitude and longitude are required.' })
      return
    }

    const user = await User.findByIdAndUpdate(
      request.user._id,
      { latitude, longitude },
      { new: true }
    ).select('-password')

    if (!user) {
      response.status(404).json({ ok: false, message: 'User not found.' })
      return
    }

    response.json({ ok: true, user: publicUser(user) })
  } catch (error) {
    console.error('User location update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update user location.' })
  }
})

app.post('/api/volunteers/nearby', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { latitude, longitude, minRadiusKm = 0, maxRadiusKm = 10 } = request.body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      response.status(400).json({ ok: false, message: 'latitude and longitude are required.' })
      return
    }

    const volunteers = await User.find({
      role: 'volunteer',
      isVerified: true,
      isAvailable: true,
      latitude: { $ne: null },
      longitude: { $ne: null },
    })
      .select('-password')
      .lean()

    const nearbyVolunteers = volunteers
      .map((volunteer) => {
        const distanceKm = haversineDistanceKm(
          { latitude, longitude },
          { latitude: volunteer.latitude, longitude: volunteer.longitude }
        )

        return {
          ...publicUser(volunteer),
          distanceKm: Number(distanceKm.toFixed(2)),
        }
      })
      .filter((volunteer) => volunteer.distanceKm >= minRadiusKm && volunteer.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    response.json({
      ok: true,
      radiusKm: { min: minRadiusKm, max: maxRadiusKm },
      count: nearbyVolunteers.length,
      nearestVolunteer: nearbyVolunteers[0] ?? null,
      volunteers: nearbyVolunteers,
    })
  } catch (error) {
    console.error('Nearby volunteer lookup failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to search nearby volunteers.' })
  }
})

app.post('/api/alerts/auto-assign', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { alertId, latitude, longitude, minRadiusKm = 0, maxRadiusKm = 10 } = request.body

    if (!alertId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      response.status(400).json({ ok: false, message: 'alertId, latitude, and longitude are required.' })
      return
    }

    const alert = await Alert.findById(alertId)
    if (!alert) {
      response.status(404).json({ ok: false, message: 'Alert not found.' })
      return
    }

    const isOwnAlert = alert.user?.toString() === request.user._id.toString()
    if (!isOwnAlert && request.user.role !== 'admin') {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot assign this alert.' })
      return
    }

    const volunteers = await User.find({
      role: 'volunteer',
      isVerified: true,
      isAvailable: true,
      latitude: { $ne: null },
      longitude: { $ne: null },
    })
      .select('-password')
      .lean()

    const candidates = volunteers
      .map((volunteer) => {
        const distanceKm = haversineDistanceKm(
          { latitude, longitude },
          { latitude: volunteer.latitude, longitude: volunteer.longitude }
        )

        return {
          ...publicUser(volunteer),
          distanceKm: Number(distanceKm.toFixed(2)),
        }
      })
      .filter((volunteer) => volunteer.distanceKm >= minRadiusKm && volunteer.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    const nearestVolunteer = candidates[0] ?? null

    if (!nearestVolunteer) {
      alert.status = 'Searching'
      alert.assignedVolunteer = null
      alert.assignedVolunteerId = null
      alert.assignedAt = null
      await alert.save()

      const safeAlert = publicAlert(alert)

      response.json({
        ok: true,
        alert: safeAlert,
        nearestVolunteer: null,
        volunteers: candidates,
      })
      emitToAlertAudience(io, 'alert-updated', safeAlert)
      return
    }

    await User.findByIdAndUpdate(nearestVolunteer.id, { isAvailable: false })

    alert.status = 'Volunteer Assigned'
    alert.assignedVolunteer = nearestVolunteer.name
    alert.assignedVolunteerId = nearestVolunteer.id
    alert.assignedAt = new Date()
    await alert.save()

    const safeAlert = publicAlert(alert)

    response.json({
      ok: true,
      alert: safeAlert,
      nearestVolunteer,
      volunteers: candidates,
    })

    emitToAlertAudience(io, 'alert-updated', safeAlert)
  } catch (error) {
    console.error('Automatic assignment failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to assign volunteer automatically.' })
  }
})

app.post('/api/alerts', verifyToken, requireRole('user'), async (request, response) => {
  try {
    await connectToDatabase()
    const { latitude, longitude } = request.body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      response.status(400).json({ ok: false, message: 'latitude and longitude are required.' })
      return
    }

    const alert = await Alert.create({
      user: request.user._id,
      latitude,
      longitude,
      status: 'Searching',
      timestamp: new Date(),
    })

    const safeAlert = publicAlert(alert)
    response.status(201).json({ ok: true, alert: safeAlert })
    emitToAlertAudience(io, 'new-alert', safeAlert)
  } catch (error) {
    console.error('Alert creation failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to create alert.' })
  }
})

app.get('/api/alerts/my-alerts', verifyToken, requireRole('user'), async (request, response) => {
  try {
    await connectToDatabase()
    const alerts = await Alert.find({ user: request.user._id }).sort({ timestamp: -1 }).lean()
    response.json({ ok: true, alerts: alerts.map((alert) => publicAlert(alert)) })
  } catch (error) {
    console.error('My alerts fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load your alerts.' })
  }
})

app.get('/api/alerts/all', verifyToken, requireRole('admin'), async (_, response) => {
  try {
    await connectToDatabase()
    const alerts = await Alert.find({}).sort({ timestamp: -1 }).lean()
    response.json({ ok: true, alerts: alerts.map((alert) => publicAlert(alert)) })
  } catch (error) {
    console.error('All alerts fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load all alerts.' })
  }
})

app.get('/api/alerts', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()

    if (request.user.role === 'admin') {
      const alerts = await Alert.find({}).sort({ timestamp: -1 }).lean()
      response.json({ ok: true, alerts: alerts.map((alert) => publicAlert(alert)) })
      return
    }

    if (request.user.role === 'user') {
      const alerts = await Alert.find({ user: request.user._id }).sort({ timestamp: -1 }).lean()
      response.json({ ok: true, alerts: alerts.map((alert) => publicAlert(alert)) })
      return
    }

    if (request.user.role === 'volunteer') {
      const currentVolunteer = await User.findById(request.user._id).lean()
      if (!currentVolunteer?.isVerified) {
        response.status(403).json({ ok: false, message: 'Volunteer account is not verified yet.' })
        return
      }

      const volunteerLatitude = Number(currentVolunteer.latitude)
      const volunteerLongitude = Number(currentVolunteer.longitude)
      if (!Number.isFinite(volunteerLatitude) || !Number.isFinite(volunteerLongitude)) {
        response.json({ ok: true, alerts: [] })
        return
      }

      const alerts = await Alert.find({}).sort({ timestamp: -1 }).lean()
      const nearbyAlerts = alerts
        .map((alert) => {
          const distanceKm = haversineDistanceKm(
            { latitude: volunteerLatitude, longitude: volunteerLongitude },
            { latitude: alert.latitude, longitude: alert.longitude }
          )
          return {
            ...publicAlert(alert),
            distanceKm: Number(distanceKm.toFixed(2)),
          }
        })
        .filter((alert) => alert.distanceKm <= 10)

      response.json({ ok: true, alerts: nearbyAlerts })
      return
    }

    response.status(403).json({ ok: false, message: 'Forbidden: unsupported role.' })
  } catch (error) {
    console.error('Unified alert fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load alerts.' })
  }
})

app.patch('/api/alerts/:id/assign', verifyToken, requireRole('admin', 'volunteer'), async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const volunteerId = request.user.role === 'volunteer' ? request.user._id : request.body?.volunteerId

    if (!volunteerId) {
      response.status(400).json({ ok: false, message: 'volunteerId is required.' })
      return
    }

    const alert = await Alert.findById(id)
    if (!alert) {
      response.status(404).json({ ok: false, message: 'Alert not found.' })
      return
    }

    const volunteer = await User.findOne({ _id: volunteerId, role: 'volunteer' }).select('-password')
    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    if (!volunteer.isVerified) {
      response.status(400).json({ ok: false, message: 'Volunteer is not verified.' })
      return
    }

    alert.status = 'Volunteer Assigned'
    alert.assignedVolunteer = volunteer.name
    alert.assignedVolunteerId = volunteer._id
    if (!alert.assignedAt) {
      alert.assignedAt = new Date()
    }
    alert.onTheWayAt = null
    alert.reachedAt = null
    await alert.save()

    await User.findByIdAndUpdate(volunteer._id, { isAvailable: false })

    const safeAlert = publicAlert(alert)
    response.json({ ok: true, alert: safeAlert })
    emitAlertUpdated(io, safeAlert)
  } catch (error) {
    console.error('Alert assign failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to assign alert.' })
  }
})

app.get('/api/volunteer/profile', verifyToken, requireRole('volunteer'), async (request, response) => {
  try {
    await connectToDatabase()
    const volunteer = await User.findById(request.user._id).select('-password').lean()

    if (!volunteer) {
      response.status(404).json({ ok: false, message: 'Volunteer not found.' })
      return
    }

    response.json({
      ok: true,
      profile: {
        ...publicUser(volunteer),
        phoneNumber: volunteer.phoneNumber || null,
      },
    })
  } catch (error) {
    console.error('Volunteer profile fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load volunteer profile.' })
  }
})

app.get('/api/alerts/assigned', verifyToken, requireRole('volunteer'), async (request, response) => {
  try {
    await connectToDatabase()
    const alerts = await Alert.find({
      assignedVolunteerId: request.user._id,
      status: { $ne: 'Reached' },
    })
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .lean()

    response.json({ ok: true, alerts: alerts.map((alert) => publicVolunteerAlert(alert)) })
  } catch (error) {
    console.error('Assigned alerts fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load assigned alerts.' })
  }
})

app.get('/api/alerts/completed', verifyToken, requireRole('volunteer'), async (request, response) => {
  try {
    await connectToDatabase()
    const alerts = await Alert.find({
      assignedVolunteerId: request.user._id,
      status: 'Reached',
    })
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .lean()

    response.json({ ok: true, alerts: alerts.map((alert) => publicVolunteerAlert(alert)) })
  } catch (error) {
    console.error('Completed alerts fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load completed alerts.' })
  }
})

app.patch('/api/alerts/:id/complete', verifyToken, requireRole('volunteer'), async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const alert = await Alert.findById(id)

    if (!alert) {
      response.status(404).json({ ok: false, message: 'Alert not found.' })
      return
    }

    const assignedVolunteerId = alert.assignedVolunteerId?.toString()
    if (!assignedVolunteerId || assignedVolunteerId !== request.user._id.toString()) {
      response.status(403).json({ ok: false, message: 'Forbidden: alert is not assigned to this volunteer.' })
      return
    }

    alert.status = 'Reached'
    await alert.save()
    await User.findByIdAndUpdate(request.user._id, { isAvailable: true })

    const populatedAlert = await Alert.findById(id).populate('user', 'name email').lean()
    const safeAlert = publicVolunteerAlert(populatedAlert)

    response.json({ ok: true, alert: safeAlert })
    emitAlertUpdated(io, safeAlert)
  } catch (error) {
    console.error('Complete alert failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to mark alert as completed.' })
  }
})

app.get('/api/alerts/nearby', verifyToken, requireRole('volunteer'), async (request, response) => {
  try {
    await connectToDatabase()

    // Check if volunteer is verified
    const currentVolunteer = await User.findById(request.user._id).lean()
    if (!currentVolunteer?.isVerified) {
      response.status(403).json({
        ok: false,
        message: 'Your account is pending admin verification. You cannot access emergency requests yet.',
      })
      return
    }

    const volunteerLatitude = Number(request.user.latitude)
    const volunteerLongitude = Number(request.user.longitude)

    if (!Number.isFinite(volunteerLatitude) || !Number.isFinite(volunteerLongitude)) {
      response.json({ ok: true, alerts: [] })
      return
    }

    const radiusKm = 10
    const alerts = await Alert.find({}).sort({ timestamp: -1 }).lean()

    const nearbyAlerts = alerts
      .map((alert) => {
        const distanceKm = haversineDistanceKm(
          { latitude: volunteerLatitude, longitude: volunteerLongitude },
          { latitude: alert.latitude, longitude: alert.longitude }
        )

        return {
          ...publicAlert(alert),
          distanceKm: Number(distanceKm.toFixed(2)),
        }
      })
      .filter((alert) => alert.distanceKm <= radiusKm)

    response.json({ ok: true, alerts: nearbyAlerts })
  } catch (error) {
    console.error('Nearby alerts fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load nearby alerts.' })
  }
})

app.patch('/api/alerts/:id/location', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const latitude = toNumber(request.body?.latitude)
    const longitude = toNumber(request.body?.longitude)

    if (latitude === null || longitude === null) {
      response.status(400).json({ ok: false, message: 'latitude and longitude are required.' })
      return
    }

    const alert = await Alert.findById(id)
    if (!alert) {
      response.status(404).json({ ok: false, message: 'Alert not found.' })
      return
    }

    const isAlertOwner = alert.user?.toString() === request.user._id.toString()
    if (!isAlertOwner && request.user.role !== 'admin') {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot update this alert location.' })
      return
    }

    alert.latitude = latitude
    alert.longitude = longitude
    await alert.save()

    const updatedAlert = publicAlert(alert)
    response.json({ ok: true, alert: updatedAlert })
    emitLocationUpdate(io, updatedAlert)
  } catch (error) {
    console.error('Alert location update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update alert location.' })
  }
})

app.patch('/api/alerts/:id/status', verifyToken, requireRole('volunteer', 'admin'), async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const { status } = request.body

    const allowedStatuses = new Set(['Searching', 'Volunteer Assigned', 'On the Way', 'Reached'])
    if (!allowedStatuses.has(status)) {
      response.status(400).json({ ok: false, message: 'Invalid status value.' })
      return
    }

    const alert = await Alert.findById(id)
    if (!alert) {
      response.status(404).json({ ok: false, message: 'Alert not found.' })
      return
    }

    if (request.user.role === 'volunteer') {
      // Check verification status
      const currentVolunteer = await User.findById(request.user._id).lean()
      if (!currentVolunteer?.isVerified) {
        response.status(403).json({
          ok: false,
          message: 'Your account is pending admin verification. You cannot accept emergencies yet.',
        })
        return
      }

      const volunteerId = request.user._id.toString()
      const assignedVolunteerId = alert.assignedVolunteerId?.toString()

      if (status === 'Volunteer Assigned') {
        alert.assignedVolunteer = request.user.name
        alert.assignedVolunteerId = request.user._id
        alert.assignedAt = new Date()
      } else if (assignedVolunteerId !== volunteerId) {
        response.status(403).json({ ok: false, message: 'Forbidden: alert is assigned to another volunteer.' })
        return
      }
    }

    alert.status = status
    if (status === 'Searching') {
      alert.assignedVolunteer = null
      alert.assignedVolunteerId = null
      alert.assignedAt = null
      alert.onTheWayAt = null
      alert.reachedAt = null
    }
    if (status === 'Volunteer Assigned' && !alert.assignedAt) {
      alert.assignedAt = new Date()
    }
    if (status === 'On the Way' && !alert.onTheWayAt) {
      alert.onTheWayAt = new Date()
    }
    if (status === 'Reached') {
      alert.reachedAt = new Date()
    }

    await alert.save()

    const safeAlert = publicAlert(alert)
    response.json({ ok: true, alert: safeAlert })
    emitAlertUpdated(io, safeAlert)
  } catch (error) {
    console.error('Alert status update failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to update alert status.' })
  }
})

app.get('/api/alerts/:id', verifyToken, async (request, response) => {
  try {
    await connectToDatabase()
    const { id } = request.params
    const alert = await Alert.findById(id).lean()

    if (!alert) {
      response.status(404).json({ ok: false, message: 'Alert not found.' })
      return
    }

    const isOwner = alert.user?.toString() === request.user._id.toString()
    const isAssignedVolunteer = alert.assignedVolunteerId?.toString() === request.user._id.toString()
    const canView = request.user.role === 'admin' || isOwner || isAssignedVolunteer || request.user.role === 'volunteer'

    if (!canView) {
      response.status(403).json({ ok: false, message: 'Forbidden: cannot view this alert.' })
      return
    }

    const safeAlert = publicAlert(alert)
    response.json({ ok: true, alert: safeAlert })
  } catch (error) {
    console.error('Alert detail fetch failed:', error)
    response.status(500).json({ ok: false, message: 'Unable to load alert detail.' })
  }
})

app.post('/api/send-contact-alerts', verifyToken, requireRole('user'), sosRateLimiter, (request, response) => {
  const { contacts = [], latitude, longitude } = request.body

  if (!latitude || !longitude) {
    response.status(400).json({ ok: false, message: 'Missing location for alert message.' })
    return
  }

  const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`
  const message = `Emergency! ${request.user?.name || 'User'} needs help. Location: ${mapsLink}`

  const simulatedResults = contacts.map((contact) => {
    const target = contact.number || contact.name || 'Unknown Contact'
    const logLine = `[MOCK SMS -> ${target}] ${message}`
    console.log(logLine)
    return { target, message, delivered: true }
  })

  response.json({
    ok: true,
    sentCount: simulatedResults.length,
    message,
    results: simulatedResults,
  })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: uniqueAllowedOrigins,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  socket.on('register-auth', ({ token }) => {
    try {
      const decoded = jwt.verify(token, jwtSecret)
      socket.data.auth = decoded
      const socketUserId = decoded.userId || decoded.id || decoded.sub
      if (socketUserId) {
        socket.join(`user:${socketUserId}`)
      }
      socket.join(`role:${decoded.role}`)
    } catch (error) {
      console.error('Socket auth registration failed:', error)
    }
  })

  socket.on('trigger-sos', (alertPayload) => {
    if (socket.data?.auth?.role !== 'user') {
      return
    }
    emitToAlertAudience(io, 'new-alert', alertPayload)
  })

  socket.on('update-alert-status', (updatePayload) => {
    emitToAlertAudience(io, 'alert-updated', updatePayload)
  })

  socket.on('location-update', (locationPayload) => {
    emitLocationUpdate(io, locationPayload)
  })

  socket.on('disconnect', () => {})
})

const port = Number(globalThis.process?.env?.PORT || 4000)

httpServer.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Another backend instance is likely running.`)
    globalThis.process?.exit?.(0)
    return
  }

  console.error('HTTP server failed to start:', error)
  globalThis.process?.exit?.(1)
})

async function startServer() {
  if (!jwtSecret) {
    console.error('JWT_SECRET missing in environment configuration')
    globalThis.process?.exit?.(1)
    return
  }

  const mongoUri = getMongoUri()
  if (!mongoUri) {
    console.error('MONGO_URI missing in environment configuration')
    globalThis.process?.exit?.(1)
    return
  }

  httpServer.listen(port, () => {
    console.log(`Socket server listening on http://localhost:${port}`)
  })

  // Start listening first so frontend requests don't fail with ECONNREFUSED.
  // DB-dependent routes already guard with connectToDatabase() and return errors when unavailable.
  connectToDatabase()
    .then(() => {
      console.log('MongoDB Atlas connected')
    })
    .catch((error) => {
      console.error('MongoDB connection failed. API routes requiring DB will return errors until connection is restored.', error)
    })
}

startServer()
