# WFRP 5h-4: Downtime — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (метод обрано користувачем: executors = Sonnet, без рев'ю по задачах, один фінальний Opus-рев'ю і один повний `pnpm test:run` наприкінці). Кроки з чекбоксами `- [ ]`.

**Goal:** ДМ однією дією «Минув період» проводить wfrp-партію через N днів простою (лікування Wounds, недуги, заняття з доходом/знижкою на навчання, подія з таблиці) і може відкотити останній період; гравець обирає заняття на вкладці «Простій».

**Architecture:** стан — ключ `characteristics.downtime` (без міграцій), читається рукописним дзеркалом `readDowntime` усередині `readCharacteristics`; чистий рушій `wfrp/downtime/` за хуком `RuleSystemDefinition.downtime` (у d20 — `undefined`); три операції через `operation-runner` (PUT заняття, POST period, POST period-undo), дохід — наявна дія гаманця `gain`; UI — слоти `SystemUi.DowntimeTab`/`DowntimePeriodPanel`, тексти в namespace `wfrpDowntime`, що підвантажується лише на чотирьох сторінках.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zod 4, Prisma 6, TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-wfrp-5h4-design.md` (з «Рішеннями користувача 2026-11-08»; уточнення плану — нижче).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-wfrp`, гілка `feat/wfrp`; не мерджити в main, не пушити.
- Без міграцій і нових таблиць БД.
- Ядро (`lib/server`, `lib/schemas`, `lib/hooks/characters`, `components/characters`, `components/character-profile`, `types`, `app`) імпортує wfrp лише через `@/lib/utils/rules/systems` (index), `@/lib/utils/rules/systems/schemas` або `@/lib/utils/rules/systems/registry` і `@/components/systems` (ESLint `SYSTEM_IMPORT_PATTERN`).
- Усі числа рушія — у `wfrp/downtime/constants.ts`, кожне з коментарем `// verify against 5e book`.
- `MAX_DAYS = 30`; межа днів 1..`downtime.maxDays` перевіряється в обробнику → 400 `DOWNTIME_DAYS_INVALID`.
- Нові коди `API_ERRORS`: `DOWNTIME_UNSUPPORTED` (409), `DOWNTIME_IN_BATTLE` (409), `DOWNTIME_DAYS_INVALID` (400), `DOWNTIME_STALE` (409); тексти `errors.*` uk+en.
- i18n: namespace `wfrpDowntime` — НЕ в `WFRP_MEMBER_EXTRA`/`WFRP_DM_EXTRA`; ліміти `WFRP_MEMBER_LIMIT_KB = 107`, `WFRP_DM_LIMIT_KB = 111`, `LIMIT_KB = 105` не змінювати. Кирилиця в коді заборонена (ESLint) — лише в `messages/uk/*.json` і docs.
- Коментарі мінімальні (одна стисла лінія лише для неочевидного); імпорти `@/lib/...`; `import/no-cycle` увімкнено.
- Тести під час роботи: `pnpm test:run <file>` / `pnpm test:related <files>`; lint: `pnpm exec eslint --fix <touched files>`. Repo-wide `pnpm lint` і повний `pnpm test:run` — лише контролер у Task 6.
- Коміти закінчуються рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Рішення, що уточнюють спеку

- **zod не дублює стан:** у `CharacteristicsSchema` поле `downtime: z.custom<DowntimeState>((v) => readDowntime(v) !== undefined).optional()` — єдине джерело правди `readDowntime`, OpenAPI бачить `{}` (`unrepresentable: "any"`). Окремі zod-схеми лише для тіл запитів (`EndeavourSchema`, `AilmentInputSchema`).
- **Без циклу `keys.ts` ↔ `downtime/read.ts`:** `CHARACTERISTIC_KEYS`, `CharacteristicKey`, `SKILL_KEY_RE`, `SPEC_RE`, `SKILL_ADVANCE_KEY_RE` переносяться в новий лист `wfrp/characteristics/constants.ts`; `keys.ts` їх реекспортує (наявні імпорти не змінюються).
- **`planPeriod` — на всю партію** (`heroes[]`), бо `tend` зачіпає іншого героя; повертає по запису на героя.
- **`PeriodSummary.endeavour.skipped?: "patientAbsent"`** — позначка, коли пацієнта `tend` немає серед живих героїв періоду.
- **`lastPeriod` пишеться всім героям періоду**, включно з пропущеними (мертвий/0 Wounds) — відкат однорідний.
- **Дохід без `note`:** нотатки журналу інвентарю — сирий текст користувача, ключ i18n показався б як є; деталі доходу — у журналі `DOWNTIME`. Відкат доходу — `applyStashAction(state, { action: "spend", amount, coin, note: "" })` (журнал `MONEY_SPEND`, `NOT_ENOUGH_MONEY` → `DOWNTIME_STALE`).
- **What's new** `2026-11-08-wfrp-downtime` — audience `all` без `href` (як `2026-11-05-wfrp-advancement`: стаття `dm-rule-systems` лише для ДМ).
- **Ціна зі знижкою на вкладці «Розвиток» не показується** (рядок у «Межі 5h-4»); кредит видно на вкладці «Простій».
- **Хуки клієнта:** PUT кладе відповідь у `characterKeys.detail`; period/undo — інвалідація (як `useRest`), бо дія рідкісна.

## Review Focus

1. **Межі днів:** `days` 0, 31, 1.5, −1 → 400 (`DOWNTIME_DAYS_INVALID` або `INVALID_BODY`), нічого не записано; `days = 30` лікує до капа, не вище `maxHp`. Тест — Task 3.
2. **Подвійний / застарілий відкат:** другий `period-undo` того ж `periodId`; відкат після ручної правки ДМ (HP, недуги), після покупки зі знижкою або після витрати доходу → 409 `DOWNTIME_STALE`, і жоден герой не змінений (включно з тими, хто пройшов перевірку). Тест — Task 3.
3. **Мертвий / непритомний / відсутній:** мертвий герой не лікується й не отримує подію; герой із 0 Wounds не виконує заняття, але лікується; `tend` на пацієнта поза періодом або мертвого — позначка `patientAbsent` без ефекту; `characterIds` з чужим/неактивним id → 400 `REST_CHARACTERS_INVALID`. Тести — Task 2 (`planPeriod`), Task 3 (обробник).
4. **Гравець у активному бою:** PUT заняття або period з будь-яким героєм в активному бою → 409 `DOWNTIME_IN_BATTLE` без запису. Тест — Task 3.
5. **Гаманець на межі INT4:** дохід, що переповнює `gp/sp/cp`, → 409 `MONEY_OVERFLOW`, не записано ні `resources`, ні `characteristics`, ні журналів жодного героя. Тест — Task 3.

---

## File Structure

```
lib/utils/rules/systems/wfrp/characteristics/constants.ts   NEW  ключі/регекспи (лист без імпортів)
lib/utils/rules/systems/wfrp/downtime/
  types.ts        NEW  DowntimeState, Ailment, Endeavour, TrainingCredit, PeriodSnapshot, PeriodSummary, TestOutcome
  read.ts         NEW  readDowntime (без zod)
  schema.ts       NEW  EndeavourSchema, AilmentInputSchema (zod, тіла запитів)
  constants.ts    NEW  числа рушія
  status.ts       NEW  parseStatus
  heal.ts         NEW  healWounds
  ailments.ts     NEW  tickAilments
  endeavours.ts   NEW  ENDEAVOURS, resolveEndeavour, validateEndeavour
  event.ts        NEW  rollEvent
  plan-period.ts  NEW  planPeriod
  index.ts        NEW  WFRP_DOWNTIME + реекспорти
lib/server/characters/core/stash-state.ts      NEW  loadStashState (винесено з stash-update.ts)
lib/server/characters/core/downtime-handler.ts NEW  setDowntime, passPeriod, undoPeriod
lib/server/characters/operations/downtime.ts         NEW  downtime.set (PUT)
lib/server/characters/operations/downtime-period.ts       NEW  downtime.period (POST)
lib/server/characters/operations/downtime-period-undo.ts  NEW  downtime.period.undo (POST)
lib/schemas/downtime.ts                         NEW  тіла запитів
app/api/campaigns/[id]/characters/[characterId]/downtime/route.ts  NEW
app/api/campaigns/[id]/downtime/period/route.ts                     NEW
app/api/campaigns/[id]/downtime/period-undo/route.ts                NEW
lib/api/downtime.ts, types/downtime.ts, lib/hooks/characters/useDowntime.ts  NEW
components/systems/wfrp/downtime/{DowntimeTab,EndeavourPicker,AilmentsEditor,PeriodSummaryView,DowntimePeriodPanel}.tsx  NEW
messages/{uk,en}/wfrpDowntime.json             NEW
```

---

## Task 1: Дані `downtime`, приватність, журнал, коди помилок (dispatch 1)

**Files:**
- Create: `lib/utils/rules/systems/wfrp/characteristics/constants.ts`, `lib/utils/rules/systems/wfrp/downtime/{types,read,schema}.ts`, `lib/utils/rules/systems/wfrp/downtime/__tests__/read.test.ts`
- Modify: `lib/utils/rules/systems/wfrp/characteristics/keys.ts` (реекспорт констант, `Characteristics.downtime?`, `readCharacteristics`), `lib/utils/rules/systems/wfrp/characteristics/schema.ts` (`downtime`), `lib/utils/rules/systems/wfrp/advancement/privacy.ts` (`redactLedger`, `preserveServerOwned`), `lib/server/characters/operations/patch.ts:75-87` (`reconcileCharacteristics`), `lib/server/characters/operations/list.ts:42` (`hasLedger` → будь-який об'єкт), `lib/utils/rules/systems/wfrp/combat/participant.ts:41-46` (`wfrpAbilitiesOf`), `lib/server/characters/core/system-fields.ts` (`normalizeCharacterInput`, create), `lib/utils/rules/systems/index.ts`, `lib/utils/rules/systems/schemas.ts`, `lib/constants/character-log.ts`, `lib/utils/characters/resources/describe-log.ts`, `lib/constants/api-errors.ts`, `messages/{uk,en}/rest.json` (`log.downtime`, `log.downtimeUndo`), `messages/{uk,en}/errors.json`
- Test: `lib/utils/rules/systems/wfrp/downtime/__tests__/read.test.ts`, `lib/utils/rules/systems/wfrp/advancement/__tests__/privacy.test.ts`, `lib/server/characters/operations/__tests__/ledger-privacy.test.ts` (list/get/patch з моками — зразок для нових кейсів), `lib/utils/rules/systems/wfrp/combat/__tests__/participant.test.ts`, `lib/server/characters/core/__tests__/system-fields.test.ts`, `lib/utils/characters/resources/__tests__/describe-log-wfrp.test.ts`

**Interfaces:**
- Consumes: —
- Produces (`wfrp/downtime/types.ts`, реекспорт типів з `@/lib/utils/rules/systems`):
```ts
export type AilmentKind = "festering" | "disease" | "injury";
export type Ailment = { id: string; kind: AilmentKind; daysLeft: number; label: string }; // daysLeft 1..365, label 1..80
export type EndeavourKind = "earn" | "train" | "tend" | "rest" | "custom";
export type Endeavour =
  | { kind: "earn"; params: { skill: "trade"; spec: string } | { skill: "charm" } }
  | { kind: "train"; params: { kind: "characteristic" | "skill"; key: string } }
  | { kind: "tend"; params: { patientId: string } }
  | { kind: "rest"; params: Record<string, never> }
  | { kind: "custom"; params: { text: string } }; // text 1..200
export type TrainingCredit = { kind: "characteristic" | "skill"; key: string; discount: number }; // discount 1..1000
export type TestOutcome = { roll: number; target: number; sl: number; outcome: PercentileOutcome };
export type CoinAmount = { coin: Coin; amount: number };
export type PeriodSummary = {
  skipped?: "dead" | "incapacitated";
  healed: number;
  endeavour?: { kind: EndeavourKind; test?: TestOutcome; coins?: CoinAmount; discount?: number; patientId?: string; skipped?: "patientAbsent" };
  ailments: { id: string; label: string; kind: AilmentKind; daysLeft: number; expired?: boolean; test?: TestOutcome; wounds?: number }[];
  event?: { roll: number; index: number; text: LogLine; wounds?: number; conditions: { key: WfrpConditionKey; levels: number }[] };
};
export type PeriodSnapshot = {
  id: string; at: string; days: number;
  before: { hp?: number; ailments: Ailment[]; training?: TrainingCredit };
  after: { hp?: number; ailmentIds: string[]; training?: TrainingCredit };
  coins?: CoinAmount;
  summary: PeriodSummary;
};
export type DowntimeState = { endeavour?: Endeavour; ailments: Ailment[]; training?: TrainingCredit; lastPeriod?: PeriodSnapshot };
export const AILMENTS_MAX = 20;
```
- Produces: `readDowntime(raw: unknown): DowntimeState | undefined` (`read.ts`); `EndeavourSchema`, `AilmentInputSchema` (`{ id?: string; kind; daysLeft; label }`) у `schema.ts`, реекспорт з `@/lib/utils/rules/systems/schemas`; `Characteristics.downtime?: DowntimeState`; `CharacterLogKind.DOWNTIME = "downtime"`; `API_ERRORS.DOWNTIME_UNSUPPORTED|DOWNTIME_IN_BATTLE|DOWNTIME_DAYS_INVALID|DOWNTIME_STALE` = `"errors.downtimeUnsupported"|"errors.downtimeInBattle"|"errors.downtimeDaysInvalid"|"errors.downtimeStale"`.

- [ ] **Step 1: Аудит витоків (перше завдання зі spec).** Виконати й занести висновок у звіт задачі:
```bash
cd /Users/silentfox/Work/dnd-tracker-wfrp
grep -rn "characteristics" lib/server/characters/operations/{list,roster,get,reads}.ts lib/server/characters/core/{read-sheet,sheet-handler}.ts lib/utils/characters/sheet/build-sheet.ts lib/utils/battle/participant/from-character.ts lib/server/battles/participant/*.ts | grep -v "readCharacteristics(.*)\.\(talents\|fate\)"
grep -rln "characteristics" lib/server/content lib/server/templates lib/server/campaigns 2>/dev/null
```
Очікувано: сирі `characteristics` виходять лише через `list` (вже редагує `redactListedLedgers`), `get` (лише ДМ/власник) і `participantFields` → `wfrpAbilitiesOf`. Якщо знайдено інше місце, що віддає сирі `characteristics` чужому гравцеві або копіює їх у знімок/шаблон, — прибрати там `downtime` у цій задачі тим самим способом, що й `ledger`.

- [ ] **Step 2: Тести `readDowntime`** (`downtime/__tests__/read.test.ts`):
  - `undefined`/`null`/рядок/масив → `undefined`.
  - `{ ailments: [] }` → `{ ailments: [] }`; відсутній `ailments` → `{ ailments: [] }`.
  - Кожен вид `Endeavour` валідний проходить; `earn` trade з `spec: "Bad Spec"` (не `SPEC_RE`) → весь стан `undefined`; `train` з `kind: "characteristic", key: "zz"` → `undefined`; `train` skill з `key: "trade:smith"` проходить; `custom` з 201 символом → `undefined`; `rest` з непорожнім `params` → `undefined`.
  - Недуга `daysLeft` 0 або 366, `label` "" або 81 символ, 21 недуга → `undefined`.
  - `training.discount` 0 → `undefined`.
  - `lastPeriod` без `id` → `undefined`; з `summary` не-об'єктом → `undefined`; валідний знімок зберігається як є.
  - Узгодженість із zod: для масиву фікстур `endeavour` `EndeavourSchema.safeParse(e).success === (readDowntime({ endeavour: e, ailments: [] }) !== undefined)`; те саме для недуг з `id` (`AilmentInputSchema`).
  - `readCharacteristics({ characteristics: { downtime: valid } }).downtime` дорівнює `valid`; з невалідним `downtime` — ключа немає, решта полів читаються як раніше.
  - `CharacteristicsSchema.safeParse({ downtime: invalid }).success === false`; `{ downtime: valid }` — `true`.

Run: `pnpm test:run lib/utils/rules/systems/wfrp/downtime/__tests__/read.test.ts` → FAIL (модуля немає).

- [ ] **Step 3: Реалізація даних.**
  - `characteristics/constants.ts`: перенести `CHARACTERISTIC_KEYS`, `CharacteristicKey`, `SKILL_KEY_RE`, `SPEC_RE`, `SKILL_ADVANCE_KEY_RE` з `keys.ts`; `keys.ts` — `export { … } from "./constants"`.
  - `downtime/read.ts` імпортує лише з `../characteristics/constants`, `@/lib/constants/inventory` (`COINS`), `@/lib/constants/wfrp-conditions`. Стиль — як `readLedger`/`readCareer` у `keys.ts` (`isRecord`, `isInt`). `summary` перевіряється лише як об'єкт (серверне поле). Повертає новий об'єкт без зайвих ключів.
  - `keys.ts`: `Characteristics.downtime?: DowntimeState`; у `readCharacteristics` — `...(downtime ? { downtime } : {})` поруч із `career`. Без цього `lockCharacters` → `advance`/`career` перезапишуть `characteristics` без `downtime`.
  - `characteristics/schema.ts`: `downtime: z.custom<DowntimeState>((v) => readDowntime(v) !== undefined).optional()`.
  - `downtime/schema.ts`: `EndeavourSchema` (discriminatedUnion по `kind`; `spec` — `SPEC_RE`; train `key` — `z.enum(CHARACTERISTIC_KEYS)` для characteristic, `SKILL_ADVANCE_KEY_RE` для skill через `superRefine`; `patientId` 1..64; `text` 1..200; `rest.params` — `z.strictObject({})`), `AilmentInputSchema` (`id` 1..64 optional, `kind` enum, `daysLeft` int 1..365, `label` trim 1..80).
  - `systems/index.ts`: `export type { Ailment, AilmentKind, DowntimeState, Endeavour, EndeavourKind, PeriodSnapshot, PeriodSummary, TrainingCredit } from "./wfrp/downtime/types"; export { AILMENTS_MAX } from "./wfrp/downtime/types"; export { readDowntime } from "./wfrp/downtime/read";`. `systems/schemas.ts`: `export { AilmentInputSchema, EndeavourSchema } from "./wfrp/downtime/schema";`.

Run Step 2 знову → PASS.

- [ ] **Step 4: Тести приватності.**
  - `privacy.test.ts`: `redactLedger(c з downtime, { isDM: false, isOwner: false })` не має ключа `downtime` і має `ledger: []`; для власника/ДМ — без змін. `preserveServerOwned(existing з downtime A, incoming з downtime B)` → `downtime` = A; `existing` без `downtime` → у результаті ключа немає.
  - `ledger-privacy.test.ts` (поруч із кейсами «DM: saving a sheet…» і «player: …stay server-side»): ДМ шле PATCH з `characteristics.downtime = { ailments: [] }`, збережено `downtime` з `lastPeriod` → у `character.update` записано збережене; гравець шле PATCH з `downtime.training` → записано збережене (без кредиту); у `list` інший гравець не бачить `downtime` чужого героя, власник і ДМ бачать.
  - `participant.test.ts`: `wfrpAbilitiesOf(c з downtime).characteristics` не має ключа `downtime`.
  - `system-fields.test.ts`: `normalizeCharacterInput(WFRP_SYSTEM, { characteristics: { …, downtime } }, rules, "create")` повертає `characteristics` без `downtime`.
  - `ledger-privacy.test.ts`: `redactListedLedgers([{ controlledBy: "p2", characteristics: { downtime: {...} } }], { userId: "p1", isDM: false })` — `downtime` прибрано навіть без `ledger` у рядку.

- [ ] **Step 5: Реалізація приватності.**
```ts
export function redactLedger(characteristics: Characteristics, viewer: LedgerViewer): Characteristics {
  if (viewer.isDM || viewer.isOwner) return characteristics;
  const { downtime: _downtime, ...rest } = characteristics;
  return { ...rest, ledger: [] };
}
```
  `preserveServerOwned`: додатково відкидає `incoming.downtime` і повертає `...(existing.downtime ? { downtime: existing.downtime } : {})`. `reconcileCharacteristics` (гілка ДМ): `const { downtime: _d, ...rest } = incoming; return stored.downtime ? { ...rest, downtime: stored.downtime } : rest;`. `list.ts`: `hasLedger` → перевірка «не-null об'єкт» (перейменувати на `isCharacteristicsObject`). `wfrpAbilitiesOf`: `const { downtime: _d, ...rest } = characteristics; characteristics: { ...rest, ledger: [] }`. `normalizeCharacterInput` create: якщо `data.characteristics?.downtime` — повернути копію без нього.

- [ ] **Step 6: Журнал і помилки.**
  - `CharacterLogKind.DOWNTIME: "downtime"`; `describeCharacterLog`: `case "downtime": return { key: d.undo ? "rest.log.downtimeUndo" : "rest.log.downtime", params: { days: num("days") } };`.
  - Тест у `describe-log-wfrp.test.ts`: `{ kind: "downtime", data: { periodId: "p", days: 7, summary: {} } }` → `rest.log.downtime` з `days: 7`; `{ undo: true }` → `rest.log.downtimeUndo`.
  - `messages/uk/rest.json` `log.downtime`: `"🕯 Простій: {days} дн."`, `log.downtimeUndo`: `"↩ Відкат простою"`; en: `"🕯 Downtime: {days} d"`, `"↩ Downtime undone"`.
  - `api-errors.ts` чотири коди; `messages/uk/errors.json`: `downtimeUnsupported` «Простій недоступний у цій рульовій системі», `downtimeInBattle` «Герой в активному бою — простій неможливий», `downtimeDaysInvalid` «Кількість днів — від 1 до 30», `downtimeStale` «Період не можна відкотити — дані змінено після нього»; en — відповідні англійські.

Run: `pnpm test:related lib/utils/rules/systems/wfrp/characteristics/keys.ts lib/utils/rules/systems/wfrp/advancement/privacy.ts lib/server/characters/operations/patch.ts lib/server/characters/operations/list.ts lib/utils/rules/systems/wfrp/combat/participant.ts lib/server/characters/core/system-fields.ts lib/utils/characters/resources/describe-log.ts lib/constants/api-errors.ts` → PASS (у т.ч. `client-api-errors`, `label-keys-rest`, `parity`).

- [ ] **Step 7: Lint і коміт.**
```bash
pnpm exec eslint --fix <усі змінені й створені файли задачі>
git add -A && git commit -m "feat(wfrp): downtime state, privacy and log kind

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Чистий рушій простою і слот `downtimeEvent` (dispatch 2)

**Files:**
- Create: `lib/utils/rules/systems/wfrp/downtime/{constants,status,heal,ailments,endeavours,event,plan-period,index}.ts`, тести `lib/utils/rules/systems/wfrp/downtime/__tests__/{status,heal,ailments,endeavours,event,plan-period}.test.ts`, `messages/{uk,en}/wfrpDowntime.json` (поки лише `events.1..10`)
- Modify: `lib/utils/rules/tables-schema.ts` (`TABLE_SLOTS`, `SLOT_EFFECTS`), `lib/utils/rules/systems/wfrp/tables/defaults.ts` (`downtimeEvent`), `lib/i18n/config.ts` (`NAMESPACES` += `"wfrpDowntime"`), `messages/{uk,en}/wfrpTables.json` (`slots.downtimeEvent`), три OpenAPI-тести (`lib/server/content/__tests__/openapi.test.ts:65`, `openapi-4f2.test.ts:21`, `openapi-4f4.test.ts:24`)
- Test: `components/rules/sections/__tests__/TablesSection*.test.tsx` (наявні — мають пройти з новим слотом)

**Interfaces:**
- Consumes (Task 1): типи з `downtime/types.ts`, `Characteristics`.
- Produces:
```ts
// constants.ts — усі з // verify against 5e book
export const MAX_DAYS = 30; export const REST_HEAL_MULTIPLIER = 2; export const TEND_HEAL_PER_SL = 1; export const TEND_DAYS_PER_SL = 1;
export const FESTERING_FAIL_WOUNDS = 2; export const FESTERING_RENEW_DAYS = 7; export const TRAIN_DISCOUNT_BASE = 5; export const TRAIN_DISCOUNT_PER_SL = 5;
export const EARN_STATUS_DEFAULT: Status = { tier: "brass", level: 1 };
export const STATUS_COIN: Record<StatusTier, Coin> = { brass: "cp", silver: "sp", gold: "gp" };
export const ENDEAVOUR_DIFFICULTY: DifficultyKey = "challenging";
// status.ts
export type StatusTier = "brass" | "silver" | "gold"; export type Status = { tier: StatusTier; level: number };
export function parseStatus(raw?: string | null): Status; // /^(brass|silver|gold)\s+(\d{1,2})$/i, level ≥ 1, інакше EARN_STATUS_DEFAULT
// heal.ts
export function healWounds(i: { current: number; max: number; tb: number; days: number; multiplier: number; bonus: number }): number; // min(max, current + tb*days*multiplier + bonus)
// ailments.ts
export function tickAilments(ailments: Ailment[], days: number, ctx: { endurance: number; rng: Rng; presetRolls?: number[] }): { ailments: Ailment[]; report: PeriodSummary["ailments"]; wounds: number };
// endeavours.ts
export type EndeavourCtx = { characteristics: Characteristics; status?: string | null; rng: Rng; presetRoll?: number };
export type EndeavourOutcome = { test?: TestOutcome; coins?: CoinAmount; training?: TrainingCredit; tend?: { patientId: string; heal: number; days: number } };
export function resolveEndeavour(e: Endeavour, ctx: EndeavourCtx): EndeavourOutcome;
export function validateEndeavour(e: Endeavour, c: Characteristics): "SKILL_UNTRAINED" | null;
// event.ts
export function rollEvent(rules: Pick<Ruleset, "tables">, rng: Rng, preset?: number): NonNullable<PeriodSummary["event"]>;
// plan-period.ts
export type PeriodHero = { id: string; resources: CharacterResources; characteristics: Characteristics; maxHp: number; status?: string | null };
export type PeriodPresets = { endeavour?: number; ailments?: number[]; event?: number };
export type PeriodInput = { heroes: PeriodHero[]; days: number; rules: Pick<Ruleset, "tables">; rng: Rng; periodId: string; now: string; presets?: Record<string, PeriodPresets> };
export type PlannedHero = { id: string; resources: CharacterResources; characteristics: Characteristics; coins?: CoinAmount; summary: PeriodSummary };
export function planPeriod(input: PeriodInput): PlannedHero[];
// index.ts
export const WFRP_DOWNTIME = { planPeriod, validateEndeavour, maxDays: MAX_DAYS };
```
- Produces: `TABLE_SLOTS` містить `"downtimeEvent"` (останнім), `SLOT_EFFECTS.downtimeEvent = ["wounds", "condition"]`, `DEFAULT_TABLES.downtimeEvent` (10 рядків).

- [ ] **Step 1: Тести чистих функцій** (кожен файл — `describe` з кейсами; `rng = () => 0.5`, кидки через `preset`/`presetRoll`/`presetRolls`):
  - `status.test.ts`: `"Silver 3"` → `{silver,3}`; `"gold 1"` → `{gold,1}`; `"Brass 0"`, `"Copper 2"`, `""`, `undefined`, `null` → `EARN_STATUS_DEFAULT`.
  - `heal.test.ts`: `{current:3,max:12,tb:3,days:2,multiplier:1,bonus:0}` → 9; кап — `days:30` → 12; `days:0,bonus:0` → 3; `multiplier:2` подвоює; `bonus:2` додається; `current = max` → `max`.
  - `ailments.test.ts`: `disease` `daysLeft:10`, `days:3` → лишається з 7, `report[0].expired` відсутній; `days:10` → знята, `expired: true`; `injury` так само; `festering` спливла + `presetRolls:[10]`, `endurance:40` → знята, `test.outcome` success, `wounds: 0`; `presetRolls:[90]` → лишається з `daysLeft: FESTERING_RENEW_DAYS`, `wounds: FESTERING_FAIL_WOUNDS`; дві festering з провалом сумують wounds.
  - `endeavours.test.ts` (характеристики з `DEFAULT_CHARACTERISTICS` + потрібні `skillAdvances`):
    - `earn` charm (ціль 30; SL = десятки цілі − десятки кидка), `presetRoll: 15` (SL 2), `status: "Silver 2"` → `coins {sp, 4}`; `presetRoll: 30` (SL 0, успіх) → `max(1,0)×2 = 2`; `presetRoll: 80` → без `coins`, `test.outcome` failure; дубль `22` при цілі 30 → outcome `success` (не critical); без статусу → `cp`, `level 1`; `"Gold 1"` → `gp`.
    - `earn` trade `spec: "smith"` з `skillAdvances["trade:smith"] = 5` — ціль 35.
    - `train` з `research` (`skillAdvances.research = 5`), `presetRoll: 15` (ціль 35, SL 2) → `training { kind, key, discount: 5 + 2×5 = 15 }`; провал → без `training`.
    - `tend` з `heal` (`skillAdvances.heal = 5`, ціль 35), `presetRoll: 25` (SL 1) → `tend { patientId, heal: 1, days: 1 }`; `presetRoll: 35` (SL 0, успіх) → `heal: 1, days: 1`; `presetRoll: 5` (SL 3) → `heal: 3, days: 3`; провал → без `tend`.
    - `rest`, `custom` → `{}` (без `test`).
    - `validateEndeavour`: train/tend/earn-trade без просувань → `"SKILL_UNTRAINED"`; charm, rest, custom → `null`; trade з просуваннями → `null`.
  - `event.test.ts`: `rollEvent({ tables: {} }, rng, 5)` → `index 0`, `text` = `dynamicTextRef("wfrpDowntime.events.1")`, `conditions: []`; рядок з `wounds` → `wounds` = сума; кастомна таблиця `{ tables: { downtimeEvent: [{ max: 100, text: "Flood", effects: [{ type: "condition", key: "fatigued", levels: 1 }] }] } }` → `text: "Flood"`, `conditions: [{ key: "fatigued", levels: 1 }]`; невалідна секція: `rollEvent(parseRules({ system: { key: "wfrp" }, tables: { downtimeEvent: [{ max: 50, effects: [] }] } }), rng, 5)` → дефолтний рядок 1.
  - `plan-period.test.ts` (два-три герої, `maxHp: 12`, `presets` на кожного):
    - Мертвий (`resources.dead`) → `summary.skipped === "dead"`, `resources` без змін, `healed: 0`, немає `event`, `characteristics.downtime.lastPeriod.id === periodId`.
    - 0 Wounds (`resources.hp = 0`) з `endeavour: earn` → `summary.skipped === "incapacitated"`, немає `endeavour` у підсумку й `coins`, але `healed > 0`, є `event`, `downtime.endeavour` збережено.
    - `tend` пацієнта, якого немає серед героїв, і пацієнта-мерця → `summary.endeavour.skipped === "patientAbsent"`, пацієнт не лікується.
    - `tend` успіх → пацієнт лікується на `tb×days + heal`, найближча недуга пацієнта зменшується на `days` до тіку.
    - `rest` → лікування × `REST_HEAL_MULTIPLIER`.
    - Порядок: festering-провал і подія з `wounds` віднімаються після лікування (`hp` 2, `max` 12, `days` 1, `tb` 3, подія `wounds 1`, festering провал 2 → `2+3−2−1 = 2`), мінімум 0.
    - Знімок: `before.hp` = вхідний `resources.hp`, `after.hp` = вихідний (`undefined` при повних), `after.ailmentIds` = id залишених недуг, `before.training`/`after.training`, `coins` = дохід.
    - `train` успіх замінює наявний `training`.
    - `endeavour` лишається в `downtime` після періоду.
Run: `pnpm test:run lib/utils/rules/systems/wfrp/downtime` → FAIL.

- [ ] **Step 2: Реалізація чистих функцій.** Тест — `resolvePercentileTest({ target, slModifier: DIFFICULTY_SL[ENDEAVOUR_DIFFICULTY], doubles: false, mode: "normal", rng, presetRoll })`; `TestOutcome = { roll: r.roll, target: r.target, sl: r.sl, outcome: r.outcome }`; успіх = `outcome === "success" || outcome === "critical"`. Цілі: `skillTarget(c, "charm" | "research" | "heal" | "endurance")`, `skillTarget(c, "trade", spec)`; `null` або `!trained` → `validateEndeavour` повертає `"SKILL_UNTRAINED"` (для charm/endurance basic — завжди trained). `tb = bonus(c, "t")`. `planPeriod` — дві фази:
```ts
// фаза A: заняття всіх живих не-непритомних героїв → outcomes[id]; вклад tend збирається в tendBonus[patientId] = { heal, days }
// фаза B (на кожного героя): dead → skipped; інакше heal(multiplier = rest ? REST_HEAL_MULTIPLIER : 1, bonus = tendBonus.heal)
//   → ailments (спершу −tendBonus.days найближчій за daysLeft, потім tickAilments) → rollEvent → hp = max(0, healed − ailments.wounds − event.wounds)
//   → resources = withHp(resources, hp, maxHp); downtime = { ...prev, ailments, training, lastPeriod: snapshot }
```
  Пацієнт «присутній» = є в `heroes` і не `dead`. `withHp` — з `@/lib/utils/characters/resources/hp`; `currentHp(resources, maxHp)` — поточне значення.

- [ ] **Step 3: Слот `downtimeEvent`.** `TABLE_SLOTS = [..., "wrath", "downtimeEvent"]`; `SLOT_EFFECTS.downtimeEvent = ["wounds", "condition"]`. `DEFAULT_TABLES.downtimeEvent` — 10 рядків `max: 10, 20, …, 100`, `textKey: "wfrpDowntime.events.1".."10"`, ефекти: рядок 3 `[{ type: "wounds", amount: 1 }]`, рядок 6 `[{ type: "condition", key: "fatigued", levels: 1 }]`, рядок 9 `[{ type: "wounds", amount: 2 }]`, решта `[]`; над масивом `// verify against 5e book`. `messages/uk/wfrpDowntime.json` — `{ "events": { "1": "…", …, "10": "…" } }` (короткі grimdark-події, ≤ 120 символів: спокійний тиждень, сварка в таверні, дрібна крадіжка, …; рядки 3/6/9 — відповідно з пораненням, виснаженням, бійкою); en — переклад. `NAMESPACES` += `"wfrpDowntime"`. `wfrpTables.json` `slots.downtimeEvent`: uk «Події простою», en «Downtime events».

Run: `pnpm test:run lib/utils/rules/systems/wfrp/downtime components/rules/sections lib/utils/rules/__tests__ lib/utils/rules/systems/wfrp/tables lib/i18n/__tests__/parity.test.ts` → PASS.

- [ ] **Step 4: Бюджет OpenAPI.** `pnpm test:run lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/openapi-4f4.test.ts`. Якщо перевищено 192_000 — виміряти довжину (тимчасовий `console.info(json.length)`, прибрати після) і підняти в усіх трьох до `ceil((виміряне + 1000) / 1000) × 1000`, коментар `// 5h-1 trait effects ~1.4 KB, 5h-2 rules.tables ~7.2 KB, 5h-4 downtimeEvent slot ~<N> KB (doc <виміряне>)`. Якщо потрібно > 194_000 — зупинитися й повідомити контролеру.

- [ ] **Step 5: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): downtime engine and downtimeEvent table slot"` + рядок Co-Authored-By.

---

## Task 3: Хук системи, сервер, клієнтські хуки, знижка `train` (dispatch 3)

**Files:**
- Create: `lib/server/characters/core/stash-state.ts`, `lib/server/characters/core/downtime-handler.ts`, `lib/server/characters/operations/downtime.ts`, `lib/server/characters/operations/downtime-period.ts`, `lib/server/characters/operations/downtime-period-undo.ts`, `lib/schemas/downtime.ts`, `app/api/campaigns/[id]/characters/[characterId]/downtime/route.ts`, `app/api/campaigns/[id]/downtime/period/route.ts`, `app/api/campaigns/[id]/downtime/period-undo/route.ts`, `lib/api/downtime.ts`, `types/downtime.ts`, `lib/hooks/characters/useDowntime.ts`, `lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts`
- Modify: `lib/utils/rules/systems/types.ts` (`RuleSystemDowntime`, `RuleSystemDefinition.downtime?`), `lib/utils/rules/systems/wfrp/index.ts` (`downtime: WFRP_DOWNTIME`), `lib/utils/rules/systems/index.ts` (тип `RuleSystemDowntime`), `lib/server/characters/battle-lock.ts`, `lib/server/characters/operations/stash-update.ts` (імпорт `loadStashState`), `lib/server/characters/operations/registry.ts`, `lib/server/assistant/actions/character-coverage.ts`, `lib/server/assistant/__tests__/helpers/coverage.ts` (`ASSISTANT_ROUTE_COVERAGE`), `lib/server/characters/progression-service.ts:34-46` (`PROGRESSION_INPUTS`), `lib/hooks/characters/index.ts`, `lib/utils/rules/systems/wfrp/characteristics/{keys,schema}.ts` (`LedgerEntry.discount`), `lib/utils/rules/systems/wfrp/advancement/{plan,undo}.ts`
- Test: `lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts`, `lib/utils/rules/systems/wfrp/advancement/__tests__/engine.test.ts`, `lib/utils/rules/systems/__tests__/` (тест реєстру — `grep -l "RULE_SYSTEM_REGISTRY" lib/utils/rules/systems/__tests__/*`), `lib/server/assistant/__tests__/{coverage,character-coverage}.test.ts`, три OpenAPI-тести (`lib/server/content/__tests__/openapi{,-4f2,-4f4}.test.ts`)

**Interfaces:**
- Consumes: Task 1 (`DowntimeState`, `readDowntime`, `EndeavourSchema`, `AilmentInputSchema`, `CharacterLogKind.DOWNTIME`, коди помилок); Task 2 (`planPeriod`, `PeriodHero`, `PlannedHero`, `validateEndeavour`, `WFRP_DOWNTIME`).
- Produces:
```ts
// lib/utils/rules/systems/types.ts
export interface RuleSystemDowntime { planPeriod: typeof planPeriod; validateEndeavour: typeof validateEndeavour; maxDays: number }
// lib/server/characters/battle-lock.ts
export async function assertNotInActiveBattle(campaignId: string, characterIds: string[], message: string = API_ERRORS.CHARACTER_IN_BATTLE): Promise<void>;
// lib/server/characters/core/stash-state.ts
export async function loadStashState(tx: Prisma.TransactionClient, characterId: string): Promise<StashState>;
// lib/schemas/downtime.ts
export const downtimeSetSchema = z.object({ endeavour: EndeavourSchema.nullable(), ailments: z.array(AilmentInputSchema).max(AILMENTS_MAX).optional() });
export const downtimePeriodSchema = z.object({ days: z.number().int(), characterIds: z.array(z.string().min(1).max(64)).min(1).max(50) });
export const downtimePeriodUndoSchema = z.object({ periodId: z.string().min(1).max(64), characterIds: z.array(z.string().min(1).max(64)).min(1).max(50) });
export type DowntimeSetInput = z.infer<typeof downtimeSetSchema>;
export type DowntimePeriodInput = z.infer<typeof downtimePeriodSchema>;
export type DowntimePeriodUndoInput = z.infer<typeof downtimePeriodUndoSchema>;
// types/downtime.ts
export type DowntimeSetBody = { endeavour: Endeavour | null; ailments?: (Omit<Ailment, "id"> & { id?: string })[] };
export type DowntimePeriodBody = { days: number; characterIds: string[] };
export type DowntimePeriodUndoBody = { periodId: string; characterIds: string[] };
export type DowntimeSetResult = { downtime: DowntimeState };
export type DowntimePeriodResult = { periodId: string; characters: { id: string; resources: CharacterResources; downtime: DowntimeState; purse?: Purse }[] }; // Purse — @/types/inventory
// lib/server/characters/core/downtime-handler.ts
export async function setDowntime(gate: CharacterGate, input: DowntimeSetInput): Promise<DowntimeSetResult>;
export async function passPeriod(access: CampaignAccessResult, input: DowntimePeriodInput): Promise<DowntimePeriodResult>;
export async function undoPeriod(access: CampaignAccessResult, input: DowntimePeriodUndoInput): Promise<DowntimePeriodResult>;
// operations: downtimeSetOperation (name "downtime.set", PUT), downtimePeriodOperation ("downtime.period", POST), downtimePeriodUndoOperation ("downtime.period.undo", POST)
// lib/api/downtime.ts
export const putDowntime = (campaignId: string, characterId: string, body: DowntimeSetBody) => campaignPut<DowntimeSetResult>(campaignId, `/characters/${characterId}/downtime`, body);
export const postDowntimePeriod = (campaignId: string, body: DowntimePeriodBody) => campaignPost<DowntimePeriodResult>(campaignId, "/downtime/period", body);
export const postDowntimePeriodUndo = (campaignId: string, body: DowntimePeriodUndoBody) => campaignPost<DowntimePeriodResult>(campaignId, "/downtime/period-undo", body);
// lib/hooks/characters/useDowntime.ts (у барелі index.ts)
export function useDowntime(campaignId: string, characterId: string); // useCrudMutation, mutationFn: putDowntime
export function useDowntimePeriod(campaignId: string); // mutationFn: postDowntimePeriod
export function useDowntimePeriodUndo(campaignId: string); // mutationFn: postDowntimePeriodUndo
// LedgerEntry: discount?: number (1..1e6)
```

- [ ] **Step 1: Знижка `train` — тести** (`advancement/__tests__/engine.test.ts`):
  - `downtime.training = { kind: "characteristic", key: "ws", discount: 15 }`, покупка `ws` з ціною 25 (`DEFAULT_ADVANCEMENT_RULES`, `ws` 0 → 1) → `entry.cost === 10`, `entry.discount === 15`, у `next.downtime.training` ключа немає, `next.downtime.ailments` збережено.
  - Правила з `characteristic.brackets: [{ upTo: 40, cost: 10 }]`, знижка 15 → `cost 0`, `discount 15`.
  - Кредит на `ws`, покупка `bs` → ціна повна, кредит лишається.
  - Кредит `skill` `trade:smith`, покупка `talent` з тим самим key → без знижки.
  - XP-перевірка після знижки: `available = 10`, ціна 25, знижка 15 → ok.
  - `planUndo` запису з `discount: 15` → `next.downtime.training = { kind: "characteristic", key: "ws", discount: 15 }`; якщо в `characteristics.downtime.training` уже інший кредит → `{ ok: false, error: "LEDGER_STALE" }`.
  - `readCharacteristics` зберігає `discount` у леджері; `discount: 0` → леджер невалідний (повертається дефолт, як для інших полів).
Run: `pnpm test:run lib/utils/rules/systems/wfrp/advancement` → FAIL.

- [ ] **Step 2: Знижка — реалізація.** `LedgerEntry.discount?: number`; `LedgerEntrySchema.discount: z.number().int().min(1).max(1e6).optional()`; `isLedgerEntry`/`readLedger` — так само, як `tick`. У `planPurchase` після `careerPrice`:
```ts
const credit = request.kind === "talent" ? undefined : characteristics.downtime?.training;
const discounted = credit && credit.kind === request.kind && credit.key === request.key ? credit : undefined;
const price = discounted ? Math.max(0, cost - discounted.discount) : cost;
// available < price → INSUFFICIENT_XP; entry.cost = price; ...(discounted ? { discount: discounted.discount } : {})
// next.downtime: discounted ? { ...downtime, training: undefined → ключ прибрати } : без змін
```
  `planUndo`: після `undoLast`+`dropTick`, якщо `entry.discount`: наявний `downtime.training` → `LEDGER_STALE`, інакше `downtime = { ...(next.downtime ?? { ailments: [] }), training: { kind: entry.kind as "characteristic" | "skill", key: entry.key, discount: entry.discount } }`. `advance-handler.ts` не змінюється. Step 1 → PASS.

- [ ] **Step 3: Хук системи й дрібні зміни.** `RuleSystemDowntime` у `types.ts` + `downtime?: RuleSystemDowntime` у `RuleSystemDefinition`; `WFRP_SYSTEM.downtime = WFRP_DOWNTIME`; тип у `systems/index.ts`. Тест реєстру: `RULE_SYSTEM_REGISTRY.wfrp.downtime?.maxDays === 30`, `homm.downtime === undefined`, `dnd5e.downtime === undefined`. `assertNotInActiveBattle(campaignId, ids, message = API_ERRORS.CHARACTER_IN_BATTLE)`. `loadStashState` — перенести тіло з `stash-update.ts:76-88` у `core/stash-state.ts` (імпорти `ensureInventory`, `normalizeItems`, `normalizeStash`, `attunedRefs`), `stash-update.ts` імпортує звідти. Run: `pnpm test:related lib/server/characters/battle-lock.ts lib/server/characters/operations/stash-update.ts lib/utils/rules/systems/registry.ts` → PASS.

- [ ] **Step 4: E2E-тести обробників** (`wfrp-downtime-e2e.test.ts`, моки за зразком `wfrp-careers-e2e.test.ts`: `vi.hoisted` стан рядків героїв і інвентарів; `prisma.$transaction(fn) → fn(h)`; `$queryRaw` віддає рядки для `lockCharacters`; `$executeRaw` для `lockCampaignArtifacts`; `characterInventory.findUnique/create/update` для `ensureInventory`/гаманця; `characterLog.createMany`, `inventoryLog.createMany`; `battleParticipant.findFirst` для бою; `character.findMany/count/update`; `career.findMany`). Rng детермінується `vi.spyOn(Math, "random")`. Кейси:
  - PUT: власник ставить `earn charm` → 200, `downtime.endeavour` записано; ДМ ставить `ailments` без `id` → кожна отримує `id`; гравець шле `ailments` → 403 `FORBIDDEN`; чужий гравець → 403 (гейт); `train` без Research → 409 `SKILL_UNTRAINED`; `tend` з `patientId` іншої кампанії → 400 `REST_CHARACTERS_INVALID`; власник в активному бою → 409 `DOWNTIME_IN_BATTLE`; homm-кампанія → 409 `DOWNTIME_UNSUPPORTED`; `endeavour: null` знімає заняття, `lastPeriod`/`training` не чіпає.
  - Period: два герої (earn charm з `Silver 2` у кар'єрі; rest) `days: 7` → `resources.hp` вилікувано, `characteristics.downtime.lastPeriod.id === periodId` в обох, гаманець першого `silver += 2×max(1,SL)`, `inventoryLog` з `MONEY_GAIN`, `characterLog` `DOWNTIME` для обох; відповідь — дельта з `purse` лише в першого.
  - **Review Focus 1:** `days` 0 і 31 → 400 `DOWNTIME_DAYS_INVALID`; `days: 1.5` і `-1` → 400 (`parseBody`/схема); `days: 30` → `hp` не вище `maxHp` (ключ `hp` відсутній); у всіх 400-кейсах `character.update` не викликано.
  - **Review Focus 3:** мертвий герой у періоді → `resources` незмінні, `lastPeriod.summary.skipped === "dead"`, `DOWNTIME`-журнал з позначкою; `characterIds` з неактивним/чужим id → 400 `REST_CHARACTERS_INVALID`.
  - **Review Focus 4:** будь-який герой періоду в активному бою → 409 `DOWNTIME_IN_BATTLE`, нічого не записано.
  - **Review Focus 5:** гаманець `silver = 2_147_483_647`, дохід у `sp` → 409 `MONEY_OVERFLOW`; моки `character.update`, `characterInventory.update`, `characterLog.createMany`, `inventoryLog.createMany` не викликані (обробник перевіряє всі гаманці до першого запису).
  - `outOfCombat.persistResources = false` → 409 `OOC_RESOURCES_DISABLED`.
  - Undo: успішний відкат → `hp`, `ailments`, `training` з `before`, `lastPeriod` відсутній, гаманець повернуто, `MONEY_SPEND` і `DOWNTIME {undo: true}` у журналах.
  - **Review Focus 2:** повторний undo того ж `periodId` → 409 `DOWNTIME_STALE`; після ручної зміни `resources.hp` одного з двох героїв → `DOWNTIME_STALE`, другий герой теж не змінений; після витрати доходу (гаманець 0) → `DOWNTIME_STALE`; після покупки зі знижкою (`training` зник) → `DOWNTIME_STALE`; ДМ зберіг лист через PATCH після періоду → `lastPeriod` збережено (Task 1) і undo працює.
Run: `pnpm test:run lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts` → FAIL.

- [ ] **Step 5: Схеми, обробник, операції, маршрути.**
  - `setDowntime(gate, input)`: `ruleSystemOf(access.campaign.rules).downtime` або 409 `DOWNTIME_UNSUPPORTED`; `character.status !== ACTIVE` → 400 `REST_CHARACTERS_INVALID`; `input.ailments && !access.isDM` → 403 `FORBIDDEN`; `assertNotInActiveBattle(campaignId, [id], API_ERRORS.DOWNTIME_IN_BATTLE)`; `tend` → `prisma.character.count({ where: { id: patientId, campaignId, status: ACTIVE } }) === 1` інакше 400 `REST_CHARACTERS_INVALID`; у `$transaction`: `lockCharacters` → `validateEndeavour(endeavour, locked.characteristics)` → 409 `SKILL_UNTRAINED`; `next = { ...(c.downtime ?? { ailments: [] }), endeavour?, ailments: input.ailments?.map(a => ({ ...a, id: a.id ?? randomUUID() })) ?? prev }` (без `endeavour` при `null`); `tx.character.update({ data: { characteristics: characteristicsJson({ ...c, downtime: next }) } })`.
  - `passPeriod(access, input)`: (1) `downtime` системи або 409 `DOWNTIME_UNSUPPORTED`; `!outOfCombat.persistResources` → 409 `OOC_RESOURCES_DISABLED`; `days` поза 1..`downtime.maxDays` → `ContentError(DOWNTIME_DAYS_INVALID, 400)`. (2) `ids = [...new Set(characterIds)]`; `findMany({ where: { id: { in: ids }, campaignId, status: ACTIVE }, select: { id, level, constitution, archetype, characteristics } })`; довжина ≠ → 400 `REST_CHARACTERS_INVALID`; `assertNotInActiveBattle(…, API_ERRORS.DOWNTIME_IN_BATTLE)`. (3) поза транзакцією: кар'єри `prisma.career.findMany({ where: { id: { in: careerIds }, campaignId } })` → `status = toCareerData(row).tiers[state.tier - 1]?.status`; `maxHp = characterBaseHp(c, { rules, characteristics: c.characteristics }).total`. (4) `$transaction`: `lockCharacters(tx, ids)` (свіжі `resources`/`characteristics`) → `planPeriod({ heroes, days, rules: campaign.rules, rng: Math.random, periodId: randomUUID(), now: new Date().toISOString() })`; якщо є `coins` — один `lockCampaignArtifacts(tx, campaign.id)`, для кожного: `loadStashState` → `applyStashAction(state, { action: "gain", amount, coin }, { newItemId: randomUUID() })`, `!ok` → `ContentError(MONEY_OVERFLOW, 409)` — **усі гаманці перевіряються до першого `update`**; далі `characterInventory.update` (`gold/silver/copper`), `writeInventoryLog`, `character.update` (`resources`, `characteristicsJson`), `writeCharacterLog` (`DOWNTIME`, `data: { periodId, days, summary }`). (5) повертає дельту.
  - `undoPeriod(access, input)`: ті ж кроки (1) без днів і (2); у транзакції для кожного героя перевірка: `d = characteristics.downtime`; `d?.lastPeriod?.id !== periodId` → STALE; `resources.hp !== after.hp`, `sorted(d.ailments.map(a => a.id))` ≠ `sorted(after.ailmentIds)`, `JSON.stringify(d.training) !== JSON.stringify(after.training)` → STALE; гроші: `applyStashAction(state, { action: "spend", amount, coin, note: "" }, { newItemId, coinValue: currencyValueOf(campaign.rules) })`, `!ok` → STALE. Лише після перевірки всіх — запис: `resources` з `before.hp` (`undefined` → прибрати ключ `hp`), `downtime = { endeavour, ailments: before.ailments, training: before.training }` без `lastPeriod`, гаманці, `writeInventoryLog` (`MONEY_SPEND`), `writeCharacterLog` (`DOWNTIME`, `{ periodId, undo: true }`).
  - Операції: `downtime.ts` — `defineCharacterOperation({ name: "downtime.set", action: "set downtime", schema: downtimeSetSchema, gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)), run: setDowntime })`, `export const PUT = characterRoute(...)`; `downtime-period.ts` і `downtime-period-undo.ts` — по одній операції з `gate: campaignGate`, `schema` з `lib/schemas/downtime.ts`, `run: passPeriod` / `run: undoPeriod`, кожен файл `export const POST = characterRoute(...)` (як `operations/rest.ts`). Маршрути — лише реекспорт (парсер `exportedHttpMethods` у тесті покриття читає текст route-файлу): `period/route.ts` → `export { POST } from "@/lib/server/characters/operations/downtime-period";`, `period-undo/route.ts` → `export { POST } from "@/lib/server/characters/operations/downtime-period-undo";`, `characters/[characterId]/downtime/route.ts` → `export { PUT } from "@/lib/server/characters/operations/downtime";`.
  - Асистент/MCP: `PROGRESSION_INPUTS` += `"downtime.set": withId(downtimeSetSchema)`, `"downtime.period": downtimePeriodSchema.strict()`, `"downtime.period.undo": downtimePeriodUndoSchema.strict()` (з них будуються дії `characters.downtime.*`); `ASSISTANT_ROUTE_COVERAGE` += три рядки `{ route: 'campaigns/[id]/characters/[characterId]/downtime', methods: ['PUT'], task: 9, adapter: 'characters', state: "active" }`, `{ route: 'campaigns/[id]/downtime/period', methods: ['POST'], … }`, `{ route: 'campaigns/[id]/downtime/period-undo', methods: ['POST'], … }`.
  - `CHARACTER_OPERATIONS`: `"downtime.set"`, `"downtime.period"`, `"downtime.period.undo"`; `CHARACTER_ACTION_COVERAGE`: `["PUT", \`${hero}/downtime\`, "downtime.set", "wfrp-downtime-e2e"]`, `["POST", "campaigns/[id]/downtime/period", "downtime.period", "wfrp-downtime-e2e"]`, `["POST", "campaigns/[id]/downtime/period-undo", "downtime.period.undo", "wfrp-downtime-e2e"]`.
Run: `pnpm test:run lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts lib/server/assistant/__tests__/coverage.test.ts lib/server/assistant/__tests__/character-coverage.test.ts app/api/__tests__/openapi-route.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/openapi-4f4.test.ts` → PASS. OpenAPI-бюджет — те саме правило, що в Task 2 Step 4 (підняти до виміряного + ≥1000, округлити до тисячі, коментар `5h-4 downtime actions ~<N> KB`; понад 196_000 — зупинитися й повідомити контролеру).

- [ ] **Step 6: Клієнт.** `types/downtime.ts`, `lib/api/downtime.ts` (сигнатури вище). `useDowntime`: `useCrudMutation({ mutationFn: (body: DowntimeSetBody) => putDowntime(campaignId, characterId, body), onSuccess: (r) => qc.setQueryData<Character>(characterKeys.detail(campaignId, characterId), (old) => old && { ...old, characteristics: { ...(old.characteristics as object), downtime: r.downtime } }), errorText: t("saveFailed") })` (`useCrudMutation` має `onSuccess`, `invalidateKeys`, `errorText` — `lib/hooks/common/useCrudMutation.ts:23-37`; `qc = useQueryClient()`). `useDowntimePeriod`/`useDowntimePeriodUndo`: `invalidateKeys: [characterKeys.details(c), characterKeys.sheet(c), characterKeys.lists(c), characterKeys.logs(c), characterKeys.stashes(c), characterKeys.inventoryLogs(c)]`, `errorText: t("periodFailed")`/`t("undoFailed")` з `useTranslations("wfrpDowntime.errors")` (ключі додає Task 4). Експорт у `lib/hooks/characters/index.ts`. Тест хуків не потрібен (тонкі обгортки); перевірка — `pnpm test:related lib/hooks/characters/useDowntime.ts lib/api/downtime.ts` і `pnpm exec eslint` на файлах (типи перевіряє `@typescript-eslint` з type-info).

- [ ] **Step 7: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): downtime period routes, purse income and train discount"` + Co-Authored-By.

---

## Task 4: UI — вкладка «Простій», панель ДМ, підвантаження namespace (dispatch 4)

**Files:**
- Create: `components/systems/wfrp/downtime/{DowntimeTab,EndeavourPicker,AilmentsEditor,PeriodSummaryView,DowntimePeriodPanel}.tsx`, тести `components/systems/wfrp/downtime/__tests__/{DowntimeTab,DowntimePeriodPanel}.test.tsx`
- Modify: `components/systems/types.ts` (`SystemUi.DowntimeTab?`, `DowntimePeriodPanel?`, `DowntimePeriodPanelProps`), `components/systems/wfrp/index.ts` (dynamic-імпорт обох), `components/character-profile/ProfileTabs.tsx:7` (`ProfileTabId` += `"downtime"`), `components/character-profile/CharacterProfile.tsx:36-50,125` (`VIEW_TABS`, `viewTabs.withDowntime`), `components/characters/rest/PartyRestActions.tsx`, `app/campaigns/[id]/character/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/page.tsx`, `app/campaigns/[id]/dm/characters/page.tsx`, `app/campaigns/[id]/dm/rules/page.tsx`, `messages/{uk,en}/wfrpDowntime.json` (UI-ключі), `messages/{uk,en}/characterProfile.json` (`tabs.downtime`)
- Test: `components/systems/__tests__/registry.test.tsx`, `app/campaigns/[id]/character/__tests__/page.test.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/__tests__/page.test.tsx`, `app/campaigns/[id]/dm/characters/__tests__/page-client.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`readCharacteristics(...).downtime`, типи), Task 2 (`ENDEAVOUR` kinds, `MAX_DAYS` через `system.downtime.maxDays`), Task 3 (`useDowntime`, `useDowntimePeriod`, `useDowntimePeriodUndo`, `DowntimePeriodResult`).
- Produces:
```ts
export interface DowntimePeriodPanelProps { campaignId: string; characters: CharacterListItem[] }
// SystemUi: DowntimeTab?: ComponentType; DowntimePeriodPanel?: ComponentType<DowntimePeriodPanelProps>
```
- Ключі `wfrpDowntime` (uk/en, плоскі групи): `tab.{endeavourTitle,ailmentsTitle,summaryTitle,noEndeavour,noAilments,noSummary,save,clear,trainingCredit}`, `endeavours.{earn,train,tend,rest,custom}`, `endeavourHints.{earn,train,tend,rest,custom}`, `params.{skill,trade,charm,spec,trainKind,trainKey,patient,text}`, `ailments.{festering,disease,injury}`, `ailmentForm.{label,days,add,remove}`, `summary.{skippedDead,skippedIncapacitated,healed,coins,discount,patientAbsent,expired,event,daysLeft,test}`, `panel.{button,title,days,daysHint,heroes,all,submit,result,undo,undoConfirm,undone}`, `errors.{saveFailed,periodFailed,undoFailed}`, `events.1..10` (з Task 2).

- [ ] **Step 1: Тести** (`// @vitest-environment happy-dom`; рендер через наявні тест-хелпери i18n — `grep -l "renderWithIntl\|IntlTestProvider" lib/i18n/test*`; хуки мокаються `vi.mock("@/lib/hooks/characters", …)`):
  - `registry.test.tsx`: `systemUiOf("wfrp").DowntimeTab` і `.DowntimePeriodPanel` визначені; для `homm`/`dnd5e` — `undefined`.
  - `DowntimeTab.test.tsx`: власник бачить вибір заняття й список недуг без кнопок редагування; ДМ бачить «додати недугу»; вибір `train` показує поля цілі; збереження викликає `useDowntime().mutateOk({ endeavour })` без `ailments` для гравця і з `ailments` для ДМ; з `training` показується рядок кредиту; з `lastPeriod` — `PeriodSummaryView` (текст події через `dynamicTextRef` перекладається); `summary.skipped = "dead"` показує відповідний текст.
  - `DowntimePeriodPanel.test.tsx`: кнопка відкриває діалог; за замовчуванням вибрані всі передані герої; `days` поза 1..30 блокує submit; submit → `useDowntimePeriod().mutateOk({ days, characterIds })`; після відповіді показується підсумок по героях і кнопка «Відкотити період» → `useConfirm` → `useDowntimePeriodUndo().mutateOk({ periodId, characterIds })`.
  - `page-client.test.tsx` (`PartyRestActions` на сторінці ДМ): wfrp + `persistResources` → панель рендериться; homm → немає.
  - Тести сторінок (`character/page`, `dm/characters/[characterId]/page`): мок `isWfrpCampaign` (як у `app/campaigns/[id]/__tests__/layout.test.tsx:11`) і `ExtendLocaleScope` з `data-scope` → для wfrp обгортка з `wfrpDowntime`, для homm без неї.
Run: `pnpm test:run components/systems components/character-profile "app/campaigns/[id]/character" "app/campaigns/[id]/dm/characters"` → FAIL.

- [ ] **Step 2: Компоненти.**
  - `DowntimeTab`: `useProfile()` (`campaignId`, `characterId`, `sheet.viewer.isDM`), `useCharacter` → `readCharacteristics(character.data).downtime ?? { ailments: [] }`, `useCharacters(campaignId, { type: CharacterType.PLAYER })` для пацієнтів (без себе), `useDowntime`. Розділи `HudSection`: «Заняття» (`EndeavourPicker`, кнопки «Зберегти»/«Зняти»), «Недуги» (`AilmentsEditor`, редагування лише ДМ; збереження шле `{ endeavour: поточне ?? null, ailments }`), «Останній період» (`PeriodSummaryView` з `lastPeriod.summary`). Кредит `training` — `t("tab.trainingCredit", { key, discount })`.
  - `EndeavourPicker`: `SelectField` виду; параметри: earn → перемикач trade/charm + `spec` (лише `[a-z0-9-]`), train → вид (characteristic/skill) + ключ (характеристики з `CHARACTERISTIC_KEYS` і `gameTerms.characteristics.*.short`; навички — `sheet.wfrp.skills`, ключ `skillAdvanceKey(key, spec)`), tend → пацієнт, custom → текст ≤ 200. Валідацію повторює сервер (409 показується через `errorText`).
  - `PeriodSummaryView({ summary, days })`: підсумок — лікування, заняття (тест: кидок/ціль/SL/результат через `rest.log.test`-подібний формат з `wfrpDowntime.summary.test`), монети з `currency.labelKeys`, знижка, недуги (спливла/лишилось днів/festering-тест), подія (`useTranslations()` для `dynamicTextRef` — як рядки таблиць у `TablesSection.tsx:96`).
  - `DowntimePeriodPanel({ campaignId, characters })`: `Button` «Минув період» → діалог (`Dialog` з `@/components/ui`): `days` (1..`system.downtime.maxDays`, за замовчуванням 7), чекбокси героїв (усі `characters` за замовчуванням), submit; після успіху — список `PeriodSummaryView` по героях з відповіді (`resources`/`downtime.lastPeriod.summary`), кнопка «Відкотити період» з `useConfirm`.
  - `SystemUi` слоти, `WFRP_UI`: `const DowntimeTab = dynamic(() => import("./downtime/DowntimeTab").then((m) => m.DowntimeTab));` і так само `DowntimePeriodPanel`.
  - `CharacterProfile`: `VIEW_TABS` += `"downtime"` (після `"advancement"`); `viewTabs` отримує `withDowntime: ComponentType | false` = `(sheet.viewer.isDM || sheet.viewer.isOwner) && (systemUiOf(sheet.system).DowntimeTab ?? false)`, вкладка `{ id: "downtime", label: t("downtime"), content: <Downtime /> }` після «Розвитку». `characterProfile.tabs.downtime`: uk «Простій», en «Downtime».
  - `PartyRestActions`: `const Panel = system?.downtime && ooc.persistResources ? systemUiOf(key).DowntimePeriodPanel : undefined;` (`key` з `useRuleSystem`), `{Panel && <Panel campaignId={campaignId} characters={characters} />}` після кнопки «Нова сесія».

- [ ] **Step 3: Підвантаження namespace (рішення користувача, варіант 2).** На кожній сторінці — `(await isWfrpCampaign(id)) ? <ExtendLocaleScope namespaces={["wfrpDowntime"]}>{content}</ExtendLocaleScope> : content` (зразок — `app/campaigns/[id]/dm/rules/page.tsx:43`):
  - `app/campaigns/[id]/character/page.tsx` — обгорнути гілку з `CharacterProfile`;
  - `app/campaigns/[id]/dm/characters/[characterId]/page.tsx` — обгорнути весь повернутий JSX;
  - `app/campaigns/[id]/dm/characters/page.tsx` — обгорнути `DMCharactersClient`;
  - `app/campaigns/[id]/dm/rules/page.tsx` — `namespaces={["battleWfrp", "wfrpDowntime"]}`.
  `scopes.ts` не змінювати.

Run: Step 1 → PASS; `pnpm test:related components/character-profile/CharacterProfile.tsx components/characters/rest/PartyRestActions.tsx` → PASS.

- [ ] **Step 4: Lint і коміт** — `pnpm exec eslint --fix <файли задачі>`; `git commit -m "feat(wfrp): downtime tab and DM period panel"` + Co-Authored-By.

---

## Task 5: i18n-повнота, what's new, довідка, e2e-сценарій, docs (dispatch 5)

**Files:**
- Modify: `lib/i18n/__tests__/label-keys-rule-systems.test.ts`, `lib/i18n/__tests__/scope-size.test.ts`, `lib/onboarding/whats-new.ts`, `messages/{uk,en}/whatsNew.json`, `lib/onboarding/help/dm.ts:100-110`, `messages/{uk,en}/help.json` (`dm-rule-systems.sections.s7`), `lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts`, `docs/architecture/rule-systems.md`, `docs/STATUS.md`
- Test: ті самі тест-файли + `lib/i18n/__tests__/{parity,untranslated,messages}.test.ts`, тести онбордингу (`grep -rl "WHATS_NEW\b" lib/onboarding/__tests__`)

**Interfaces:**
- Consumes: усі попередні задачі.
- Produces: —

- [ ] **Step 1: Ключі.** У `label-keys-rule-systems.test.ts`:
```ts
expectLabelKeys("wfrpDowntime", "endeavours", ["earn", "train", "tend", "rest", "custom"]);
expectLabelKeys("wfrpDowntime", "endeavourHints", ["earn", "train", "tend", "rest", "custom"]);
expectLabelKeys("wfrpDowntime", "ailments", ["festering", "disease", "injury"]);
expectLabelKeys("wfrpDowntime", "events", DEFAULT_TABLES.downtimeEvent.map((_, i) => String(i + 1)));
expectLabelKeys("wfrpTables", "slots", [...TABLE_SLOTS]);
```
  (`DEFAULT_TABLES` з `@/lib/utils/rules/systems`, `TABLE_SLOTS` з `@/lib/utils/rules/tables-schema`; якщо `expectLabelKeys` для `slots` уже є в іншому файлі — не дублювати.)
- [ ] **Step 2: `scope-size`.** Додати в `SCOPES` рядок `{ name: "wfrpDowntime page extra", namespaces: ["wfrpDowntime"], limit: WFRP_DOWNTIME_PAGE_LIMIT_KB }` з `const WFRP_DOWNTIME_PAGE_LIMIT_KB = 2;` і коментарем `// loaded per page via ExtendLocaleScope (character pages, DM characters, DM rules), not in the layout scope; measured uk gzip <N> KB` (число — з `console.info` прогону). Наявні ліміти не чіпати. Run: `pnpm test:run lib/i18n/__tests__/scope-size.test.ts` → PASS (жоден наявний рядок не виріс понад ліміт; якщо `campaign` 105 KB перевищено через `characterProfile.tabs.downtime` — зупинитися й повідомити контролеру).
- [ ] **Step 3: What's new і довідка.** `whats-new.ts`: першим рядком `{ id: "2026-11-08-wfrp-downtime", date: "2026-11-08", audience: "all" }`. `whatsNew.json` uk: `title` «Grim d100: простій», `body` «Між пригодами майстер натискає «Минув період» у списку персонажів: рани загоюються, недуги спливають або загострюються, кожен герой виконує обране заняття (заробіток, навчання, лікування товариша, відпочинок), а таблиця подій додає випадковість. Заняття обирають на вкладці «Простій» на аркуші; останній період майстер може відкотити.»; en — переклад. `help/dm.ts` — восьма секція `{ blocks: [{ kind: "p" }, { kind: "p" }] }`; `help.json` `s7` uk: `heading` «Простій», `b0` — як працює «Минув період» (дні 1–30, вибір героїв, порядок: заняття → лікування → недуги → подія; мертві пропускаються, непритомні не виконують заняття), `b1` — заняття й недуги на вкладці «Простій», дохід у гаманці, знижка навчання на наступну покупку, таблиця подій у правилах (секція таблиць), відкат лише останнього періоду до ручних змін; en — переклад. Run: `pnpm test:related lib/onboarding/whats-new.ts lib/onboarding/help/dm.ts` і `pnpm test:run lib/i18n/__tests__/parity.test.ts lib/i18n/__tests__/untranslated.test.ts` → PASS.
- [ ] **Step 4: E2E-сценарій** (дописати в `wfrp-downtime-e2e.test.ts`, використовуючи моки Task 3 і операції `advanceOperation`/`advanceUndoOperation` як у `wfrp-careers-e2e.test.ts`): PUT `train characteristic ws` (Research з просуваннями) → period з успішним кидком → `downtime.training.discount` > 0 → `advance { kind: "characteristic", key: "ws" }` → `entry.cost` зменшено, кредит знято → `period-undo` → 409 `DOWNTIME_STALE` → `advance-undo` → кредит повернуто → `period-undo` → 200. Окремий кейс: `dnd5e`-кампанія → усі три операції 409 `DOWNTIME_UNSUPPORTED`. Run: `pnpm test:run lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts` → PASS.
- [ ] **Step 5: Docs.** `docs/architecture/rule-systems.md`: рядок у таблиці «Реєстр і хуки» — `downtime` | `RuleSystemDowntime`: `planPeriod`, `validateEndeavour`, `maxDays`; `undefined` у d20 | `downtime-handler.ts`, операції `downtime.*`; рядок у таблиці модулів — `wfrp/downtime/`; розділ «Межі 5h-4» (стан у `characteristics.downtime` без міграцій; приватність; namespace `wfrpDowntime` поза layout-scope на чотирьох сторінках, рядок `scope-size` 2 KB; знижка `train` — поле леджера `discount`, ціна зі знижкою не показується на «Розвитку»; стан з події поза боєм не зберігається; без леджера постійних травм; бюджет OpenAPI — фактичне число з Task 2); у перелік «Звірити з книгою» — усі числа `wfrp/downtime/constants.ts`, дефолтна таблиця `downtimeEvent`, формула доходу за статусом, тести endeavours, механіка festering/disease. `docs/STATUS.md`: у рядок WFRP після 5h-2 — «**5h-4 (простій) реалізовано на `feat/wfrp`, не змерджено:** «Минув період» (лікування, недуги, заняття з доходом/знижкою, подія `downtimeEvent`, відкат), вкладка «Простій»; без міграцій; namespace `wfrpDowntime` посторінково; e2e `wfrp-downtime-e2e.test.ts`; межі — «Межі 5h-4».» Шляхи spec/план не переносити в archive (епік не змерджено).
- [ ] **Step 6: Lint і коміт** — `pnpm exec eslint --fix <змінені .ts>`; `git commit -m "docs(wfrp): 5h-4 downtime boundaries, help and status"` + Co-Authored-By.

---

## Task 6: Контролер — /simplify, повна перевірка, live-run, фінальне рев'ю

- [ ] **Step 1: `/simplify`** на diff гілки від `84b0011b9` (1–2 агенти, Sonnet); виправлення — окремим комітом `refactor(wfrp): simplify 5h-4`.
- [ ] **Step 2: Lint змінених файлів** (НЕ repo-wide): `git diff --name-only 84b0011b9..HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint`.
- [ ] **Step 3: Повний прогін.** Спершу `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` — якщо активний важкий процес іншої сесії, чекати. Потім один раз `pnpm test:run` (очікувано: усі тести зелені; процес довше ~5 хв — вбити й прогнати вужче).
- [ ] **Step 4: Live-run через суб-агента** (Sonnet, браузер, масштабовані скріншоти, перевірки JS/текстом): wfrp-кампанія — гравець обирає заняття (earn/train/tend), ДМ додає недугу, ДМ «Минув період» на 7 днів → підсумок, гаманець, журнал, вкладка «Простій» гравця; «Відкотити період»; редактор таблиць показує «Події простою» з перекладеними текстами; homm-кампанія — немає ні вкладки, ні кнопки; ширина 375 px. Тестові дані видалити після прогону.
- [ ] **Step 5: Фінальне Opus-рев'ю** гілки (spec + план + diff від `84b0011b9`), з Review Focus як чеклістом; виправлення — Sonnet-виконавцем, повторний `pnpm test:related` на змінених файлах.
- [ ] **Step 6:** оновити `docs/STATUS.md` (виконано `/simplify`, live-run, рев'ю) і закомітити. Не мерджити, не пушити.
