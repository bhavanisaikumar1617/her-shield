import bcrypt from 'bcrypt'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import User from './models/User.js'
import { connectToDatabase } from './utils/db.js'

loadEnv({ path: resolve(globalThis.process?.cwd?.() || '.', 'server/.env') })
loadEnv()

const defaultAdmin = {
  name: 'Admin',
  email: 'admin@hershield.com',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
}

async function seedAdmin() {
  try {
    await connectToDatabase()

    const existingAdmin = await User.findOne({ email: defaultAdmin.email }).lean()
    if (existingAdmin) {
      console.log('Admin already exists. No changes made.')
      return
    }

    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10)

    await User.create({
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      username: defaultAdmin.username,
      password: hashedPassword,
      role: defaultAdmin.role,
      isVerified: true,
      isAvailable: true,
    })

    console.log('Admin user seeded successfully.')
    console.log(`Email: ${defaultAdmin.email}`)
    console.log(`Password: ${defaultAdmin.password}`)
  } catch (error) {
    console.error('Failed to seed admin user:', error)
    process.exitCode = 1
  }
}

seedAdmin()
