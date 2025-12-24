#!/bin/bash
# Setup cron job for daily update
# This script adds a cron job to run the daily update at 6:00 AM every day

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get the full path to the script
DAILY_UPDATE_SCRIPT="$PROJECT_DIR/scripts/daily-update.ts"

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx is not installed. Installing..."
    npm install -g tsx
fi

# Create cron job entry
CRON_JOB="0 6 * * * cd $PROJECT_DIR && /usr/local/bin/tsx $DAILY_UPDATE_SCRIPT >> $PROJECT_DIR/logs/daily-update.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "daily-update.ts"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "daily-update.ts" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added successfully!"
echo "   Schedule: Every day at 6:00 AM"
echo "   Script: $DAILY_UPDATE_SCRIPT"
echo "   Logs: $PROJECT_DIR/logs/daily-update.log"
echo ""
echo "To view your cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line)"





