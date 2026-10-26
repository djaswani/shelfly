#!/bin/bash
# Load the showcase kitchen into Shelfly on the booted iOS simulator (run from larder/).
# Closes the app, rebuilds today's showcase state (dates are relative to today), writes it, relaunches.
set -e
APP=com.djaswani.larder
DEV=${1:-booted}
DIR="$(xcrun simctl get_app_container "$DEV" $APP data)/Library/Application Support/$APP/RCTAsyncLocalStorage_V1"
KEY=$(echo -n "larder.state.v1" | md5)
TMP=$(mktemp -d)
xcrun simctl terminate "$DEV" $APP 2>/dev/null || true
cp "$DIR/$KEY" "$TMP/current.json" 2>/dev/null || echo '{}' > "$TMP/current.json"
cp "$TMP/current.json" "$TMP/backup-$(date +%s).json"
npx tsx scripts/showcase.ts "$TMP/current.json" "$TMP/showcase.json"
cp "$TMP/showcase.json" "$DIR/$KEY"
xcrun simctl launch "$DEV" $APP >/dev/null
echo "Showcase loaded. Previous state backed up in $TMP"
