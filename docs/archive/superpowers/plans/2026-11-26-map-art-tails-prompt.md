# Map-art tails — prompt for a new session

Model Sonnet; talk to the owner in Ukrainian. Worktree /Users/silentfox/Work/dnd-tracker-mapart, branch `fix/map-art-tails` (off main bfcead398, already pushed to origin/main with Ch1a+Ch1b). Do not touch /Users/silentfox/Work/dnd-tracker. Read CLAUDE.md, docs/STATUS.md (Ch1b), memory project-map-art-ch1b, and .superpowers/sdd/2026-11-26-map-art-ch1b/{final-review,live-run-report,fix-report}.md (git-ignored scratch; may be gone — STATUS has the list).

Done on the branch: 8dea20bc6 stray edges on wall drag (item 1). Prod deployed (Ready), migration 20261226000000 applied, prod backup taken (.migration-backup/backup_20261126_185958.sql, 29M).

Remaining, in order:
1. pushAway footprint walls (lib/utils/battle/grid/push.ts ~39): check every footprint cell, not only the anchor.
2. M4: art-map cell `erase` of a scene-blocked cell is undone on save — make erase remove it from scene.blocked (or hide the tool).
3. M8: cloneMap creates the art row outside the createMap transaction (library-service.ts) — move it into the same transaction.
4. M6: converter dry-run prints counts of dropped edge-art/effects layers.
   Each with tests, one commit each, `git add <paths>`, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; tsc, `pnpm cycles`, eslint on touched files, `pnpm test:related`; one full `pnpm test:run` at the end; agents write tests but don't run the suite.
5. Converter on PROD (owner approved after backup+deploy, both done): `pnpm exec tsx --env-file=<prod env, DIRECT_URL> --tsconfig tsconfig.scripts.json scripts/maps/convert-tiles-to-art.ts --allow-remote` (dry-run first; expect 2 maps, ground 17 / wallfill 3 chunks), then `--apply`. Prod URL lives in /Users/silentfox/Work/dnd-tracker/.env.production-db.local; never print secrets. After apply tell the owner: both maps stay unbaked until a DM opens and saves each one.
6. Owner decision pending: 100x100 square bakes at only 33 px/cell (4 MB cap) and is blurry at zoom; options: raise BAKE.maxBytes for big maps (egress cost), lower quality, or accept. Ask the owner.
7. Not yet verified live: hex 100x100 bake, hex movement/vision/door-open by player, 375 px (Chrome min 500). Live run: local DB prodcopy_mapart (migrated), `next build` + `next start -p 3000` (kill nothing else without asking), owner logs in manually in the extension Chrome window.
8. Cleanup with owner's consent: worktree ../dnd-tracker-mapart, local DB prodcopy_mapart, maps MAPART-TEST sq30/hex30/sq100 in HOMM5 (local prodcopy only), restart the landing server on :3000 (killed, ../dnd-tracker-landing).
Finish: merge to main and push without asking (owner approved 2026-11-26), update docs/STATUS.md and memory project-map-art-ch1b.
