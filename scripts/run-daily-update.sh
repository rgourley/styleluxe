#!/bin/bash
# Simple script to run daily update manually
# Can be used with cron: 0 6 * * * /path/to/scripts/run-daily-update.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the daily update script
if command -v tsx &> /dev/null; then
    tsx scripts/daily-update.ts
elif command -v npx &> /dev/null; then
    npx tsx scripts/daily-update.ts
else
    echo "❌ tsx not found. Please install: npm install -g tsx"
    exit 1
fi





