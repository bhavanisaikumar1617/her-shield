import mongoose from 'mongoose'

function getMongoUri() {
  return globalThis.process?.env?.MONGO_URI || globalThis.process?.env?.MONGODB_URI || ''
}

let connectPromise = null

async function connectToDatabase() {
  const mongoUri = getMongoUri()

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured. Set it in server/.env.')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUri).catch((error) => {
      connectPromise = null
      throw error
    })
  }

  return connectPromise
}

export { connectToDatabase, getMongoUri }
