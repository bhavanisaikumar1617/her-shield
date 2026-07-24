import mongoose from 'mongoose'

function getMongoUri() {
  return globalThis.process?.env?.MONGO_URI || ''
}

function getMongoConnectTimeoutMs() {
  const raw = Number(globalThis.process?.env?.MONGO_CONNECT_TIMEOUT_MS || 5000)
  return Number.isFinite(raw) && raw > 0 ? raw : 5000
}

let connectPromise = null

async function connectToDatabase() {
  let mongoUri = getMongoUri()

  function maskUri(uri) {
    try {
      if (!uri) return ''
      // mask basic auth credentials
      return uri.replace(/(:\/\/)([^:@\/]+)(:[^@]+)?@/, (m, p1, user) => `${p1}${user}:*****@`)
    } catch {
      return uri
    }
  }

  // If MONGO_URI is missing, allow a development fallback to local MongoDB.
  const allowFallback = (globalThis.process?.env?.NODE_ENV || 'development') !== 'production'
  if (!mongoUri && allowFallback) {
    mongoUri = globalThis.process?.env?.MONGO_FALLBACK_URI || 'mongodb://localhost:27017/her-shield'
    console.warn('MONGO_URI not set; attempting dev fallback to local MongoDB at', maskUri(mongoUri))
  }

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured. Set it in your .env file.')
  }

  console.log('Attempting MongoDB connection to', maskUri(mongoUri))

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: getMongoConnectTimeoutMs(),
    }).catch(async (error) => {
      connectPromise = null

      // Improve error messaging for common DNS / SRV issues (e.g. ENOTFOUND)
      if (error && (error.code === 'ENOTFOUND' || error.syscall === 'querySrv')) {
        const hint = `Failed to resolve SRV record for MongoDB. If you're using MongoDB Atlas (mongodb+srv), ensure your network and DNS can resolve cluster SRV records, your Atlas IP whitelist allows your current IP, and the MONGO_URI is correct.`
        console.error(error.message, hint)

        // In non-production dev, attempt a local fallback so the app remains usable.
        const allowFallback = (globalThis.process?.env?.NODE_ENV || 'development') !== 'production'
        if (allowFallback) {
          const localUri = globalThis.process?.env?.MONGO_FALLBACK_URI || 'mongodb://localhost:27017/her-shield'
          console.warn(`Attempting fallback MongoDB connection to ${maskUri(localUri)}`)
          try {
            const fallbackPromise = await mongoose.connect(localUri, {
              serverSelectionTimeoutMS: Math.max(2000, getMongoConnectTimeoutMs()),
            })
            return fallbackPromise
          } catch (fallbackError) {
            console.error('Local MongoDB fallback failed:', fallbackError.message || fallbackError)
          }
        }

        const wrapped = new Error(`${error.message} — ${hint}`)
        wrapped.original = error
        throw wrapped
      }

      throw error
    })
  }

  return connectPromise
}

export { connectToDatabase, getMongoUri }
