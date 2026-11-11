# WFRP 5h-3: Corruption і мутації — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (метод обрано користувачем: executors = Sonnet, без рев'ю по задачах, один фінальний Opus-рев'ю, `/simplify`, live-run і один повний `pnpm test:run` наприкінці — Task 8). Кроки з чекбоксами `- [ ]`.

**Goal:** ДМ однією дією нараховує герою пункти порчі; понад поріг (TB + WPB) сервер кидає Endurance і при провалі додає постійну мутацію з таблиці, ефекти якої змінюють характеристики/Wounds/Move скрізь (лист, тести, бій); останнє нарахування можна відкотити.

**Architecture:** стан — ключ `characteristics.corruption` (без міграцій), читається рукописним дзеркалом `readCorruption` усередині `readCharacteristics`; модифікатори мутацій входять лише через `derive.ts` (`value`/`woundsMax`/`moveOf`/`walkYards`/`runYards`), а для учасника бою згортаються в `base/advances/move` (`foldCorruption`), тож бій не знає про порчу; чистий рушій `wfrp/corruption/` за хуком `RuleSystemDefinition.corruption` (у d20 — `undefined`); дві DM-операції через `operation-runner`; таблиці — два нові слоти `rules.tables` з власною схемою ефектів; UI — блок на вкладці «Бій» аркуша + чип у `HeroStats`, тексти в namespace `wfrpCorruption`, що підвантажується лише на трьох сторінках.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zod 4, Prisma 6, TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-wfrp-5h3-design.md` (рішення користувача 2026-11-09 не переглядаються; уточнення плану — нижче).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-wfrp`, гілка `feat/wfrp`; не мерджити в main, не пушити.
- Без міграцій і нових таблиць БД.
- Ядро (`lib/server`, `lib/schemas`, `lib/hooks/characters`, `components/characters`, `components/character-profile`, `components/rules`, `types`, `app`) імпортує wfrp лише через `@/lib/utils/rules/systems` (index), `@/lib/utils/rules/systems/schemas`, `@/lib/utils/rules/systems/registry` і `@/components/systems` (ESLint `SYSTEM_IMPORT_PATTERN`). Тести в `lib/server/**/__tests__` теж — механіку перевіряють через `ruleSystemOf(rules).*`.
- Усі числа рушія — у `wfrp/corruption/constants.ts`, кожне з `// verify against 5e book`; дефолтні таблиці мутацій — під одним `// verify against 5e book`. Тексти мутацій — власні формулювання (ліцензія GW: книжковий текст не копіювати).
- `GRANT_MAX = 10`, `MUTATIONS_MAX = 20`, `POINTS_MAX = 999`, `PHYSICAL_MAX_ROLL = 50`, `CORRUPTION_TEST_SKILL = "endurance"`, `CORRUPTION_TEST_DIFFICULTY: DifficultyKey = "challenging"`.
- Нові коди `API_ERRORS`: `CORRUPTION_UNSUPPORTED` (409), `CORRUPTION_IN_BATTLE` (409), `CORRUPTION_STALE` (409); тексти `errors.*` uk+en.
- i18n: namespace `wfrpCorruption` — НЕ в `WFRP_*_EXTRA`, лише `ExtendLocaleScope` на `app/campaigns/[id]/character/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/page.tsx`, `app/campaigns/[id]/dm/rules/page.tsx`. Наявні ліміти `scope-size` (`LIMIT_KB = 105`, `WFRP_MEMBER_LIMIT_KB = 107`, `WFRP_DM_LIMIT_KB = 111`, `WFRP_DOWNTIME_PAGE_LIMIT_KB = 2`) не змінювати. Кирилиця в коді заборонена — лише `messages/uk/*.json` і docs.
- Коментарі мінімальні (одна стисла лінія лише для неочевидного); імпорти `@/lib/...`; `import/no-cycle` увімкнено.
- Тести під час роботи: `pnpm test:run <file>` / `pnpm test:related <files>` / `pnpm test:changed`; lint: `pnpm exec eslint --fix <touched files>`. Repo-wide `pnpm lint` і повний `pnpm test:run` — лише контролер у Task 8.
- Не чіпати відомий хвіст 5h-4 — порядок блокувань у `passPeriod`/`undoPeriod` (`downtime-handler.ts`). Операції порчі блокують рівно один рядок `characters` (`lockCharacters`), без `lockCampaignArtifacts`.
- Коміти виконавців закінчуються рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Відповіді на «Відкриті питання плану» (перевірено в коді 2026-11-09)

1. **Прямі читання `base/advances/move`** (`grep -rnE "\.base\[|\.advances\[|\.move\b|\.extraWounds"` по `lib components app`): лише `derive.ts` (виправляється в центрі), `characteristics/sheet-block.ts:34,36` (`move.value = c.move` → ефективний), `components/systems/wfrp/AdvancementTab.tsx:78` (`c.base[key] + c.advances[key]` → `value`), `components/systems/wfrp/CharacteristicsEditor.tsx:29` (сума → `value`), `equipment/encumbrance.ts:8` (власний `bonusOf`; єдиний виклик `lib/hooks/systems/wfrp/useEncumbrance.ts:48` передає `value` з блоку листа й нульові advances — вже ефективне, не чіпаємо), `advancement/plan.ts:33`/`undo.ts:43` (сирі advances для ціни/відкату — правильно, не чіпаємо). Бій (`combat/resolve-attack.ts:23`, `hit-model.ts:19`, `magic/channel.ts:14`, `magic/cast-test.ts:15,21`, `traits/psychology.ts:66`, `conditions/end-test.ts:41`) читає `readCharacteristics(p.abilities.characteristics)` → `value()`; учасник отримує `characteristics` з `wfrpAbilitiesOf` → туди йде `foldCorruption`. `wfrpBaseStats` (Move → speed) і `progression.maxHp` (`hero-hp.ts:24`) читають рядок персонажа → `derive` з модифікаторами. `lib/ai/**` характеристик не читає. Юніти порчі не мають (схема юнітів відкидає `corruption`).
2. **Публічні проєкції `characteristics`:** `list` (`operations/list.ts` → `redactListedLedgers` → `redactLedger`) і учасник бою (`combat/participant.ts` → `wfrpAbilitiesOf`, знімок бачать усі гравці бою). `get` (`operations/get.ts:39`), лист (`read-sheet.ts:34`), журнал (`read-character-log.ts` через `gateCharacter`) — лише ДМ/власник; `roster` `characteristics` не вибирає; `create` — `normalizeCharacterInput` (`system-fields.ts`). Отже `corruption` вирізається в `redactLedger`, `wfrpAbilitiesOf` (через `foldCorruption`), `normalizeCharacterInput` (create) і `preserveServerOwned`/`reconcileCharacteristics` (PATCH). Аудит-крок Task 1 повторює grep на випадок нових місць.
3. **`scope-size`:** заміряно 2026-11-09: ДМ wfrp uk 110.2 / 111 KB, учасник 106.3 / 107, кампанія+бій+battleWfrp 104.2 / 105. Мітки слотів і трьох типів ефектів (`wfrpTables.slots.*`, `wfrpTables.effect.*`, `wfrpTables.characteristic`) — ≈0.1 KB gzip у DM-пакеті `wfrpTables` — вміщаються, окремий namespace не потрібен. Рядки журналу `rest.log.corruption*` (≈0.05 KB) — у `rest` (як `rest.log.downtime`). Усе інше — `wfrpCorruption` з окремим рядком `scope-size` 2 KB.
4. **Тексти дефолтних рядків:** `textKey` = `wfrpCorruption.mutations.physical.1..6` / `mental.1..6` (прецедент — `wfrpDowntime.events.*`); тому `wfrpCorruption` додається в `ExtendLocaleScope` сторінки ДМ-правил (`DefaultRows` і «Налаштувати» перекладають ключ).

## Рішення, що уточнюють спеку

- **`Mutation.text: LogLine`** (не `string`): рядок з `text` зберігає рядок як є (≤ 200), дефолтний — `dynamicTextRef(textKey)` (`{ message }`), перекладається на межі (`formatText`) мовою глядача. «Зафіксовано в момент кидка» лишається: текст копіюється в мутацію й не залежить від пізніших правок таблиці. Сервер не знає мови глядача, тож переклад на сервері суперечив би правилу i18n. `readCorruption` приймає `text` як рядок ≤ 200 або `{ message: string (1..120) }` без `params`.
- **`Mutation.id = grantId`** (одна мутація на нарахування); `GrantSnapshot.after.mutationId` = той самий id.
- **`GrantSummary` += `capped?: true`** (кап мутацій) і `pointsCapped?: true` (сума обрізана до `POINTS_MAX`).
- **Тіло undo:** `{ grantId }`; STALE, якщо `last?.id !== grantId`, `points !== last.after.points` або (`after.mutationId` і `mutations.at(-1)?.id !== mutationId`). Після undo `last` прибирається (другий undo → STALE). Ручних змін порчі через API немає (PATCH її зберігає), тож «ручну зміну» e2e моделює прямою правкою рядка в моку.
- **Схема ефектів:** окремі `MutationEffectSchema`/`MutationRowSchema` для `mutationPhysical|mutationMental`, наявні слоти лишаються на старому `EffectSchema` — нові типи в інших слотах відхиляються самим zod (а `SLOT_EFFECTS` для мутаційних слотів — `["characteristic","move","maxWounds"]`), і OpenAPI не росте на 3 варіанти × 8 слотів. `TableEffect` — об'єднання старих і нових типів (`MutationEffect` з `wfrp/corruption/types.ts` дублює форму, тип береться з `tables-schema.ts`, щоб ядро не імпортувало wfrp).
- **Бій:** `wfrpAbilitiesOf` викликає `foldCorruption(c)`: для кожної характеристики з модифікатором `target = min(200, value(c,k))`, `base' = clamp(target − adv, 1, 100)`, `adv' = target − base'` (обидва в межах `readCharacteristics`, тож знімок не падає в дефолти); `move' = moveOf(c)`; ключ `corruption` прибирається. `maxWounds` у учасника не потрібен (max HP учасника береться з `characterBaseHp` рядка).
- **Лист:** `SheetWfrpBlock` += `characteristics[].mod: number`, `corruption: { points; threshold; mutations: Mutation[] }` (лист бачать лише ДМ/власник). UI читає порчу з листа, не з `character.characteristics`.
- **Хуки клієнта:** файл `lib/hooks/characters/useCorruption.ts` у барелі `lib/hooks/characters/index.ts` (як `useDowntime.ts`), а не тека `corruption/` зі спеки — в домені `characters` підтек-хуків немає.
- **Порча для будь-якого персонажа кампанії** (`player` і `npc_hero`, статус `ACTIVE`); «NPC/юніти поза межами» = учасники-юніти бою.
- **What's new** `2026-11-09-wfrp-corruption` — audience `all` без `href`; довідка — секція `s8` статті `dm-rule-systems`.

## Review Focus

1. **Межа порогу й модифікований поріг:** сума рівно = порогу → тесту немає; поріг + 1 → тест; мутація −10 T знижує поріг для наступного нарахування (поріг рахується з ефективних характеристик). Тест — Task 4 (`plan-grant`), Task 5 (e2e).
2. **Капи й мінімуми:** 21-й провал при 20 мутаціях → `capped`, мутації немає, пункти додано; `points` 995 + 10 → 999 і `pointsCapped`; мутація −30 на характеристиці 20 → `value` 1; Move 2 з −3 → 1 (walk 2 yd); Wounds з −10 → 1; `foldCorruption` при `base 100 + adv 100 + 30` і при `base 5, adv 0, −30` дає значення в межах читача (знімок не скидається в дефолт 30). Тести — Task 2.
3. **Відкат:** другий undo того ж `grantId`, undo старого `grantId` після нового нарахування, undo після прямої правки `points` у рядку → 409 `CORRUPTION_STALE`, нічого не записано; undo після збереження листа ДМ (PATCH з іншим `corruption`) працює, бо PATCH зберігає порчу; після undo мутації характеристики/Wounds/Move повертаються. Тест — Task 5.
4. **Конкурентність:** grant і `advance`/`career-set`/PATCH/`downtime` серіалізуються одним `FOR UPDATE` рядка героя; кожен із них пише `characteristicsJson(readCharacteristics(...))`, тому `readCharacteristics` мусить зберігати `corruption` (інакше `advance` стирає порчу). Тест — Task 1 (`readCharacteristics` round-trip) і Task 5 (`advance` після grant лишає `corruption`). Порядок блокувань 5h-4 не чіпаємо.
5. **Приватність і системи:** інший гравець у `list` не бачить `corruption`; учасник бою не має `corruption`, але має згорнуті ефективні значення; гравець через PATCH не змінює й не стирає `corruption`; гравець на `POST …/corruption` і `…/undo` → 403; `rules.tables.mutation*` гравцю не приходить (`stripPlayerHiddenRules`); homm/dnd5e → 409 `CORRUPTION_UNSUPPORTED`, у UI немає ні блоку, ні чипа. Тести — Task 1, Task 5, Task 6.

---

## File Structure

```
lib/constants/wfrp-characteristics.ts                 NEW  CHARACTERISTIC_KEYS (лист; wfrp/characteristics/constants реекспортує)
lib/constants/wfrp-mutations.ts                       NEW  MUTATION_EFFECT_LIMITS, MUTATION_EFFECTS_MAX
lib/utils/rules/systems/wfrp/corruption/
  types.ts       NEW  CorruptionState, Mutation, MutationEffect, GrantSnapshot, GrantSummary
  read.ts        NEW  readCorruption (без zod)
  constants.ts   NEW  числа рушія
  modifiers.ts   NEW  modifiersOf, EMPTY_MODIFIERS
  threshold.ts   NEW  corruptionThreshold
  fold.ts        NEW  foldCorruption (для учасника бою)
  plan-grant.ts  NEW  planGrant
  undo.ts        NEW  planCorruptionUndo
  index.ts       NEW  WFRP_CORRUPTION
lib/schemas/corruption.ts                             NEW  тіла запитів
lib/server/characters/core/corruption-handler.ts      NEW  grantCorruption, undoCorruption
lib/server/characters/operations/corruption.ts        NEW  corruption.grant (POST)
lib/server/characters/operations/corruption-undo.ts   NEW  corruption.undo (POST)
app/api/campaigns/[id]/characters/[characterId]/corruption/route.ts       NEW
app/api/campaigns/[id]/characters/[characterId]/corruption/undo/route.ts  NEW
lib/api/corruption.ts, types/corruption.ts, lib/hooks/characters/useCorruption.ts  NEW
components/systems/wfrp/corruption/{CorruptionBlock,GrantCorruptionDialog,GrantSummaryView,MutationEffects}.tsx  NEW
messages/{uk,en}/wfrpCorruption.json                  NEW
lib/server/characters/__tests__/wfrp-corruption-e2e.test.ts  NEW
```

---

## Task 1: Дані `corruption`, приватність, журнал, коди помилок (dispatch 1)

**Files:**
- Create: `lib/utils/rules/systems/wfrp/corruption/{types,read,constants}.ts`, `lib/utils/rules/systems/wfrp/corruption/__tests__/read.test.ts`, `lib/constants/wfrp-characteristics.ts` (`CHARACTERISTIC_KEYS`, `CharacteristicKey` — перенесено з `wfrp/characteristics/constants.ts`, який їх реекспортує), `lib/constants/wfrp-mutations.ts` (`MUTATION_EFFECT_LIMITS = { characteristic: 30, move: 3, maxWounds: 10 } as const` з `// verify against 5e book`, `MUTATION_EFFECTS_MAX = 3`). Листи в `lib/constants` потрібні, бо `lib/utils/rules/tables-schema.ts` (Task 3) поза `systems/**` і не може імпортувати `systems/wfrp*` (ESLint), а імпорт з index `@/lib/utils/rules/systems` дав би цикл `tables-schema → systems → wfrp/tables/defaults → tables-schema` (зразок — `@/lib/constants/wfrp-conditions`).
- Modify: `lib/utils/rules/systems/wfrp/characteristics/constants.ts` (реекспорт з `@/lib/constants/wfrp-characteristics`), `lib/utils/rules/systems/wfrp/characteristics/keys.ts` (`Characteristics.corruption?`, `readCharacteristics`), `lib/utils/rules/systems/wfrp/characteristics/schema.ts` (`corruption`, `UnitCharacteristicsSchema`), `lib/utils/rules/systems/schemas.ts`, `lib/schemas/units.ts:113,143,182`, `lib/utils/rules/systems/wfrp/advancement/privacy.ts`, `lib/server/characters/operations/patch.ts:75-90`, `lib/server/characters/core/system-fields.ts` (create), `lib/utils/rules/systems/index.ts`, `lib/constants/character-log.ts`, `lib/utils/characters/resources/describe-log.ts`, `lib/constants/api-errors.ts`, `messages/{uk,en}/rest.json` (`log.corruption`, `log.corruptionMutation`, `log.corruptionUndo`), `messages/{uk,en}/errors.json`
- Test: `corruption/__tests__/read.test.ts`, `lib/utils/rules/systems/wfrp/advancement/__tests__/privacy.test.ts`, `lib/server/characters/operations/__tests__/ledger-privacy.test.ts`, `lib/server/characters/core/__tests__/system-fields.test.ts`, `lib/utils/characters/resources/__tests__/describe-log-wfrp.test.ts`, `lib/utils/rules/systems/wfrp/characteristics/__tests__/schema.test.ts`

**Interfaces:**
- Consumes: `CharacteristicKey`/`CHARACTERISTIC_KEYS` з `../characteristics/constants`; `TestOutcome` з `../downtime/types`; `LogLine` з `@/types/text`.
- Produces (`wfrp/corruption/types.ts`, реекспорт типів і `readCorruption` з `@/lib/utils/rules/systems`):
```ts
export type MutationKind = "physical" | "mental";
export type MutationEffect =
  | { type: "characteristic"; key: CharacteristicKey; amount: number } // -30..30, ≠ 0
  | { type: "move"; amount: number }                                   // -3..3, ≠ 0
  | { type: "maxWounds"; amount: number };                             // -10..10, ≠ 0
export type Mutation = { id: string; at: string; kind: MutationKind; roll: number; text: LogLine; effects: MutationEffect[] }; // roll 1..100, effects ≤ 3
export type GrantSummary = {
  points: number; total: number; threshold: number;
  pointsCapped?: true;
  test?: TestOutcome;
  mutation?: { kind: MutationKind; typeRoll: number; roll: number; text: LogLine; effects: MutationEffect[] };
  capped?: true;
};
export type GrantSnapshot = { id: string; at: string; reason: string; before: { points: number }; after: { points: number; mutationId?: string }; summary: GrantSummary };
export type CorruptionState = { points: number; mutations: Mutation[]; last?: GrantSnapshot };
export const EMPTY_CORRUPTION: CorruptionState = { points: 0, mutations: [] };
```
- Produces: `readCorruption(raw: unknown): CorruptionState | undefined`; `constants.ts` (усі з `// verify against 5e book`): `GRANT_MAX = 10`, `POINTS_MAX = 999`, `MUTATIONS_MAX = 20`, `PHYSICAL_MAX_ROLL = 50`, `CORRUPTION_TEST_SKILL = "endurance"`, `CORRUPTION_TEST_DIFFICULTY: DifficultyKey = "challenging"`, `REASON_MAX = 80` (межі ефектів — `MUTATION_EFFECT_LIMITS`/`MUTATION_EFFECTS_MAX` з `@/lib/constants/wfrp-mutations`); реекспорт `CORRUPTION_GRANT_MAX` (= `GRANT_MAX`) з `@/lib/utils/rules/systems`; `UnitCharacteristicsSchema` з `@/lib/utils/rules/systems/schemas`; `CharacterLogKind.CORRUPTION = "corruption"`; `API_ERRORS.CORRUPTION_UNSUPPORTED|CORRUPTION_IN_BATTLE|CORRUPTION_STALE` = `"errors.corruptionUnsupported"|"errors.corruptionInBattle"|"errors.corruptionStale"`.

- [ ] **Step 1: Аудит витоків.** Виконати й занести висновок у звіт задачі:
```bash
cd /Users/silentfox/Work/dnd-tracker-wfrp
grep -rnE "\.base\[|\.advances\[|\.move\b|\.extraWounds" --include='*.ts' --include='*.tsx' lib components app | grep -v __tests__ | grep -iE "wfrp|characteristic|\bc\.|data\."
grep -rn "characteristics" lib/server --include='*.ts' -l | grep -v __tests__
grep -rn "abilities\.characteristics\|abilities?\.characteristics" lib components --include='*.ts' --include='*.tsx' | grep -v __tests__
```
Очікувано — точно перелік з «Відповідей» п. 1–2 плану. Нове місце, що віддає сирі `characteristics` чужому гравцеві або копіює їх у знімок, — прибрати там `corruption` у цій задачі тим самим способом, що `downtime`; нове пряме читання `base/advances/move` для механіки — занести в Task 2.

- [ ] **Step 2: Тести `readCorruption`** (`corruption/__tests__/read.test.ts`):
  - `undefined`/`null`/рядок/масив → `undefined`; `{}` → `{ points: 0, mutations: [] }`.
  - `points` −1, 1000, 1.5 → `undefined`; 999 → ок.
  - Мутація: валідна з `text: "Scales"` і з `text: { message: "wfrpCorruption.mutations.physical.1" }` проходить; `text` 201 символ, `{ message: "" }`, `{ message: "x", params: {} }` → `undefined`; `kind: "spiritual"`, `roll` 0/101, 4 ефекти → `undefined`.
  - Ефекти: `characteristic` з `key: "zz"`, `amount: 0`, `31`, `-31` → `undefined`; `move` 4, `maxWounds` −11 → `undefined`; зайвий ключ в ефекті (`{ type: "move", amount: 1, x: 1 }`) → `undefined`.
  - 21 мутація → `undefined`; дубль `id` мутацій → `undefined`.
  - `last` без `id`, `reason` 81 символ, `summary` не-об'єкт, `before.points` поза 0..999 → `undefined`; валідний `last` зберігається (`summary` перевіряється лише як об'єкт — серверне поле).
  - Повертає новий об'єкт без зайвих ключів (`{ points: 1, mutations: [], extra: 1 }` → без `extra`).
  - `readCharacteristics({ characteristics: { corruption: valid } }).corruption` дорівнює `valid`; з невалідним — ключа немає, решта полів читаються як раніше; разом із `downtime` обидва ключі на місці.
  - `schema.test.ts`: `CharacteristicsSchema.safeParse({ corruption: invalid }).success === false`, `{ corruption: valid }` → `true`; `UnitCharacteristicsSchema.parse({ corruption: valid })` не має ключа `corruption`.

Run: `pnpm test:run lib/utils/rules/systems/wfrp/corruption/__tests__/read.test.ts` → FAIL (модуля немає).

- [ ] **Step 3: Реалізація даних.**
  - `corruption/read.ts` імпортує лише `../characteristics/constants`, `@/lib/constants/wfrp-mutations`, `./constants`, `./types` (без `keys.ts` — інакше цикл). Стиль — `readDowntime` (`isRecord`, `isInt`). Ефект — рівно ключі свого типу.
  - `keys.ts`: `Characteristics.corruption?: CorruptionState`; у `readCharacteristics` — `const corruption = readCorruption(raw.corruption);` і `...(corruption ? { corruption } : {})` поруч із `downtime`.
  - `schema.ts`: `corruption: z.custom<CorruptionState>((v) => readCorruption(v) !== undefined).optional()`; `export const UnitCharacteristicsSchema = CharacteristicsSchema.omit({ corruption: true });` (zod-об'єкт відкидає невідомі ключі); `systems/schemas.ts` реекспортує; `lib/schemas/units.ts` — три місця `CharacteristicsSchema.optional()` → `UnitCharacteristicsSchema.optional()`.
  - `systems/index.ts`: `export type { CorruptionState, GrantSnapshot, GrantSummary, Mutation, MutationEffect, MutationKind } from "./wfrp/corruption/types"; export { EMPTY_CORRUPTION } from "./wfrp/corruption/types"; export { readCorruption } from "./wfrp/corruption/read"; export { GRANT_MAX as CORRUPTION_GRANT_MAX } from "./wfrp/corruption/constants";`.

Run Step 2 знову → PASS.

- [ ] **Step 4: Тести приватності.**
  - `privacy.test.ts`: `redactLedger(c з corruption і downtime, { isDM: false, isOwner: false })` — немає ні `corruption`, ні `downtime`, `ledger: []`; власник/ДМ — без змін. `preserveServerOwned(existing з corruption A, incoming з corruption B)` → A; `existing` без `corruption`, `incoming` з ним → ключа немає.
  - `ledger-privacy.test.ts` (поруч із кейсами downtime): ДМ шле PATCH з `characteristics.corruption = { points: 0, mutations: [] }`, збережено `corruption` з `points: 7` і мутацією → у `character.update` записано збережене; гравець шле PATCH з `corruption.points: 0` → записано збережене; у `list` інший гравець не бачить `corruption` чужого героя, власник і ДМ бачать.
  - `system-fields.test.ts`: `normalizeCharacterInput(WFRP_SYSTEM, { characteristics: { …, corruption } }, rules, "create")` → без `corruption`.

- [ ] **Step 5: Реалізація приватності.**
```ts
export function redactLedger(characteristics: Characteristics, viewer: LedgerViewer): Characteristics {
  if (viewer.isDM || viewer.isOwner) return characteristics;
  const { downtime: _downtime, corruption: _corruption, ...rest } = characteristics;
  return "ledger" in rest ? { ...rest, ledger: [] } : rest;
}
```
  `preserveServerOwned`: ще й відкидає `incoming.corruption` і повертає `...(existing.corruption ? { corruption: existing.corruption } : {})`. `reconcileCharacteristics` (гілка ДМ): `const { downtime: _d, corruption: _c, ...rest } = incoming; return { ...rest, ...(stored.downtime ? { downtime: stored.downtime } : {}), ...(stored.corruption ? { corruption: stored.corruption } : {}) };`. `normalizeCharacterInput` create: `const { downtime: _downtime, corruption: _corruption, ...characteristics } = data.characteristics;`. `wfrpAbilitiesOf` змінює Task 2.

- [ ] **Step 6: Журнал і помилки.**
  - `CharacterLogKind.CORRUPTION: "corruption"`. Дані рядка (пише Task 5): `{ grantId, reason, points, total, threshold, mutation: boolean, summary }`, відкат — `{ grantId, undo: true }`.
  - `describeCharacterLog`: `case "corruption": return d.undo ? { key: "rest.log.corruptionUndo" } : { key: d.mutation === true ? "rest.log.corruptionMutation" : "rest.log.corruption", params: { points: num("points"), total: num("total"), threshold: num("threshold") } };`.
  - Тест у `describe-log-wfrp.test.ts`: `{ kind: "corruption", data: { points: 2, total: 7, threshold: 6, mutation: false } }` → `rest.log.corruption` з параметрами; `mutation: true` → `rest.log.corruptionMutation`; `{ undo: true }` → `rest.log.corruptionUndo`.
  - `messages/uk/rest.json`: `log.corruption` «☠ Порча +{points} ({total}/{threshold})», `log.corruptionMutation` «☠ Порча +{points} ({total}/{threshold}) — мутація», `log.corruptionUndo` «↩ Відкат порчі»; en: «☠ Corruption +{points} ({total}/{threshold})», «… — mutation», «↩ Corruption undone».
  - `api-errors.ts` три коди; `errors.json` uk: `corruptionUnsupported` «Порча недоступна в цій рульовій системі», `corruptionInBattle` «Герой в активному бою — нарахування порчі неможливе», `corruptionStale` «Нарахування не можна відкотити — порча змінилася після нього»; en — відповідні англійські.

Run: `pnpm test:related lib/utils/rules/systems/wfrp/characteristics/keys.ts lib/utils/rules/systems/wfrp/characteristics/schema.ts lib/utils/rules/systems/wfrp/advancement/privacy.ts lib/server/characters/operations/patch.ts lib/server/characters/core/system-fields.ts lib/utils/characters/resources/describe-log.ts lib/constants/api-errors.ts lib/schemas/units.ts` → PASS (у т.ч. `client-api-errors`, `label-keys-rest`, `parity`).

- [ ] **Step 7: Lint і коміт** — `pnpm exec eslint --fix <усі змінені й створені файли задачі>`; `git commit -m "feat(wfrp): corruption state, privacy and log kind"` + Co-Authored-By.

---

## Task 2: Модифікатори мутацій у `derive`, поріг, згортання для бою, аудит читачів (dispatch 2)

**Files:**
- Create: `lib/utils/rules/systems/wfrp/corruption/{modifiers,threshold,fold}.ts`, тести `corruption/__tests__/{modifiers,threshold,fold}.test.ts`
- Modify: `lib/utils/rules/systems/wfrp/characteristics/derive.ts`, `lib/utils/rules/systems/wfrp/characteristics/sheet-block.ts`, `lib/utils/rules/systems/types.ts:49-57` (`SheetWfrpBlock`), `lib/utils/rules/systems/wfrp/combat/participant.ts:40-48`, `components/systems/wfrp/AdvancementTab.tsx:78`, `components/systems/wfrp/CharacteristicsEditor.tsx:29`, `components/systems/wfrp/CharacteristicsGrid.tsx` (показ `mod`)
- Test: `characteristics/__tests__/{derive,sheet-block}.test.ts`, `combat/__tests__/participant.test.ts`, `components/systems/wfrp/__tests__/{CharacteristicsGrid,AdvancementTab}.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`CorruptionState`, `Mutation`, `Characteristics.corruption`).
- Produces:
```ts
// modifiers.ts (імпортує лише ../characteristics/constants і ./types)
export type CorruptionModifiers = { characteristics: Partial<Record<CharacteristicKey, number>>; move: number; maxWounds: number };
export const EMPTY_MODIFIERS: CorruptionModifiers;
export function modifiersOf(state?: CorruptionState): CorruptionModifiers; // сума ефектів усіх мутацій, нулі не записуються
// derive.ts
export const value = (c: Characteristics, key: CharacteristicKey) => Math.max(1, c.base[key] + c.advances[key] + (modifiersOf(c.corruption).characteristics[key] ?? 0));
export const moveOf = (c: Characteristics) => Math.max(1, c.move + modifiersOf(c.corruption).move);
export const walkYards = (c: Characteristics) => moveOf(c) * 2;
export const runYards = (c: Characteristics) => moveOf(c) * 4;
export const woundsMax = (c: Characteristics) => Math.max(1, bonus(c,"s") + 2*bonus(c,"t") + bonus(c,"wp") + c.extraWounds*bonus(c,"t") + modifiersOf(c.corruption).maxWounds);
// threshold.ts
export const corruptionThreshold = (c: Characteristics) => bonus(c, "t") + bonus(c, "wp");
// fold.ts
export function foldCorruption(c: Characteristics): Characteristics; // без ключа corruption; base/advances/move ефективні
// SheetWfrpBlock
characteristics: { key; base; advances; value; bonus; mod: number }[];
corruption: { points: number; threshold: number; mutations: Mutation[] };
```
  `moveOf`, `corruptionThreshold`, `modifiersOf` реекспортуються з `wfrp/characteristics/index.ts` / `wfrp/corruption/index.ts` (Task 4) для `components/systems/wfrp`.

- [ ] **Step 1: Тести.**
  - `modifiers.test.ts`: `undefined` → `EMPTY_MODIFIERS`; дві мутації з `t −5` і `t +10`, `move −1`, `maxWounds 2` → `{ characteristics: { t: 5 }, move: −1, maxWounds: 2 }`; взаємознищення `t +5`/`t −5` → ключа `t` немає.
  - `derive.test.ts` (база 30, advances 0): `value` з `ws −10` → 20; з `ws −30` при base 20 → 1 (мінімум); `bonus` рахується з ефективного; `moveOf` move 2 + `move −3` → 1, `walkYards` 2; `woundsMax` з `maxWounds −10` при формулі 9 → 1, з `+2` → 11; без `corruption` — значення як раніше (регресія).
  - `threshold.test.ts`: дефолт → 6; `t −10` → 5; `wp +10` → 7.
  - `fold.test.ts`: без `corruption` → той самий об'єкт за значенням без ключа; `base 100, adv 100, ws +30` → `value(fold) === 200`, `base ≤ 100`, `advances ≤ 100`; `base 5, adv 0, ws −30` → `value(fold) === 1`, `base 1`, `advances 0`; `base 40, adv 10, ag −5` → `base 35, advances 10`; `move 4, move −1` → `move 3`; для всіх кейсів `readCharacteristics({ characteristics: fold(c) })` дорівнює `fold(c)` (жодного скидання в дефолт).
  - `participant.test.ts`: `wfrpAbilitiesOf(c з corruption ws −10)` — `characteristics` без `corruption` і без `downtime`, `value(characteristics, "ws") === 20`, `wfrp.ag`/`sb`/`tb` з ефективних; `wfrpBaseStats({ characteristics: c з move −1 })` → `speed === 3*2*3`.
  - `sheet-block.test.ts`: блок з мутацією `ws −10`, `move −1`, `maxWounds 2` → `characteristics.ws = { base: 30, advances: 0, value: 20, mod: −10, … }`, `move.value 3`, `wounds.max` + 2, `corruption = { points, threshold, mutations }`; без `corruption` → `{ points: 0, threshold: 6, mutations: [] }`.
  - `CharacteristicsGrid.test.tsx`: `mod: −10` → показано значення 20 і позначку `−10` (через `signed` з `@/lib/utils/common/format`); `mod: 0` — без позначки. `AdvancementTab.test.tsx`: з мутацією `ws −10` поле значення ws = 20.
Run: `pnpm test:run lib/utils/rules/systems/wfrp/corruption lib/utils/rules/systems/wfrp/characteristics lib/utils/rules/systems/wfrp/combat/__tests__/participant.test.ts components/systems/wfrp/__tests__` → FAIL.

- [ ] **Step 2: Реалізація.** `derive.ts` імпортує `modifiersOf` з `../corruption/modifiers` (перевірити, що `pnpm exec eslint` не бачить `import/no-cycle`). `foldCorruption` у `fold.ts`:
```ts
export function foldCorruption(c: Characteristics): Characteristics {
  const { corruption, ...rest } = c;
  if (!corruption) return rest;
  const mods = modifiersOf(corruption);
  const base = { ...c.base }; const advances = { ...c.advances };
  for (const key of Object.keys(mods.characteristics) as CharacteristicKey[]) {
    const target = Math.min(200, value(c, key));
    base[key] = Math.min(100, Math.max(1, target - c.advances[key]));
    advances[key] = target - base[key];
  }
  return { ...rest, base, advances, move: Math.min(12, moveOf(c)) };
}
```
  `wfrpAbilitiesOf`: `const { downtime: _d, ...rest } = foldCorruption(characteristics); characteristics: { ...rest, ledger: [] }`; `wfrp` стати — з `characteristics` (ефективні через `value`/`bonus`). `sheet-block.ts`: `mod: mods.characteristics[key] ?? 0`, `move.value: moveOf(c)`, `corruption: { points: c.corruption?.points ?? 0, threshold: corruptionThreshold(c), mutations: c.corruption?.mutations ?? [] }`. `AdvancementTab.tsx:78` → `value(c, key)`; `CharacteristicsEditor.tsx:29` → `value(data, key)`; `CharacteristicsGrid` — `signed(mod)` поруч зі значенням (`text-hud-muted`, `aria-label` не потрібен — число видно). `encumbrance.ts` не змінювати (див. «Відповіді» п. 1).
Run Step 1 → PASS; `pnpm test:related lib/utils/rules/systems/wfrp/characteristics/derive.ts lib/utils/rules/systems/wfrp/combat/participant.ts lib/utils/rules/systems/wfrp/characteristics/sheet-block.ts` → PASS (бій, баланс, магія, психологія, простій).

- [ ] **Step 3: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): mutation modifiers through derive and battle fold"` + Co-Authored-By.

---

## Task 3: Слоти таблиць мутацій, редактор ефектів, дефолтні тексти (dispatch 3)

**Files:**
- Create: `messages/{uk,en}/wfrpCorruption.json` (поки лише `mutations.physical.1..6`, `mutations.mental.1..6`)
- Modify: `lib/utils/rules/tables-schema.ts`, `lib/utils/rules/systems/wfrp/tables/defaults.ts`, `lib/i18n/config.ts` (`NAMESPACES` += `"wfrpCorruption"`), `messages/{uk,en}/wfrpTables.json`, `components/rules/sections/TablesSection.tsx`, три OpenAPI-тести (`lib/server/content/__tests__/openapi.test.ts:65`, `openapi-4f2.test.ts:21`, `openapi-4f4.test.ts:24`)
- Test: `lib/utils/rules/__tests__/tables-schema.test.ts`, `lib/utils/rules/systems/wfrp/tables/__tests__/resolve.test.ts`, `components/rules/sections/__tests__/TablesSection{,.translated}.test.tsx`, `lib/utils/rules/__tests__/player-hidden*.test.ts` (`grep -l stripPlayerHiddenRules lib/utils/rules/__tests__/*`)

**Interfaces:**
- Consumes: Task 1 — `CHARACTERISTIC_KEYS`/`CharacteristicKey` з `@/lib/constants/wfrp-characteristics`, `MUTATION_EFFECT_LIMITS`/`MUTATION_EFFECTS_MAX` з `@/lib/constants/wfrp-mutations` (і в `tables-schema.ts`, і в `TablesSection.tsx`).
- Produces:
```ts
export const TABLE_SLOTS = [..., "downtimeEvent", "mutationPhysical", "mutationMental"] as const;
export const MUTATION_SLOTS = ["mutationPhysical", "mutationMental"] as const satisfies readonly TableSlot[];
export type TableEffect =
  | { type: "damage"; amount: number } | { type: "wounds"; amount: number }
  | { type: "condition"; key: WfrpConditionKey; levels: number } | { type: "marker"; key: (typeof MARKER_KEYS)[number] }
  | { type: "characteristic"; key: CharacteristicKey; amount: number } | { type: "move"; amount: number } | { type: "maxWounds"; amount: number };
SLOT_EFFECTS.mutationPhysical = SLOT_EFFECTS.mutationMental = ["characteristic", "move", "maxWounds"];
DEFAULT_TABLES.mutationPhysical / mutationMental — по 6 рядків
```

- [ ] **Step 1: Тести.**
  - `tables-schema.test.ts`: `TablesRulesSchema.safeParse({ mutationPhysical: [{ max: 100, effects: [{ type: "characteristic", key: "ag", amount: -5 }, { type: "move", amount: -1 }, { type: "maxWounds", amount: 2 }] }] })` → success; `amount: 0`, `31`, `move 4`, `maxWounds −11`, `key: "zz"`, 4 ефекти → fail; `{ type: "wounds", amount: 1 }` у `mutationMental` → fail; `{ type: "characteristic", … }` у `critHead`/`downtimeEvent` → fail; `null` → success (дефолт).
  - `resolve.test.ts`: `DEFAULT_TABLES.mutationPhysical`/`mutationMental` — по 6 рядків, останній `max: 100`, `max` строго зростає, кожен рядок проходить схему слота (`TablesRulesSchema.parse({ [slot]: DEFAULT_TABLES[slot].map(({ textKey: _k, ...r }) => r) })`), `textKey` = `wfrpCorruption.mutations.<kind>.<n>`; `rollSlot({ tables: {} }, "mutationMental", rng, 40)` → рядок 3.
  - `player-hidden` тест: `stripPlayerHiddenRules` прибирає `tables` разом із `mutationPhysical` (регресія).
  - `mergeRules` (тест поруч із наявними кейсами `tables`, `grep -ln "mergeRules" lib/utils/rules/__tests__/*`): патч `{ tables: { mutationMental: rows } }` зберігає наявний `critHead`; `{ tables: { mutationMental: null } }` повертає дефолт.
  - `TablesSection.test.tsx`: у селекторі слота є `mutationPhysical`/`mutationMental`; «Налаштувати» на `mutationPhysical` → рядки з ефектами; редактор ефекту типу `characteristic` має вибір характеристики (10 опцій з `gameTerms.characteristics.*.short`) і число з межами −30..30; «Додати ефект» додає `characteristic` (перший тип слота); `DefaultRows` друкує ефект як «Ag −5» (`signed`).
  - `TablesSection.translated.test.tsx`: дефолтні рядки мутацій перекладено (немає сирих `wfrpCorruption.` у тексті).
Run: `pnpm test:run lib/utils/rules/__tests__/tables-schema.test.ts lib/utils/rules/systems/wfrp/tables components/rules/sections` → FAIL.

- [ ] **Step 2: Схема й дефолти.** У `tables-schema.ts`:
```ts
const signed = (limit: number) => z.number().int().min(-limit).max(limit).refine((n) => n !== 0);
const MutationEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("characteristic"), key: z.enum(CHARACTERISTIC_KEYS), amount: signed(MUTATION_EFFECT_LIMITS.characteristic) }),
  z.strictObject({ type: z.literal("move"), amount: signed(MUTATION_EFFECT_LIMITS.move) }),
  z.strictObject({ type: z.literal("maxWounds"), amount: signed(MUTATION_EFFECT_LIMITS.maxWounds) }),
]);
const MutationRowSchema = z.strictObject({ max: RowSchema.shape.max, text: RowSchema.shape.text, effects: z.array(MutationEffectSchema).max(MUTATION_EFFECTS_MAX) });
const rowSchemaOf = (slot: TableSlot) => ((MUTATION_SLOTS as readonly string[]).includes(slot) ? MutationRowSchema : RowSchema);
```
  `slotRows(slot)` будується на `rowSchemaOf(slot)`; перевірка `SLOT_EFFECTS` лишається. `DEFAULT_TABLES` під `// verify against 5e book`, `max: 16, 33, 50, 66, 83, 100`:
  - physical: 1 `[ag −5]`, 2 `[fel −10]`, 3 `[move −1]`, 4 `[t +5, ag −5]`, 5 `[maxWounds +2, fel −5]`, 6 `[s +5, move −1]`;
  - mental: 1 `[wp −5]`, 2 `[int −5]`, 3 `[fel −5]`, 4 `[i −10]`, 5 `[wp +5, fel −10]`, 6 `[int −5, wp −5]`.
  `messages/uk/wfrpCorruption.json` `mutations.physical.1..6`/`mental.1..6` — власні короткі grimdark-описи ≤ 120 символів, що відповідають ефектам (скрючена кінцівка, спотворене обличчя, копита, луската шкіра, роздуте тіло, зайва м'язова маса / шепіт у голові, провали пам'яті, параноя, нічні жахіття, фанатизм, розщеплення думок); en — переклад. `NAMESPACES` += `"wfrpCorruption"`. `wfrpTables.json`: `slots.mutationPhysical` uk «Мутації: тіло» / en «Mutations: physical», `slots.mutationMental` «Мутації: розум» / «Mutations: mental», `effect.characteristic` «Характеристика» / «Characteristic», `effect.move` «Рух» / «Move», `effect.maxWounds` «Макс. Wounds» / «Max Wounds», `characteristic` «Характеристика» / «Characteristic».

- [ ] **Step 3: Редактор.** `TablesSection.tsx`: `newEffect` для `characteristic` → `{ type, key: CHARACTERISTIC_KEYS[0], amount: -5 }`, `move`/`maxWounds` → `{ type, amount: -1 }`; `EffectFields` — для `characteristic` `SelectField` (`CHARACTERISTIC_KEYS`, мітки `tt(\`gameTerms.characteristics.${k}.short\`)`) + `BoundedNumberInput min={-limit} max={limit}`; для `move`/`maxWounds` — лише число зі знаком (`MUTATION_EFFECT_LIMITS`). `DefaultRows.effectText`: `characteristic` → `${tt(short)} ${signed(amount)}`, `move`/`maxWounds` → `${t(\`effect.${type}\`)} ${signed(amount)}`.
Run Step 1 → PASS; `pnpm test:run lib/i18n/__tests__/parity.test.ts lib/i18n/__tests__/scope-size.test.ts` → PASS (DM ≤ 111 KB; якщо перевищено — зупинитися й повідомити контролеру, ліміт не піднімати).

- [ ] **Step 4: Бюджет OpenAPI.** `pnpm test:run lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/openapi-4f4.test.ts`. Якщо > 193_000 — виміряти (тимчасовий `console.info(json.length)`, прибрати) і підняти в усіх трьох до `ceil((виміряне + 1000) / 1000) × 1000` з коментарем `… 5h-3 mutation slots ~<N> KB (total ~<виміряне/1000> KB)`. Понад 196_000 — зупинитися й повідомити контролеру.

- [ ] **Step 5: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): mutation table slots and signed effect editor"` + Co-Authored-By.

---

## Task 4: Чистий рушій нарахування й відкату, хук системи (dispatch 4)

**Files:**
- Create: `lib/utils/rules/systems/wfrp/corruption/{plan-grant,undo,index}.ts`, тести `corruption/__tests__/{plan-grant,undo}.test.ts`
- Modify: `lib/utils/rules/systems/types.ts` (`RuleSystemCorruption`, `RuleSystemDefinition.corruption?`), `lib/utils/rules/systems/wfrp/index.ts` (`corruption: WFRP_CORRUPTION`), `lib/utils/rules/systems/index.ts` (тип `RuleSystemCorruption`, реекспорт `corruptionThreshold`, `modifiersOf`)
- Test: тест реєстру (`grep -l "RULE_SYSTEM_REGISTRY" lib/utils/rules/systems/__tests__/*`)

**Interfaces:**
- Consumes: Task 1 (типи, константи), Task 2 (`corruptionThreshold`, `skillTarget` з ефективними значеннями), Task 3 (`MUTATION_SLOTS`, `DEFAULT_TABLES`), `rollSlot`/`rowText` (`wfrp/tables/resolve.ts`), `resolvePercentileTest`, `DIFFICULTY_SL`, `rollDie` (`@/lib/utils/common/dice`).
- Produces:
```ts
// plan-grant.ts
export type GrantPresets = { test?: number; type?: number; row?: number };
export type GrantInput = { characteristics: Characteristics; rules: Pick<Ruleset, "tables">; points: number; reason: string; rng: Rng; id: string; at: string; presets?: GrantPresets };
export function planGrant(input: GrantInput): { state: CorruptionState; summary: GrantSummary };
// undo.ts
export function planCorruptionUndo(state: CorruptionState | undefined, grantId: string): { ok: true; state: CorruptionState } | { ok: false; error: "CORRUPTION_STALE" };
// index.ts
export const WFRP_CORRUPTION = { planGrant, planUndo: planCorruptionUndo, grantMax: GRANT_MAX };
// types.ts
export interface RuleSystemCorruption { planGrant: typeof planGrant; planUndo: typeof planCorruptionUndo; grantMax: number }
```

- [ ] **Step 1: Тести** (`rng = () => 0.5`, кидки через `presets`; дефолтні характеристики 30 → поріг 6, Endurance basic = 30):
  - `plan-grant.test.ts`:
    - `p0 = 0`, `points 5` → `total 5`, без `test`, без мутації; `state.points 5`; `state.last = { id, at, reason, before: { points: 0 }, after: { points: 5 }, summary }`.
    - Рівно на порозі: `p0 = 1`, `points 5` → `total 6`, без `test`.
    - `p0 = 6`, `points 1` → тест; `presets.test 25` (успіх) → `summary.test.outcome` success, мутації немає, `after.mutationId` відсутній.
    - Провал `presets { test: 90, type: 50, row: 1 }` → `mutation.kind "physical"`, `typeRoll 50`, `roll 1`, `text = dynamicTextRef("wfrpCorruption.mutations.physical.1")`, `effects` = копія рядка 1; `state.mutations.at(-1) = { id, at, kind, roll, text, effects }`; `after.mutationId === id`. `type: 51` → `mental`.
    - Кастомна таблиця `{ tables: { mutationMental: [{ max: 100, text: "Whispers", effects: [{ type: "characteristic", key: "wp", amount: -5 }] }] } }`, `type 80` → `text: "Whispers"`, ефект скопійовано (зміна вхідного масиву після виклику не змінює стан).
    - Повторне нарахування після мутації (`p0 = 7`, є мутація) знову тестує.
    - Модифікований поріг: стан з мутацією `t −10` (поріг 5), `p0 = 4`, `points 2` → `total 6 > 5` → тест; тест рахується по ефективній T (Endurance 20).
    - Кап: 20 мутацій, провал → `summary.capped === true`, мутацій 20, `points` додано, `summary.mutation` відсутній.
    - `p0 = 995`, `points 10` → `state.points 999`, `summary.total 999`, `pointsCapped: true`.
    - Невалідна секція `mutationPhysical` у сирих правилах (`parseRules`) → дефолтний рядок.
  - `undo.test.ts`: успіх → `{ points: before.points, mutations: без mutationId }`, `last` відсутній; без мутації → мутації не чіпаються; `state` `undefined` / без `last` / інший `grantId` / `points ≠ after.points` / `mutations.at(-1)?.id ≠ mutationId` → `{ ok: false, error: "CORRUPTION_STALE" }`; повторний undo результату → STALE.
  - Реєстр: `RULE_SYSTEM_REGISTRY.wfrp.corruption?.grantMax === 10`, `homm.corruption === undefined`, `dnd5e.corruption === undefined`.
Run: `pnpm test:run lib/utils/rules/systems/wfrp/corruption` → FAIL.

- [ ] **Step 2: Реалізація.**
```ts
export function planGrant({ characteristics: c, rules, points, reason, rng, id, at, presets = {} }: GrantInput) {
  const prev = c.corruption ?? EMPTY_CORRUPTION;
  const raw = prev.points + points;
  const total = Math.min(POINTS_MAX, raw);
  const threshold = corruptionThreshold(c);
  const summary: GrantSummary = { points, total, threshold, ...(raw > POINTS_MAX && { pointsCapped: true as const }) };
  let mutation: Mutation | undefined;
  if (total > threshold) {
    const target = skillTarget(c, CORRUPTION_TEST_SKILL)?.target ?? value(c, "t");
    const r = resolvePercentileTest({ target, slModifier: DIFFICULTY_SL[CORRUPTION_TEST_DIFFICULTY], doubles: false, mode: "normal", rng, presetRoll: presets.test });
    summary.test = { roll: r.roll, target: r.target, sl: r.sl, outcome: r.outcome };
    const passed = r.outcome === "success" || r.outcome === "critical";
    if (!passed && prev.mutations.length >= MUTATIONS_MAX) summary.capped = true;
    else if (!passed) {
      const typeRoll = presets.type ?? rollDie(100, rng);
      const kind: MutationKind = typeRoll <= PHYSICAL_MAX_ROLL ? "physical" : "mental";
      const { row, roll } = rollSlot(rules, kind === "physical" ? "mutationPhysical" : "mutationMental", rng, presets.row);
      const effects = row.effects.filter(isMutationEffect).map((e) => ({ ...e }));
      mutation = { id, at, kind, roll, text: rowText(row), effects };
      summary.mutation = { kind, typeRoll, roll, text: mutation.text, effects };
    }
  }
  const state: CorruptionState = { points: total, mutations: mutation ? [...prev.mutations, mutation] : prev.mutations, last: { id, at, reason, before: { points: prev.points }, after: { points: total, ...(mutation && { mutationId: id }) }, summary } };
  return { state, summary };
}
```
  `isMutationEffect` — type guard у `modifiers.ts` (`type` ∈ `characteristic|move|maxWounds`). Хук: `RuleSystemCorruption` у `types.ts`, `WFRP_SYSTEM.corruption = WFRP_CORRUPTION`, тип і `corruptionThreshold`/`modifiersOf`/`moveOf` реекспорт у `systems/index.ts` (для UI).
Run Step 1 → PASS; `pnpm test:related lib/utils/rules/systems/wfrp/index.ts lib/utils/rules/systems/types.ts` → PASS.

- [ ] **Step 3: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): corruption grant and undo engine"` + Co-Authored-By.

---

## Task 5: Сервер, маршрути, асистент/MCP, клієнтські хуки (dispatch 5)

**Files:**
- Create: `lib/schemas/corruption.ts`, `lib/server/characters/core/corruption-handler.ts`, `lib/server/characters/operations/corruption.ts`, `lib/server/characters/operations/corruption-undo.ts`, `app/api/campaigns/[id]/characters/[characterId]/corruption/route.ts`, `app/api/campaigns/[id]/characters/[characterId]/corruption/undo/route.ts`, `lib/api/corruption.ts`, `types/corruption.ts`, `lib/hooks/characters/useCorruption.ts`, `lib/server/characters/__tests__/wfrp-corruption-e2e.test.ts`
- Modify: `lib/server/characters/operations/registry.ts`, `lib/server/assistant/actions/character-coverage.ts`, `lib/server/assistant/__tests__/helpers/coverage.ts` (`ASSISTANT_ROUTE_COVERAGE`), `lib/server/characters/progression-service.ts:17,41` (`PROGRESSION_INPUTS`), `lib/hooks/characters/index.ts`
- Test: `wfrp-corruption-e2e.test.ts`, `lib/server/assistant/__tests__/{coverage,character-coverage}.test.ts`, `app/api/__tests__/openapi-route.test.ts`, три OpenAPI-тести

**Interfaces:**
- Consumes: Task 1 (типи, `CharacterLogKind.CORRUPTION`, коди), Task 4 (`ruleSystemOf(rules).corruption`), `lockCharacters` (`lib/server/characters/lock.ts`), `assertNotInActiveBattle` (`lib/server/characters/battle-lock.ts`), `characteristicsJson` (`core/system-fields.ts`), `writeCharacterLog` (`lib/server/characters/log.ts`), `requireCharacterAccess`/`gateOptions(ctx, true)`.
- Produces:
```ts
// lib/schemas/corruption.ts
export const corruptionGrantSchema = z.object({ points: z.number().int().min(1).max(CORRUPTION_GRANT_MAX), reason: z.string().trim().min(1).max(80) });
export const corruptionUndoSchema = z.object({ grantId: z.string().min(1).max(64) });
export type CorruptionGrantInput = z.infer<typeof corruptionGrantSchema>; export type CorruptionUndoInput = z.infer<typeof corruptionUndoSchema>;
// types/corruption.ts
export type CorruptionGrantBody = { points: number; reason: string };
export type CorruptionUndoBody = { grantId: string };
export type CorruptionGrantResult = { grantId: string; corruption: CorruptionState; summary: GrantSummary };
export type CorruptionUndoResult = { corruption: CorruptionState };
// core/corruption-handler.ts
export async function grantCorruption(gate: CharacterGate, input: CorruptionGrantInput): Promise<CorruptionGrantResult>;
export async function undoCorruption(gate: CharacterGate, input: CorruptionUndoInput): Promise<CorruptionUndoResult>;
// operations: corruptionGrantOperation ("corruption.grant", POST), corruptionUndoOperation ("corruption.undo", POST)
// lib/api/corruption.ts
export const postCorruptionGrant = (campaignId: string, characterId: string, body: CorruptionGrantBody) => campaignPost<CorruptionGrantResult>(campaignId, `/characters/${characterId}/corruption`, body);
export const postCorruptionUndo = (campaignId: string, characterId: string, body: CorruptionUndoBody) => campaignPost<CorruptionUndoResult>(campaignId, `/characters/${characterId}/corruption/undo`, body);
// lib/hooks/characters/useCorruption.ts (у барелі)
export function useGrantCorruption(campaignId: string, characterId: string);
export function useUndoCorruption(campaignId: string, characterId: string);
```

- [ ] **Step 1: E2E-тести обробників** (`wfrp-corruption-e2e.test.ts`, моки за зразком `wfrp-downtime-e2e.test.ts`: `vi.hoisted` рядки героїв, `prisma.$transaction(fn) → fn(h)`, `$queryRaw` для `lockCharacters`, `battleParticipant.findFirst` для бою, `character.findUnique/findMany/update`, `characterLog.createMany`; rng — `vi.spyOn(Math, "random").mockReturnValueOnce(...)` у порядку: тест, тип, рядок). Механіку перевіряти через `ruleSystemOf(rules)`: `progression.maxHp`, `characteristics.sheetBlock`, `combat.participantFields`, `combat.baseStats`. Кейси:
  - Основний сценарій (критерій успіху спеки): ДМ `grant { points: 5, reason: "Warpstone" }` → 200, без `test`, `corruption.points 5`, журнал `CORRUPTION` з `mutation: false` → `grant { points: 2 }` з провалом (кидок 96, тип 20, рядок 3 → `move −1`) → `summary.mutation.kind "physical"`, у рядку `characteristics.corruption.mutations[0].id === grantId`; через систему: `baseStats(row).speed` зменшилось, `sheetBlock(...).move.value === 3`; інший провал з рядком 1 (`ag −5`) → `participantFields(row).characteristics` без `corruption`, `value` ag 25 через `sheetBlock`; рядок 5 (`maxWounds +2`) → `progression.maxHp(...).total` +2 → `undo { grantId: останній }` → 200, мутації й ефекту немає, журнал `{ undo: true }`.
  - **Review Focus 1:** сума рівно 6 → без тесту; 7 → тест; після мутації `t −10` (кастомна таблиця в `campaign.rules.tables.mutationPhysical`) поріг у `summary.threshold === 5`.
  - **Review Focus 3:** другий undo того ж `grantId` → 409 `CORRUPTION_STALE`; grant A, grant B, undo A → STALE; пряма правка `characteristics.corruption.points` у моку → STALE; ДМ PATCH листа з `corruption: { points: 0, mutations: [] }` між grant і undo → збережене не змінилось, undo → 200. У всіх STALE-кейсах `character.update` і `characterLog.createMany` не викликані.
  - **Review Focus 4:** після grant з мутацією викликати `advanceOperation` (як у `wfrp-careers-e2e.test.ts`) → записані `characteristics.corruption` ідентичні; `downtime.set` після grant теж зберігає `corruption`.
  - **Review Focus 5:** гравець-власник на grant і undo → 403 `FORBIDDEN`; чужий гравець → 403; homm і dnd5e → 409 `CORRUPTION_UNSUPPORTED` на обидва маршрути; герой в активному бою → 409 `CORRUPTION_IN_BATTLE`, нічого не записано; неактивний статус → 400 `REST_CHARACTERS_INVALID`.
  - Тіло: `points` 0, 11, 1.5, `reason` "" / "   " / 81 символ → 400, без запису.
Run: `pnpm test:run lib/server/characters/__tests__/wfrp-corruption-e2e.test.ts` → FAIL.

- [ ] **Step 2: Схеми, обробник, операції, маршрути.**
  - `corruptionOf(access)`: `ruleSystemOf(access.campaign.rules).corruption` або `ContentError(CORRUPTION_UNSUPPORTED, 409)`.
  - `grantCorruption({ access, character }, input)`: `corruptionOf` → `character.status !== ACTIVE` → 400 `REST_CHARACTERS_INVALID` → `assertNotInActiveBattle(campaignId, [character.id], API_ERRORS.CORRUPTION_IN_BATTLE)` → `$transaction`: `lockCharacters(tx, [id])` (немає → 404 `CHARACTER_NOT_FOUND`) → `grantId = randomUUID()` → `planGrant({ characteristics: locked.characteristics, rules: access.campaign.rules, points, reason, rng: Math.random, id: grantId, at: new Date().toISOString() })` → `tx.character.update({ data: { characteristics: characteristicsJson({ ...locked.characteristics, corruption: state }) } })` → `writeCharacterLog(tx, [{ campaignId, characterId, actorUserId: access.userId, kind: CharacterLogKind.CORRUPTION, data: { grantId, reason, points, total, threshold, mutation: !!summary.mutation, summary } }])` → `{ grantId, corruption: state, summary }`.
  - `undoCorruption`: ті самі перевірки до транзакції; у транзакції `planUndo(locked.characteristics.corruption, input.grantId)`; `!ok` → `ContentError(CORRUPTION_STALE, 409)`; запис `corruption` і журналу `{ grantId, undo: true }`.
  - Операції: `defineCharacterOperation({ name: "corruption.grant", action: "grant corruption", schema: corruptionGrantSchema, gate: (ctx) => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)), run: grantCorruption })`, `export const POST = characterRoute(...)`; так само `corruption.undo` (`action: "undo corruption"`). Маршрути — лише реекспорт: `export { POST } from "@/lib/server/characters/operations/corruption";` і `…/corruption-undo`.
  - `CHARACTER_OPERATIONS` += `"corruption.grant"`, `"corruption.undo"`; `CHARACTER_ACTION_COVERAGE` += `["POST", \`${hero}/corruption\`, "corruption.grant", "wfrp-corruption-e2e"]`, `["POST", \`${hero}/corruption/undo\`, "corruption.undo", "wfrp-corruption-e2e"]`; `PROGRESSION_INPUTS` += `"corruption.grant": withId(corruptionGrantSchema)`, `"corruption.undo": withId(corruptionUndoSchema)`; `ASSISTANT_ROUTE_COVERAGE` += `{ route: 'campaigns/[id]/characters/[characterId]/corruption', methods: ['POST'], task: 9, adapter: 'characters', state: "active" }` і такий самий для `…/corruption/undo`.
Run: `pnpm test:run lib/server/characters/__tests__/wfrp-corruption-e2e.test.ts lib/server/assistant/__tests__/coverage.test.ts lib/server/assistant/__tests__/character-coverage.test.ts app/api/__tests__/openapi-route.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/openapi-4f4.test.ts` → PASS. Бюджет OpenAPI — правило Task 3 Step 4 (коментар `5h-3 corruption actions ~<N> KB`; понад 197_000 — зупинитися).

- [ ] **Step 3: Клієнт.** `types/corruption.ts`, `lib/api/corruption.ts` (сигнатури вище). Хуки:
```ts
const corruptionKeys = (c: string, id: string) => [characterKeys.detail(c, id), characterKeys.sheet(c, id), characterKeys.log(c, id), ...characterWriteKeys(c)];
export function useGrantCorruption(campaignId: string, characterId: string) {
  const t = useTranslations("wfrpCorruption.errors");
  return useCrudMutation({ mutationFn: (body: CorruptionGrantBody) => postCorruptionGrant(campaignId, characterId, body), invalidateKeys: corruptionKeys(campaignId, characterId), errorText: t("grantFailed") });
}
// useUndoCorruption — те саме з postCorruptionUndo і t("undoFailed")
```
  Експорт у `lib/hooks/characters/index.ts`. Перевірка — `pnpm test:related lib/hooks/characters/useCorruption.ts lib/api/corruption.ts` і `pnpm exec eslint` на файлах.

- [ ] **Step 4: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): corruption grant and undo routes"` + Co-Authored-By.

---

## Task 6: UI — блок порчі, діалог нарахування, чип, підвантаження namespace (dispatch 6)

**Files:**
- Create: `components/systems/wfrp/corruption/{CorruptionBlock,GrantCorruptionDialog,GrantSummaryView,MutationEffects}.tsx`, тести `components/systems/wfrp/corruption/__tests__/{CorruptionBlock,GrantCorruptionDialog}.test.tsx`
- Modify: `components/systems/wfrp/StatsTab.tsx` (блок під характеристиками в секції `top`), `components/systems/wfrp/HeroStats.tsx` (чип), `app/campaigns/[id]/character/page.tsx:44`, `app/campaigns/[id]/dm/characters/[characterId]/page.tsx:34`, `app/campaigns/[id]/dm/rules/page.tsx:43`, `messages/{uk,en}/wfrpCorruption.json` (UI-ключі), `lib/i18n/__tests__/scope-size.test.ts`
- Test: `app/campaigns/[id]/character/__tests__/page.test.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/__tests__/page.test.tsx`, `app/campaigns/[id]/dm/rules/__tests__/page.test.tsx` (якщо є; інакше пропустити), `components/systems/wfrp/__tests__/HeroStats*.test.tsx` (`grep -l HeroStats components/systems/wfrp/__tests__/*`; немає — новий `HeroStats.test.tsx`)

**Interfaces:**
- Consumes: Task 2 (`sheet.wfrp.corruption`, `mod`), Task 4 (`RULE_SYSTEM_REGISTRY.wfrp.corruption?.grantMax`), Task 5 (`useGrantCorruption`, `useUndoCorruption`, `CorruptionGrantResult`), `formatText` (`@/lib/i18n/text-ref`), `signed`.
- Produces: компоненти (лише wfrp-UI, слотів `SystemUi` не додаємо — блок живе всередині wfrp `StatsTab`/`HeroStats`).
- Ключі `wfrpCorruption` (uk/en): `title`, `points` («Пункти порчі: {points} / поріг {threshold}»), `overThreshold`, `noMutations`, `mutationsTitle`, `kinds.{physical,mental}`, `effects.{characteristic,move,maxWounds}` («{name} {amount}» / «Рух {amount}» / «Макс. Wounds {amount}»), `chip.{label,short}`, `grant.{button,title,points,pointsHint,reason,submit,result,undo,undoConfirm,undone}`, `summary.{noTest,test,passed,failed,mutation,typeRoll,capped,pointsCapped}`, `errors.{grantFailed,undoFailed}`, `mutations.*` (Task 3).

- [ ] **Step 1: Тести** (`// @vitest-environment happy-dom`; провайдер i18n — наявні хелпери (`grep -l "renderWithIntl\|IntlTestProvider" lib/i18n/test*`); `useProfile` і хуки мокаються, як у `components/systems/wfrp/downtime/__tests__/DowntimeTab.test.tsx`):
  - `CorruptionBlock.test.tsx`: власник бачить «Пункти порчі: 3 / поріг 6», без кнопки нарахування; при `points 7 > 6` — позначка `overThreshold`; мутація з `text: { message: "wfrpCorruption.mutations.physical.3" }` показує перекладений текст і «Рух −1»; мутація з рядком `"Whispers"` і `characteristic wp −5` → «Whispers», «СВ −5» (`gameTerms.characteristics.wp.short`); ДМ бачить кнопку `grant.button`; без мутацій — `noMutations`; `sheet.wfrp` відсутній → нічого.
  - `GrantCorruptionDialog.test.tsx`: submit заблокований при `points` 0/11/порожньому `reason`; submit → `useGrantCorruption().mutateOk({ points: 2, reason: "Warpstone" })`; відповідь з `summary` без тесту → `summary.noTest`; з тестом-провалом і мутацією → кидок/ціль/SL, вид, текст і ефекти; `capped` → `summary.capped`; «Відкотити» → `useConfirm` → `useUndoCorruption().mutateOk({ grantId })`, після успіху — `grant.undone`.
  - `HeroStats` тест: чип порчі `3/6` для wfrp-блоку.
  - Тести сторінок: для wfrp `ExtendLocaleScope` отримує `["wfrpDowntime", "wfrpCorruption"]` (сторінки персонажа) і `["battleWfrp", "wfrpDowntime", "wfrpCorruption"]` (ДМ-правила); homm — без обгортки.
Run: `pnpm test:run components/systems/wfrp "app/campaigns/[id]/character" "app/campaigns/[id]/dm/characters/[characterId]"` → FAIL.

- [ ] **Step 2: Компоненти.**
  - `MutationEffects({ effects })`: список чипів; `characteristic` → `t("effects.characteristic", { name: tg(\`characteristics.${key}.short\`), amount: signed(amount) })`, інші — `t(\`effects.${type}\`, { amount: signed(amount) })`.
  - `CorruptionBlock`: `useProfile()` (`sheet`, `campaignId`, `characterId`); `const c = sheet.wfrp?.corruption; if (!c) return null;` `HudSection title={t("title")}`: рядок пунктів/порогу (`overThreshold` при `points > threshold`), список мутацій (бейдж `kinds.*`, `formatText(useTranslations(), m.text)`, `MutationEffects`), для `sheet.viewer.isDM` — `GrantCorruptionDialog`.
  - `GrantCorruptionDialog({ campaignId, characterId })`: `Button` → `Dialog` (`@/components/ui`): `points` (`Input type="number"` 1..`RULE_SYSTEM_REGISTRY.wfrp.corruption?.grantMax`), `reason` (≤ 80), submit `mutateOk`; після відповіді — `GrantSummaryView({ summary })` і кнопка «Відкотити» (`useConfirm`, як `DowntimePeriodPanel`).
  - `GrantSummaryView`: `total/threshold`, `pointsCapped`; `test` → `t("summary.test", { roll, target, sl })` + `passed|failed`; `mutation` → вид, `typeRoll`, текст, `MutationEffects`; `capped`.
  - `StatsTab` (`section === "top"`): після `HudSection` характеристик — `<CorruptionBlock />` (фрагмент). `HeroStats`: шостий `HudStatChip` з `useTranslations("wfrpCorruption.chip")`, `value={\`${block.corruption.points}/${block.corruption.threshold}\`}`.
- [ ] **Step 3: Namespace.** `character/page.tsx` і `dm/characters/[characterId]/page.tsx`: `namespaces={["wfrpDowntime", "wfrpCorruption"]}`; `dm/rules/page.tsx`: `namespaces={["battleWfrp", "wfrpDowntime", "wfrpCorruption"]}`. `scope-size.test.ts`: `const WFRP_CORRUPTION_PAGE_LIMIT_KB = 2;` з коментарем `// loaded per page via ExtendLocaleScope (character pages, DM character, DM rules); measured uk gzip <N> KB` і рядок `{ name: "wfrpCorruption page extra", namespaces: ["wfrpCorruption"], limit: WFRP_CORRUPTION_PAGE_LIMIT_KB }`. Якщо виміряне ≥ 1.8 KB — скоротити тексти, ліміт не піднімати.
Run: Step 1 → PASS; `pnpm test:run lib/i18n/__tests__/scope-size.test.ts lib/i18n/__tests__/parity.test.ts`; `pnpm test:related components/systems/wfrp/StatsTab.tsx components/systems/wfrp/HeroStats.tsx` → PASS.

- [ ] **Step 4: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): corruption block, grant dialog and sheet chip"` + Co-Authored-By.

---

## Task 7: Ключі, what's new, довідка, docs (dispatch 7)

**Files:**
- Modify: `lib/i18n/__tests__/label-keys-rule-systems.test.ts`, `lib/onboarding/whats-new.ts`, `messages/{uk,en}/whatsNew.json`, `lib/onboarding/help/dm.ts:100-112`, `messages/{uk,en}/help.json` (`dm-rule-systems.sections.s8`), `docs/architecture/rule-systems.md`, `docs/STATUS.md`
- Test: ті самі + `lib/i18n/__tests__/{parity,untranslated,messages}.test.ts`, тести онбордингу (`grep -rl "WHATS_NEW\b" lib/onboarding/__tests__`)

**Interfaces:** Consumes усе попереднє; Produces —.

- [ ] **Step 1: Ключі.**
```ts
expectLabelKeys("wfrpCorruption", "kinds", ["physical", "mental"]);
expectLabelKeys("wfrpCorruption", "effects", ["characteristic", "move", "maxWounds"]);
expectLabelKeys("wfrpCorruption", "mutations.physical", DEFAULT_TABLES.mutationPhysical.map((_, i) => String(i + 1)));
expectLabelKeys("wfrpCorruption", "mutations.mental", DEFAULT_TABLES.mutationMental.map((_, i) => String(i + 1)));
expectLabelKeys("wfrpTables", "effect", ["damage", "wounds", "condition", "marker", "characteristic", "move", "maxWounds"]);
```
  (`wfrpTables.slots` вже перевіряється через `TABLE_SLOTS`.)
- [ ] **Step 2: What's new і довідка.** `whats-new.ts` першим рядком `{ id: "2026-11-09-wfrp-corruption", date: "2026-11-09", audience: "all" }`; `whatsNew.json` uk: `title` «Grim d100: порча й мутації», `body` «Майстер нараховує герою пункти порчі на вкладці «Бій» аркуша. Коли сума перевищує поріг (бонус Витривалості + бонус Сили волі), герой проходить тест Endurance; провал додає постійну мутацію тіла чи розуму, що змінює характеристики, Рух або Wounds. Пункти, поріг і мутації видно на аркуші; останнє нарахування майстер може відкотити.»; en — переклад. `help/dm.ts` — дев'ята секція `{ blocks: [{ kind: "p" }, { kind: "p" }] }`; `help.json` `s8` uk: `heading` «Порча й мутації», `b0` — нарахування (1–10 пунктів з причиною, поріг TB + WPB, тест лише понад поріг, рівно на порозі — без тесту, кожне наступне нарахування понад поріг тестує знову, до 20 мутацій), `b1` — таблиці «Мутації: тіло/розум» у правилах (секція таблиць, ефекти: характеристика, Рух, макс. Wounds зі знаком), мутації діють на аркуші й у бою, відкат лише останнього нарахування, недоступно в активному бою; en — переклад. Run: `pnpm test:related lib/onboarding/whats-new.ts lib/onboarding/help/dm.ts` і `pnpm test:run lib/i18n/__tests__/parity.test.ts lib/i18n/__tests__/untranslated.test.ts lib/i18n/__tests__/label-keys-rule-systems.test.ts` → PASS.
- [ ] **Step 3: Docs.** `rule-systems.md`: рядок у «Реєстр і хуки» — `corruption` | `RuleSystemCorruption`: `planGrant`, `planUndo`, `grantMax`; `undefined` у d20 | `corruption-handler.ts`, операції `corruption.grant`/`corruption.undo`; рядок у «Що де лежить» — `wfrp/corruption/`; розділ «Межі 5h-3» (після «Межі 5h-4»): стан у `characteristics.corruption` без міграцій; модифікатори лише через `derive` і `foldCorruption` для учасника (знімок бою має ефективні значення без списку мутацій; `maxWounds` учасника з рядка героя); приватність (гравець — свої пункти/мутації на аркуші; `list` і учасник бою — без `corruption`; таблиці `mutation*` приховані; журнал `CORRUPTION` — ДМ/власник); `Mutation.text` — `LogLine` (відхилення від спеки, переклад мовою глядача); капи (`POINTS_MAX`, `MUTATIONS_MAX` → `capped`); мінімум 1 для характеристики/Move/Wounds, верхня межа згортання 200; розклад Wounds (`woundsBreakdown`) внесок мутації не показує (лише підсумок); юніти порчі не приймають (`UnitCharacteristicsSchema`); недоступно в активному бою; поза межами — автоджерела, зняття порчі, Dissolution, токен, шаблони (5g); namespace `wfrpCorruption` посторінково (3 сторінки, рядок `scope-size` 2 KB, виміряне з Task 6); бюджет OpenAPI — фактичне число з Task 3/5. У «Звірити з книгою» — рядок «Порча (5h-3): `wfrp/corruption/constants.ts` (`GRANT_MAX`, `POINTS_MAX`, `MUTATIONS_MAX`, `PHYSICAL_MAX_ROLL`, тест `endurance`/`challenging`), межі ефектів `lib/constants/wfrp-mutations.ts`, поріг TB + WPB, «рівно на порозі — без тесту», повторний тест при кожному нарахуванні понад поріг, дефолтні таблиці `mutationPhysical`/`mutationMental` (рядки й ефекти)». `docs/STATUS.md`: у рядок WFRP після 5h-4 — «**5h-3 (порча й мутації) реалізовано на `feat/wfrp`, не змерджено:** нарахування ДМ з тестом Endurance понад поріг TB + WPB, мутації з таблиць `mutationPhysical`/`mutationMental` (ефекти характеристика/Рух/макс. Wounds через `derive`), відкат останнього; без міграцій; namespace `wfrpCorruption` посторінково; e2e `wfrp-corruption-e2e.test.ts`; межі — «Межі 5h-3».»; «Далі 5g» лишається. Без нових пунктів у чеклісті міграцій (міграцій немає). Spec/план в archive не переносити.
- [ ] **Step 4: Lint і коміт** — `pnpm exec eslint --fix <змінені .ts>`; `git commit -m "docs(wfrp): 5h-3 corruption boundaries, help and status"` + Co-Authored-By.

---

## Task 8: Контролер — /simplify, повна перевірка, live-run, фінальне рев'ю, пам'ять

- [ ] **Step 1: `/simplify`** на diff гілки від `a71b3d46c` (1–2 агенти, Sonnet); виправлення — комітом `refactor(wfrp): simplify 5h-3`.
- [ ] **Step 2: Lint змінених файлів** (НЕ repo-wide): `git diff --name-only a71b3d46c..HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint`.
- [ ] **Step 3: Повний прогін.** Спершу `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` — якщо активний важкий процес іншої сесії, чекати. Потім один раз `pnpm test:run` (довше ~5 хв — вбити й прогнати вужче).
- [ ] **Step 4: Live-run через суб-агента** (Sonnet, браузер, масштабовані скріншоти, перевірки JS/текстом): wfrp-кампанія — ДМ нараховує 5 (без тесту), потім до перевищення порогу до отримання мутації (за потреби — тимчасово кастомна таблиця з одним рядком `move −1` у правилах) → підсумок діалогу, блок на «Бою», чип у шапці, Рух/характеристика змінені на аркуші; журнал `☠`; «Відкотити»; гравець-власник бачить пункти/мутації без кнопки; інший гравець не бачить порчі в списку (мережевий відповідь `characters`); редактор таблиць показує «Мутації: тіло/розум» з перекладеними текстами й редактором ефекту зі знаком; бій з героєм-мутантом — ціль атаки/Move відповідають ефективним значенням; homm-кампанія — немає ні блоку, ні чипа; ширина 375 px. Тестові дані видалити після прогону.
- [ ] **Step 5: Фінальне Opus-рев'ю** гілки (spec + план + diff від `a71b3d46c`), Review Focus як чекліст; виправлення — Sonnet-виконавцем, повторний `pnpm test:related` на змінених файлах.
- [ ] **Step 6:** оновити `docs/STATUS.md` (виконано `/simplify`, live-run, рев'ю) і пам'ять `/Users/silentfox/.claude/projects/-Users-silentfox-Work-dnd-tracker/memory/project-wfrp.md` + рядок у `MEMORY.md` («5h-3 DONE (<hash>) … next 5g»); закомітити docs. Не мерджити, не пушити.
