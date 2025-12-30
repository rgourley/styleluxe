/**
 * Script to create or update an admin user
 * Usage: tsx scripts/create-admin-user.ts <email> <password> [name]
 */

import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

async function createOrUpdateAdminUser() {
  const email = process.argv[2]
  const password = process.argv[3]
  const name = process.argv[4] || email?.split('@')[0] || 'Admin'

  if (!email || !password) {
    console.error('Usage: tsx scripts/create-admin-user.ts <email> <password> [name]')
    console.error('Example: tsx scripts/create-admin-user.ts admin@example.com mypassword123 "Admin User"')
    process.exit(1)
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    if (existingUser) {
      // Update existing user
      const updated = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          name: name || existingUser.name,
          role: 'admin',
        },
      })
      console.log(`✅ Updated user: ${updated.email}`)
      console.log(`   Name: ${updated.name}`)
      console.log(`   Role: ${updated.role}`)
    } else {
      // Create new user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'admin',
        },
      })
      console.log(`✅ Created user: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
    }

    console.log('\n✅ You can now log in at /admin/login')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createOrUpdateAdminUser()
