# API Route Authentication Guide

## How Authentication Works with NextAuth in API Routes

### Overview

NextAuth uses **JWT tokens stored in HTTP-only cookies**. When a user logs in:
1. NextAuth creates a JWT token
2. Token is stored in an HTTP-only cookie (can't be accessed via JavaScript)
3. Cookie is automatically sent with every request to your domain
4. API routes can verify the token to check if user is authenticated

---

## How It Works

### 1. **Getting the Session in API Routes**

NextAuth provides an `auth()` function that reads the session from the request cookies:

```typescript
import { authFunction } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: Request) {
  // Get the session from the request
  const session = await authFunction()
  
  // Check if user is authenticated
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // User is authenticated - session.user contains user info
  console.log('User:', session.user.email)
  console.log('Role:', session.user.role)
  
  // ... your protected code here
}
```

### 2. **What's in the Session?**

The session object contains:
```typescript
{
  user: {
    id: string        // User ID
    email: string     // User email
    name: string      // User name
    role: string      // 'admin' (from your JWT callback)
  },
  expires: string     // When session expires
}
```

---

## Implementation Patterns

### Pattern 1: Inline Check (Simple)

```typescript
// app/api/products/[id]/route.ts
import { NextResponse } from 'next/server'
import { authFunction } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const session = await authFunction()
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // User is authenticated - proceed with update
  const { id } = await params
  const body = await request.json()
  
  // ... rest of your code
}
```

### Pattern 2: Helper Function (Reusable)

Create a reusable helper:

```typescript
// lib/auth-utils.ts
import { NextResponse } from 'next/server'
import { authFunction } from '@/app/api/auth/[...nextauth]/route'

/**
 * Check if user is authenticated
 * Returns null if authenticated, or an error response if not
 */
export async function requireAuth() {
  const session = await authFunction()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in to perform this action' },
      { status: 401 }
    )
  }
  
  return null // User is authenticated
}

/**
 * Get the current session (throws if not authenticated)
 */
export async function getSession() {
  const session = await authFunction()
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session
}
```

Then use it in routes:

```typescript
// app/api/products/[id]/route.ts
import { requireAuth } from '@/lib/auth-utils'

export async function PATCH(request: Request, ...) {
  // Check auth - returns error response if not authenticated
  const authError = await requireAuth()
  if (authError) return authError
  
  // User is authenticated - proceed
  // ... rest of your code
}
```

### Pattern 3: Role-Based Authorization

```typescript
// lib/auth-utils.ts
export async function requireAdmin() {
  const session = await authFunction()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Check if user has admin role
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    )
  }
  
  return null // User is admin
}
```

---

## How Requests Work

### Client-Side Request (Authenticated)

```typescript
// Client component making authenticated request
'use client'
import { useSession } from 'next-auth/react'

export function UpdateProductButton() {
  const { data: session } = useSession()
  
  const updateProduct = async () => {
    // Cookies are automatically sent with fetch requests
    const response = await fetch('/api/products/123', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Name' }),
      // No need to manually add auth headers - cookies are automatic!
    })
    
    if (response.status === 401) {
      // User not authenticated - redirect to login
      window.location.href = '/admin/login'
    }
  }
  
  return <button onClick={updateProduct}>Update</button>
}
```

### Server-Side Request (from another API route)

```typescript
// If you need to make authenticated requests from server-side
import { cookies } from 'next/headers'

export async function someServerFunction() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('next-auth.session-token')
  
  // Make request with cookie
  const response = await fetch('https://api.example.com/data', {
    headers: {
      Cookie: `next-auth.session-token=${sessionToken?.value}`,
    },
  })
}
```

---

## Security Features

### ✅ **HTTP-Only Cookies**
- Cookies can't be accessed via JavaScript (`document.cookie`)
- Prevents XSS attacks from stealing tokens

### ✅ **Secure Cookies (Production)**
- NextAuth automatically uses `Secure` flag in production
- Cookies only sent over HTTPS

### ✅ **SameSite Protection**
- Prevents CSRF attacks
- Cookies only sent to same site

### ✅ **JWT Tokens**
- Tokens are signed with `NEXTAUTH_SECRET`
- Can't be tampered with
- Include expiration time

---

## Example: Protected Route

Here's a complete example of a protected API route:

```typescript
// app/api/products/[id]/route.ts
import { NextResponse } from 'next/server'
import { authFunction } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await authFunction()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      )
    }
    
    // 2. Optional: Check role
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      )
    }
    
    // 3. Get request data
    const { id } = await params
    const body = await request.json()
    
    // 4. Validate input
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Product name is required' },
        { status: 400 }
      )
    }
    
    // 5. Perform the operation
    const product = await prisma.product.update({
      where: { id },
      data: { name: body.name },
    })
    
    // 6. Return success
    return NextResponse.json({
      success: true,
      product,
    })
    
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

---

## Public vs Protected Routes

### Public Routes (No Auth Required)
- `GET /api/products` - List products (public)
- `GET /api/products/[id]` - Get single product (public)
- `GET /api/products/[id]/sparkline` - Get sparkline data (public)

### Protected Routes (Auth Required)
- `PATCH /api/products/[id]` - Update product (admin only)
- `POST /api/products/[id]/publish` - Publish product (admin only)
- `POST /api/generate-content` - Generate AI content (admin only)
- `POST /api/upload-image` - Upload images (admin only)
- `POST /api/collect-data` - Trigger data collection (admin only)

---

## Testing Authentication

### Test with curl (No Auth - Should Fail)
```bash
curl -X PATCH http://localhost:3000/api/products/123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# Response: {"error":"Unauthorized","message":"You must be logged in"}
```

### Test with Browser (Authenticated - Should Work)
1. Log in at `/admin/login`
2. Open browser DevTools → Network tab
3. Make request from your app
4. Check that cookies are sent automatically

---

## Common Issues

### Issue: `authFunction()` returns null
**Cause:** User not logged in, or cookies not being sent  
**Fix:** Ensure user is logged in, check cookie domain/path settings

### Issue: Session expires too quickly
**Fix:** Adjust `maxAge` in NextAuth config:
```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

### Issue: Auth works locally but not in production
**Fix:** Check that `NEXTAUTH_SECRET` is set in production environment variables

---

## Next Steps

1. Create `lib/auth-utils.ts` with helper functions
2. Add auth checks to all protected routes
3. Test each route with and without authentication
4. Update client-side code to handle 401 responses

