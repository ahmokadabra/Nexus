#!/usr/bin/env bash
set -euo pipefail

echo "➕ Prisma generate…"
npx prisma generate

# Retry migrate deploy (npr. do 8 pokušaja, sa backoff-om)
max=8
for i in $(seq 1 $max); do
  echo "🚀 Prisma migrate deploy (pokusaj $i/$max)…"
  if npx prisma migrate deploy; then
    echo "✅ Migrate OK"
    break
  fi
  if [ "$i" -eq "$max" ]; then
    echo "❌ Migrate nije uspio nakon $max pokušaja"
    exit 1
  fi
  sleep $((i*5))
done

echo "🟢 Start app…"
node src/index.js
