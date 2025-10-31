#!/usr/bin/env bash
# Build only – NO server start here
set -e

echo "🏗️ Installing dependencies..."
npm install

echo "🔧 Fixing Prisma CLI permissions..."
chmod +x ./node_modules/.bin/prisma || true

echo "🧩 Generating Prisma Client for Linux..."
npx prisma generate --schema=./prisma/schema.prisma

echo "📦 Applying Prisma migrations to Neon..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "✅ Build step finished."
