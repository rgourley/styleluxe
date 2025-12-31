#!/bin/bash
# Setup script for monorepo structure
# Run this in a CLONED copy of the repo, not the original!

set -e

echo "🚀 Setting up monorepo structure..."
echo "⚠️  Make sure you're in a CLONED directory, not your original repo!"

# Create directory structure
mkdir -p packages/shared/lib
mkdir -p packages/shared/types
mkdir -p packages/database/prisma
mkdir -p packages/ui/components
mkdir -p apps/beautyfinder

echo "✅ Directory structure created"

# Create root package.json with workspaces
cat > package.json << 'EOF'
{
  "name": "beautyfinder-monorepo",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "cd apps/beautyfinder && npm run dev",
    "build": "cd apps/beautyfinder && npm run build",
    "db:generate": "cd packages/database && npx prisma generate",
    "db:push": "cd packages/database && npx prisma db push",
    "db:migrate": "cd packages/database && npx prisma migrate dev",
    "db:studio": "cd packages/database && npx prisma studio"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

echo "✅ Root package.json created"

# Create workspace package.json files
cat > packages/database/package.json << 'EOF'
{
  "name": "@beautyfinder/database",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "scripts": {
    "generate": "prisma generate",
    "push": "prisma db push",
    "migrate": "prisma migrate dev",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.19.1"
  },
  "devDependencies": {
    "prisma": "^6.19.1"
  }
}
EOF

cat > packages/shared/package.json << 'EOF'
{
  "name": "@beautyfinder/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "scripts": {},
  "dependencies": {}
}
EOF

cat > packages/ui/package.json << 'EOF'
{
  "name": "@beautyfinder/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "scripts": {},
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  }
}
EOF

echo "✅ Workspace package.json files created"

echo ""
echo "📋 Next steps:"
echo "1. Move prisma/ to packages/database/prisma/"
echo "2. Move lib/ to packages/shared/lib/"
echo "3. Move components/ to packages/ui/components/"
echo "4. Move app/ and other Next.js files to apps/beautyfinder/"
echo "5. Update imports to use workspace packages"
echo ""
echo "⚠️  Remember: This is just structure. Test incrementally!"

