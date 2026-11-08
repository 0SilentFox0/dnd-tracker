# Maze illusion swap — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (рекомендовано) або superpowers:executing-plans. Кроки з чекбоксами `- [ ]`.

**Goal:** DM вмикає в лабіринті «Підміну» для пар героїв: кожен бачить іншого ворогом під іншою маскою, бій справжній, повернення однією дією.

**Architecture:** Реальні `side`/`controlledBy` не чіпаємо. Стан `MazeConfig.illusionSwap` їде в дельтах як інший ключ maze. Ворожість для атак/заклинань — новий опційний хук `ModeEngineHooks.areHostile` + ядровий `isHostile(map, a, b)`. Маска імені/аватара — клієнтська, в `maskMazeScene` / `maskMazeFxAction`.

**Tech Stack:** Next.js 16, TypeScript strict, Zod, Vitest (`pnpm test:run <file>`), TanStack Query, next-intl (`messages/{uk,en}`).

**Spec:** `docs/superpowers/specs/2026-11-08-maze-illusion-swap-design.md` (читати першим; рішення там зафіксовані).

## Global Constraints

- Коментарі мінімальні (глобальний CLAUDE.md): лише неочевидне «чому», один рядок.
- Імпорти лише `@/…`; `import/no-cycle` увімкнено; ядро не імпортує режим напряму (лише через `lib/utils/battle/modes/registry.ts`).
- Компоненти й `app/**` не імпортують `@/lib/api/*` і не роблять `fetch`: усе через хуки (`lib/hooks/battle/modes/maze/*`).
- Тексти UI в `messages/uk/*.json` і `messages/en/*.json` (кирилиці в коді нема, ESLint). Імена в журналі — через `textRef`.
- Під час роботи: `pnpm test:related <файли>` / `pnpm test:changed`, `pnpm exec eslint --fix <файли>`. Повний `pnpm test:run` і repo-wide lint лише раз наприкінці (Task 7).
- Не додавати в коміти чужі зміни в робочому дереві; `git add` лише власні файли. Гілка `feat/maze-illusion-swap`; для ізоляції від іншої сесії краще окремий worktree (`superpowers:using-git-worktrees`).
- Коміти закінчувати рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Модель: Sonnet — імплементація; Opus — лише фінальне рев'ю.

## Review Focus

- Герой у двох парах або пара «сам із собою» → відмова з зрозумілим текстом.
- Один із пари помер / втік / бій завершено → підміна знімається, DM отримує подію, нічого не падає.
- Гравець не пов'язаний з парою бачить справжні імена; DM без «як герой» бачить справжні + позначку.
- Ім'я маски з пробілів / порожнє → 400.
- Старі бої без `illusionSwap` (ключ відсутній) працюють без змін, дельта не роздувається (`delta-invariant`, `delta-size`).

---

### Task 1: Тип, схема, стан за замовчуванням, дельта

**Files:**
- Modify: `types/battle.ts` (біля `MazeConfig`, ~:263), `lib/schemas/battles.ts` (`mazeSchema` ~:30, `mazeActionSchema` ~:57), `lib/utils/battle/modes/maze/mode.ts` (`onReset`)
- Create: `lib/utils/battle/modes/maze/illusion.ts` (чисті хелпери, див. Interfaces)
- Test: `lib/utils/battle/modes/maze/__tests__/illusion.test.ts`, `lib/schemas/__tests__/` (знайти наявний тест `mazeActionSchema`; додати кейси там)

**Interfaces — Produces:**
```ts
// types/battle.ts
export interface IllusionDisguise { name: string; avatar?: string; unitId?: string }
/** aSees — ким a бачить b; bSees — ким b бачить a */
export interface IllusionPair { a: string; b: string; aSees: IllusionDisguise; bSees: IllusionDisguise }
// MazeConfig: illusionSwap?: { pairs: IllusionPair[] }
// types/api.ts: MazeActionData вже виводиться зі схеми; нова гілка { op: "illusion"; pairs: IllusionPair[] }

// lib/utils/battle/modes/maze/illusion.ts
export const illusionPairs = (maze: MazeConfig | null | undefined): IllusionPair[]
export const illusionPartner = (pairs: IllusionPair[], id: string): IllusionPair | undefined
export const areIllusionFoes = (pairs: IllusionPair[], aId: string, bId: string): boolean
/** маска для глядача `viewerId`: ким він бачить `targetId` (undefined — справжнім) */
export const disguiseFor = (pairs: IllusionPair[], viewerId: string, targetId: string): IllusionDisguise | undefined
```

- [ ] **Step 1: Failing tests** `illusion.test.ts`: `areIllusionFoes` симетрична й false для різних пар; `disguiseFor(pairs,"zehir","godric")` = `aSees` пари; `disguiseFor(pairs,"godric","zehir")` = `bSees`; для сторонньої `"c"` → undefined; `illusionPairs(undefined)` → `[]`. Schema-тести: валідна пара проходить; порожній масив (скидання) проходить; `name: ""`/пробіли → fail; `a === b` → fail (`.refine`); один id у двох парах → fail (`.superRefine` на `pairs`); >8 пар → fail.
- [ ] **Step 2:** `pnpm test:run lib/utils/battle/modes/maze/__tests__/illusion.test.ts` → FAIL.
- [ ] **Step 3: Реалізація.** Типи; у `mazeSchema` — `illusionSwap: z.object({ pairs: pairsSchema }).optional()`; `pairsSchema = z.array(pairSchema).max(8).superRefine(унікальність id)`; `disguiseSchema = z.object({ name: z.string().trim().min(1).max(60), avatar: z.string().max(500).optional(), unitId: z.string().max(64).optional() })`; в `mazeActionSchema` — `z.object({ op: z.literal("illusion"), pairs: pairsSchema })`. `onReset`: прибрати ключ (`{ ...maze, marks: {}, dark: false, moved: false, illusionSwap: undefined }` не годиться, бо `mazeChange` вважає `undefined` сигналом повної карти: замість цього `illusionSwap: { pairs: [] }`). `emptyMaze` не міняти (ключ необов'язковий).
- [ ] **Step 4:** тести → PASS; `pnpm exec eslint --fix` по змінених файлах.
- [ ] **Step 5:** коміт `feat(maze): illusion swap types, schema and pair helpers`.

### Task 2: Серверна операція `illusion` + автознімання

**Files:**
- Modify: `lib/server/battles/mutations/maze/maze-ops.ts` (новий `illusion` в `MAZE_OPS` за зразком `dark` :234), `lib/utils/battle/modes/maze/texts.ts` (`ops.illusionOn/illusionOff/illusionAuto`, `illusionInvalid`), `lib/utils/battle/modes/maze/mode.ts` (`afterMutation`), `lib/utils/battle/modes/maze/awareness.ts` (обгорнути результат: див. нижче), `messages/{uk,en}/battleActions.json`, `lib/constants/api-errors.ts` або `rejectAction`-тексти за зразком `MAZE_TEXTS`
- Test: `lib/server/battles/__tests__/mutations/maze-illusion.test.ts` (за зразком наявних maze-тестів і `fixtures.ts`)

**Interfaces — Consumes:** `IllusionPair`, `illusionPairs` (Task 1), `finish({ctx,map,maze,text})`, `mazeOpEvent`, `onMazeField`, `ParticipantSourceType.CHARACTER`.
**Produces:** `op:"illusion"` в `MAZE_OPS`; `pruneIllusion(map, scene, result)` у `illusion.ts` (повертає `result` з очищеним списком і DM-подією, якщо пара недійсна).

- [ ] **Step 1: Failing tests.** (a) DM встановлює пару двох героїв → `scene.map.maze.illusionSwap.pairs` має пару, подія `mazeEvent:"op"`. (b) `pairs:[]` повертає порожній список; HP/позиції/ефекти учасників не змінились. (c) учасник не герой (UNIT) → відмова; мертвий / не на мапі / невідомий id → відмова. (d) гравець (не DM) не може (перевірити `access` у `operations.ts`: maze має лишатись DM-only). (e) `prune`: після смерті одного з пари наступна мутація знімає пару + DM-подія; те саме при `scene.status !== ACTIVE`.
- [ ] **Step 2:** запустити → FAIL.
- [ ] **Step 3: Реалізація.** `illusion` handler: перевірити кожну пару (існують, `sourceType === CHARACTER`, `onMazeField`) → інакше `rejectAction(MAZE_TEXTS.illusionInvalid)`; `finish({ ctx, map, maze: { ...grid.maze, illusionSwap: { pairs: body.pairs } }, text: body.pairs.length ? MAZE_TEXTS.ops.illusionOn : MAZE_TEXTS.ops.illusionOff })`. `pruneIllusion` — чиста функція в `illusion.ts` (перевіряє `onMazeField` обох і `scene.status`), викликається з `afterMutation` разом з `withMazeAwareness` (композиція: `pruneIllusion(map, scene, withMazeAwareness(...))`); нову мапу кладе в `result.scene.map` (подивитись, як `withMazeAwareness` віддає зміни, і повторити), подію додає через `mazeOpEvent(round, MAZE_TEXTS.ops.illusionAuto, "op")`.
- [ ] **Step 4:** тести → PASS; `pnpm test:related` на змінені файли; eslint.
- [ ] **Step 5:** коміт `feat(maze): illusion op with auto-clear`.

### Task 3: Ворожість у рушії (`areHostile` / `isHostile`)

**Files:**
- Modify: `lib/utils/battle/modes/types.ts` (`ModeEngineHooks.areHostile?`), `lib/utils/battle/modes/engine.ts` (`modeHostile`), `lib/utils/battle/modes/maze/mode.ts` (engine hook), місця заміни: `attack-phase/targets.ts` (`enemyOf` :38 — прокинути `map`), `grid/attack-reach.ts` (:58,100,113), `actions/run.ts:153` (лише `enemyRequired`), `actions/legendary.ts:38`, `actions/opportunity.ts:54`, `spell/spell-targeting.ts` (`hostile()` ~:305, `resolveTargets` ~:208), `validation/ability-targets.ts:40`, `maneuvers/strike.ts:18` (`isEnemyOf`)
- Test: `lib/utils/battle/modes/maze/__tests__/illusion-hostile.test.ts` + кейси в наявних тестах `attack-phase`/`spell-targeting` (знайти їх через `pnpm test:related`)

**Interfaces — Produces:**
```ts
// types.ts
areHostile?(args: { config: C; map: BattleMapConfig; a: BattleParticipant; b: BattleParticipant }): boolean | undefined;
// engine.ts
export function isHostile(map: MapArg, a: BattleParticipant, b: BattleParticipant): boolean // hook ?? a.side !== b.side
```
Maze-хук: `areIllusionFoes(illusionPairs(config), a.id, b.id) ? true : undefined`.

- [ ] **Step 1: Failing tests.** `isHostile` без режиму = порівняння `side`; в maze з парою → true для пари, false для однаково-сайдових поза парою; без пари = `side`. Інтеграційно: площинна атака / cleave / `enemy`-заклинання від A зачіпає B лише коли пара активна; `opportunity` теж; після `pairs: []` — ні.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реалізація.** Додати хук і `isHostile` в `engine.ts` за зразком `modeSees`. Замінити в перелічених місцях `a.basicInfo.side !== b.basicInfo.side` на `isHostile(map, a, b)`. Де `map` не доступний у сигнатурі — прокинути параметр (це перевірка з спеки; якщо місце потребує зміни >3 викликів вище, зупинитись і описати в рапорті, а не рефакторити). `:121` у `run.ts` (пасивне сприйняття), ауры, тригери НЕ чіпати.
- [ ] **Step 4:** тести → PASS; `pnpm test:related` по всіх змінених файлах (battle-ядро має багато тестів: усі мають лишитись зеленими).
- [ ] **Step 5:** коміт `feat(battle): mode areHostile hook for illusion swap`.

### Task 4: Клієнтська ворожість у UI

**Files:**
- Modify: `lib/hooks/battle/useAttackTargets.ts:26-29`, інші клієнтські фільтри за `side`: `useCoreActions.ts:61`, `useLegendaryAction.ts:47`, `useBattleMapPlayground.ts:163` (лише там, де вибираються цілі атаки/вмінь)
- Test: наявний тест `useAttackTargets` (або новий `__tests__/useAttackTargets.illusion.test.ts`, `// @vitest-environment happy-dom`)

- [ ] **Step 1: Failing test:** при `friendlyFire=false` герой A у парі бачить B серед `targets`/`enemyTargets`; герой C (поза парою) — ні.
- [ ] **Step 2:** FAIL. **Step 3:** використати `isHostile(map, attacker, p)` з `@/lib/utils/battle/modes/engine` замість порівняння `side` (виняток `friendlyFire === true` лишити). **Step 4:** PASS + eslint. **Step 5:** коміт `feat(battle-ui): illusion foes are attackable in target pickers`.

### Task 5: Маска (клієнт)

**Files:**
- Modify: `lib/utils/battle/modes/maze/view.ts` (`MazeView.disguiseOf?: (targetId) => IllusionDisguise | undefined`; `deriveMazeView` заповнює для гравця / DM «як герой»; для DM без `asHero` — `undefined`, але додати `MazeView.maskedIds: ReadonlySet<string>` для позначки «(під маскою)»), `maskMazeScene`, `maskMazeFxAction` (імена в `actorName`, `targets[].participantName`, `hpChanges[].participantName`, та `TextRef.params` зі значенням == справжньому імені → ім'я маски), `lib/hooks/battle/modes/maze/useMazeView.ts` (`useMazeMaskValue` — маскує також `battle.initiativeOrder`, `turn.current`, `turn.queue`, roster, `battleLog` і `fxLog`)
- Create: `lib/utils/battle/modes/maze/illusion-mask.ts` (`maskParticipant(p, d)`, `maskLogLine`, `maskAction`)
- Test: `lib/utils/battle/modes/maze/__tests__/illusion-mask.test.ts`

**Interfaces — Consumes:** `disguiseFor`, `illusionPairs` (Task 1). **Produces:** `maskParticipant(p: BattleParticipant, d: IllusionDisguise): BattleParticipant` (міняє лише `basicInfo.name`/`avatar`, `id` лишає).

- [ ] **Step 1: Failing tests.** Глядач `zehir` бачить у ростері/черзі/`turn.current`/`initiativeOrder` учасника `godric` як `aSees` (ім'я й аватар), а `id` той самий; глядач `c` — справжнє; DM без `asHero` — справжнє, `maskedIds` містить обох; DM `asHero=zehir` — як `zehir`. Лог: запис із `actorName:"Godric"`, `targets[0].participantName`, `TextRef.params.name:"Godric"` → для `zehir` «Vampire»; для `c` без змін. Власний герой не маскується для власного гравця.
- [ ] **Step 2:** FAIL. **Step 3:** реалізувати чисті функції + підключення. Імена-рядки у вкладених `TextRef.params` обходити рекурсивно. **Step 4:** PASS; eslint; `pnpm test:related` на `view.ts`/`useMazeView.ts` (існуючі maze-тести лишаються зеленими). **Step 5:** коміт `feat(maze): client illusion mask for scene, log and fx`.
- Додатково: перевірити вручну в коді, що токени мапи (`components/battle/map/*`) і тости беруть імена з замаскованих даних (`modeView`/`value`), а не з немаскованих `battle.initiativeOrder`; якщо ні — підключити маску там і додати тест.

### Task 6: DM-інтерфейс

**Files:**
- Modify: `components/battle/modes/maze/MazeToolbar.tsx` (кнопка «Підміна» + `dialog === "illusion"`), `lib/hooks/battle/modes/maze/useMazeTools.ts` (`illusion: { pairs, set(pairs), clear() }` за зразком `toggleDark`, використовує `send({ op:"illusion", pairs })`), `messages/{uk,en}/battleDm.json` (`maze.toolbar.illusion`, `maze.illusion.*`), позначка «(під маскою)» в DM-ростері/токені (де DM бачить `view.maskedIds`)
- Create: `components/battle/modes/maze/MazeIllusionDialog.tsx` (список пар; для кожної — два `SelectField` героїв із `heroes` з `useMazeTools`, і по масці для кожного: picker юніта з бібліотеки — знайти й повторно використати наявний picker у `components/battle/dm/dialogs/*` / `components/common`, або довільні ім'я + аватар; кнопки «Додати пару», «Застосувати», «Повернути союзників»)
- Test: `components/battle/modes/maze/__tests__/MazeIllusionDialog.test.tsx` (happy-dom), тест хука

- [ ] **Step 1: Failing tests:** діалог не дозволяє обрати одного героя двічі й однакових a/b; «Застосувати» викликає `set` із очікуваним масивом; «Повернути союзників» викликає `clear` (`pairs: []`); активні пари відображаються з масками.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація; без `fetch`/`@/lib/api` у компоненті. **Step 4:** PASS; eslint. **Step 5:** коміт `feat(maze-ui): DM illusion swap dialog`.

### Task 7: Документи, онбординг, повна перевірка

**Files:**
- Modify: `docs/architecture/map-modes.md` (хук `areHostile`), `docs/architecture/battle.md` (підміна, «UI only», межі `isHostile`: ауры/тригери лишаються за `side`), `docs/STATUS.md`, `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в `messages/{uk,en}/whatsNew.json`
- Test: `lib/server/battles/__tests__/mutations/delta-invariant.test.ts` (оновити, якщо падає), тести i18n-ключів

- [ ] **Step 1:** `pnpm test:changed main`; виправити.
- [ ] **Step 2:** переконатись, що ніхто більше не запускає важких процесів: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`. Тоді один раз `pnpm test:run` і `pnpm lint` (+ `pnpm exec tsc --noEmit`); процес >5 хв — зависання, перезапустити вужче.
- [ ] **Step 3:** переписати `docs`, перенести спеку й план у `docs/archive/superpowers/` у merge-коміті (`git mv`) — лише при мерджі, за CLAUDE.md.
- [ ] **Step 4:** `/simplify` по diff гілки (1–2 агенти), коміт `docs+chore: illusion swap docs, whats-new`.
- [ ] **Step 5:** живий прогон (Sonnet-субагент у браузері, за `feedback-browser-context`): Лабіринт, 2+ героїв (Зехір, Годрик) + третій (C). DM вмикає пару → Зехір бачить Годрика Вампіром і навпаки, C бачить справжніх; атака героя по «ворогу»; площинне заклинання; «Повернути союзників»; смерть одного знімає пару. Тестові бої видалити після.
- [ ] **Step 6:** один фінальний Opus-рев'ю гілки; мердж лише після окремого «так» користувача (не пушити).

## Self-review

- Spec coverage: стан/операція/валідація/автознімання — T1–T2; `areHostile`/`isHostile` — T3–T4; маска, DM-позначка — T5; діалог/кнопка/пошук масок — T6; docs/whats-new/тести/браузер — T7. Поза межами (не-герої, flip side, per-user дельти) — не реалізується.
- Типи: `IllusionPair`/`IllusionDisguise`/`illusionPairs`/`disguiseFor`/`areIllusionFoes`/`isHostile(map,a,b)`/`pruneIllusion` — однакові в усіх задачах.
