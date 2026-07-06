#!/usr/bin/env bash
# Supabase local stack (Docker must already be running)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running or you lack permission."
  echo "Try: sudo systemctl start docker && newgrp docker"
  exit 1
fi

echo "==> Starting Supabase..."
npx supabase start

echo "==> Writing .env.local from supabase status..."
npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=' | while IFS='=' read -r key value; do
  case "$key" in
    API_URL) echo "NEXT_PUBLIC_SUPABASE_URL=$value" ;;
    ANON_KEY) echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$value" ;;
    SERVICE_ROLE_KEY) echo "SUPABASE_SERVICE_ROLE_KEY=$value" ;;
  esac
done > .env.local.tmp
{
  cat .env.local.tmp
  echo "MISTRAL_API_KEY=${MISTRAL_API_KEY:-}"
  echo "MISTRAL_MODEL=mistral-small-latest"
  echo "INNGEST_DEV=1"
  echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"
} > .env.local
rm -f .env.local.tmp

echo "==> Applying migrations..."
npx supabase db reset

echo ""
echo "Done! Create your org at http://localhost:3000/setup"
echo "Start the app: npm run dev"
echo "Start Inngest: npx inngest-cli@latest dev"
