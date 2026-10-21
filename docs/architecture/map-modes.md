# Map modes

`lib/utils/battle/modes`: one mode per battle, `activeMapMode(map)` from `MAP_MODE_REGISTRY` (server/engine/client hooks, `NORMAL_MODE` neutral) + `MAP_MODE_UI` (`components/battle/modes`, UI slots) + mode hooks in `lib/hooks/battle/modes/<key>`. Core never imports a mode directly (ESLint).

**New mode** = a folder in the three places + a row in both registries (+ `satisfies Record<MapModeKey, …>` objects in `lib/hooks/battle/modes/tools.ts`).

## Maze

The first mode: pure geometry/vision/generator, server wake-up in `afterMutation`, hiding client-side in `modes/maze/view.ts`; the server sends the full scene.
