import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// Lazy load prisma to prevent build issues
const getPrisma = async () => {
  const { prisma } = await import('@/lib/prisma')
  return prisma
}

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET is required in production')
}

const auth = NextAuth({
  // Using JWT strategy, so no adapter needed
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'fallback-secret-for-dev-only' : undefined),
  trustHost: true, // Required for production/Vercel
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const prisma = await getPrisma()
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in - create user in database if they don't exist
      if (account?.provider === 'google' && user.email) {
        const prisma = await getPrisma()
        
        // Check if user exists
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        // Create user if they don't exist
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || profile?.name || user.email.split('@')[0],
              image: user.image || profile?.picture,
              emailVerified: new Date(),
              role: 'admin', // Auto-assign admin role for Google sign-ins
            },
          })
        }

        // Link Google account to user if not already linked
        if (account) {
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: dbUser.id,
              provider: 'google',
              providerAccountId: account.providerAccountId,
            },
          })

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
          }
        }

        // Update user info
        ;(user as any).id = dbUser.id
        ;(user as any).role = dbUser.role
      }

      return true // Allow sign-in
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role || 'admin'
        token.id = (user as any).id || user.id
      }
      
      // Handle Google OAuth - fetch user from database
      if (account?.provider === 'google' && token.email) {
        const prisma = await getPrisma()
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        })
        
        if (dbUser) {
          token.role = dbUser.role || 'admin'
          token.id = dbUser.id
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || 'admin'
        ;(session.user as any).id = token.id || token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
})

export const { handlers, auth: authFunction } = auth
export const { GET, POST } = handlers
