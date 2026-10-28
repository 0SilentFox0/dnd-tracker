# Battle Map — блок 2d: місцевість і підсвітка ходу — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Зона ходу без цифр, з яскравим зеленим обведенням (як у HOMM/BG3); червоні клітинки — небезпечні (поруч ворог ближнього бою або позначена ДМ небезпека); шар «Місцевість», який ДМ малює в налаштуваннях і під час бою: непрохідне (темне), барʼєр на N раундів (темніше, зникає сам), небезпека (червоне, з підписом).

**Architecture:** `BattleMapConfig.terrain?: Record<cellKey, TerrainCell>`. Рушій вважає `wall`/`barrier` непрохідними там само, де `blocked` (через `isPlayable`). Карта змінюється під час бою новою DM-мутацією `map-terrain`; для цього `ScenePatch` отримує `map`, `saveBattle` пише колонку `map`, клієнтська дельта несе `scene.map`, відкат зберігає `map` у знімку стану. Барʼєри з `untilRound < round` прибирає рушій ходу при переході раунду. Загроза ближнього бою рахується чистою функцією для того, хто ходить.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Prisma, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-battle-map.md` (розділ «Місцевість», дописується в Task 1)

## Global Constraints

- Конвенції `CLAUDE.md` (pipeline `runBattleMutation`, дельти замість refetch, `useBattleAction`, компоненти без `@/lib/api`, тексти українською).
- `terrain` зберігається лише в `battle_scenes.map` (JSONB) — без нових таблиць і міграцій.
- Шкода від небезпечних клітинок у цьому блоці НЕ рахується автоматично (лише показ + підпис); автошкода — блок 3.
- Неігрові клітинки (`blocked`) лишаються прозорими (без змін).
- Зміни місцевості не пишуть подій у журнал (як рух).

## Review Focus

- Барʼєр із `rounds: 1`, поставлений у раунді 3, діє до кінця раунду 3 і зникає на початку раунду 4 — і для рушія, і на екрані в усіх гравців.
- Відкат бою до події до появи барʼєра прибирає барʼєр (карта в знімку стану).
- Учасник, що стоїть у клітинці, яку ДМ робить непрохідною/барʼєром: ДМ отримує відмову («Клітинка зайнята»), а не «застряглий» токен.
- Загроза ближнього бою: ворог з лише дальніми атаками або з `disable_melee_attacks`, мертвий, у резерві — загрози не створює; велика істота 2×2 загрожує всім клітинкам навколо свого footprint.
- Бій без карти й карта без `terrain` — поведінка й вигляд як раніше (крім нової підсвітки ходу).

---

### Task 1: Модель і рушій місцевості

**Files:**
- Modify: `types/battle.ts` (`TerrainKind`, `TerrainCell`, `BattleMapConfig.terrain?`), `lib/schemas/battles.ts` (`terrain`), `lib/utils/battle/grid/geometry.ts` (`isPlayable` ураховує `wall`/`barrier`; кеш як у `blockedSet`)
- Create: `lib/utils/battle/grid/terrain.ts` (`terrainAt`, `hazardCells`, `threatCells`, `pruneExpiredBarriers`, `applyTerrain`)
- Modify: `lib/utils/battle/store/types.ts` (`ScenePatch.map`), `lib/utils/battle/store/save-battle.ts` (запис `map`, якщо в патчі), `lib/utils/battle/store/snapshot-state.ts` (+ відновлення при відкаті — знайди, де `SnapshotState.scene` застосовується в rollback), `lib/utils/battle/pipeline/client-delta.ts` + `types/api.ts` (`ClientBattleDelta.scene.map?` — лише коли змінилась), `lib/utils/battle/client/apply-delta.ts` (застосувати `scene.map`), `lib/utils/battle/turn/*` (при переході на новий раунд — `pruneExpiredBarriers`, повернути `scene.map`, якщо щось прибрано)
- Create: `app/api/campaigns/[id]/battles/[battleId]/map-terrain/{route.ts,map-terrain-mutation.ts}` (DM-only, `requireStatus: ACTIVE`, без подій), `lib/api/battles.ts` (`setMapTerrain`), `lib/hooks/battles/useBattles.ts` (`useMapTerrain`), `lib/hooks/battle/useBattleScene.ts` (`actions.mapTerrain`)
- Modify: spec — розділ «Місцевість»
- Tests: grid terrain, save/delta/apply-delta/rollback, turn prune, mutation

**Interfaces:**
```ts
export type TerrainKind = "wall" | "barrier" | "hazard";
export interface TerrainCell { kind: TerrainKind; label?: string; untilRound?: number }
// BattleMapConfig.terrain?: Record<string, TerrainCell>   // key = "x:y"

terrainAt(map, p): TerrainCell | undefined
hazardCells(map): Set<string>
threatCells(map, participants, mover): Set<string>   // клітинки поруч (відстань 1) з footprint живих, не в резерві ворогів mover-а, що мають хоча б одну melee-атаку і не мають disable_melee_attacks; без клітинок самих ворогів
pruneExpiredBarriers(map, round): BattleMapConfig | null   // null — нічого не змінилось
applyTerrain(map, cells: string[], value: TerrainCell | null): BattleMapConfig
```
- Мутація `map-terrain` body: `{ cells: string[] (1..400, "x:y"), terrain: { kind, label?: string ≤ 60, rounds?: int 1..20 } | null }`; `barrier` вимагає `rounds` → `untilRound = round + rounds - 1`; `wall`/`barrier` на клітинку, зайняту живим учасником або поза ігровою зоною → `BattleRuleError("action_rejected", "Клітинка зайнята або поза полем")`; `null` — стерти.
- Схема `terrain`: `z.record(z.string().regex(/^\d+:\d+$/), z.object({ kind: z.enum([...]), label: z.string().max(60).optional(), untilRound: z.number().int().min(1).optional() })).optional()`, ≤ 3600 записів.
- `isPlayable` = в межах, не `blocked`, не `wall`/`barrier`.

- [ ] TDD для кожної функції/шару; `pnpm test:run`, tsc, lint. Commits: `feat(battle-map): terrain model and engine rules`, `feat(battle-map): DM map-terrain mutation, map in scene delta and rollback`.

### Task 2: Відмальовка — зона ходу, небезпека, місцевість

**Files:** `components/battle/map/BattleMap.tsx` (GridLayer), `lib/utils/battle/grid/map-view.ts`, `lib/utils/battle/grid/map-scene.ts`, `types/battle.ts` (`BattleMapMark` + `"move-danger"`), dev-пісочниця, тести компонента й map-scene.

- Прибрати цифри вартості з клітинок (вартість лишається в даних для логіки).
- `move`: заливка `rgba(70,200,70,.16)`, обведення `#7dff5a` товщиною ~2.5 (non-scaling) з легким світінням (SVG `filter` drop-shadow або другий напівпрозорий широкий stroke); сусідні клітинки зони мають виглядати як суцільна сітка обведень, як на референсі.
- `move-danger` (досяжна клітинка в `threatCells` або `hazardCells`): той самий стиль, але червоний `#ff5a4a`, заливка `rgba(220,60,50,.2)`.
- Місцевість поверх фону, під токенами: `wall` — `rgba(0,0,0,.6)` без сітки; `barrier` — `rgba(0,0,0,.75)` + діагональне штрихування (SVG pattern) без сітки, у `<title>` «Барʼєр до кінця раунду N»; `hazard` — постійна червона заливка `rgba(200,40,30,.28)` з тонким червоним обведенням, `<title>` = підпис.
- `deriveMapScene`: у move-режимі позначати `move-danger` для досяжних клітинок у загрозі/небезпеці.

- [ ] Тести (map-scene: сусідня з ворогом melee клітинка → `move-danger`; ворог лише з ranged → `move`; hazard → `move-danger`; компонент: немає `<text>` з цифрами; стилі wall/barrier/hazard), tsc, lint, повний прогін. Commit: `feat(battle-map): accented move zone, danger cells, terrain rendering`.

### Task 3: Інструмент «Місцевість» для ДМ (бій + налаштування)

**Files:** `lib/hooks/battle/useMapTerrainTool.ts` (+ barrel), `components/battle/map/MapTerrainToolbar.tsx`, `components/battle/map/BattleMapPanel.tsx`, `lib/utils/battle/grid/map-scene.ts` (режим інструмента), `components/battle/setup/BattleFormMap.tsx` + `lib/hooks/battles/setup/useBattleMapEditor.ts` (палітра замість простого «малювати неігрові»: Неігрова / Непрохідне / Небезпека / Стерти; барʼєр у налаштуваннях недоступний — він тільки для бою).

- У бою (лише ДМ): кнопка «Місцевість» поруч із «Розставити» (взаємовиключні режими, Esc виходить). Палітра: «Непрохідне», «Барʼєр» (+ поле раундів, дефолт 1), «Небезпека» (+ поле підпису, дефолт «Небезпечна зона»), «Стерти». Натиснути й протягнути по клітинках — локальне превʼю штриха; на відпускання — один запит `actions.mapTerrain.mutate({ cells, terrain })`.
- Поки інструмент активний, кліки по клітинках/токенах не роблять рух/атаку.
- Налаштування: та сама палітра для `blocked`/`wall`/`hazard`, малювання протягуванням.

- [ ] Тести хука (штрих збирає унікальні клітинки, один виклик на відпускання; взаємовиключність з «Розставити»), компонента панелі; tsc, lint, повний прогін. Commit: `feat(battle-map): DM terrain tool in battle and setup`.

### Task 4: Перевірка в браузері (локальна база)

- [ ] Тестовий бій з гробницею: зона ходу — зелені обведення без цифр; клітинки біля ворога ближнього бою — червоні; ДМ ставить «Непрохідне» (темне, туди не піти), «Барʼєр 1 раунд» (зникає на наступному раунді), «Небезпека: Вогняна стіна» (червоне з підписом); друга вкладка бачить зміни без перезавантаження; відкат прибирає барʼєр.
