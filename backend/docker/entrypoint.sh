#!/bin/sh
set -e

echo "House of Guidance Chat - backend starting (${APP_ENV:-production})..."

# Wait for MySQL to accept connections before touching migrations.
if [ -n "$DB_HOST" ]; then
  echo "Waiting for database at ${DB_HOST}:${DB_PORT:-3306}..."
  timeout=60
  until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT:-3306}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    timeout=$((timeout - 1))
    if [ "$timeout" -le 0 ]; then
      echo "Database did not become available in time." >&2
      exit 1
    fi
    sleep 1
  done
  echo "Database is up."
fi

# Run Laravel package discovery at runtime, when production environment
# variables such as the Reverb credentials are available.
php artisan package:discover --ansi

if [ ! -f /var/www/html/storage/.link-created ]; then
  php artisan storage:link --force >/dev/null 2>&1 || true
  touch /var/www/html/storage/.link-created
fi

# Only the primary "backend" container runs migrations/cache warmup; the
# queue/reverb/scheduler containers share this same image but shouldn't
# race each other to migrate on every restart.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  php artisan migrate --force

  # Config/route/event caching is skipped when APP_DEBUG=true (local/dev
  # convenience) so changes take effect without a rebuild.
  if [ "${APP_DEBUG:-false}" != "true" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan event:cache
  fi
fi

echo "Backend ready."

exec "$@"