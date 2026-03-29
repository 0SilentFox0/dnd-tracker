#!/usr/bin/env bash
# Позначає перші N міграцій як застосовані (без SQL), потім migrate deploy.
# Потрібно, коли БД вже відповідає цим міграціям, але _prisma_migrations порожня (P3005),
# а новіші міграції ще треба реально накатити. N підбирай через:
#   prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script
# (скільки останніх міграцій відповідає «хвосту» diff — ті не входять у N).
set -euo pipefail
N="${1:-}"
if [[ -z "$N" ]] || ! [[ "$N" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 N" >&2
  echo "  N — скільки перших міграцій (за алфавітним порядку імен папок) позначити migrate resolve --applied" >&2
  exit 1
fi
cd "$(dirname "$0")/.."
args=()
[[ -f .env ]] && args+=(--env-file=.env)
[[ -f .env.local ]] && args+=(--env-file=.env.local)
i=0
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  i=$((i + 1))
  if [[ $i -le $N ]]; then
    echo "migrate resolve --applied $name"
    node "${args[@]}" node_modules/prisma/build/index.js migrate resolve --applied "$name"
  fi
done < <(ls -1 prisma/migrations | grep -v '^migration_lock' | sort)
echo "migrate deploy"
node "${args[@]}" node_modules/prisma/build/index.js migrate deploy
