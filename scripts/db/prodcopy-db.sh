#!/usr/bin/env bash
#
# Копія прод-БД у локальну БД (за замовчуванням prodcopy) у Docker з `pnpm db:local` — для `pnpm battle-sweep`.
# Прод лише читається (pg_dump схеми public з даними й історією міграцій через DIRECT_URL з .env.production-db.local);
# локальна БД створюється наново, потім `migrate deploy` докатує ще не задеплоєні міграції — разом із дата-міграціями.
#
#   ./scripts/db/prodcopy-db.sh [ім'я_бд]
#
set -euo pipefail

cd "$(dirname "$0")/../.."

DB="${1:-prodcopy}"
LOCAL="postgresql://postgres:postgres@localhost:54322/$DB"
PROD="$(grep '^DIRECT_URL=' .env.production-db.local | cut -d= -f2- | tr -d '"' | sed 's/[?&]pgbouncer=[^&]*//')"

# pg_dump з контейнера: версія клієнта збігається з Postgres 17 на Supabase
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
docker compose exec -T db psql -U postgres -d "$DB" -c "DROP SCHEMA public CASCADE"
docker compose exec -T db pg_dump "$PROD" --schema=public --no-owner --no-privileges \
  | docker compose exec -T db psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q
DATABASE_URL="$LOCAL" DIRECT_URL="$LOCAL" pnpm exec prisma migrate deploy

echo "✅ $DB готова: DATABASE_URL=$LOCAL pnpm battle-sweep"
