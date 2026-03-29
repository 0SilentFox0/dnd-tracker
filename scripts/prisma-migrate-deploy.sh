#!/usr/bin/env bash
# Prisma loads .env only; Next.js also loads .env.local. Merge both so DIRECT_URL
# in .env.local is visible to `prisma migrate deploy`.
set -euo pipefail
cd "$(dirname "$0")/.."
args=()
[[ -f .env ]] && args+=(--env-file=.env)
[[ -f .env.local ]] && args+=(--env-file=.env.local)
exec node "${args[@]}" node_modules/prisma/build/index.js migrate deploy "$@"
