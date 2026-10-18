# SDD ledger — plan: docs/superpowers/plans/2026-10-18-battle-map-ui-mock.md
Spec: docs/superpowers/specs/2026-10-18-battle-map.md. Mode: sonnet implementers, no per-task review, final opus review.
Pre-flight: T1 attackReachError has options arg {ignoreReach} — map-view passes default; T2 consumes T1 layout/CellMark; T3 consumes T2 BattleMap + T1 marks; consistent.

## Progress
Task 1: complete (754d509..9a46aae)
Task 2: fix round 1/5 (2 addressed: native wheel preventDefault, drag suppresses click; commits 2a51cca..f3a5ffa)
Task 2: complete (9a46aae..f3a5ffa)
Task 2: minor (deferred): HealthBar always exact on map — player-side HP hiding belongs to block 2b scene integration
Task 3: complete (f3a5ffa..8c4d512) — not visually verified by implementer (auth); controller checks in browser
Controller browser check: /dev/battle-map renders bg, square+hex grid, 8 tokens incl 2x2, move highlights + move works, attack mode greys unreachable enemies; mobile resize not applied by browser (unchecked). Final review deferred until user feedback on the look.
User feedback: drop hex; token HUD card in row style (chosen option "card on token"). Tasks 4-5 appended to plan.
Task 4: complete (..43b71d9) hex removed
Task 5: fix round 1/5 (page scroll, card clipping, card overlap, effect names → icons; 5fdeded..2936d1e)
Task 5: complete (43b71d9..2936d1e) — browser: no page scroll at 1512x799, cards readable
Task 5: minor (deferred): bottom-row card could clip vertically
