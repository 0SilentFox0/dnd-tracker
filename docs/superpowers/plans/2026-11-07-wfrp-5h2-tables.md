# WFRP 5h-2: редаговані таблиці наслідків — план

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Кроки з чекбоксами `- [ ]`.

**Goal:** таблиці критів, miscast і Wrath редагуються ДМ як секція правил `rules.tables`; без рядків кампанії діють зашиті дефолти.

**Architecture:** секція правил (за зразком `advancement`) → `resolveTable(rules, slot)` → крит/miscast читають рядки з `ctx.rules`; редактор — секція в `RulesForm`; гравцям секція вирізається в `readCampaignRules`. Без міграцій.

**Tech Stack:** Zod 4, Vitest, React 19 + next-intl.

**Spec:** `docs/superpowers/specs/2026-11-07-wfrp-5h2-tables-design.md` (поправки з цього плану — див. «Рішення, що уточнюють спеку»).

## Global Constraints

- Worktree `../dnd-tracker-wfrp`, гілка `feat/wfrp`; не мерджити й не пушити в main.
- Коментарі мінімальні; імпорти `@/lib/...`; `import/no-cycle` увімкнено.
- Тести: `pnpm test:related <files>` / `pnpm test:run <file>`; повний `pnpm test:run` один раз у T6; lint лише `pnpm exec eslint --fix <touched files>` (repo-wide не запускати).
- Ніяких міграцій і нових таблиць БД. Нових кодів `API_ERRORS` немає.
- Тексти редактора — у DM-пакет поза `scope-size` (як `wfrpCareers`); запас DM-пакета 0.4 KB. Тексти uk+en.
- Бюджет OpenAPI 183000 байт: `RulesetPatchSchema` росте — після T1 запустити `pnpm test:run lib/server/**/openapi*` (знайти тест за `183_000`/`183000`), якщо перевищено — підняти бюджет у тому ж коміті до виміряного значення + запас.

## Рішення, що уточнюють спеку

- **Ключі секції плоскі**, `mergeRules` зливає секцію поверхнево: `critHead|critArm|critBody|critLeg|miscastMinor|miscastMajor|wrath`, кожен `Row[] | null | undefined` (`null`/відсутній = дефолт; «Скинути» шле `null`). `DEFAULT_RULES.tables = {}`.
- **Літеральний `TextRef` не потрібен:** `LogLine`/`TextArg` вже приймають рядок (`types/text.ts`). Прибрати `literalTextRef` зі спеки.
- **Ефект `marker`:** `winded|disarmed|crippled` не входять до каталогу станів wfrp (`WFRP_CONDITION_KEYS`), це відображувані маркери без механіки (зараз `markerKey` у `applyWfrpCrit`). Типи ефекту: `damage{amount}`, `wounds{amount}`, `condition{key,levels}`, `marker{key}`. За слотом: крити — `damage`,`condition`,`marker`; miscast/wrath — `wounds`,`condition`.
- Крит більше не має одного `markerKey`: рядок несе список ефектів (до 4).

## Review Focus

- Порожня/відсутня секція дає точно зашиту поведінку (регрес по всіх 5+5+4+4 рядках дефолтів).
- `preset`-кидок 1, 100 і межі `max` вибирають правильний рядок; рядок із кількома ефектами застосовує всі.
- Кампанія з частково перекритими слотами (лише `critHead`): інші слоти лишаються дефолтними.
- `null` у слоті = дефолт; невалідна секція в сирих правилах не ламає бій (`parseRules` повертає `DEFAULT_RULES.tables`).
- Не-ДМ ніколи не отримує `tables` (GET правил, SSR/prefetch, відповідь PATCH).
- Текст рядка кампанії з HTML/довгий рядок не ламає журнал (≤200, виводиться як звичайний рядок).

---

## Task 1: Схема секції `rules.tables` + проводка в Ruleset

**Files:**
- Create: `lib/utils/rules/tables-schema.ts`, `lib/utils/rules/__tests__/tables-schema.test.ts`
- Modify: `lib/utils/rules/schema.ts` (`sectionSchemas`, `sections`, `RulesetSchema`, `RulesetPatchSchema`), `lib/utils/rules/defaults.ts` (`tables: {}`), OpenAPI-бюджет-тест (див. Global Constraints)

**Interfaces — Produces:**
```ts
export const TABLE_SLOTS = ["critHead","critArm","critBody","critLeg","miscastMinor","miscastMajor","wrath"] as const;
export type TableSlot = (typeof TABLE_SLOTS)[number];
export type TableEffect =
  | { type: "damage"; amount: number }      // 1..20
  | { type: "wounds"; amount: number }      // 1..20
  | { type: "condition"; key: WfrpConditionKey; levels: number }  // levels 1..10
  | { type: "marker"; key: "winded" | "disarmed" | "crippled" };
export interface TableRow { max: number; text?: string; effects: TableEffect[] }   // max 1..100, text ≤200, effects ≤4
export const TablesRulesSchema: z.ZodType<Partial<Record<TableSlot, TableRow[] | null>>>; // strictObject, кожен слот optional+nullable, 1..20 рядків
export const SLOT_EFFECTS: Record<TableSlot, readonly TableEffect["type"][]>;
```
Валідація рядків слота: `max` строго зростає, останній `max === 100`, типи ефектів ∈ `SLOT_EFFECTS[slot]`. Повідомлення — ключі `rules.validation.tablesOrder|tablesLast|tablesEffect` (за зразком `advancementBrackets`; додати тексти в `messages/{uk,en}/rules.json` — переконатись, де лежать `advancementBrackets`).

- [ ] **Step 1: Тести** (`tables-schema.test.ts`): валідна таблиця з 5 рядків; `max` не зростає → помилка; останній ≠100 → помилка; `damage` у `wrath` → помилка; `wounds` у `critHead` → помилка; `condition.key:"nope"` → помилка; 5 ефектів → помилка; `text` 201 символ → помилка; `null` слот проходить; `parseRules({tables:{critHead:[{max:50,effects:[]}]}})` (невалідний) → `tables` = `{}`; `mergeRules(rules,{tables:{critHead:null}})` скидає слот.
- [ ] **Step 2:** `pnpm test:run lib/utils/rules/__tests__/tables-schema.test.ts` → FAIL.
- [ ] **Step 3: Реалізація.** Якщо `eslint` скаржиться на `import/no-cycle` через імпорт `WFRP_CONDITION_KEYS` з `systems/wfrp/conditions/catalog`, перенести масив у `lib/constants/wfrp-conditions.ts` і реекспортувати з `catalog.ts`. У `schema.ts` додати `tables: TablesRulesSchema` у `sectionSchemas`, `tables: withDefaults(sectionSchemas.tables, DEFAULT_RULES.tables)` у `sections`, `tables: sections.tables.prefault({})` у `RulesetSchema`, `tables: patchSection("tables").optional()` у `RulesetPatchSchema`; `DEFAULT_RULES.tables = {}`.
- [ ] **Step 4:** тести T1 + `pnpm test:related lib/utils/rules/schema.ts lib/utils/rules/defaults.ts` → PASS; виправити тести, що знімають повний знімок `Ruleset`/дефолтів (оновити очікувані значення); OpenAPI-бюджет.
- [ ] **Step 5:** `pnpm exec eslint --fix` по зачеплених файлах; commit `feat(wfrp): rules.tables section schema`.

## Task 2: Дефолтні таблиці в форматі Row + `resolveTable`

**Files:**
- Create: `lib/utils/rules/systems/wfrp/tables/defaults.ts`, `lib/utils/rules/systems/wfrp/tables/resolve.ts`, `lib/utils/rules/systems/wfrp/tables/__tests__/resolve.test.ts`
- Modify: `lib/utils/rules/systems/wfrp/tables/` (index не потрібен)

**Interfaces — Consumes:** `TableSlot`, `TableRow`, `TableEffect` (T1), `rollTable` (`tables/roll-table.ts`). **Produces:**
```ts
export interface ResolvedRow extends TableRow { textKey?: string }   // textKey лише в дефолтів
export const DEFAULT_TABLES: Record<TableSlot, readonly ResolvedRow[]>;
export function resolveTable(rules: Pick<Ruleset,"tables">, slot: TableSlot): readonly ResolvedRow[];   // rules.tables[slot] ?? DEFAULT_TABLES[slot]
export function rollSlot(rules: Pick<Ruleset,"tables">, slot: TableSlot, rng: Rng, preset?: number): { index: number; row: ResolvedRow; roll: number };
```
`DEFAULT_TABLES` будується з наявних `CRIT_TABLE`/`MISCAST_TABLE`/`WRATH_TABLE` (імпортувати їх, **не видаляти** у цій задачі): крит `bonusDamage>0` → `damage`; `markerKey` ∈ `WFRP_CONDITION_KEYS` → `condition{levels:1}`, інакше `marker`; `textKey` = `battleWfrp.crit.<loc>.<n>` (loc: `critHead→head`, `critArm→arm`, `critBody→body`, `critLeg→leg`); miscast/wrath: `wounds`/`condition{levels}`, `textKey` = `wfrpMagic.miscast.<minor|major|wrath>.<n>` (звірити з рядками, які зараз будує `miscast.ts`).

- [ ] **Step 1: Тести:** (a) для кожного слота `DEFAULT_TABLES` проходить `TablesRulesSchema` після зняття `textKey`; (b) еквівалентність: для кожного `max` старих констант `rollSlot(rules, slot, rng, roll)` на всіх межах (`roll` = 1, `max`, `max+1`, 100) дає той самий набір (damage/condition/wounds), що старий рядок; (c) `resolveTable({tables:{critHead:rows}}, "critHead")` → `rows`, інші слоти — дефолти; (d) `null` → дефолт.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS (`pnpm test:run lib/utils/rules/systems/wfrp/tables`).
- [ ] **Step 5:** eslint; commit `feat(wfrp): default tables as rows + resolveTable`.

## Task 3: Крит і miscast читають `rules.tables`

**Files:**
- Modify: `lib/utils/rules/systems/wfrp/combat/crit-table.ts` (`rollCrit`, `CritResult`), `combat/crit-effect.ts` (`applyWfrpCrit`), `combat/mitigate.ts:52`, `combat/on-zero-hp.ts:29` (+ `ZeroHpCtx` у `systems/types.ts`, якщо там немає `rules`), `magic/miscast.ts`; видалити `CRIT_TABLE`, `MISCAST_TABLE`, `WRATH_TABLE`, `magic/miscast-table.ts` після переходу; оновити існуючі тести в `combat/__tests__`, `magic/__tests__`
- Test: `combat/__tests__/crit-rules-tables.test.ts`, `magic/__tests__/miscast-rules-tables.test.ts`

**Interfaces — Consumes:** `rollSlot`, `ResolvedRow` (T2). **Produces:**
```ts
export interface CritResult { id: string; text: LogLine; bonusDamage: number; conditions: { key: WfrpConditionKey; levels: number }[]; markers: string[] }
export function rollCrit(location: HitLocation, rules: Pick<Ruleset,"tables">, rng: Rng, presetRoll?: number): CritResult;
```
`text` = `dynamicTextRef(row.textKey)` для дефолту, `row.text` (рядок) для кампанії, порожній рядок-fallback → `dynamicTextRef(\`battleWfrp.crit.${location}.${index+1}\`)` лише для дефолту; рядок кампанії без `text` → `battleWfrp.log.critHit` без фрагмента тексту (перевірити шаблон ключа; якщо вимагає `text`, підставити порожній рядок). `id` = `${location}.${index+1}`. `bonusDamage` = сума `damage`. `applyWfrpCrit` застосовує всі `conditions` (рівні з рядка; джерело `sourceName` = `text`), `markers` — через наявний `upsertLabeled` (зараз на один маркер; цикл по списку, `timedKey` додає ключ маркера). `wfrpMiscast`: `rollSlot(ctx.rules, slot, ...)`, ефекти `condition` і `wounds` як зараз; `effect` у журналі = `row.text ?? dynamicTextRef(textKey)`; `concealed` не змінюється.

- [ ] **Step 1: Тести (нові):** (a) крит із рядком кампанії (`damage 4`+`condition prone 2`+`marker crippled`) на `preset` → `bonusDamage 4`, стан `prone` рівня 2, маркер; (b) порожня секція → поведінка ≡ до змін (оновлені старі тести лишаються зеленими, приведені до нової сигнатури); (c) частково перекритий слот: `critHead` кампанії, `critArm` — дефолт; (d) miscast minor із рядком кампанії (`wounds 3`+`condition stunned 1`) → HP −3 і стан; wrath; (e) текст кампанії потрапляє в журнал рядком, без `text` — без падіння; (f) `preset` 1 і 100.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація (за Interfaces; `mitigate.ts` передає `ctx.rules`, `on-zero-hp.ts` — `ctx.rules`; якщо `ZeroHpCtx` не має `rules`, додати поле й заповнити в місці виклику `onZeroHp` у `lib/utils/battle/...consequences.ts`). **Step 4:** `pnpm test:related lib/utils/rules/systems/wfrp/combat/crit-table.ts lib/utils/rules/systems/wfrp/magic/miscast.ts` + `pnpm test:run lib/utils/rules/systems/wfrp` → PASS.
- [ ] **Step 5:** eslint по зачеплених; commit `feat(wfrp): crit and miscast read rules.tables`.

## Task 4: Приховування `tables` від не-ДМ

**Files:**
- Modify: `lib/server/campaigns/rules.ts` (`readCampaignRules`), місця, що віддають правила клієнту (знайти): `grep -rn "parseRules\|loadRules\|readCampaignRules\|useRuleSystem\|rules:" app lib/hooks lib/server --include='*.ts' --include='*.tsx'` → список у PR-описі; `updateCampaignRules` (відповідь PATCH), SSR/prefetch правил на сторінках кампанії
- Test: `lib/server/campaigns/__tests__/rules-tables-visibility.test.ts`

**Interfaces — Produces:** `export const stripPlayerHiddenRules = (rules: Ruleset): Ruleset` (`{...rules, tables: {}}`) у `lib/utils/rules/` і його використання в усіх клієнтських шляхах для `!actor.isDM`.

- [ ] **Step 1: Тест:** DM `readCampaignRules` повертає `tables`; гравець — `tables: {}`; відповідь PATCH для гравця неможлива (DM-only) — перевірити, що PATCH правил лишається DM-only; SSR/prefetch (знайдені шляхи) для гравця без `tables`.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація; рушій на сервері бере `loadRules` без стрипа (потрібні таблиці). **Step 4:** PASS. **Step 5:** eslint; commit `fix(wfrp): hide rules.tables from players`.

## Task 5: Редактор `TablesSection`

**Files:**
- Create: `components/rules/sections/TablesSection.tsx`, `components/rules/sections/__tests__/TablesSection.test.tsx`
- Modify: `components/rules/RulesForm.tsx` (реєстр секцій, як `advancement: AdvancementSection`; показувати лише для `system.key === "wfrp"` — повторити спосіб гейтингу, яким `AdvancementSection` ховається в d20), `messages/{uk,en}/*.json` (DM-пакет поза `scope-size`: перевірити, як `wfrpCareers` виключено в `scope-size`-тесті/конфігу, і повторити для нового неймспейсу `wfrpTables`)

**Interfaces — Consumes:** `TABLE_SLOTS`, `TableRow`, `TableEffect`, `SLOT_EFFECTS` (T1), `resolveTable`/`DEFAULT_TABLES` (T2). Поведінка (за зразком `AdvancementSection`; читати його перед початком): вибір слота (select); для обраного слота список рядків — поле «до» (`max`), обчислена нижня межа (read-only), текст, список ефектів (тип з `SLOT_EFFECTS[slot]`, значення/ключ стану з каталогу, рівень), додати/видалити рядок (останній `max` примусово 100), показ дефолту, якщо слот не перекритий (рядки дефолту як початок редагування: «Налаштувати» копіює `DEFAULT_TABLES[slot]` без `textKey` у стан форми), «Скинути до дефолту» шле `null`. Помилки схеми біля рядка через наявний механізм `RulesForm`. Дефолтні рядки читаються як текст через `useTranslations` за `textKey`.

- [ ] **Step 1: Тести (`// @vitest-environment happy-dom`):** показ дефолту для невизначеного слота; «Налаштувати» → додати ефект → onChange з очікуваним патчем; видалення рядка зберігає останній `max=100`; недопустимий тип ефекту для слота відсутній у списку; «Скинути» шле `{critHead: null}`; не-wfrp — секція не рендериться.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація, i18n uk/en. **Step 4:** PASS + `pnpm test:related components/rules/RulesForm.tsx` + scope-size тест. **Step 5:** eslint; commit `feat(wfrp): rules.tables editor section`.

## Task 6 (контролер): e2e, документація, фінал

- [ ] e2e: за зразком `wfrp-traits-e2e.test.ts` (знайти) — бій на wfrp із кампанією, де `critHead` має власний рядок, крит у голову дає очікувані ефекти й текст у журналі; та сама кампанія для гравця не віддає `tables`.
- [ ] Документація: `docs/architecture/rule-systems.md` — «Межі 5h-2» (секція `rules.tables`, ключі, ефекти, дефолти, приховування, поза межами: імпорт/sync/шари — 5g, числа не звірені); оновити рядки `wfrp/tables/` і `magic` у таблиці модулів; `docs/STATUS.md` (5h-2 DONE; без міграцій).
- [ ] `/simplify` на diff гілки від `a490334c7`, один раз повний `pnpm test:run`, eslint по зачеплених файлах; перед повним прогоном перевірити `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- [ ] Live-run у браузері (Sonnet-субагент, 375px і desktop): ДМ у правилах змінює `critHead`, бій, крит у голову → ефект із таблиці; «Скинути» повертає дефолт; гравець у `GET /api/campaigns/:id/rules` не бачить `tables`; dnd5e-кампанія без змін. Тестові дані прибрати.
- [ ] Один фінальний Opus-review `a490334c7..HEAD`, виправити знахідки; оновити пам'ять `project-wfrp.md` (5h-2 DONE).
- [ ] Гейт епіку, не зараз: `battle-sweep` homm/dnd5e на prodcopy.

## Dispatch (SDD, Sonnet)

1. T1+T2 (одна диспетчеризація), 2. T3, 3. T4, 4. T5, 5. T6 — контролер. Ревʼю по задачах немає; один Opus-review наприкінці.
