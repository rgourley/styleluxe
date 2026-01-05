# Email Notifications Setup

This guide explains how to set up email notifications for viral products using Resend.

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **API Key**: Get your API key from the Resend dashboard
3. **Domain Verification**: Verify your domain in Resend (required for production)

## Environment Variables

Add these to your `.env` file:

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=BeautyFinder <notifications@yourdomain.com>
```

**Note**: Replace `notifications@yourdomain.com` with your verified domain email address.

## Database Migration

The Prisma schema has been updated with new models:
- `EmailSubscription` - Stores subscriber emails
- `ViralProductNotification` - Tracks sent notifications

Run the migration:
```bash
npx prisma db push
# or
npx prisma migrate dev
```

## How It Works

### 1. User Subscription
- Users can subscribe via the `EmailSubscriptionForm` component
- They receive a verification email
- Must verify before receiving notifications

### 2. Viral Product Detection
A product is considered "viral" if:
- `currentScore >= 70` (high trend score), OR
- Sales spike >= 500%
- Status is `PUBLISHED`
- We haven't notified about it in the last 24 hours

### 3. Notification Script
Run the script to check for viral products and send notifications:

```bash
npx tsx scripts/check-viral-products-and-notify.ts
```

### 4. Automated Notifications (Optional)
Set up a cron job to run the notification script periodically:

**Vercel Cron** (recommended):
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-viral-products",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Then create `app/api/cron/check-viral-products/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: Request) {
  // Verify cron secret (recommended)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run the notification script
    await execAsync('npx tsx scripts/check-viral-products-and-notify.ts')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error running viral products check:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

## Adding the Subscription Form

Add the `EmailSubscriptionForm` component to any page:

```tsx
import EmailSubscriptionForm from '@/components/EmailSubscriptionForm'

export default function HomePage() {
  return (
    <div>
      {/* Your content */}
      <EmailSubscriptionForm />
    </div>
  )
}
```

## API Routes

- `POST /api/email/subscribe` - Subscribe to notifications
- `GET /api/email/verify?token=...&email=...` - Verify email subscription
- `GET /api/email/unsubscribe?email=...` - Unsubscribe from notifications

## Email Templates

Email templates are defined in `lib/email.ts`:
- **Verification Email**: Sent when user subscribes
- **Viral Product Notification**: Sent when a product goes viral

You can customize the HTML templates in `lib/email.ts`.

## Testing

1. **Test Subscription**:
   ```bash
   curl -X POST http://localhost:3000/api/email/subscribe \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Test Notification Script**:
   ```bash
   npx tsx scripts/check-viral-products-and-notify.ts
   ```

## Monitoring

Check notification stats:
```sql
SELECT 
  COUNT(*) as total_subscribers,
  COUNT(CASE WHEN verified = true THEN 1 END) as verified_subscribers,
  SUM(notificationCount) as total_notifications_sent
FROM "EmailSubscription";
```

## Rate Limits

Resend free tier includes:
- 3,000 emails/month
- 100 emails/day

For production, consider upgrading to a paid plan.

## Troubleshooting

1. **Emails not sending**: Check `RESEND_API_KEY` is set correctly
2. **Domain not verified**: Verify your domain in Resend dashboard
3. **No viral products**: Check product scores and ensure products are `PUBLISHED`
4. **Duplicate notifications**: The script prevents sending duplicate notifications within 24 hours

