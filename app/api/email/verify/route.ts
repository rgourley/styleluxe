import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { success: false, message: 'Missing verification token or email' },
        { status: 400 }
      )
    }

    // Find subscription
    const subscription = await prisma.emailSubscription.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!subscription) {
      return NextResponse.json(
        { success: false, message: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Verify token matches
    if (subscription.unsubscribeToken !== token) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Already verified
    if (subscription.verified) {
      return NextResponse.redirect(new URL('/?verified=true', request.url))
    }

    // Verify the subscription
    await prisma.emailSubscription.update({
      where: { id: subscription.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    })

    return NextResponse.redirect(new URL('/?verified=true&subscribed=true', request.url))
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to verify email' },
      { status: 500 }
    )
  }
}

