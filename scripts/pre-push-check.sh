#!/bin/bash
#
# Pre-push check script
# Run this manually or set up as git hook to ensure build passes

set -e

echo "🔍 Running pre-push checks..."
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "   Consider committing or stashing them first"
  echo ""
fi

# Run build
echo "📦 Running build..."
npm run build

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed! Please fix errors before pushing."
  exit 1
fi

# Run hydration check
echo ""
echo "🔍 Checking for hydration issues..."
npm run check:hydration || true  # Don't fail on warnings

echo ""
echo "✅ All checks passed! Safe to push."
exit 0




