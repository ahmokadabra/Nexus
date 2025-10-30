#!/usr/bin/env bash
# Render build script (fix Prisma permissions)

echo "Installing dependencies..."
npm install

echo "Fixing Prisma permissions..."
chmod +x ./node_modules/.bin/prisma

echo "Generating Prisma Client for Linux..."
npx prisma generate

echo "Starting app..."
node src/index.js
