# Prompt for a new session: live run, review, merge and push of integrate/ch8-codex, then wave 3

Model: Opus for the review; Sonnet for the live-run agent and mechanical fixes. Stop and hand off at ~150k context.

Read first: CLAUDE.md; memory project-ch8-wave1, project-ch8-wave2, project-game-ui-ch8, feedback-browser-live-check, feedback-shared-checkout; docs/superpowers/plans/2026-11-27-ch8-integrate-continue-prompt.md (steps 4-7 still apply).

## State (2026-11-27)

- Worktree `../dnd-tracker-ch8-int`, branch `integrate/ch8-codex`, tip 70341b866 (merge a948d99f3 + fixes 4b6037194, 70341b866). Not pushed. Main folder `../dnd-tracker` is on feat/ops-vercel-pro: do not touch.
- Gates green: tsc, `pnpm cycles`, `pnpm lint:dirs --changed origin/main`; full `pnpm test:run` was green except props-budget, fixed afterwards (targeted rerun green; one more full run before push is cheap insurance).
- i18n route budgets in lib/i18n/test/route-budgets.ts raised by owner approval (measured uk gzip + 0.5 KB).
- No prisma diff vs origin/main: no migration goes to prod.
- Owner approved merge and push (given on 2026-11-27) once gates are green and the live run passes.
- `.env.local` copied into the worktree (untracked/ignored). The build is done and `ch8_live` is migrated. The `next start -p 3100` server may have died with the old session: restart with `DATABASE_URL=DIRECT_URL=postgresql://postgres:postgres@localhost:54322/ch8_live RATE_LIMIT_ALLOW_MEMORY=1 pnpm exec next start -p 3100` (run in background; rebuild only if code changed).

## Remaining

1. Ask the owner to log in at localhost:3100 in the Chrome-extension window.
2. Sonnet agent live run: conflicted screens (library forms, /info, rules, hero «Основне», import) + wave 2 (battles list, create, map) at 1280/390, tavern+parchment, console, 5xx, MISSING_MESSAGE, hscroll. Agent must not start/stop servers. Mobile sticky action bar on the battle setup form was lost with wave 0-1 frame: check it.
3. Opus review of the conflict decisions only; fix findings.
4. Merge: feat/game-ui-ch8 <- integrate/ch8-codex (ff); then main in a temporary worktree; `git push origin main`, no force. Do not delete the Ч8 spec/plan.
5. After push: update memory (project-ch8-wave1/2: integrated into main <sha>), docs/STATUS.md, tip/branch in docs/superpowers/plans/2026-11-27-game-style-ui-ch8-wave3-prompt.md; then wave 3 from that prompt (or hand off).
