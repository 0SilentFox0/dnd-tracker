# Ч7c hex: уточнення плану після Opus-рев'ю (2026-11-26)

Пріоритетніше за спеку/план Ч7. Рішення власника: усі шість рекомендацій прийняті.

## Рішення
1. Токени на hex = 1 клітинка. `sizeOf` і `combatStats.gridSize`/snapshot НЕ чіпаємо (їх читають d20 `size-limit`, `mastery`, wfrp). Новий `footprintSizeOf(p, grid)` в `occupancy.ts`: hex → 1, square → `sizeOf(p)`. `cellsOf(p, grid)` і всі `footprint(.., sizeOf(..))` ідуть через нього.
2. Шаблони на hex: circle/emanation/sphere/cube = hex-диск за `hexDistance`; cross = 6 променів; line = `hexLine`; cone = 60° клин; `areaCentre`/`apexOf` по `hexCenter`. Описати в `battle.md`.
3. Видимість: square-shadowcast + обрізання результату за `hexDistance ≤ radius`; line-of-fire і покриття через `hexLine`; розбіжність задокументувати.
4. Grid: обовʼязковий параметр без default для participant-рівня (`cellsOf`, `footprint`, `isAdjacent`, `aimInRange`, `pointBlankBetween`); default `'square'` для низькорівневих (`neighbors`, `cellDistance`, `footprintDistance`, `cellLine`, `cellsByRing`, `cellsByDistance`) + AST-ratchet. Square-тести, що викликають обовʼязкові, правимо мінімально (додати `'square'`).
5. Великі істоти на hex: reach/opportunity від 1 клітинки; правила розміру (`sizeOf`) не міняються; задокументувати.
6. `scripts/sim/battle-sweep.ts`: один hex-сценарій зі змішаними ролями й spell-шаблонами.

## Схема і потік
- Refine НЕ на `battleMapObject` (його `.omit().extend()` у `headerSchema`), а в `battleMapSchema.superRefine` (`lib/schemas/battles.ts`) і `refineBattleMap` (`lib/schemas/battle-maps.ts`): hex ⇒ без maze/walls/bars/doors/tiles.
- Тайли/стіни йдуть patch-маршрутами без `gridType` → серверна перевірка за завантаженим header. `map-update-mutation` відхиляє зміну `gridType`.
- Capability режиму `grids?: GridKind[]` у `lib/utils/battle/modes/types.ts`, maze = `['square']`; UI фільтрує режими за `grids`.
- UVTT/catalog імпорт примусово square (`useImportCatalogMap.ts`, `UvttImportSection.tsx`); `EditorSidebar` ховає стіни/двері/тайли на hex.

## Пакети і файли
**A1:** `types/battle-grid.ts` (+`GridKind`, `gridOf`), `lib/schemas/{battles,battle-maps}.ts`, `grid/{hex.ts,geometry.ts,occupancy.ts,layout.ts (+gridMetrics),index.ts}`, `modes/types.ts` + maze def, тести.
**A2 (мердж лише разом з A3):** `CreateMapDialog`, `useMapEditorDraft`, `useImportCatalogMap`, `UvttImportSection`, `EditorSidebar`, `useBattleMapEditor`, `lib/server/content/copy/maps.ts`, clone, `map-update-mutation`, messages uk/en.
**A3a-1 (grid/):** `geometry, adjacency.ts:17, path.ts, map-view.ts:57,94, map-scene.ts (rangeWindow → hex-область), template.ts (rayCells, exactCircleCells, cubeCells, crossCells, apexOf, areaCentre, aimInRange, participantsInCells), push.ts (hexAwayStep), line-of-fire, sight, attack-reach, reach-check, nearest, placement, revive-placement, hazard, terrain.ts:85,91 (point-free), vision/shadowcast, fog/fog-view.ts`.
**A3a-2:** `spell/{spell-targeting,auto-reaction,zone-hazard,anchored-zone,zone-triggers}`, `spell/cast/{burst,effects,extension,move-self (:42 reach 1+1),move-summon}`, `attack/bonus-math`, `attack/process/{chain,cleave,piercing,fire-wave (hexAwayStep)}`, `counter/eligibility`, `summon/objects-near`, `maneuvers/squall`, `flows/spell-pick`, `validation/ability-aim`, `abilities/engine/effects/map-auras`. Автоматично через `adjacencyOf`/`isAdjacentOnMap`: `abilities/registry/conditions`, `maneuvers/fire-burst`, `pipeline/ability-use`, `run-abilities`.
**A3a-3:** `systems/opportunity/rules/opportunity.ts`, `systems/wfrp/rules/combat/range-band.ts` (`pointBlankBetween` + grid), `traits/frenzy.ts`, `magic/dispel-range.ts`, `systems/wfrp/server/battle/movement-mutation.ts:247`, `map-door-toggle-mutation` (square-only exempt + assert), hooks `playground-click`, `useAbilityMapAim:35`, `useStrokePaint:91`, `scripts/sim/battle-sweep.ts`.
**A3b (рендер):** `layout.ts` (`mapSize, cellAtScreenPoint, cellScreenPoint, cellCenter, cellPolygon, tokenBox, fitMapBox`), `region-path.ts` (hex fill = один `<path>`, outline = ребра, що зустрілись раз, ключ `(cell,dir)`↔`(neighbor,opp(dir))`), `grid/{GridStatic,GridMarks (:54,:97),GridHit,GridLayer,MapPathPreview}`, `layers/MapLayers.tsx`, `tokens/{token-box,MapToken,MapTokenHud,MapHitFloat,RangedHint,useMapStageTokens}`, `MapStage, useBattleMapFrame, BattleMap, camera/{MapMinimap,follow}, useGridWindow`, `components/fx/runtime/anchors.ts` (`data-grid`), `fog/{FogSurface,MapFogLayer}` + `lib/utils/canvas/fog/{fog-mask,mask-canvas}` (≥2 px/клітинку, зсув непарних колонок, grid з наявного `map`, без нового prop), `background.ts, calibration.ts, useMapGridSizing`.

## Хибні спрацювання (не чіпати)
wfrp `weapon-profile.ts` (локальний `cellsOf`), `lib/utils/scenario/graph` (`neighbors`), `components/dice/scene.ts`, «footprint» у `tiles/derive`, `load-battle`, `useBattleMapFog`, `useBattleSceneMap`, `tilesets/*`, `painter`; `UNIT` у `DmParticipantRow`, `AddParticipantDialog`, `balance/*`, `summon/*`; `maneuvers/dive.ts`; `scripts/spikes/*`. Square-only exempt: `modes/maze/*`, `tiles/edit.ts`.

## Ratchet `lib/__tests__/grid-calls.test.ts`
TS AST (`ts.createSourceFile`, як `lookup-lazy-toplevel.test.ts`). Скан: `lib/utils/{battle,abilities}`, `lib/server/battles`, `systems/*/{rules,server}`, `lib/hooks/battle`, `components/battle/map` (без `__tests__`). Відстежуємо лише binding-и, імпортовані з `grid/*`: `cellsOf, footprint, footprintDistance, cellDistance, neighbors, cellLine, cellsByRing, cellsByDistance, closestCell, isAdjacent, aimInRange, pointBlankBetween`. Порушення: (a) арґументів менше повної arity; (b) point-free посилання; (c) `footprint(_, sizeOf(..))` / `sizeOf(..) *` поза `occupancy.ts`; (d) літерал `'square'` як grid. Винятки: `ratchets/grid-square-only.json` `{file: reason}`, лише скорочується. Фікстури-порушення в тесті. Додатково ratchet проти сирого `* UNIT` поза `layout.ts` (за import з `grid/layout`).

## Ризики (деталі)
Chebyshev на odd-q (1,1)↔(0,0) = 1, hex = 2; `Math.sign` у `fire-wave`/`push` дає неіснуючий напрям → cube `hexAwayStep` (cubeRound, tie-break по найбільшій компоненті); `fitMapBox` ratio cols/rows на hex хибний; `GridMarks` template малює `cellPolygon` поштучно → hex-полігон.
