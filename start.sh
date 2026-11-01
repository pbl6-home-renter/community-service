#!/bin/sh
set -e

echo "Running migrations..."
npm run migration:run:prod || true

echo "Starting application..."
node dist/main.js
