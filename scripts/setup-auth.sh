#!/bin/bash

# Quick setup script for authentication
echo "🔐 Setting up authentication..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Please create one first."
  exit 1
fi

# Generate NEXTAUTH_SECRET if not present
if ! grep -q "NEXTAUTH_SECRET" .env; then
  echo "📝 Generating NEXTAUTH_SECRET..."
  SECRET=$(openssl rand -base64 32)
  echo "" >> .env
  echo "# NextAuth Secret" >> .env
  echo "NEXTAUTH_SECRET=$SECRET" >> .env
  echo "✅ Added NEXTAUTH_SECRET to .env"
else
  echo "✅ NEXTAUTH_SECRET already exists"
fi

echo ""
echo "📋 Next steps:"
echo "1. Add Google OAuth credentials to .env (optional):"
echo "   GOOGLE_CLIENT_ID=your-client-id"
echo "   GOOGLE_CLIENT_SECRET=your-client-secret"
echo ""
echo "2. Create your first admin user:"
echo "   npx tsx scripts/create-admin-user.ts your@email.com password \"Your Name\""
echo ""
echo "3. Or use Google OAuth by logging in at /admin/login"
echo ""
echo "✅ Setup complete! See AUTH_SETUP.md for detailed instructions."





