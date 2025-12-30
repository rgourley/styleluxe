/**
 * Validate required environment variables
 * Call this at app startup to fail fast if secrets are missing
 */

export function validateEnvironmentVariables() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ]

  const missing: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set these in your production environment.'
    )
  }

  if (missing.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `⚠️  Missing environment variables (development mode): ${missing.join(', ')}\n` +
      'Some features may not work correctly.'
    )
  }
}

// Validate on module load (only in production)
if (process.env.NODE_ENV === 'production') {
  validateEnvironmentVariables()
}

