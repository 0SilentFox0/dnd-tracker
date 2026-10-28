# Battle Map — блок 3: заклинання, шаблони AoE, небезпека, аури — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На карті заклинання мають дальність, зональні — шаблон (коло/куб/конус/лінія), який гравець наводить на карті, а сервер сам рахує цілі (усіх у шаблоні, включно з союзниками); небезпечні клітинки завдають шкоди при вході й на початку ходу; Вогняна стіна лишає лінію небезпеки; аури «поруч» діють за радіусом без ручного вибору; тимчасові винятки reach для `aoe`/`attackHitsAllEnemies` прибрано.

**Architecture:** Чиста геометрія шаблонів у `lib/utils/battle/grid/template.ts`. `SpellDefinition` отримує `range?` (фути) і `zone?`; `SpellTargeting` — новий варіант `template` (форма, розмір, а `side`/`maxTargets` — запасний ручний вибір для боїв без карти). Каст несе `targetCell`; `resolveSpellTargets` отримує контекст карти. Небезпека — `TerrainCell.damage`, шкоду рахує спільна функція `hazardHit` для руху (`move`) і початку ходу (`processStartOfTurn`). Аури — `syncMapAuras` у pipeline поруч із `withPlacement`. Клієнт: режим наведення шаблону в контексті сцени, шар превʼю на `BattleMap`.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Prisma, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-battle-map.md` (розділ «Заклинання й шаблони (блок 3)» дописується в Task 1)

## Global Constraints

- Конвенції `CLAUDE.md`: `runBattleMutation`, дельти, `useBattleAction`, компоненти без `@/lib/api`, тексти українською, мінімум коментарів.
- Бій без карти (`map = null`), учасник без позиції, колонковий вигляд — працюють як раніше: `template`-заклинання без карти = ручний вибір до `maxTargets` цілей сторони `side`; дальність не перевіряється.
- Без нових таблиць і міграцій: усе в JSON-колонках (`spells.targeting`, `battle_scenes.map`, `battle_participants.state`).
- Відстань — Чебишев (`cellDistance`, `footprintDistance`); `CELL_FEET = 5`; дальність/розмір у даних — у футах, у рушії — клітинки (`Math.max(1, floor(feet / 5))`).
- Шаблон зачіпає всіх живих учасників на карті, чий footprint перетинає клітинки шаблону — і ворогів, і союзників, і самого заклинателя (рішення користувача).
- Заклинання «на всіх» (`allEnemies`/`allAllies`/`everyone`/`allAlliesDead`) лишаються глобальними, крім тих, що Task 8 переводить у шаблони.
- Небезпека: шкода раз за власний хід учасника (вхід або початок ходу — що раніше), великий юніт — один раз незалежно від кількості клітинок. Розстановка ДМ (`free` / чужий хід) шкоди не завдає.
- Рух повз небезпеку: шкода лише якщо до цілі неможливо дійти тією ж вартістю, оминаючи небезпечні клітинки (рушій обирає безпечний шлях); закінчення руху на небезпечній клітинці — завжди вхід (якщо учасник не стояв у ній до руху).
- Прод: бібліотеку заклинань на prod НЕ засівати в цьому блоці; Task 8 лише готує дані й dry-run diff.

## Review Focus

- Вогняна куля, наведена так, що в коло потрапляє сам заклинатель і союзник: обидва отримують шкоду і кидають рятівний кидок; журнал показує їх серед цілей.
- `template`-заклинання в бою без карти (або заклинатель без позиції): майстер показує звичайний список цілей сторони `side` до `maxTargets`, сервер приймає `targetIds` без `targetCell`.
- Учасник, що починає хід у небезпеці, а потім виходить і знову заходить у неї в той самий хід, — шкода лише один раз; наступного раунду — знову.
- Вогняна стіна зникає на початку раунду `untilRound + 1` (як барʼєр), а небезпека, намальована ДМ без строку, не зникає.
- Аура страху: ворог, що відійшов за радіус, втрачає штраф одразу після свого руху (наступна дельта), а той, хто підійшов, — отримує; у бою без карти лишається ручний `AuraZonePicker`.

---

### Task 1: Геометрія шаблонів і дальності

**Files:**
- Create: `lib/utils/battle/grid/template.ts` (+ export у `lib/utils/battle/grid/index.ts`)
- Test: `lib/utils/battle/grid/__tests__/template.test.ts`
- Modify: `types/battle.ts` (`TemplateShape`, `SpellTemplate`), spec — новий розділ «Заклинання й шаблони (блок 3)» з рішеннями з Global Constraints

**Interfaces:**
- Produces:
```ts
export type TemplateShape = "circle" | "cube" | "cone" | "line";
export interface SpellTemplate { shape: TemplateShape; size: number }   // size у футах: радіус кола, сторона куба, довжина конуса/лінії

export function feetToCells(feet: number): number;                      // Math.max(1, Math.floor(feet / CELL_FEET))
export function templateCells(map: BattleMapConfig, template: SpellTemplate, origin: GridPoint[], aim: GridPoint): string[];
// origin — footprint заклинателя (cellsOf); результат — ключі "x:y", лише isPlayable/inBounds-клітинки (неігрові й стіни не входять), без дублікатів
export function participantsInCells(participants: BattleParticipant[], cells: string[], from: GridPoint): BattleParticipant[];
// живі (isActive), isOnMap, не reserved, footprint перетинає cells; відсортовані за footprintDistance до from (потім за порядком у масиві) — порядок важливий для falloff
export function aimInRange(origin: GridPoint[], aim: GridPoint, rangeFeet: number | undefined): boolean;   // undefined → true
```
- Форми (r = `feetToCells(size)`):
  - `circle`: центр `aim`; клітинка входить, якщо `(dx² + dy²) <= (r + 0.5)²` — коло виглядає круглим, а не квадратом Чебишева.
  - `cube`: квадрат `r×r`, `aim` — лівий верхній кут для парного r, центр для непарного (`x0 = aim.x - floor((r-1)/2)`).
  - `cone`: вершина — клітинка footprint заклинателя, найближча до `aim`; входять клітинки з `cellDistance(вершина, c) ∈ [1, r]` і кутом між `(c - вершина)` та `(aim - вершина)` ≤ 26.57° (`atan(0.5)`, ширина конуса = довжині, як у 5e); `aim == вершина` → порожньо.
  - `line`: від тієї ж вершини в напрямку `aim` продовжити `cellLine` до довжини r (без клітинок самого заклинателя).
- Для `cone`/`line` дальність не перевіряється (вони починаються від заклинателя); для `circle`/`cube` — `aimInRange(origin, aim, range)` через `footprintDistance`.

- [ ] **Step 1:** Тести: коло r=2 (10 фт) у центрі 7×7 → 21 клітинка (перевір точний набір через `(dx²+dy²) <= 6.25`); куб 10 фт → 4 клітинки, 15 фт → 9 з центром `aim`; конус 15 фт праворуч від (0,3) — містить (1,3),(3,2),(3,4), не містить (1,2)? (кут 45° > 26.57° → не містить) і (0,3); лінія 30 фт на схід → 6 клітинок; шаблон біля краю/через неігрову клітинку відкидає їх; `participantsInCells` бере велику істоту 2×2, якщо зачеплена хоча б одна її клітинка, пропускає мертвих/резерв/без позиції, сортує за відстанню; `aimInRange` для 2×2 заклинателя рахує від найближчої клітинки.
- [ ] **Step 2:** `pnpm test:run lib/utils/battle/grid/__tests__/template.test.ts` — FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** Тести PASS, `pnpm exec tsc --noEmit`, `pnpm lint`.
- [ ] **Step 5:** Commit `feat(battle-map): spell template geometry`.

### Task 2: Модель заклинання — дальність, шаблон, зона (+ форма редагування)

**Files:**
- Modify: `lib/utils/spells/model/schema.ts` (варіант `template`, `range`, `zone`), `lib/utils/spells/model/form.ts`, `lib/utils/spells/model/labels.ts`, `components/spells/form/SpellFormPowerFields.tsx`, `components/spells/form/spell-form-defaults.ts`
- Test: `lib/utils/spells/model/__tests__/` (schema + form round-trip; знайди наявні тести моделі й допиши)

**Interfaces:**
- Consumes: `TemplateShape` (Task 1).
- Produces:
```ts
// SpellTargetingSchema += 
z.object({ kind: z.literal("template"), shape: z.enum(["circle","cube","cone","line"]), size: z.number().int().min(5).max(120),
           side: z.enum(["ally","enemy"]), maxTargets: z.number().int().min(1).max(20) })
// SpellDefinitionSchema +=
range: z.number().int().min(5).max(600).optional(),            // фути; немає — без обмеження
zone: z.object({ rounds: z.number().int().min(1).max(10), label: z.string().max(60).optional() }).optional(),
// zone дозволена лише разом із targeting.kind === "template" (superRefine)
```
- Форма: у «Цілі» додати опцію «Шаблон на карті» → поля Форма (Коло/Куб/Конус/Лінія), Розмір (фути), а також «Без карти: сторона / макс. цілей»; окреме поле «Дальність, фути» (порожнє = без обмеження) для всіх, крім `self`/глобальних; для `template` — перемикач «Лишає небезпеку» з полями «Раундів» і «Підпис».
- Лейбли (`labels.ts`): `template` → «Коло 10 фт» / «Конус 15 фт» тощо; `range` → «Дальність 60 фт».

- [ ] TDD: схема приймає/відхиляє (`zone` без `template` → помилка; `size` 0 → помилка); round-trip форми для template/range/zone; лейбли. Тест компонента форми (є `components/spells/__tests__`? — якщо нема, лише модель). tsc, lint. Commit `feat(spells): range, map template and hazard zone in spell model and form`.

### Task 3: Сервер — цілі заклинання на карті, Вогняна стіна як небезпека

**Виконавець: opus** (pipeline, дельта карти).

**Files:**
- Modify: `app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema.ts` (`targetCell?: { x, y }`), `.../spell/spell-mutation.ts`, `lib/utils/battle/spell/spell-targeting.ts`, `lib/utils/battle/spell/cast.ts` (повернути `zone`-клітинки й шкоду для небезпеки), `lib/utils/battle/grid/terrain.ts` (`pruneExpiredBarriers` → `pruneExpiredTerrain`: прибирає й `hazard` з `untilRound`; оновити виклик у `lib/utils/battle/turn/advance-turn.ts`), `types/battle.ts` (`TerrainCell.damage?`), `lib/schemas/battles.ts` (схема `terrain.damage`), `lib/api/battles.ts` + тип тіла касту (`targetCell`)
- Test: `lib/utils/battle/spell/__tests__/spell-targeting*.test.ts`, тест мутації `spell` (знайди наявний у `app/api/__tests__` або поруч), `lib/utils/battle/grid/__tests__/terrain.test.ts`

**Interfaces:**
- Consumes: `templateCells`, `participantsInCells`, `aimInRange`, `feetToCells` (Task 1); `SpellDefinition.range/zone`, targeting `template` (Task 2).
- Produces:
```ts
export interface SpellMapContext { map: BattleMapConfig | null; targetCell?: GridPoint; range?: number }
resolveSpellTargets(ps, caster, spell, targeting, chosenIds, mapCtx?: SpellMapContext): SpellTargetResolution
// SpellTargetResolution ok-гілка += cells?: string[]  (клітинки шаблону, коли він застосований)
export interface TerrainDamage { dice?: string; amount?: number; type: string }   // type — DamageType
// TerrainCell += damage?: TerrainDamage
export function pruneExpiredTerrain(map: BattleMapConfig, round: number): BattleMapConfig | null;
```
- Правила `resolveSpellTargets` з `mapCtx`:
  - Карта є і заклинатель має позицію → «просторовий режим»: інакше — поточна поведінка без змін.
  - `template` у просторовому режимі: `targetCell` обовʼязковий («Оберіть точку на карті»); `circle`/`cube` поза `range` → «Точка поза дальністю заклинання»; цілі = `participantsInCells(ps, cells, aim-або-вершина)`; `chosenIds` ігноруються; навички `spellTargeting` не розширюють шаблон; порожній шаблон дозволений (ок, `targetIds: []`) лише якщо є `zone`, інакше «У шаблоні немає цілей».
  - `template` без просторового режиму: як `area` (`side`, `maxTargets`).
  - `ally`/`enemy`/`area`/`allyDead` у просторовому режимі з `range`: кожна обрана ціль з позицією має `footprintDistance ≤ feetToCells(range)`, інакше «Ціль поза дальністю заклинання». Правило «поруч ворог» для заклинань НЕ застосовується.
  - Глобальні види — без змін.
- `zone` (Вогняна стіна): після касту клітинки шаблону стають `hazard` з `label = zone.label ?? назва заклинання`, `untilRound = round + rounds - 1`, `damage = { amount: <кидок шкоди заклинання до опорів>, type }`; мутація повертає `scene: { map: applyTerrain(...) }` (дельта несе diff місцевості — механізм блоку 2d). Знайди в `cast.ts`, де рахується базовий кидок шкоди (`spellRoll`), і поверни його поруч із результатом.
- `dryRun`/`preview` касту повертає ті самі цілі (для превʼю на клієнті).

- [ ] TDD: шаблон зачіпає союзника й заклинателя; falloff іде за порядком відстані; без карти `template` = ручний вибір; поза дальністю — відмова; одиночна ціль поза `range` — відмова, без `range` — ок; `zone` створює небезпеку на клітинках лінії з правильним `untilRound` і `damage.amount`, дельта несе `scene.terrain`; `pruneExpiredTerrain` прибирає небезпеку з `untilRound`, лишає без нього. tsc, lint, повний прогін. Commit `feat(battle-map): spell range and map templates resolve targets on the server`.

### Task 4: Автошкода небезпеки — вхід і початок ходу

**Виконавець: opus** (рушій ходу, журнал, смерть).

**Files:**
- Create: `lib/utils/battle/grid/hazard.ts` (+ export)
- Modify: `lib/utils/battle/grid/path.ts` (`reachable(..., opts?: { avoid?: ReadonlySet<string> })`), `app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts`, `lib/utils/battle/turn/run-advance-turn-loop.ts` і `lib/utils/battle/turn/start-end.ts` (прокинути `map`), `lib/utils/battle/turn/advance-turn.ts`, `types/battle.ts` (`battleData.hazardHitRound?: number` + `PATCHABLE_PARTICIPANT_FIELDS` у `lib/utils/battle/pipeline/client-delta.ts`, якщо патчиться окремим полем — перевір, як патчиться `movementUsed`), DM-інструмент місцевості: `components/battle/map/MapTerrainToolbar.tsx`, `lib/hooks/battle/useMapTerrainTool.ts`, `map-terrain` схема (поле шкоди для `hazard`: кубики `^\d+d\d+([+-]\d+)?$` + тип шкоди), редактор налаштувань `components/battle/setup/BattleFormMap.tsx` (так само)
- Test: `lib/utils/battle/grid/__tests__/hazard.test.ts`, тести `move`, `advance-turn`/`start-end`

**Interfaces:**
- Consumes: `TerrainCell.damage` (Task 3).
- Produces:
```ts
export function hazardUnder(map: BattleMapConfig, p: BattleParticipant, at?: GridPoint): TerrainCell | null;
// небезпечна клітинка з найбільшою шкодою серед footprint (at — альтернативна позиція); без damage — null (лише підсвітка, як було)
export function hazardHit(p: BattleParticipant, cell: TerrainCell, round: number, participants: BattleParticipant[], rng: Rng):
  { participant: BattleParticipant; message: string; damage: number } | null;
// null, якщо p.battleData.hazardHitRound === round; кидок dice (rollDice) або amount; applyResistance; dropBreakOnDamage; hazardHitRound = round;
// повідомлення: `${name}: ${n} ${type} шкоди від «${label}»`
```
- Рух (`move`, не розстановка): після переміщення, якщо `hazardUnder(map, mover)` і до руху учасник у ній не стояв, — `hazardHit`; інакше, якщо `reachable(..., { avoid: hazardCellsZ }).get(to) !== cost` (безпечного шляху тієї ж вартості немає) — `hazardHit` з найсильнішою небезпекою на шляху (візьми найсильнішу серед усіх небезпек у радіусі `cost` — простий консервативний вибір; задокументуй у тесті). Подія журналу з `hpChanges` (подивись, як `processStartOfTurn` → loop пише `end_turn` з `damageMessages`; зроби подію того ж формату) і смерть/непритомність через ту ж функцію, що й DoT (`resolveDowned`). Без шкоди — подій нема, як і раніше.
- Початок ходу: `processStartOfTurn(participant, round, all, rng, map?)` — після DoT, якщо `hazardUnder(map, participant)` → `hazardHit`, повідомлення в `damageMessages`.
- DM-інструмент: для «Небезпека» поля «Шкода (кубики)» (дефолт `1d6`, можна порожньо — без шкоди) і «Тип» (select типів шкоди з `lib/constants`); `TerrainCell.damage = { dice, type }`.

- [ ] TDD: вхід у небезпеку → шкода й подія; вихід і повторний вхід у той самий раунд → без шкоди; прохід повз, коли є обхід тієї ж вартості → без шкоди, коли обходу нема → шкода; велика істота на 2 небезпечних клітинках → одна шкода найсильнішої; початок ходу в небезпеці → шкода в журналі, смерть від неї обробляється як від DoT; розстановка ДМ → без шкоди; небезпека без `damage` → без шкоди; опір вогню зменшує. tsc, lint, повний прогін. Commit `feat(battle-map): hazard damage on entering and at turn start`.

### Task 5: Аури за радіусом

**Files:**
- Create: `lib/utils/abilities/engine/effects/map-auras.ts` (`syncMapAuras`)
- Modify: `lib/utils/battle/pipeline/run-battle-mutation.ts` (поруч із `withPlacement`, лише не-dryRun? — ні: і для dryRun, щоб превʼю було чесним; лише коли `map` є), `lib/constants/battle.ts` (`AURA_RADIUS_CELLS = 2`), `components/battle/turn/MyTurnControls.tsx` (не показувати `AuraZonePicker`, коли бій із картою і власник на карті), `lib/hooks/battle/useAuraZones.ts` (те саме для `pending`)
- Test: `lib/utils/abilities/engine/effects/__tests__/map-auras.test.ts`, тест pipeline

**Interfaces:**
- Consumes: `pendingAreaAuras`/`applyAuraZone`/`AreaAura` з `area-aura.ts`, `cellsOf`, `footprintDistance`, `isOnMap`.
- Produces:
```ts
export function syncMapAuras(participants: BattleParticipant[], map: BattleMapConfig | null): BattleParticipant[];
// для кожної area-аури живого власника на карті: члени = живі на карті учасники потрібної сторони з footprintDistance(власник, учасник) <= AURA_RADIUS_CELLS;
// додати zone-ефект (той самий, що робить applyAuraZone: id `zone:${ownerId}:${auraId}`) тим, у кого його нема; зняти з тих, хто вийшов або коли власник мертвий/без позиції;
// учасники без змін повертаються тими ж обʼєктами (щоб дельта не роздувалась); без карти — вхідний масив без змін
```
- Учасник без позиції або бій без карти — ручний режим лишається (мутація `aura-zone` не змінюється).

- [ ] TDD: ворог у радіусі отримує ефект, поза — ні; відійшов → знято; власник помер → знято з усіх; велика істота-власник рахує від footprint; незмінні учасники — ті самі посилання; без карти — no-op. tsc, lint, повний прогін. Commit `feat(battle-map): nearby auras follow the radius on the map`.

### Task 6: Прибрати тимчасові винятки reach

**Files:**
- Modify: `lib/utils/battle/grid/attack-reach.ts` (прибрати `attack.targetType === "aoe"` і опцію `ignoreReach`), `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts`, `lib/utils/battle/attack-phase/run-attack-phase.ts`, `lib/hooks/battle/useAttackWizard.ts`, `lib/utils/battle/grid/map-view.ts`
- Test: `lib/utils/battle/grid/__tests__/attack-reach.test.ts`, тести attack-phase / attack-wizard

**Interfaces:**
- Produces: `export function enemiesInReach(map, participants, attacker, attack): BattleParticipant[]` у `attack-reach.ts` — живі вороги на карті, для яких `attackReachError(..., [enemy]) === null`.
- `aoe`-атака на карті: кожна ціль підлягає звичайному правилу reach (melee — сусідство; ranged — дальність і заборона, коли поруч ворог).
- `attackHitsAllEnemies` на карті: замість «усі вороги» — `enemiesInReach`; без карти / без позиції — як раніше (усі). Майстер атаки (`useAttackWizard`) передвибирає саме `enemiesInReach`.

- [ ] TDD: aoe melee-атака по неприлеглому ворогу → відмова; Кха-Белех на карті б'є лише прилеглих (melee) / тих, хто в дальності (ranged); без карти — усіх. tsc, lint, повний прогін. Commit `fix(battle-map): aoe and hit-all attacks obey reach on the map`.

### Task 7: Клієнт — наведення шаблону й дальність у майстрі заклинань

**Виконавець: opus** (контекст сцени, карта, мобілка).

**Files:**
- Modify: `lib/utils/battle/flows/spell-flow.ts` (`SpellTargetMode += "template"`, `SpellPick.template?`, `SpellPick.range?`, стан `aim?: GridPoint`, дія `SET_AIM`, `spellPayload` → `targetCell`), `lib/hooks/battle/useSpellBook.ts`, `lib/hooks/battle/useBattleScene.ts` (стан `mapAim: MapAim | null` + `actions.setMapAim`, за зразком `attackIntent`), `lib/hooks/battle/useBattleMapScene.ts` (у режимі `mapAim` клік по клітинці/токену → `mapAim.onAim(cell)`, ховер → превʼю), `lib/utils/battle/grid/map-scene.ts` (`MapClick += { kind: "aim", cell }`; марки `"template"` для клітинок шаблону, `"out-of-range"` не потрібні), `types/battle.ts` (`BattleMapMark += "template"`), `components/battle/map/BattleMap.tsx` (шар шаблону: заливка `rgba(255,140,40,.28)`, обведення `#ffb04a`, клітинка `aim` — яскравіше; поверх місцевості, під токенами), `components/battle/wizards/SpellBook.tsx` (крок цілей для `template`: підказка «Оберіть точку на карті», список зачеплених учасників (союзники позначені «⚠ союзник»), кнопка «Підтвердити»; для одиночних — кандидати поза дальністю вимкнені з підписом «Поза дальністю»), `components/battle/scene/MobileBattleLayout.tsx` (під час наведення відкрити вкладку «Карта», панель майстра лишається знизу), `components/battle/dm/DmPanel.tsx` (той самий майстер — працює автоматично через `useSpellBook`), пісочниця `components/battle/map/dev/*` (кнопка «Шаблон» для ручної перевірки)
- Test: `lib/utils/battle/flows/__tests__/spell-flow*.test.ts`, `lib/hooks/battle/__tests__/` (useSpellBook / useBattleMapScene), тест `BattleMap` (шар шаблону)

**Interfaces:**
- Consumes: `templateCells`, `participantsInCells`, `aimInRange`, `feetToCells` (Task 1); `targetCell` у тілі касту (Task 3).
- Produces:
```ts
export interface MapAim { template: SpellTemplate; casterId: string; range?: number; aim?: GridPoint; onAim(cell: GridPoint): void }
// useBattleScene().mapAim / actions.setMapAim(aim | null)
// spell-flow: buildSpellPick → targetMode "template", коли targeting.kind === "template" І бій має карту І заклинатель має позицію; інакше — "multi" з side/maxTargets (як area)
```
- Превʼю рахує клієнт тією ж `templateCells` (без запиту); остаточні цілі — сервер. Клік по точці поза дальністю — ігнор із підказкою «Поза дальністю». Скасування майстра / Esc / відправка — `setMapAim(null)`.
- Колонковий вигляд на desktop: якщо `template`-заклинання стартує, коли обрано «Колонки», — тимчасово перемкнути на «Карта» (через `useBattleViewMode`), не змінюючи збережений вибір; після закінчення — повернути.

- [ ] TDD: reducer (template-режим, SET_AIM, payload з `targetCell`; без карти — multi); хук сцени (aim-режим перехоплює клік, не робить рух/атаку); BattleMap рендерить клітинки шаблону; SpellBook: кандидат поза дальністю вимкнений. tsc, lint, повний прогін. Commit `feat(battle-map): aim spell templates on the map`.

### Task 8: Бібліотека — дальності, шаблони, Вогняна стіна; dry-run diff для prod

**Files:**
- Modify: `data/library/spells.ts` (хелпери `template(shape, feet, side, maxTargets)`, `range` у `def`-опціях), `data/library/__tests__/library.test.ts`, `scripts/seed/seed-library.ts` (у `--dry-run` друкувати для заклинань поля, що зміняться: `targeting`, `resolution`, `spellEffects`, `dice`, `description` — коротко «Назва: targeting, spellEffects»), опис Вогняної стіни (description) під нову механіку
- Test: library test (кожне `template` має `size`, ≤ 120 фт; `zone` лише з `template`; заклинання з таблиці мають очікувані значення)

Таблиця (затверджує користувач на рев'ю плану):

| Заклинання | Було | Стає |
|---|---|---|
| Вогняна куля | `enemies(3)` | коло 10 фт, дальність 120 фт |
| Коло зими | `enemies(3)` | коло 10 фт, дальність 60 фт |
| Рій ос | `enemies(3)` | коло 5 фт (3×3), дальність 60 фт |
| Кам'яні шипи | `enemies(2)` | лінія 30 фт |
| Сплутування | `enemies(3)` | куб 15 фт, дальність 60 фт |
| Метеоритний дощ | всі вороги | коло 15 фт, дальність 120 фт |
| Землетрус | всі вороги | коло 20 фт, дальність 60 фт |
| Вогняна стіна | DoT на всіх ворогів 3 р. | лінія 30 фт: миттєва шкода вогнем усім у лінії + небезпека 3 раунди зі шкодою кидка |
| Ланцюгова блискавка | `enemies(4)` | без змін (ланцюг, ручний вибір), дальність 60 фт |
| Слово світла, Прокляття Потойбіччя, Шторм природи, Армагеддон, Хвиля зцілення, Відродження лісу | глобальні | без змін |
| Одиночні на ворога (болти, Блискавка, Імплозія, Потойбічна стріла, Глибока заморозка, Місячний промінь, Божественна відплата) | — | дальність 120 фт |
| Прокляття й контроль на ворога (Ослаблення, Сповільнення, Немічність, Чума, Розсіяність, Страждання, Смуток, Сліпота, Шал, Ляльковод, Корені, Колючі лози) | — | дальність 60 фт |
| Бафи й лікування союзника, Воскресіння | — | дальність 60 фт |
| Self / прикликання | — | без змін |

- [ ] TDD library-тестів; dry-run `pnpm seed-library cmuylhk0c0001ia06lg5eommv --dry-run` на локальній prodcopy показує diff. Локально (`.env.local` → prodcopy) — повний `pnpm seed-library` для браузерної перевірки. tsc, lint, повний прогін, `battle-sweep` на prodcopy (0 помилок; якщо sweep кастить Вогняну стіну/шаблони без карти — fallback має пройти). Commit `feat(library): spell ranges and map templates, fire wall leaves a hazard line`.

### Фінал блоку

- [ ] Одне фінальне opus-рев'ю всієї гілки → один захід виправлень → вузьке повторне рев'ю.
- [ ] Браузерна перевірка (Claude in Chrome, `pnpm dev --port 3123`, бій cmveetc330004ey7047tsw1b2): Вогняна куля з превʼю й союзником у колі; Вогняна стіна → лінія небезпеки, шкода при вході й на початку ходу, зникнення через 3 раунди; одиночне поза дальністю; аура страху при русі; бій без карти — старий майстер; мобілка (вкладка «Карта» під час наведення). Скріншоти користувачу.
- [ ] Prod-план: мердж і push — лише з дозволу; засів заклинань на prod — після показу dry-run diff з prod і окремого дозволу.
