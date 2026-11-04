# Map motion («Рух») Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ вмикає на карті бою режим «Рух»: завантажений фон безперервно (дзеркально зациклено) їде під нерухомою сіткою; ДМ міняє вісь, напрям, швидкість або зупиняє, гравці бачать це одразу.

**Architecture:** Окреме поле `map.motion` (за зразком `map.weather`, НЕ запис у `MAP_MODE_REGISTRY`). Сервер зберігає лише `{ axis, speed }`; кожен клієнт сам крутить фазу в `requestAnimationFrame` через спільний `lib/utils/canvas/ticker`. Чиста математика (обмеження, розгін, період, поворот осі) — у `lib/utils/battle/map-motion/`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zod, TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-map-motion-design.md`

## Global Constraints

- Не `MAP_MODE_REGISTRY`; режим сумісний із лабіринтом; рух не змінює ходи, дальність, ефекти (spec «Рішення»).
- `speed`: клітинки/с зі знаком, `|speed| ≤ 6`, `0` = зупинено, `null`/відсутнє = вимкнено.
- Фаза не синхронізується; по мережі лише `axis` і `speed`; жодного полінгу (Supabase egress).
- Layering: компоненти не імпортують `@/lib/api/*`; хук → `lib/hooks/battle`, op → `lib/api/battle-ops.ts`; `@/`-імпорти, без `../../`; `import/no-cycle`.
- Нові рядки лише через `messages/{uk,en}` (кирилиця в коді заборонена ESLint); коментарі мінімальні; нові ідентифікатори англійською.
- Тести: `pnpm test:run <file>` / `pnpm test:related`; без repo-wide lint/повного набору до фіналу (Task 6); `pnpm exec eslint --fix <touched files>`.
- Коміти завершувати рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Мобільний поворот карти (`fit.rotated`): вісь і знак мають лишатися екранними — тест `motionInMapSpace`.
2. Фон ще не завантажений / `map.background === null` (дефолтний фон) / незнана пропорція: без падіння, статичний фон — тест `MotionBackground`.
3. Картинка вужча за карту вздовж осі: кількість копій тайла парна й покриває карту + період — тест `mirrorTileCount`.
4. Зупинка ≠ вимкнення; «Продовжити» повертає останню ненульову швидкість; розворот при `0` не вмикає рух — тест хука.
5. `prefers-reduced-motion` і прихована вкладка: анімація не крутиться — тест `MotionBackground`.
6. Гравець (не ДМ) викликає `map-motion` → 403 — додати операцію в тест захисту.

---

### Task 1: Types, constants, schema, pure math

**Files:**
- Modify: `types/battle.ts` (після `weather?`, ~рядок 308), `lib/schemas/battles.ts` (після `mapWeatherSchema`, ~212), `types/api.ts` (імпорт у блоці ~15 і тип біля `MapWeatherData`, ~185)
- Create: `lib/constants/battle-motion.ts`, `lib/utils/battle/map-motion/index.ts`
- Modify: `lib/utils/battle/grid/index.ts` не чіпати; експорт — з власної папки
- Test: `lib/utils/battle/map-motion/__tests__/map-motion.test.ts`

**Interfaces:**
- Produces (types): `MapMotionAxis = "x" | "y"`, `MapMotion { axis: MapMotionAxis; speed: number }`, `BattleMapConfig.motion?: MapMotion | null`; `mapMotionSchema = z.object({ motion: z.object({ axis: z.enum(["x","y"]), speed: z.number().min(-6).max(6) }).nullable() })`; `MapMotionData = z.infer<typeof mapMotionSchema>`.
- Produces (constants): `MAP_MOTION_MAX_SPEED = 6`, `MAP_MOTION_PRESETS = { slow: 1, medium: 2.5, fast: 5 } as const`, `MAP_MOTION_DEFAULT_SPEED = 2.5`, `MAP_MOTION_EASE_SECONDS = 0.3`.
- Produces (utils, all pure): 
  - `clampMotionSpeed(v: number): number` — NaN→0, clamp ±MAX, округлення до 0.1.
  - `motionInMapSpace(m: MapMotion, rotated: boolean): MapMotion` — без повороту повертає `m`; з поворотом (карта повернута на 90° за годинниковою): екранна `x`+s → мапна `y` зі знаком −s; екранна `y`+s → мапна `x` зі знаком +s.
  - `stepMotion(s: { phase: number; speed: number }, target: number, dt: number, period: number): { phase: number; speed: number }` — `speed += (target − speed)·(1 − exp(−dt/EASE))`, `phase = (phase + speed·dt) mod period`, результат у `[0, period)` і для від'ємного руху.
  - `mirrorTileCount(mapLen: number, tileLen: number): number` — парне, `≥ 2`, `≥ (mapLen + 2·tileLen)/tileLen`; `tileLen ≤ 0` → 2.
  - `resumeSpeed(last: number | null): number` — ненульова `last` або `MAP_MOTION_DEFAULT_SPEED`.

- [ ] **Step 1: Write the failing tests** — `map-motion.test.ts` покриває: `clampMotionSpeed(99)=6`, `(-99)=-6`, `(NaN)=0`, `(1.26)=1.3`; `motionInMapSpace({axis:"x",speed:2},false)` рівне вхідному; `(…,true)` → `{axis:"y",speed:-2}`; `({axis:"y",speed:2},true)` → `{axis:"x",speed:2}`; `stepMotion({phase:0,speed:0},3,10,100)` — швидкість майже 3 (≥2.99), фаза в `[0,100)`; `stepMotion({phase:1,speed:-5},-5,1,100)` — фаза `96` (обгортання вниз); `stepMotion` при `target=0` після багатьох кроків → `|speed|<0.01`; `mirrorTileCount(1000,200)` = 8 (≥7 → парне), `mirrorTileCount(100,500)` = 2... (перевірити формулу: ≥ (100+1000)/500=2.2→ парне 4; тест фіксує `4`), `mirrorTileCount(100,0)=2`; `resumeSpeed(null)=2.5`, `resumeSpeed(-4)=-4`, `resumeSpeed(0)=2.5`. Тест схеми: `mapMotionSchema.safeParse({motion:{axis:"x",speed:7}}).success===false`, `{motion:null}` ok, `{motion:{axis:"z",speed:1}}` fail.
- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/map-motion` → FAIL (модуля нема).
- [ ] **Step 3: Implement** types, constants, schema (імпортувати константи у схему), `MapMotionData`, utils. Імпортувати `clamp` з `@/lib/utils/common/clamp`.
- [ ] **Step 4: Run** тест → PASS; `pnpm exec eslint --fix` на створені файли.
- [ ] **Step 5: Commit** `feat(map-motion): types, schema and pure motion math`.

### Task 2: Server operation, route, client op, hooks

**Files:**
- Create: `lib/server/battles/mutations/map-motion/map-motion-mutation.ts`, `app/api/campaigns/[id]/battles/[battleId]/map-motion/route.ts`
- Modify: `lib/server/battles/operations.ts` (імпорт схеми + запис `"map-motion"` після `"map-weather"`), `lib/utils/api/rate-limit.ts` (`mapMotion: { limit: 20, windowSeconds: 10 }` + коментар «Рух карти (ДМ)»), `lib/server/assistant/actions/battle-actions.ts` (додати `"map-motion"` у `BATTLE_COMMANDS` за алфавітом, після `"map-terrain"`), `lib/server/assistant/__tests__/helpers/coverage.ts` (рядок як у `map-weather`), `lib/api/battle-ops.ts` (`mapMotion: op<MapMotionData>({ path: "/map-motion", retryOnConflict: true })` + імпорт), `lib/hooks/battles/useBattles.ts` (`useMapMotion = makeBattleHook(battleOps.mapMotion)`), `lib/hooks/battles/index.ts` (експорт), `lib/hooks/battle/useBattleActions.ts` (`mapMotion: useMapMotion(campaignId, battleId, o)` поруч із `mapWeather`)
- Test: тест мутації поруч із тестом `mapWeatherMutation` (знайти `grep -rln mapWeatherMutation lib`), `lib/server/assistant/__tests__/battle-actions.test.ts` (список імен рядок ~66 і guard-тест ~100)

**Interfaces:**
- Consumes: `mapMotionSchema`, `MapMotionData` (Task 1).
- Produces: `mapMotionMutation(ctx: BattleMutationContext, body: MapMotionData): MutationResult`; `useBattleActions().mapMotion: { mutate(data: MapMotionData): void; isPending: boolean }`.

- [ ] **Step 1: Failing tests** — для мутації: (а) бій без карти → `BattleRuleError` з `API_ERRORS.BATTLE_NO_MAP`; (б) `{motion:{axis:"x",speed:2}}` → `scene.map.motion` рівне цьому, решта карти (`weather`, `maze`, `terrain`) збережена; (в) `{motion:null}` → ключа `motion` у `scene.map` немає; (г) `{motion:{axis:"y",speed:0}}` зберігає `speed:0` (зупинка ≠ вимкнення). У `battle-actions.test.ts`: додати `"map-motion"` у масив імен і в цикл guard-тесту (403 для не-ДМ).
- [ ] **Step 2: Run** ці файли → FAIL.
- [ ] **Step 3: Implement** — мутація копіює `mapWeatherMutation`: `const { motion: _previous, ...rest } = map; scene: { map: body.motion ? { ...rest, motion: body.motion } : rest }`; роут — копія `map-weather/route.ts` з `operation: "map-motion"`; решта рядків реєстрів за списком вище. Запустити `pnpm test:run lib/server/assistant` — виправити інші тести/реєстри, що перелічують команди чи роути (адаптер/coverage), доки зелено.
- [ ] **Step 4: Run** `pnpm test:related` для змінених файлів → PASS; eslint.
- [ ] **Step 5: Commit** `feat(map-motion): map-motion battle operation, route and client hook`.

### Task 3: Tool hook and palette wiring

**Files:**
- Create: `lib/hooks/battle/useMapMotionTool.ts`
- Modify: `lib/hooks/battle/modes/palettes.ts` (`PaletteKey` + `KEYS` + `"motion"`), `lib/hooks/battle/useExclusivePalettes.ts` (четвертий ключ), `lib/hooks/battle/useBattleMapScene.ts` (поле `motionTool: MapMotionTool | null` у типі й поверненні; виклик хука; нова палітра в `useExclusivePalettes`), `lib/hooks/battle/index.ts` (експорт `type MapMotionTool, useMapMotionTool`)
- Test: `lib/hooks/battle/__tests__/useMapMotionTool.test.tsx`, оновити `useMapToolsExclusive.test.tsx` і `useBattleMapScene-palettes.test.tsx` під четвертий ключ

**Interfaces:**
- Consumes: `MapMotion`, `MapMotionData`, `clampMotionSpeed`, `resumeSpeed`, `MAP_MOTION_PRESETS`.
- Produces:
```ts
export interface MapMotionTool {
  active: boolean; toggle(): void; close(): void;
  current: MapMotion | null; pending: boolean;
  setAxis(axis: MapMotionAxis): void;     // зберігає знак і |speed|; при null вмикає з resumeSpeed(null)
  setSpeed(speed: number): void;          // clamp; зберігає вісь (за замовч. "x")
  reverse(): void;                        // змінює знак; при 0 або null — нічого
  togglePaused(): void;                   // speed≠0 → запам'ятати last і слати 0; 0 → resumeSpeed(last)
  turnOff(): void;                        // mutate({ motion: null })
}
export function useMapMotionTool(args: { isDM: boolean; current: MapMotion | null; mutation: { mutate(d: MapMotionData): void; isPending: boolean } }): MapMotionTool | null;
```
`last` — `useRef`, лише в клієнті ДМ. Мутація не викликається, якщо нове значення дорівнює поточному.

- [ ] **Step 1: Failing tests** (`renderHook`): `togglePaused` з `{x,3}` → `mutate({motion:{axis:"x",speed:0}})`, повторно → `speed:3`; `reverse` з `{x,2}` → `-2`, з `{x,0}` → нічого; `setSpeed(99)` → `6`; `setAxis("y")` з `null` → `{axis:"y",speed:2.5}`; `turnOff` → `{motion:null}`; повторний виклик з тим самим значенням не мутує; `isDM:false` → `null`. Для паліт: відкриття `motion` закриває `weather`/`terrain`/`mode` (за зразком наявних тестів).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** хук за зразком `useMapWeatherTool`; розширити палітри й `useBattleMapScene` (`current: map?.motion ?? null, mutation: actions.mapMotion`).
- [ ] **Step 4: Run** `pnpm test:run lib/hooks/battle` → PASS; eslint.
- [ ] **Step 5: Commit** `feat(map-motion): motion tool hook and exclusive palette`.

### Task 4: DM panel and i18n

**Files:**
- Create: `components/battle/map/MapMotionPanel.tsx`
- Modify: `components/battle/map/BattleMapPanel.tsx` (кнопка `ModeButton` «Рух» і `{motionTool.active && <MapMotionPanel tool={motionTool} />}`; додати `motionTool` до умови `tools` та до `terrainTool.active || weatherTool.active || motionTool.active`), `messages/uk/battle.json` і `messages/en/battle.json` (`battle.map.tools.motion`, нова група `battle.map.motion`: `axisX`, `axisY`, `reverse`, `speed`, `slow`, `medium`, `fast`, `pause`, `resume`, `off`, `reducedHint`)
- Test: `components/battle/map/__tests__/MapMotionPanel.test.tsx` (за зразком `MapWeatherPicker.test.tsx`)

**Interfaces:**
- Consumes: `MapMotionTool` (Task 3), `MAP_MOTION_PRESETS`, `MAP_MOTION_MAX_SPEED`.
- Produces: `MapMotionPanel({ tool }: { tool: MapMotionTool })` — `role="group"` з `aria-label={t("tools.motion")}`; кнопки осі (`aria-pressed`), розворот, три пресети (`aria-pressed` коли `|speed|` збігається), повзунок `<input type="range">` (0…6, крок 0.1) з локальним станом і відкладеним (debounce ~250 мс, використати наявний debounce-хук з `lib/hooks/common` — перевірити перед написанням) викликом `tool.setSpeed`, кнопка пауза/продовжити (`tool.togglePaused`), «Вимкнути» (`tool.turnOff`); усе `disabled={tool.pending}`; при `matchMedia("(prefers-reduced-motion: reduce)")` показати `reducedHint` (використати наявний хук/утиліту reduced-motion, якщо є; інакше локально в компоненті).

- [ ] **Step 1: Failing tests**: клік на пресет «Швидко» → `tool.setSpeed(5)`; клік осі → `setAxis("y")`; пауза → `togglePaused`; «Вимкнути» → `turnOff`; при `pending` усі кнопки `disabled`; при `current=null` пресети й розворот неактивні (`disabled`), вісь і «Вимкнути» — ні/так за логікою: «Вимкнути» disabled при `null`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** компонент (класи як у `MapWeatherPicker`, тексти через `useTranslations("battle.map")`), підключити в `BattleMapPanel`, додати переклади uk+en (тести i18n перевіряють парність ключів).
- [ ] **Step 4: Run** `pnpm test:run components/battle/map lib/i18n` → PASS; eslint.
- [ ] **Step 5: Commit** `feat(map-motion): DM motion panel and translations`.

### Task 5: MotionBackground rendering

**Files:**
- Create: `components/battle/map/motion/MotionBackground.tsx`
- Modify: `components/battle/map/MapBackground.tsx` (якщо `map.motion` — повернути `<MotionBackground … />`, інакше як зараз), `components/battle/map/MapStage.tsx` (передати `rotated={rotated}` у `MapBackground`)
- Test: `components/battle/map/motion/__tests__/MotionBackground.test.tsx`

**Interfaces:**
- Consumes: `motionInMapSpace`, `stepMotion`, `mirrorTileCount` (Task 1); `subscribe` з `@/lib/utils/canvas/ticker` (`fn(now, dt)`, повертає unsubscribe; `return false` — зняти підписку); `DEFAULT_MAP_BACKGROUND`.
- Produces: `MotionBackground({ map, cellPx, rotated, phone }: { map: BattleMapConfig & { motion: MapMotion }; cellPx: number; rotated: boolean; phone: boolean })`.

Алгоритм: `mapW = map.cols·cellPx`, `mapH = map.rows·cellPx`; `m = motionInMapSpace(map.motion, rotated)`. Для `m.axis === "x"` картинка вписується по висоті в `mapH` (`tileLen = mapH / aspect`), інакше по ширині (`tileLen = mapW·aspect`). `aspect` невідомий (картинка не завантажена) → поки рендерити один прихований-завантажувач `<Image onLoad>` і статичний фон як у `MapBackground` (без падіння). Після `onLoad` — «доріжка» (`data-motion-track`): `mirrorTileCount(len, tileLen)` копій `<Image fill>` у обгортках розміром тайла, непарні — віддзеркалені (`scale(-1,1)` для осі x, `scale(1,-1)` для y). Період `P = 2·tileLen`. Поточні `phase`/`speed` у `useRef`; `subscribe` застосовує `stepMotion` з `target = m.speed·cellPx` (px/с) і пише `track.style.transform = translate3d(offset…)`, де `offset = phase − P` вздовж осі (без React-стану). Підписка не створюється, якщо `matchMedia("(prefers-reduced-motion: reduce)").matches` або `document.hidden`; повернення вкладки перепідписує (`visibilitychange`). Зупинка (`speed 0`) після затухання повертає `false` з тікера, зміна `m.speed` — підписується знову.

- [ ] **Step 1: Failing tests** (happy-dom, мок `@/lib/utils/canvas/ticker` як у `MapWeatherPicker.test.tsx`; `next/image` мокнути як у сусідніх тестах, якщо вони є): (а) без `onLoad` — є статичний фон і немає `[data-motion-track]`; (б) після `fireEvent.load` на зображенні — є `[data-motion-track]` з парною кількістю копій, непарні мають `scale(-1`; (в) `subscribe` викликано один раз при `speed≠0`; (г) при `speed:0` після прогону тіків із `dt` — підписка знімається (callback повертає `false`); (д) `prefers-reduced-motion: reduce` (stub `matchMedia`) — `subscribe` не викликано; (е) `rotated` true з `{axis:"x"}` — доріжка орієнтована по осі y (перевірити `data-motion-axis="y"`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** компонент і підключення в `MapBackground`/`MapStage`.
- [ ] **Step 4: Run** `pnpm test:run components/battle/map` → PASS; eslint.
- [ ] **Step 5: Commit** `feat(map-motion): mirrored scrolling background`.

### Task 6: Docs, what's new, final verification

**Files:**
- Modify: `docs/architecture/battle.md` і `docs/architecture/map-modes.md` (розділ «Map motion»: поле `map.motion`, чому не режим реєстру, фаза локальна, ігнорування `backgroundCols`/`gridOffset`), `docs/STATUS.md`, `lib/onboarding/whats-new.ts` (рядок `{ id: "2026-11-04-map-motion", date: "2026-11-04", audience: "dm" }` на початок списку), `messages/uk/whatsNew.json` і `messages/en/whatsNew.json` (`whatsNew.2026-11-04-map-motion` за формою сусідніх записів)
- Move: `git mv` спеки й плану в `docs/archive/superpowers/` — лише в merge-коміті після злиття (не тут)

- [ ] **Step 1:** Оновити документацію й whats-new (+переклади).
- [ ] **Step 2:** `/simplify` на diff гілки (1 агент), виправити знахідки.
- [ ] **Step 3:** Перед повним прогоном: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` — якщо йде важкий процес, зачекати. Тоді один раз `pnpm test:run` і `pnpm lint`; `pnpm exec tsc --noEmit` за потреби.
- [ ] **Step 4:** Жива перевірка (Sonnet-субагент або вручну): бій із картою → «Рух» → швидкість, розворот, вертикаль, пауза, вимкнення; друге вікно гравця бачить зміни; телефон у портреті (повернута карта) — напрям екранний; `prefers-reduced-motion`.
- [ ] **Step 5: Commit** `docs: map motion architecture, status and what's new`.
