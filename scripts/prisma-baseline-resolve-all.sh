#!/usr/bin/env bash
# Позначає всі локальні міграції як уже застосовані в БД (без виконання SQL).
# Використовуй ЛИШЕ якщо схема на сервері вже відповідає поточному prisma/schema.prisma
# (наприклад після імпорту дампу, db push або ручного відтворення схеми).
# Інакше отримаєш роз’їзд історії міграцій і реального стану БД.
set -euo pipefail
cd "$(dirname "$0")/.."
args=()
[[ -f .env ]] && args+=(--env-file=.env)
[[ -f .env.local ]] && args+=(--env-file=.env.local)
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  echo "prisma migrate resolve --applied \"$name\""
  node "${args[@]}" node_modules/prisma/build/index.js migrate resolve --applied "$name"
done < <(ls -1 prisma/migrations | grep -v '^migration_lock' | sort)
echo "Done. Далі: pnpm migrate:deploy (має пройти без накату SQL, якщо все збігалося)."
