import bcrypt from 'bcrypt'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import User from './models/User.js'
import { connectToDatabase } from './utils/db.js'

// Load server .env if present
loadEnv({ path: resolve(globalThis.process?.cwd?.() || '.', 'server/.env') })
loadEnv()

const newPassword = String(process.env.NEW_ADMIN_PASSWORD || '').trim()
const createIfMissing = String(process.env.CREATE_IF_MISSING || 'false').toLowerCase() === 'true'
const adminEmail = process.env.ADMIN_EMAIL || 'admin@hershield.com'
const adminUsername = process.env.ADMIN_USERNAME || 'admin'

async function run() {
  if (!newPassword) {
    console.error('ERROR: NEW_ADMIN_PASSWORD must be set in environment before running this script.')
    process.exitCode = 1
    return
  }

  try {
    await connectToDatabase()

    const user = await User.findOne({ $or: [{ email: adminEmail }, { username: adminUsername }] })

    const hashed = await bcrypt.hash(newPassword, 10)

    if (user) {
      user.password = hashed
      user.isVerified = true
      await user.save()
      console.log('Admin password updated successfully.')
      console.log(`Email: ${user.email}`)
      console.log('Password source: NEW_ADMIN_PASSWORD from environment')
      process.exit(0)
      return
    }

    if (!user && createIfMissing) {
      const created = await User.create({
        name: 'Admin',
        email: adminEmail,
        username: adminUsername,
        password: hashed,
        role: 'admin',
        isVerified: true,
        isAvailable: true,
      })
      console.log('Admin user created successfully.')
      console.log(`Email: ${created.email}`)
      console.log('Password source: NEW_ADMIN_PASSWORD from environment')
      process.exit(0)
      return
    }

    console.error('Admin user not found. To create one set CREATE_IF_MISSING=true and provide NEW_ADMIN_PASSWORD.')
    process.exitCode = 1
  } catch (err) {
    console.error('Failed to update admin password:', err)
    process.exitCode = 1
  }
}

run()
