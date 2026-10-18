# Task 5 report

Status: DONE. HUD card (MapTokenHud.tsx) above tokens in a separate z-layer; fitMapBox + ResizeObserver contain-fit in BattleMap; playground h-dvh with compact mobile controls; mock effects; FX hooks (data-fx-anchor/cell/clip, left/top transition with motion-reduce). Tests: map 11, layout 6, full suite 2697 passed, tsc and eslint clean.
Concerns: not visually checked. Cards flip below the token for tokens in the first row. EffectLine inside card shows effect names (13px) and has no tooltips (pointer-events-none).

## Fix round 1
Playground uses the existing .below-header class (100dvh minus --app-header-h) instead of h-dvh. HUD card clamped horizontally inside the map. Card is compact: name + HP, bar, effect icons only (aria-label/title carry the name). Placement prefers every other row per side, then fills gaps (test added). Full suite 2698 passed, tsc and lint clean.
