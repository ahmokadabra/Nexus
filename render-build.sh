#!/usr/bin/env bash
# Render build script

echo "Installing dependencies..."
npm install

echo "Generating Prisma Client for Linux..."
npx prisma generate

echo "Starting app..."
npm start
