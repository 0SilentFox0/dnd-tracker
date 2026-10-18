# Task 2 report

Status: DONE.

TDD: RED — test run failed ("no tests", 1 file failed: `@/components/battle/map` did not exist). GREEN — 5/5 pass (12 polygons, tokens with data-fx-participant, cell click {1,1}, token click without cell click, target fill, hex 12 polygons x 6 vertices). tsc clean, eslint 0 errors/warnings.

Files: components/battle/map/{BattleMap.tsx,MapToken.tsx,index.ts,__tests__/BattleMap.test.tsx}, lib/hooks/battle/useMapViewport.ts (+ barrel export).

Concerns:
- HealthBar rendered with `exact` always (map has no viewer context); player-side hiding must be handled by the caller later.
- Wheel handler does not call preventDefault (React wheel is passive), so the page may scroll while zooming.
- No click suppression after a drag; at zoom 1 there is nothing to pan anyway.
- Portrait px = 0.8 * token size * pxPerUnit (leaves room for the health bar); pxPerUnit is 0 until the first measure (min 12px).

## Fix round 1
Native non-passive wheel listener (preventDefault) via hook containerRef; hook exposes wasDragged(), BattleMap ignores cell/token clicks after a >4px drag or pinch. Added 2 tests (7/7 pass), tsc and lint clean.
