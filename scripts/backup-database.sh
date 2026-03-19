#!/usr/bin/env bash
#
# Бекап поточної бази даних (PostgreSQL).
# Зберігає дамп у .migration-backup/backup_YYYYMMDD_HHMMSS.sql
#
# Використання:
#   1. Для Supabase: у .env вкажи Direct connection (порт 5432) для бекапу:
#      Dashboard → Project Settings → Database → Connection string → Direct connection
#      Або створи .env.backup з BACKUP_DATABASE_URL="postgresql://..."
#   2. chmod +x scripts/backup-database.sh
#   3. ./scripts/backup-database.sh
#
# Якщо використовуєш звичайний DATABASE_URL (pooler 6543), скрипт спробує його;
# для надійного pg_dump краще використовувати Direct connection (5432).
#

set -e

for dir in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin; do
  if [ -x "$dir/pg_dump" ]; then
    export PATH="$dir:$PATH"
    break
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.migration-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Завантажуємо .env (якщо є .env.backup — для бекапу можна використати його)
if [ -f "$PROJECT_ROOT/.env.backup" ]; then
  set -a
  source "$PROJECT_ROOT/.env.backup"
  set +a
  DB_URL="${BACKUP_DATABASE_URL:-}"
elif [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  DB_URL="${BACKUP_DATABASE_URL:-$DATABASE_URL}"
else
  DB_URL="${BACKUP_DATABASE_URL:-$DATABASE_URL}"
fi

if [ -z "$DB_URL" ]; then
  echo "❌ Не знайдено URL бази. Встанови BACKUP_DATABASE_URL або DATABASE_URL."
  echo ""
  echo "   Supabase: Project Settings → Database → Connection string → Direct connection (порт 5432)."
  exit 1
fi

# pg_dump не приймає параметр pgbouncer у URI — прибираємо його
DB_URL="$(echo "$DB_URL" | sed 's/[?&]pgbouncer=[^&]*//g' | sed 's/?$//')"

echo "📦 Бекап бази даних"
echo "   Вихід: $OUTPUT_FILE"
echo ""

mkdir -p "$BACKUP_DIR"

PG_DUMP_VER=$(pg_dump --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -z "$PG_DUMP_VER" ]; then
  echo "❌ pg_dump не знайдено. Встанови PostgreSQL: brew install postgresql@17"
  exit 1
fi
if [ "$PG_DUMP_VER" -lt 17 ]; then
  echo "⚠️  pg_dump $PG_DUMP_VER. Для Supabase рекомендовано 17+: brew install postgresql@17"
fi

echo "1️⃣  Експорт (public + auth, data-only)..."
pg_dump "$DB_URL" \
  -n public \
  -n auth \
  --data-only \
  --no-owner \
  --no-acl \
  -f "$OUTPUT_FILE" 2>/dev/null || {
  echo "   Спроба повного data-only без указання схем..."
  pg_dump "$DB_URL" \
    --data-only \
    --no-owner \
    --no-acl \
    -f "$OUTPUT_FILE"
}

if [ ! -s "$OUTPUT_FILE" ]; then
  echo "❌ Експорт не вдався або файл порожній."
  echo "   Для Supabase використовуй Direct connection (порт 5432), не pooler (6543)."
  exit 1
fi

SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
echo "   ✅ Збережено: $OUTPUT_FILE ($SIZE)"
echo ""
echo "📋 Далі: збережи цей файл у безпечному місці перед переходом на новий акаунт."
echo "   Відновлення: psql \"\$NEW_DATABASE_URL\" -f \"$OUTPUT_FILE\""
echo "   (спочатку застосуй схему: DATABASE_URL=new_url pnpm prisma migrate deploy)"
