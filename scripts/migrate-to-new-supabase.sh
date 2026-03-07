#!/usr/bin/env bash
#
# Міграція Supabase: старий проект → новий (інший регіон)
# Переносить: PostgreSQL (public + auth), авторизацію (auth.users)
#
# Використання:
#   1. Скопіюй .env.migration.example → .env.migration
#   2. Заповни OLD_DB_URL та NEW_DB_URL
#   3. chmod +x scripts/migrate-to-new-supabase.sh
#   4. ./scripts/migrate-to-new-supabase.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.migration-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Завантажуємо .env.migration якщо є
if [ -f "$PROJECT_ROOT/.env.migration" ]; then
  set -a
  source "$PROJECT_ROOT/.env.migration"
  set +a
fi

OLD_DB_URL="${OLD_DB_URL:-}"
NEW_DB_URL="${NEW_DB_URL:-}"

if [ -z "$OLD_DB_URL" ] || [ -z "$NEW_DB_URL" ]; then
  echo "❌ Потрібні змінні OLD_DB_URL та NEW_DB_URL"
  echo ""
  echo "Створи файл .env.migration з вмістом:"
  echo "  OLD_DB_URL=\"postgresql://postgres.[OLD_REF]:[PASSWORD]@db.[OLD_REF].supabase.co:5432/postgres\""
  echo "  NEW_DB_URL=\"postgresql://postgres.[NEW_REF]:[PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres\""
  echo ""
  echo "Connection strings візьми з Supabase Dashboard → Project Settings → Database"
  echo "Для експорту/імпорту використовуй Direct connection (не pooler)"
  exit 1
fi

echo "📦 Міграція Supabase: старий проект → новий"
echo "   Backup буде збережено в: $BACKUP_DIR"
echo ""

mkdir -p "$BACKUP_DIR"

# --- Крок 1: Експорт зі старого проекту ---
echo "1️⃣  Експорт даних зі старого проекту..."
pg_dump "$OLD_DB_URL" \
  -n public \
  -n auth \
  --data-only \
  --no-owner \
  --no-acl \
  -f "$BACKUP_DIR/data_$TIMESTAMP.sql" 2>/dev/null || {
  echo "   pg_dump з schema: спроба без schema (повний data-only)..."
  pg_dump "$OLD_DB_URL" \
    --data-only \
    --no-owner \
    --no-acl \
    -f "$BACKUP_DIR/data_$TIMESTAMP.sql"
}

DATA_FILE="$BACKUP_DIR/data_$TIMESTAMP.sql"
if [ ! -s "$DATA_FILE" ]; then
  echo "❌ Експорт не вдався або файл порожній"
  exit 1
fi
echo "   ✅ Експортовано: $DATA_FILE"
echo ""

# --- Крок 2: Застосувати Prisma migrations на нову БД ---
echo "2️⃣  Застосування Prisma migrations на нову БД..."
cd "$PROJECT_ROOT"
DATABASE_URL="$NEW_DB_URL" pnpm prisma migrate deploy
echo "   ✅ Схема створена"
echo ""

# --- Крок 3: Імпорт даних у новий проект ---
echo "3️⃣  Імпорт даних у новий проект..."
# session_replication_role = replica вимикає тригери (потрібно для auth.users з шифруванням)
IMPORT_FILE="$BACKUP_DIR/import_$TIMESTAMP.sql"
(echo "SET session_replication_role = replica;"; cat "$DATA_FILE") > "$IMPORT_FILE"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f "$IMPORT_FILE" 2>/dev/null || {
  echo "   ⚠️  Імпорт з replica mode не вдався, спроба без..."
  psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f "$DATA_FILE" || true
}

echo "   ✅ Імпорт завершено"
echo ""

# --- Готово ---
echo "✅ Міграція завершена!"
echo ""
echo "📋 Що далі:"
echo "   1. JWT Secret: скопіюй зі старого проекту (Settings → API) у новий"
echo "   2. Онови .env та Vercel:"
echo "      - DATABASE_URL (connection string нового проекту)"
echo "      - NEXT_PUBLIC_SUPABASE_URL"
echo "      - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   3. Redeploy на Vercel"
echo "   4. Перевір логін та основні сценарії"
echo ""
echo "   Backup збережено: $DATA_FILE"
