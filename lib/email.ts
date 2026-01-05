/**
 * Email service using Resend
 */

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not configured. Email functionality will be disabled.')
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BeautyFinder <notifications@beautyfinder.io>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

export interface ViralProductEmailData {
  productName: string
  productSlug: string
  brand: string | null
  price: number | null
  imageUrl: string | null
  trendScore: number
  salesSpike?: number
  amazonUrl: string | null
}

/**
 * Send verification email to new subscriber
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  if (!resend) {
    console.error('Resend not configured')
    return false
  }

  const verifyUrl = `${SITE_URL}/api/email/verify?token=${token}&email=${encodeURIComponent(email)}`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your email - BeautyFinder',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">BeautyFinder</h1>
            </div>
            <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify your email</h2>
              <p style="color: #4b5563; font-size: 16px;">
                Thanks for subscribing to BeautyFinder! We'll notify you when new beauty products go viral.
              </p>
              <p style="color: #4b5563; font-size: 16px;">
                Click the button below to verify your email address:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Verify Email
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color: #667eea; word-break: break-all;">${verifyUrl}</a>
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                If you didn't sign up for BeautyFinder, you can safely ignore this email.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
              <p>BeautyFinder - Discover trending beauty products</p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending verification email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending verification email:', error)
    return false
  }
}

/**
 * Send viral product notification email
 */
export async function sendViralProductNotification(
  email: string,
  product: ViralProductEmailData
): Promise<boolean> {
  if (!resend) {
    console.error('Resend not configured')
    return false
  }

  const productUrl = `${SITE_URL}/products/${product.productSlug}`
  const unsubscribeUrl = `${SITE_URL}/api/email/unsubscribe?email=${encodeURIComponent(email)}`
  
  const salesSpikeText = product.salesSpike 
    ? `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
         <strong style="color: #92400e;">🔥 Sales Spike:</strong> 
         <span style="color: #78350f;">+${product.salesSpike.toLocaleString()}%</span>
       </div>`
    : ''

  const priceText = product.price ? `$${product.price.toFixed(2)}` : 'Check price'
  const imageHtml = product.imageUrl 
    ? `<img src="${product.imageUrl}" alt="${product.productName}" style="width: 100%; max-width: 400px; border-radius: 8px; margin: 20px 0;" />`
    : ''

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🔥 New Viral Product: ${product.productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔥 New Viral Product!</h1>
            </div>
            <div style="background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">${product.productName}</h2>
              ${product.brand ? `<p style="color: #6b7280; font-size: 16px; margin-top: -10px;">by ${product.brand}</p>` : ''}
              
              ${imageHtml}
              
              ${salesSpikeText}
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #4b5563; font-size: 16px;">
                  <strong>Trend Score:</strong> ${Math.round(product.trendScore)}/100<br>
                  <strong>Price:</strong> ${priceText}
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${productUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                  View Product
                </a>
                ${product.amazonUrl ? `<a href="${product.amazonUrl}" style="display: inline-block; background: #ff9900; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Buy on Amazon
                </a>` : ''}
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these notifications</a>
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
              <p>BeautyFinder - Discover trending beauty products</p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending viral product notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending viral product notification:', error)
    return false
  }
}

