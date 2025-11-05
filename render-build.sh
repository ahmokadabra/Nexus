#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
npm ci || npm i

echo "Fixing Prisma permissions..."
chmod -R +x node_modules/.bin || true

echo "Generate Prisma Client for Linux..."
node ./node_modules/prisma/build/index.js generate

echo "Apply Prisma migrations (deploy)..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Build step finished."
