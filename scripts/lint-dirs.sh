#!/usr/bin/env bash
# Sequential per-folder eslint (a repo-wide run is slow and heavy).
#   scripts/lint-dirs.sh [dir...]            default: app components lib systems scripts types
#   scripts/lint-dirs.sh --changed [base]    folders of files changed vs base (default main)
# env: LINT_TIMEOUT=240 (s per dir)
set -euo pipefail
cd "$(dirname "$0")/.."

TIMEOUT="${LINT_TIMEOUT:-240}"
DEFAULT_DIRS=(app components lib systems scripts types)
dirs=()

if [ "${1:-}" = "--changed" ]; then
  base="${2:-main}"
  while IFS= read -r top; do
    [ -n "$top" ] && dirs+=("$top")
  done < <(
    { git diff --name-only "$base"...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } \
      | grep -E '\.(ts|tsx|mjs|js)$' | grep -E '/' | xargs -I{} dirname {} | sort -u \
      | while IFS= read -r d; do [ -d "$d" ] && echo "$d"; done
  )
  [ "${#dirs[@]}" -gt 0 ] || { echo "no changed folders"; exit 0; }
elif [ "$#" -gt 0 ]; then
  dirs=("$@")
else
  dirs=("${DEFAULT_DIRS[@]}")
fi

log="$(mktemp)"
trap 'rm -f "$log"' EXIT
failed=()
for dir in "${dirs[@]}"; do
  start=$SECONDS
  code=0
  perl -e 'alarm shift; exec @ARGV' "$TIMEOUT" pnpm exec eslint --cache --cache-location .eslintcache "$dir" >"$log" 2>&1 || code=$?
  if [ "$code" -eq 0 ]; then
    echo "ok      $dir ($((SECONDS - start))s)"
  else
    if [ "$code" -eq 142 ]; then echo "TIMEOUT $dir (>${TIMEOUT}s)"; else echo "FAIL    $dir ($((SECONDS - start))s)"; fi
    tail -30 "$log"
    failed+=("$dir")
  fi
done
[ "${#failed[@]}" -eq 0 ] || { echo "failed: ${failed[*]}"; exit 1; }
