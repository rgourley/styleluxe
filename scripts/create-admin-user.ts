/**
 * Script to create an admin user with email/password
 * Usage: npx tsx scripts/create-admin-user.ts <email> <password>
 */

import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

async function createAdminUser() {
  const email = process.argv[2]
  const password = process.argv[3]
  const name = process.argv[4] || email?.split('@')[0]

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-admin-user.ts <email> <password> [name]')
    process.exit(1)
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.error(`❌ User with email ${email} already exists`)
      process.exit(1)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: 'admin',
      },
    })

    console.log(`✅ Admin user created successfully!`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role}`)
    console.log(`\n   You can now login at http://localhost:3000/admin/login`)
  } catch (error) {
    console.error('❌ Error creating user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()

