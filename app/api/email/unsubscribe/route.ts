import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find subscription
    const subscription = await prisma.emailSubscription.findUnique({
      where: { email: normalizedEmail },
    })

    if (!subscription) {
      return NextResponse.redirect(new URL('/?unsubscribed=notfound', request.url))
    }

    // If token provided, verify it matches
    if (token && subscription.unsubscribeToken !== token) {
      return NextResponse.json(
        { success: false, message: 'Invalid unsubscribe token' },
        { status: 400 }
      )
    }

    // Delete subscription
    await prisma.emailSubscription.delete({
      where: { id: subscription.id },
    })

    return NextResponse.redirect(new URL('/?unsubscribed=true', request.url))
  } catch (error) {
    console.error('Error unsubscribing:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}

