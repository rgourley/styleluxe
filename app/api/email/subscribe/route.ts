import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if already subscribed
    const existing = await prisma.emailSubscription.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      if (existing.verified) {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed!',
          verified: true,
        })
      } else {
        // Resend verification email
        const sent = await sendVerificationEmail(normalizedEmail, existing.unsubscribeToken)
        return NextResponse.json({
          success: true,
          message: 'Verification email sent. Please check your inbox.',
          verified: false,
        })
      }
    }

    // Create new subscription
    const subscription = await prisma.emailSubscription.create({
      data: {
        email: normalizedEmail,
        verified: false,
      },
    })

    // Send verification email
    const sent = await sendVerificationEmail(normalizedEmail, subscription.unsubscribeToken)

    if (!sent) {
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Please check your inbox to confirm your subscription.',
    })
  } catch (error) {
    console.error('Error subscribing email:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    )
  }
}

