#!/usr/bin/env bash
# Aplica migraciones y seed sobre PostgreSQL de Supabase (DATABASE_URL / DIRECT_URL).
set -euo pipefail
cd "$(dirname "$0")/../../backend"
npx prisma migrate deploy
npx prisma db seed
