#!/bin/sh
set -e

echo "House of Guidance Chat - backend starting (${APP_ENV:-production})..."

# Laravel cannot serve anything (every request 500s) without an APP_KEY.
# Render-style hosts inject env instead of a .env file, and it is easy to
# forget the key. Generate an ephemeral one so the app boots; a PERSISTENT
# key must still be set in the host env, otherwise sessions, encrypted
# cookies, and signed URLs invalidate on every restart/redeploy.
if [ -z "${APP_KEY:-}" ]; then
  echo "APP_KEY is empty - generating an ephemeral key for this boot..."
  GENERATED_KEY=$(php artisan key:generate --show 2>/dev/null | tr -d '\r\n ') || GENERATED_KEY=""

  if [ -n "$GENERATED_KEY" ]; then
    export APP_KEY="$GENERATED_KEY"
    echo "WARNING: using an ephemeral APP_KEY. Set a persistent APP_KEY in the host environment."
  else
    echo "Could not generate APP_KEY automatically; set APP_KEY in the host environment." >&2
  fi
fi

# Wait for the database to accept connections before touching
# migrations. Driver-aware: supports mysql, pgsql, and anything else PDO
# understands via DB_DSN override. sqlite and empty hosts skip the wait.
# Never destructive: this block only waits, it migrates nothing.
if [ -n "$DB_DSN" ]; then
  DB_WAIT_DSN="$DB_DSN"
elif [ "${DB_CONNECTION:-mysql}" = "pgsql" ] && [ -n "$DB_HOST" ]; then
  DB_WAIT_DSN="pgsql:host=${DB_HOST};port=${DB_PORT:-5432};dbname=${DB_DATABASE};sslmode=${DB_SSLMODE:-prefer}"
elif [ "${DB_CONNECTION:-mysql}" = "mysql" ] && [ -n "$DB_HOST" ]; then
  DB_WAIT_DSN="mysql:host=${DB_HOST};port=${DB_PORT:-3306}"
fi

if [ -n "${DB_WAIT_DSN:-}" ]; then
  echo "Waiting for database (${DB_CONNECTION:-mysql})..."
  timeout=60
  until php -r "new PDO('${DB_WAIT_DSN}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
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

# Opt-in full wipe for poisoned fresh databases on shell-less hosts.
# When repeated interrupted runs leave tables behind WITHOUT their
# migration rows, migrate fails migration-by-migration forever (each
# CREATE hits "already exists", masked as 25P02 on a later ALTER). This
# block drops every application table leaf-first (foreign-key order, so
# no CASCADE keyword is ever needed), resets the migrations tracker, and
# lets the normal `migrate` below rebuild from zero. Requires the exact
# confirmation value - a bare "true" will NOT trigger it. NEVER enable on
# a database holding real data; remove the variable right after recovery.
if [ "${MIGRATE_FRESH_REBUILD:-false}" = "wipe-and-rebuild" ]; then
  if [ -z "${DB_WAIT_DSN:-}" ]; then
    echo "MIGRATE_FRESH_REBUILD is set but no database DSN is configured - aborting." >&2
    exit 1
  fi
  echo "MIGRATE_FRESH_REBUILD confirmed - wiping application tables for a clean rebuild..."
  php -r "try { \$pdo = new PDO('${DB_WAIT_DSN}', '${DB_USERNAME}', '${DB_PASSWORD}'); foreach (['room_seats', 'call_participants', 'call_sessions', 'quran_bookmarks', 'quran_progress', 'quran_audio', 'quran_surah_audio', 'quran_translations', 'event_registrations', 'message_reactions', 'message_attachments', 'messages', 'conversation_participants', 'announcements', 'events', 'reports', 'ayahs', 'notifications', 'hadiths', 'duas', 'surahs', 'quran_reciters', 'conversations', 'personal_access_tokens', 'password_reset_tokens', 'sessions', 'users', 'jobs', 'job_batches', 'failed_jobs', 'cache', 'cache_locks'] as \$t) { \$pdo->exec('DROP TABLE IF EXISTS '.\$t); } \$pdo->exec('DELETE FROM migrations'); echo 'Wipe complete - schema will rebuild from zero.'; } catch (\Throwable \$e) { echo 'WIPE FAILED: '.\$e->getMessage(); exit(1); }" 2>&1 || { echo "Wipe did not complete - aborting before migrate." >&2; exit 1; }
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

# Seed once on genuinely fresh databases only (see app:seed-if-fresh).
# This is how shell-less hosts get their initial Qur'an/Hadith/room data;
# on any database that already holds data it is a no-op. Runs after
# migrations so the tables it guards on always exist first.
if [ "${RUN_SEEDS:-false}" = "true" ]; then
  php artisan app:seed-if-fresh --no-interaction || true
fi

echo "Backend ready."

exec "$@"
