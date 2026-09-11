#!/bin/sh
# House of Guidance Chat - production deploy helper.
#
# Usage: ./scripts/deploy.sh
#
# Run this from the project root on your production server, after copying
# backend/.env.production.example -> backend/.env and filling in every
# placeholder (see DEPLOYMENT.md).
set -e

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing. Copy backend/.env.production.example to backend/.env and fill it in first." >&2
  exit 1
fi

# Compose-only variables (APP_DOMAIN, API_DOMAIN, REVERB_DOMAIN, DB creds,
# REVERB_APP_KEY) are read from backend/.env by docker compose's --env-file.
echo "Pulling latest images where possible and rebuilding the app images..."
docker compose -f docker-compose.prod.yml --env-file backend/.env build

echo "Starting the stack..."
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d

echo "Waiting for the backend to become healthy..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo ""
echo "Done. Migrations and cache warmup run automatically inside the backend container on boot."
echo "Tail logs with: docker compose -f docker-compose.prod.yml logs -f backend"
