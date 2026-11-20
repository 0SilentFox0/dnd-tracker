# World map subproject 3 (layers, final): carried-over open items

Subproject 3 (layers: markers + overlay image, visibility DM/all/per hero via `buildWorldView`) is the last part of the world-map UX epic. Items left open by subproject 2 (sessions + trail, merged 2026-11-20) are folded into it; fix them when touching the same files, or close them explicitly.

## From the subproject 2 review and live run

- **Sessions list entry count:** spec §2 asks for a per-session record count in `GET sessions` / `SessionsPanel`; not implemented.
- **B2, horizontal scroll at 390 px:** the "Through a hero's eyes" select in the mode toolbar (`h-10 w-full shrink-0`) makes the page 501 px wide. Pre-existing, not from the trail work.
- **Trail node under a hero pin:** a node at the hero's position is covered by the pin, so the click hits the pin / map destination. Decide whether nodes need a hit-area offset once layers change the pin stack.
- **Duplicated drag gesture:** `WorldEnemies.tsx` copies the pointer-drag logic of `WorldPins.tsx`; a shared hook would remove it (re-verify drag live after the change).
- **Duplicated debounced colour commit:** `EnemyCard.tsx` repeats the pending-ref + flush-on-unmount logic of `lib/hooks/world/useMarkerFields.ts`.
- **Player trail payload:** sessions expose `active` to the player; the session description is visible to players in the bubble. Decide whether either must be DM-only (privacy rule for layers).
- **Bubble card slot:** trail bubble and marker bubble share one map card slot (trail wins); the nested ternary choosing the card in `page-client.tsx` / `WorldPlayClient.tsx` is verbose.
- **Escape mid-drag** was verified live only with synthetic pointer events, not a trusted mouse.
- **Skipped reviewer minors M3, M5, M7–M15 and the marker-name part of M6:** the detailed list lived in the SDD workspace (`final-review.md`, `review-fix-report.md`), which was deleted after the merge, so only the items above are recoverable. Re-run `/code-review` on `lib/server/world`, `components/world` and `lib/hooks/world` at the start of subproject 3 to regenerate it.
- **Unrelated:** `app/api/__tests__/assistant-cleanup-cron.test.ts` fails on main (route returns `demoBattleCopiesDeleted`, test omits it); `lib/utils/battle/modes/maze/__tests__/generate.test.ts` "40×30 generates fast" is timing-flaky under load.

## Deploy notes

- Migration `20261221000000_world_sessions_enemy_pins` (expand-only, RLS on both tables, partial unique index `world_sessions_one_active`) ships with the next main deploy.
- Enemy pins live only in `world_enemy_pins` and only in the DM map-detail response; layers must not read that table from any player path.
