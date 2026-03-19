#!/usr/bin/env bash
#
# Відновлення даних з бекапу (.migration-backup/*.sql) у поточну Supabase БД.
# Таблиці мають вже існувати (схема застосована). Використовуй Direct connection (порт 5432).
#
# Використання:
#   ./scripts/restore-backup-to-supabase.sh [файл.sql]
#   Якщо файл не вказано — береться останній backup_*.sql з .migration-backup/
#
# Потрібно: у .env.local або .env має бути DATABASE_URL або окремо RESTORE_DATABASE_URL
# для Direct connection: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.migration-backup"

# Завантажити .env
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local"
  set +a
elif [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Direct connection для імпорту (порт 5432)
RESTORE_URL="${RESTORE_DATABASE_URL:-}"
if [ -z "$RESTORE_URL" ]; then
  # Побудувати URL: спочатку Direct (db.REF:5432), якщо не задано — Session pooler (pooler:5432)
  if [[ "$DATABASE_URL" =~ postgres\.([a-z0-9]+):([^@]+)@([^:/]+):([0-9]+)/([^?]*) ]]; then
    REF="${BASH_REMATCH[1]}"
    PASS="${BASH_REMATCH[2]}"
    HOST="${BASH_REMATCH[3]}"
    PORT="${BASH_REMATCH[4]}"
    # Session pooler (5432 на pooler) для імпорту, якщо Direct недоступний
    if [[ "$HOST" == *pooler* ]]; then
      RESTORE_URL="postgresql://postgres.${REF}:${PASS}@${HOST}:5432/postgres?sslmode=require"
    else
      RESTORE_URL="postgresql://postgres:${PASS}@db.${REF}.supabase.co:5432/postgres?sslmode=require"
    fi
  else
    echo "❌ Встанови RESTORE_DATABASE_URL (Direct connection, порт 5432) або DATABASE_URL з pooler для автопобудови."
    echo "   Приклад: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
    exit 1
  fi
fi

# Прибрати pgbouncer з URL якщо є
RESTORE_URL="$(echo "$RESTORE_URL" | sed 's/[?&]pgbouncer=[^&]*//g' | sed 's/?$//')"

# Опція --clean: спочатку очистити таблиці (truncate)
CLEAN=0
for arg in "$@"; do
  if [ "$arg" = "--clean" ]; then CLEAN=1; break; fi
done

# Файл бекапу
BACKUP_FILE=""
for arg in "$@"; do
  if [ -f "$arg" ]; then BACKUP_FILE="$arg"; break; fi
done
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE="$(ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | head -1)"
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Не знайдено файл бекапу. Вкажи: $0 [--clean] path/to/backup.sql"
  exit 1
fi

if [ "$CLEAN" = "1" ]; then
  echo "🧹 Очищення таблиць (TRUNCATE) перед імпортом..."
  psql "$RESTORE_URL" -v ON_ERROR_STOP=0 <<'TRUNCATE_SQL' || true
SET session_replication_role = replica;
TRUNCATE auth.flow_state, auth.identities, auth.sessions, auth.refresh_tokens, auth.audit_log_entries CASCADE;
TRUNCATE public.users, public.campaigns, public.campaign_members, public.characters, public.units, public.unit_groups,
  public.spells, public.spell_groups, public.artifacts, public.artifact_sets, public.character_inventories,
  public.skill_trees, public.character_skills, public.battle_scenes, public.status_effects, public.racial_abilities,
  public.skills, public.races, public.main_skills CASCADE;
-- auth.users очищаємо окремо (може вимагати прав)
TRUNCATE auth.users CASCADE;
SET session_replication_role = DEFAULT;
TRUNCATE_SQL
  echo "   Готово."
  echo ""
fi

echo "📥 Відновлення даних з $BACKUP_FILE"
echo "   У базу: ${RESTORE_URL%%@*}@..."
echo ""

# Вимкнути тригери під час імпорту (важливо для auth.users)
IMPORT_TMP=$(mktemp)
echo "SET session_replication_role = replica;" > "$IMPORT_TMP"
# Пропустити \restrict і блок COPY auth.schema_migrations (немає прав через pooler)
# Пропустити \restrict, \unrestrict і блок COPY auth.schema_migrations
awk '
  /^\\restrict / { next }
  /^\\unrestrict / { next }
  /^COPY auth\.schema_migrations / { skip=1; next }
  skip && /^\\.$/ { skip=0; next }
  skip { next }
  { print }
' "$BACKUP_FILE" >> "$IMPORT_TMP"
echo "SET session_replication_role = DEFAULT;" >> "$IMPORT_TMP"

if psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -f "$IMPORT_TMP"; then
  echo ""
  echo "✅ Відновлення завершено."
else
  echo ""
  echo "⚠️ Імпорт завершився з помилками (наприклад, дублікати ключів або відмінна схема). Перевір лог вище."
  rm -f "$IMPORT_TMP"
  exit 1
fi
rm -f "$IMPORT_TMP"
