# Battle Map — блок 2c: налаштування карти — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ створює/редагує бій на карті з UI: вкладка «Карта» в налаштуваннях бою (увімкнути карту, розмір, прозорість, поля й малювання неігрових клітинок на живому превʼю, фон — завантаження або за замовчуванням); фон зберігається в Supabase Storage; у формі юніта — «Розмір на сітці».

**Architecture:** Сервер нормалізує `map.background` перед збереженням (`resolveMapBackgroundForPersistence` за зразком `lib/supabase/avatar-storage.ts`: data URL → upload, зовнішній URL → mirror, наш Storage або локальний `/battle-maps/…` — як є). Стан редактора — хук `useBattleMapEditor` (`lib/hooks/battles/setup`), чиста логіка полів/малювання — `lib/utils/battle/grid/map-editor.ts`. Превʼю — той самий `BattleMap` з `actions.onCellClick`.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Supabase Storage, Zod, Vitest.

**Spec:** `docs/archive/superpowers/specs/2026-10-18-battle-map.md`

## Global Constraints

- Конвенції `CLAUDE.md`: HUD-форми (`HudForm`/`HudTab`/`HudSection`), компоненти не імпортують `@/lib/api/*`, логіка в хуках/`lib/utils`, ≤ ~7 пропсів, тексти українською.
- Egress: фон — один файл на бій у публічному бакеті `battle-maps` з `cacheControl` на рік (як аватари), показ через `next/image` (кешується Vercel). Клієнт стискає до `maxSide = 2400` (`ImageUpload maxSide`), сервер приймає ≤ 5 MB після декодування (наявні ліміти `artifact-icon-storage`).
- Бій без карти лишається можливим: перемикач «Бій на карті» вимкнено → `map: null`.
- Нові таблиці не створюються; бакет створюється кодом (`ensureBucket` як в `artifact-icon-storage.ts`).

## Review Focus

- Редагування бою, у якого вже є карта: вкладка показує збережені значення (розмір, поля, клітинки, фон), а збереження без змін не перезавантажує фон повторно.
- Зменшення `cols/rows` після малювання: заблоковані клітинки поза новою сіткою відкидаються.
- Фон із чужого хосту (вставлений URL) після збереження — URL нашого Storage (не падає `next/image`).
- Вимкнення карти в бою, що вже йде: PATCH `map: null` → сцена повертається до списків.
- Юніт без зміни розміру зберігається з `gridSize: 1`; великий бібліотечний (2) — не скидається формою на 1.

---

### Task 1: Фон карти в Storage

**Files:**
- Create: `lib/supabase/battle-map-storage.ts`
- Modify: `lib/schemas/battles.ts` (`battleMapSchema.background`), `app/api/campaigns/[id]/battles/route.ts` (POST), `app/api/campaigns/[id]/battles/[battleId]/route.ts` (PATCH)
- Test: `lib/supabase/__tests__/battle-map-storage.test.ts` (мок адмін-клієнта як у наявних тестах `artifact-icon-storage`/avatar, якщо є; інакше — мок `resolveArtifactIconForPersistence`), `app/api/__tests__/battles-api.test.ts` (доповнити)

**Interfaces:**
- `BATTLE_MAPS_BUCKET = "battle-maps"`
- `resolveMapBackgroundForPersistence(background: string | null | undefined, opts: { campaignId: string }): Promise<{ ok: true; background: string | null | undefined } | { ok: false; message: string }>` — `undefined`/`null` → як є; локальний шлях, що починається з `/battle-maps/` → як є; URL нашого Storage → як є; інакше — `resolveArtifactIconForPersistence(value, { campaignId, objectBaseName: randomUUID(), bucket: BATTLE_MAPS_BUCKET, cacheControl: <той самий річний, що в avatar-storage> })`.
- `battleMapSchema.background`: `z.string().max(7_000_000).nullable()` з refine: `https://…` | `data:image/(png|jpeg|webp);base64,…` | `/battle-maps/<file>.(webp|jpg|png)`; інакше помилка «Фон: потрібне посилання https, файл або вбудований фон».
- POST/PATCH: якщо в тілі є `map` з `background` — нормалізувати перед записом; `ok: false` → 400 з `message` (через `errorResponse`).

- [ ] Тести: data URL → викликано upload і збережено публічний URL; `/battle-maps/nicolas-tomb.webp` і наш Storage URL → без upload; зовнішній https → mirror; невалідний рядок → 400 від схеми; помилка upload → 400. Run — FAIL → реалізація → PASS; tsc, lint.
- [ ] Commit — `feat(battle-map): store map backgrounds in Supabase Storage`

### Task 2: Логіка редактора (pure + hook)

**Files:**
- Create: `lib/utils/battle/grid/map-editor.ts` (+ експорт у barrel), `lib/hooks/battles/setup/useBattleMapEditor.ts` (+ barrel `lib/hooks/battles/setup/index.ts`, якщо є; інакше як решта setup-хуків)
- Modify: `lib/hooks/battles/setup/useBattleSetup.ts` (`BattleSetupInitial.map`, стан), `lib/hooks/battles/setup/useBattleForm.ts` (тіло `map`, deps), `types/battle-setup.ts` (`CreateBattleData.map?: BattleMapConfig | null`), `useBattleSetupInitial` (бере `battle.map`)
- Test: `lib/utils/battle/grid/__tests__/map-editor.test.ts`, тест хука в `lib/hooks/battles/__tests__` (за наявним шаблоном)

**Interfaces:**
- `map-editor.ts`:
  - `type Margins = { top: number; right: number; bottom: number; left: number }`
  - `marginsBlocked(cols, rows, m: Margins): string[]`
  - `inferMargins(map: BattleMapConfig): Margins` — найбільші суцільні смуги заблокованих клітинок по краях (для відкриття збереженої карти).
  - `toggleBlocked(map: BattleMapConfig, p: GridPoint): BattleMapConfig`
  - `resizeMap(map, cols, rows): BattleMapConfig` — відкидає `blocked` поза сіткою.
  - `applyMargins(map, m: Margins): BattleMapConfig` — `blocked` = поля ∪ (намальовані клітинки, що не в полях).
- `useBattleMapEditor(initial: BattleMapConfig | null)` → `{ enabled, setEnabled, map, setSize(cols, rows), setOpacity, margins, setMargins, paint: boolean, setPaint, onCellClick(p), setBackground(v: string | null), value: BattleMapConfig | null }` (`value` — `null`, коли вимкнено; при першому вмиканні — `DEFAULT_BATTLE_MAP`).
- `useBattleSetup` тримає `map` (`value` з редактора) і передає в `useBattleForm`, який кладе `map` у тіло create/update.

- [ ] Тести pure-функцій (поля 3 на 20×12 → 156 клітинок; resize відкидає зайві; inferMargins відновлює 3/3/3/3; toggle додає/знімає) і хука (вимкнено → `value === null`; увімкнено → дефолт; малювання тільки в `paint`). FAIL → реалізація → PASS; tsc, lint.
- [ ] Commit — `feat(battle-map): map editor state for battle setup`

### Task 3: Вкладка «Карта» в налаштуваннях бою

**Files:**
- Modify: `components/battle/setup/battle-form-tabs.ts` (`map: "map"`), `components/battle/setup/BattleSetupForm.tsx` (вкладка «Карта» після «Основне»)
- Create: `components/battle/setup/BattleFormMap.tsx`
- Test: `components/battle/setup/__tests__/` (за наявними; якщо немає — `BattleFormMap.test.tsx`, happy-dom)

**Верстка (`HudSection` «Карта бою»):**
- Перемикач «Бій на карті» (наявний switch/checkbox з `components/ui`).
- Коли увімкнено, ліворуч — налаштування, праворуч — превʼю (на мобілці превʼю під налаштуваннями, висота ~55vh):
  - «Колонки» / «Рядки» (`NumberInput` 4–40), «Прозорість сітки» (слайдер 0–1),
  - «Поля» — чотири числа «Зверху/Справа/Знизу/Зліва» (0–10) + кнопка «Однакові» (усі = значення першого),
  - перемикач «Малювати неігрові клітинки» (клік по клітинці превʼю перемикає її),
  - «Фон»: `ImageUpload` (`maxSide={2400}`, `label="Фон карти"`) + кнопка «Стандартний фон» (ставить `null` → `DEFAULT_MAP_BACKGROUND`).
- Превʼю: `<BattleMap map={map} participants={[]} actions={{ onCellClick }} className="h-full" />` у блоці з фіксованою висотою (desktop ~60vh).

- [ ] Тест: вимкнено — немає превʼю, `value === null`; увімкнути → превʼю з 240 полігонами; змінити «Зверху» на 2 → у превʼю 40 заблокованих полігонів (без stroke); у режимі малювання клік по клітинці робить її заблокованою. FAIL → реалізація → PASS; tsc, lint, повний `pnpm test:run`.
- [ ] Commit — `feat(battle-map): map tab in battle setup`

### Task 4: «Розмір на сітці» у формі юніта

**Files:**
- Modify: `components/units/form/UnitBasicInfo.tsx` (поряд із числовими полями), `lib/utils/units/unit-form.ts` (`emptyUnitFormDefaults` + мапінг юніта у форму — додати `gridSize`)
- Test: тести `unit-form` / форми юніта (за наявними)

- `SelectField` «Розмір на сітці»: `1×1 — звичайна`, `2×2 — велика`, `3×3 — величезна` (значення 1/2/3).
- [ ] Тест: дефолт 1; юніт із `gridSize: 2` відкривається з 2 і payload оновлення містить 2. FAIL → PASS; tsc, lint.
- [ ] Commit — `feat(units): grid size field in the unit form`

### Task 5: Перевірка в браузері (локальна база)

- [ ] Створити новий бій у HOMM5 через UI з картою: поля 3, кілька намальованих клітинок, завантажений фон (будь-яка картинка з `/Users/silentfox/Desktop/DND/bg/`) → зберегти → відкрити редагування: значення на місці; старт бою → учасники лише в ігровій зоні; великі юніти 2×2.
- [ ] Вимкнути карту в бою, що йде → сцена зі списками.
- [ ] Звіт зі скріншотами.
