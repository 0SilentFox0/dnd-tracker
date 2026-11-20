# Fix report: failing tests on feat/world-trail

## Production bugs
- `lib/hooks/world/useHeroDrag.ts` and `components/world/map/WorldEnemies.tsx`: `exceedsDragThreshold(g.start, e)` passed the PointerEvent, which has `clientX/clientY`, not `x/y`. The distance was NaN, so a drag never activated (heroes and enemy pins could not be dragged). Fixed by passing `{ x: e.clientX, y: e.clientY }`. This fixed useHeroDrag (5), WorldHeroesDrag (2), WorldEnemies (1).
- `lib/hooks/world/useWorldEnemies.ts`: tsc error, `update` mutation generics inferred as `unknown`. Fixed with explicit generics.

## Test fixes
- world-api, world-notes-api: prisma mock lacked `worldEnemyPin` (map GET now calls `listEnemies`). Added.
- world-travel-api: mock lacked `worldSession.findFirst` (`activeSessionId` stamping in commitTravel) and `worldEnemyPin`. Added.
- dm/world page-client.test: page now uses useWorldEnemies/useWorldTrail/useWorldSessions/useWorldTravel and Trail/Sessions/Enemy components needing a QueryClient. Mocked them; detail got `enemies: []`.
- trail-handlers.test: handler reverses the desc-ordered rows; the test fed [solo, mixed] and expected solo first. Swapped the mock order to newest first.
- scope-size: `wfrp member` uk gzip is 114.14 KB vs budget 114 (growth from ~140 new lines in world/errors/help/whatsNew messages, legitimate). Raised `systems/wfrp/meta.ts` i18n.budgetKb.member 114 -> 114.5.
- assistant-cleanup-cron.test: unrelated to this branch. The route already returns `demoBattleCopiesDeleted` (from main), the old test omits it. Not touched.

## Verification
- Affected files plus components/world, lib/hooks/world, lib/server/world: all green. world-travel-api "player 403" failed once under load and passed in 2 isolated reruns (flaky first dynamic import).
- `tsc --noEmit`: clean.
