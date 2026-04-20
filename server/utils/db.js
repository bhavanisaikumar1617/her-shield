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
  const mongoUri = getMongoUri()

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured. Set it in your .env file.')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: getMongoConnectTimeoutMs(),
    }).catch((error) => {
      connectPromise = null
      throw error
    })
  }

  return connectPromise
}

export { connectToDatabase, getMongoUri }
