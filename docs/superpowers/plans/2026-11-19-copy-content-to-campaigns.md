# Копіювання контенту бібліотек в інші кампанії — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Per project rules: agents write tests but do not run the full suite; one full `pnpm test:run` at the end of each stage; per-task use `pnpm test:run <file>` / `pnpm exec eslint --fix <files>`.

**Goal:** DM копіює вибраний контент бібліотеки (13 видів `ContentKind`, потім звуки, потім карти) в одну, кілька або всі свої кампанії.

**Architecture:** Ядро = існуючий бандл-шлях шаблонів (`exportCampaign` → вибіркове замикання залежностей → `importBundle`). `importBundle` отримує два опціональні розширення: `reuse` (id джерела → id наявного рядка цілі, без запису) і `detached` (без `sourceId`/`sourceHash`/`slug`, бо це не шаблонне походження). Сервіс `lib/server/content/copy/` будує план, застосовує його по кожній цілі окремою транзакцією; тонкий роут; хук; діалог.

**Tech Stack:** Next.js 16, Prisma 6, Zod, TanStack Query, next-intl, Supabase Storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-copy-content-to-campaigns-design.md`

## Global Constraints

- Цілі: лише кампанії, де користувач `CampaignRole.DM`; джерело з «усі» виключається. Чужа/недоступна явна ціль → 403, не мовчазний пропуск.
- Копія незалежна: `sourceId`, `sourceHash`, `slug` = `null`. Дубль за назвою в цілі → використати наявний (`reused`); вибраний елемент, що вже є → `skipped`.
- Збій однієї цілі не відкочує інші: кожна ціль у власній транзакції.
- Помилки `{ error, issues? }` з `lib/constants/api-errors.ts`; тексти UI в `messages/{uk,en}/*.json`, у коді кирилиці немає (ESLint).
- Компоненти й `app/**` не імпортують `@/lib/api/*` і не викликають `fetch`; шлях: роут → `lib/api/content-copy.ts` → `lib/hooks/content-copy/` → компонент.
- Файли звуків і фонів карт копіюються як нові об'єкти в сховищі цілі (серверний `copy`, не скачування). Коментарі мінімальні, англійською.
- Кеш довідника цілі інвалідується один раз на ціль.

## Review Focus

- Цикл `spells ↔ units` / `artifacts ↔ artifact-sets` у вибраному: обидва копіюються, посилання перепризначені, нуль `warnings "→ null"`.
- Залежність вже є в цілі, але під іншим регістром/пробілами назви: має зіставитись (нормалізація `trim().toLowerCase()`).
- Фон-залежність `originFeatId` у `backgrounds`, коли feat уже є в цілі: перевірка цілісності не має падати.
- Ціль не підтримує вид (модуль не в композиції): елемент `skipped` з причиною, решта копіюється.
- Повторний запуск того самого копіювання: нуль створених, усе `skipped`, без дублів.

---

## Файлова структура

| Файл | Відповідальність |
|---|---|
| `lib/server/templates/import-bundle.ts` (змінити) | `ImportOptions { reuse?, detached? }` |
| `lib/utils/content/import-order.ts` (створити) | чиста `importOrder` (перенесена зі `scripts/templates/lib/import-order.ts`, у скрипті лишається реекспорт) |
| `lib/server/content/copy/closure.ts` | замикання залежностей над бандлом (чиста функція) |
| `lib/server/content/copy/plan.ts` | зіставлення з ціллю за назвою, відсів, підтримка виду |
| `lib/server/content/copy/targets.ts` | вибір цілей і перевірка ролі DM |
| `lib/server/content/copy/apply.ts` | запис однієї цілі (транзакція, кеш) |
| `lib/server/content/copy/service.ts` | `copyContent(...)` оркестрація по цілях |
| `lib/server/content/copy/schema.ts` | Zod-схеми тіла/відповіді |
| `app/api/campaigns/[id]/content-copy/route.ts` | GET (опції), POST (копіювання) |
| `types/content-copy.ts` | спільні типи |
| `lib/api/content-copy.ts`, `lib/hooks/content-copy/{index,keys,useContentCopy,useContentCopyOptions}.ts` | клієнт |
| `components/content-copy/ContentCopyDialog.tsx` (+ кроки) | UI |

Перевикористано: `exportCampaign`, `importBundle`, `remapIds`/`collectKeysAndStrings`, `BUNDLE_TABLES`/`tableOfKind`, `newContentId`, `isKindActive`, `requireDM`, `parseBody`, `withCampaignContentWrite`, `loadNames`, `ContentTransferButtons`.

---

# Етап 1: ядро + 13 `ContentKind` + UI

### Task 1: Розширити `importBundle` (`reuse`, `detached`)

**Files:**
- Modify: `lib/server/templates/import-bundle.ts` (`importBundle`, `buildIdMap`, `buildWrites`, `assertBackgroundRefs`)
- Test: `lib/server/templates/__tests__/import-bundle-copy.test.ts`

**Interfaces:**
- Produces:
```ts
export interface ImportOptions {
    /** source id → id of an existing row in the target; not written, only mapped */
    reuse?: ReadonlyMap<string, string>;
    /** copy between campaigns: no sourceId/sourceHash/slug */
    detached?: true;
}
export async function importBundle(
    tx: TemplateDb, raw: Bundle, targetCampaignId: string,
    layer?: ImportLayer, options?: ImportOptions
): Promise<{ idMap; warnings; hashes }>;
```

- [ ] **Step 1: Failing tests** (на двох-трьох тест-даблах/Prisma-моках за прикладом існуючих `lib/server/templates/__tests__/*`; якщо там є інтеграційний харнес — використати його). Кейси:
  1. `reuse` {srcRace→tgtRace}: unit у бандлі має `raceId=srcRace`; після імпорту записаний unit має `raceId=tgtRace`, `warnings` порожні, рядок race НЕ записується.
  2. `reuse`-id не потрапляє в `BUNDLE_FOREIGN_CONTENT` (він існує в БД, але належить цілі).
  3. `detached`: записані рядки мають `sourceId: null`, `sourceHash: null`, `slug: null`.
  4. `backgrounds` з `originFeatId`, який у `reuse`: `assertBackgroundRefs` не кидає.
  5. Без `options` поведінка не змінилась (існуючі тести проходять).
- [ ] **Step 2:** `pnpm test:run lib/server/templates/__tests__/import-bundle-copy.test.ts` → FAIL.
- [ ] **Step 3: Реалізація.**
  - `buildIdMap`: після побудови мапи додати `for (const [from, to] of options.reuse ?? []) idMap.set(from, to)` (id з `reuse` не мають бути серед рядків бандла).
  - `findForeignContentIds`: `ownIds` = `new Set([...idMap.keys()])` (вже так; `reuse` ключі входять) — перевірити, що це покриває кейс 2; якщо ні, додати `reuse.values()` у `ownIds`.
  - `buildWrites`: у перевірці FK-обнулення `!idsByTable.get(target)!.has(ref)` додати `&& !reuse?.has(ref)`; для `detached` у `stored` ставити `{ id: idMap.get(row.id)!, sourceId: null, sourceHash: null }` і `slug: null`; `assertNoLeak` виключає id з `reuse` із `sourceIds` (вони перемаплені на цільові).
  - `assertBackgroundRefs`: приймає `reuse`; для `originFeatId` і spell-id із `reuse` вважати посилання коректним (передати в `backgroundReferenceError` множини ключів `reuse`; якщо функція вимагає рядки feats, додати мінімальні заглушки `{ id }` для reused feats — перевірити сигнатуру в `lib/utils/backgrounds/integrity.ts`).
- [ ] **Step 4:** тести PASS; `pnpm exec eslint --fix lib/server/templates/import-bundle.ts lib/server/templates/__tests__/import-bundle-copy.test.ts`.
- [ ] **Step 5: Commit** `feat(templates): importBundle reuse and detached options for cross-campaign copy`.

### Task 2: Чиста `importOrder` у `lib/utils`

**Files:**
- Create: `lib/utils/content/import-order.ts` (перенести тіло з `scripts/templates/lib/import-order.ts`, `PackKind` лишити там, у новому файлі узагальнити на `string`)
- Modify: `scripts/templates/lib/import-order.ts` (реекспорт/тонка обгортка, поведінка не змінюється)
- Test: існуючий тест import-order у `scripts/templates/__tests__` лишається зеленим.

**Interfaces:** Produces `importOrder<K extends string>(kinds: readonly K[]): K[]` (топологічно за залежностями; `artifacts ↔ artifact-sets` як у скрипті).

- [ ] **Step 1:** прочитати `scripts/templates/lib/import-order.ts`; якщо він залежить від `PackKind`-констант зі `scripts/`, перенести лише чисту логіку і залежність (граф) як параметр або константу в `lib/constants/content-kinds.ts`.
- [ ] **Step 2:** перенести, скрипт імпортує з `@/lib/utils/content/import-order`.
- [ ] **Step 3:** `pnpm test:run scripts/templates/__tests__` (тільки тести import-order) → PASS.
- [ ] **Step 4: Commit** `refactor(content): move importOrder into lib/utils for reuse`.

> Якщо порядок за видами виявиться зайвим (бандл-імпорт пише таблиці в порядку `BUNDLE_TABLES`, а посилання перемаплює `idMap`), ця задача зводиться до «нічого не переносити»: порядок записів не потрібен, бо `importBundle` сам обробляє цикли через спільний `idMap`. Виконавець перевіряє це на Task 1 і, якщо так, пропускає Task 2 і вилучає її з файлової структури.

### Task 3: Замикання залежностей (`closure.ts`)

**Files:**
- Create: `lib/server/content/copy/closure.ts`
- Test: `lib/server/content/copy/__tests__/closure.test.ts`

**Interfaces:**
- Consumes: `Bundle`, `BUNDLE_TABLES`, `tableOfKind`, `collectKeysAndStrings`, `CONTENT_ID_RE`.
- Produces:
```ts
export type CopyRow = { table: BundleTable; row: Record<string, unknown> & { id: string } };
export function selectClosure(
    bundle: Bundle,
    selected: ReadonlyArray<{ table: BundleTable; id: string }>
): { rows: CopyRow[]; missing: string[] };
```
Алгоритм: індекс `id → {table,row}` по всьому бандлу; BFS від вибраних; залежності рядка = значення FK-колонок із `BundleTableDef.fks` ∪ усі рядки з `collectKeysAndStrings(row)`, що збігаються з `CONTENT_ID_RE` і є в індексі. `missing` — посилання на id, яких немає в бандлі (будуть обнулені імпортом, повертаємо для звіту).

- [ ] **Step 1: Failing tests:** (a) unit → race + spell у JSON `abilities`, повертає 3 рядки; (b) цикл spell ↔ unit не зациклюється; (c) невибраний чужий рядок не потрапляє; (d) `artifact` → `set` (FK) включається; (e) `itemStats` JSON-рядок з id всередині знаходиться (через `collectKeysAndStrings`).
- [ ] **Step 2:** запустити → FAIL. **Step 3:** реалізувати BFS. **Step 4:** PASS + eslint.
- [ ] **Step 5: Commit** `feat(content-copy): dependency closure over a campaign bundle`.

### Task 4: План проти цілі (`plan.ts`)

**Files:**
- Create: `lib/server/content/copy/plan.ts`
- Test: `lib/server/content/copy/__tests__/plan.test.ts`

**Interfaces:**
- Consumes: `selectClosure`, `exportCampaign` результат цілі, `isKindActive(kind, actor)`.
- Produces:
```ts
export type CopyPlan = {
    toCreate: CopyRow[];                       // повний замкнутий набір, без reused/skipped
    reuse: Map<string, string>;                // source id → target id
    reused: Array<{ kind: string; id: string; name: string }>;
    skipped: Array<{ kind: string; name: string; reason: 'exists' | 'kind-unsupported' }>;
    bundle: Bundle;                            // підмножина для importBundle (лише toCreate)
};
export async function buildCopyPlan(args: {
    source: Bundle; target: Bundle; targetActor: Actor;
    selected: Array<{ kind: string; ids: string[] }>;
}): Promise<CopyPlan>;
```
Правила: назва = `row.name ?? row.title`, ключ порівняння `trim().toLowerCase()` у межах таблиці. Вибраний, що є в цілі → `skipped:'exists'`. Залежність, що є в цілі → `reuse` + `reused`. Вид, непідтриманий цілью (`isKindActive` = false) → `skipped:'kind-unsupported'` (і транзитивно його залежності не тягнуться, якщо ніхто інший їх не потребує). `bundle` = `emptyBundle()` з рядками `toCreate`.

- [ ] **Step 1: Failing tests:** вибраний існує → skipped; залежність існує під іншим регістром → reuse; непідтриманий вид; повторний план по вже скопійованому дає порожній `toCreate`.
- [ ] **Step 2–4:** FAIL → реалізація → PASS + eslint. `isKindActive` мокається (`vi.mock('@/lib/server/content/kind-active')`).
- [ ] **Step 5: Commit** `feat(content-copy): copy plan against target campaign`.

### Task 5: Цілі та права (`targets.ts`)

**Files:**
- Create: `lib/server/content/copy/targets.ts`
- Test: `lib/server/content/copy/__tests__/targets.test.ts`

**Interfaces:**
- Produces:
```ts
export async function listCopyTargets(userId: string, excludeCampaignId: string): Promise<IdName[]>; // DM-кампанії користувача, не демо, не джерело
export async function resolveTargets(args: {
    userId: string; sourceCampaignId: string;
    targets: { campaignIds: string[] } | { all: true };
}): Promise<IdName[]>; // кидає ContentError(API_ERRORS.FORBIDDEN, 403) для чужої/не-DM id
```
Реалізація: `prisma.campaignMember.findMany({ where: { userId, role: CampaignRole.DM, campaign: { kind not demo } } })`; `isDemoKind` із `lib/constants/campaigns`.

- [ ] **Step 1: Failing tests** (prisma замоканий через `database-double.ts` або `vi.mock('@/lib/db')`): `all` виключає джерело й не-DM; явна чужа id → 403; порожній результат дозволений для `all`.
- [ ] **Step 2–4:** FAIL → реалізація → PASS + eslint.
- [ ] **Step 5: Commit** `feat(content-copy): resolve target campaigns with DM check`.

### Task 6: Застосування й сервіс (`apply.ts`, `service.ts`, `schema.ts`)

**Files:**
- Create: `lib/server/content/copy/{apply,service,schema}.ts`, `types/content-copy.ts`
- Test: `lib/server/content/copy/__tests__/service.test.ts`, `lib/server/content/copy/__tests__/copy.integration.test.ts` (локальна БД, `pnpm test:integration`)

**Interfaces:**
- Produces:
```ts
// types/content-copy.ts
export type CopyItem = { kind: ContentCopyKind; ids: string[] };  // ContentCopyKind = ContentKind (етап 1)
export type CopyTargetReport = {
    campaignId: string; name: string; status: 'ok' | 'partial' | 'failed';
    created: Array<{ kind: string; id: string; name: string }>;
    reused:  Array<{ kind: string; id: string; name: string }>;
    skipped: Array<{ kind: string; name: string; reason: string }>;
    error?: string;
};
export type CopyResult = { targets: CopyTargetReport[] };

// service.ts
export async function copyContent(args: {
    actor: Actor;                       // DM джерела
    items: CopyItem[];
    targets: { campaignIds: string[] } | { all: true };
    dryRun?: boolean;
}): Promise<CopyResult>;
```
`copyContent`: `assertCan` DM на джерелі; одним `exportCampaign(prisma, source)`; `resolveTargets`; для кожної цілі послідовно: `exportCampaign(target)` → `buildCopyPlan` → якщо `dryRun` повернути звіт; інакше `withCampaignContentWrite(target.id, tx => importBundle(tx, plan.bundle, target.id, undefined, { reuse: plan.reuse, detached: true }))` у try/catch (збій → `status:'failed'`, `error` = повідомлення; інші цілі продовжуються), потім один `invalidate` довідника цілі (за зразком `ContentResource.invalidates`; використати той самий механізм, що й `importContent`). Ключ ресурсу в `kind → tableKey` через `tableOfKind`.

- [ ] **Step 1: Failing unit tests (service.test.ts):** збій другої цілі не змінює результат першої; `dryRun` не викликає `importBundle`; ліміт: порожній `items` → 400 через Zod; кінцевий `status:'partial'`, якщо є `skipped`.
- [ ] **Step 2: Failing integration test (copy.integration.test.ts):** дві кампанії в локальній БД; юніт + раса + заклинання → друга кампанія; перевірити: id змінені, `sourceId` null, посилання вказують на цільові рядки; повторний запуск → нуль `created`; раса, що вже є в цілі, не дублюється, а юніт посилається на неї.
- [ ] **Step 3:** FAIL → **Step 4:** реалізація → PASS (`pnpm test:run` для unit, `pnpm test:integration lib/server/content/copy` для інтеграційного).
- [ ] **Step 5: Commit** `feat(content-copy): copy service with per-target transactions`.

### Task 7: Роут

**Files:**
- Create: `app/api/campaigns/[id]/content-copy/route.ts`
- Test: `app/api/campaigns/[id]/content-copy/__tests__/route.test.ts`

**Interfaces:**
- `GET ?kind=<ContentKind>` → `{ items: IdName[]; campaigns: IdName[] }` (`loadNames(campaignId, kind)` + `listCopyTargets`). `requireDM`.
- `POST` body (Zod, `schema.ts`): `{ items: CopyItem[] (1..13, ids 1..500), targets: {campaignIds: string[] (1..100)} | {all: true}, dryRun?: boolean }` → `CopyResult`. `parseBody`, `requireDM`, делегує в `copyContent`.

- [ ] **Step 1: Failing tests:** 401/403 без DM; 400 на порожній `items`; успіх повертає `CopyResult`; `GET` повертає лише DM-кампанії.
- [ ] **Step 2–4:** FAIL → реалізація (тонкий роут) → PASS + eslint.
- [ ] **Step 5: Commit** `feat(content-copy): content-copy API route`.

### Task 8: Клієнт і хуки

**Files:**
- Create: `lib/api/content-copy.ts`, `lib/hooks/content-copy/{index,keys,useContentCopy,useContentCopyOptions}.ts`
- Test: `lib/hooks/content-copy/__tests__/useContentCopy.test.ts`

**Interfaces:**
```ts
// lib/api/content-copy.ts
export const contentCopyApi = {
    options: (campaignId: string, kind: ContentKind) => Promise<{ items: IdName[]; campaigns: IdName[] }>,
    copy: (campaignId: string, body: CopyRequest) => Promise<CopyResult>,
};
// keys.ts
export const contentCopyKeys = { options: (campaignId: string, kind: string) => [...] as const };
// hooks
useContentCopyOptions(campaignId, kind, enabled): UseQueryResult<...>
useContentCopy(campaignId): { preview: Mutation<CopyRequest, CopyResult>; run: Mutation<CopyRequest, CopyResult> }
```
`preview` шле `dryRun: true`, `run` — `false`; після `run` інвалідувати кеші довідника цілей не потрібно (інші кампанії), лише `contentCopyKeys` джерела не змінюється.

- [ ] **Step 1: Failing hook tests** (wrapper з QueryClient, `lib/api` замоканий): `preview` викликає API з `dryRun:true`; помилка API пробрасується.
- [ ] **Step 2–4:** FAIL → реалізація (`get`/`create` обгортки за зразком інших `lib/api/*`) → PASS + eslint.
- [ ] **Step 5: Commit** `feat(content-copy): API client and hooks`.

### Task 9: Діалог і кнопка

**Files:**
- Create: `components/content-copy/ContentCopyDialog.tsx`, `components/content-copy/{PickStep,PreviewStep,ResultStep}.tsx`, `components/content-copy/__tests__/ContentCopyDialog.test.tsx` (`// @vitest-environment happy-dom`)
- Modify: `components/content-import/shared/ContentTransferButtons.tsx` (кнопка «Копіювати в кампанії…», `lucide-react` `Copy`, `dynamic` імпорт діалогу як для майстра), `messages/{uk,en}/contentCopy.json` (новий неймспейс; зареєструвати так, як інші неймспейси в `i18n`-конфігу), `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json` (`whatsNew.contentCopy`)
- Props: `{ campaignId: string; kind: ContentKind; initialIds?: string[]; open; onOpenChange }`

Кроки діалогу: (1) `PickStep`: чекліст елементів виду (пошук, «вибрати все») + чекліст кампаній із верхньою галочкою «Усі кампанії» (`targets: {all:true}` коли вона увімкнена); (2) `PreviewStep`: `preview.mutate` → зведення по цілях («буде створено N; уже є і буде використано M; пропущено K з причиною»); (3) `ResultStep`: `run.mutate`, звіт по кожній кампанії, збій окремої цілі видно окремо. Якщо `options.campaigns` порожній — кнопку в `ContentTransferButtons` не показувати.

- [ ] **Step 1: Failing component tests:** галочка «Усі кампанії» вимикає окремі чекбокси й шле `{all:true}`; кнопка «Далі» заблокована без вибору; після `run` відображається звіт; порожній список кампаній → кнопки немає.
- [ ] **Step 2–4:** FAIL → реалізація → PASS; `pnpm exec eslint --fix` по зміненому; перевірити ключі `uk`/`en` (тест на ключі в проєкті вимагає повної парності).
- [ ] **Step 5: Commit** `feat(content-copy): copy dialog and toolbar button`.

> Відхилення від специфікації: у спеці картка елемента має дію «Копіювати…». Бібліотеки (accordion, картки, сторінки без множинного вибору) різні, тож у етапі 1 вибір елементів живе всередині діалогу, а вхід через панель кнопок (`ContentTransferButtons`) на сторінках units, spells, spell-groups, races, feats, artifacts. Пункт у меню картки та покриття решти видів без `ContentTransferButtons` (classes, backgrounds, careers, main-skills, skills, artifact-sets, tracks) виносяться в Task 10.

### Task 10: Входи для решти бібліотек + `initialIds`

**Files:** сторінки `app/campaigns/[id]/dm/{classes,backgrounds,careers,main-skills,skills,tracks,...}` (знайти, де в них панель дій DM) — додати `ContentCopyButton` (тонка обгортка над діалогом, `components/content-copy/ContentCopyButton.tsx`) для кожного з 13 видів, яких ще немає; пункт «Копіювати…» у меню картки для юнітів, заклинань, артефактів, рас, фітів (`initialIds=[id]`).

- [ ] **Step 1:** `grep -rn "ContentTransferButtons\|HudPageHeader" "app/campaigns/[id]/dm"` — скласти таблицю «вид → файл панелі дій».
- [ ] **Step 2:** додати кнопку за таблицею; тест-покриття: один тест на `ContentCopyButton` (рендер/відкриття).
- [ ] **Step 3:** `pnpm lint:dirs components app` (per-folder), виправити.
- [ ] **Step 4: Commit** `feat(content-copy): copy entry points for all content libraries`.

### Task 11: Документація етапу 1 та перевірка

- [ ] Оновити `docs/architecture/content-api.md` (секція «Копіювання між кампаніями»: `importBundle` options, сервіс, роут) і `docs/STATUS.md`.
- [ ] Один повний `pnpm test:run` + `pnpm test:integration lib/server/content/copy` + `pnpm cycles`.
- [ ] Живий прогін на dynamic stage / локальному `next start`: дві кампанії, копія юніта з залежностями, галочка «Усі кампанії», повторне копіювання (нуль створених). Якщо stage недоступний, написати про це явно, не стверджувати «готово».
- [ ] `/simplify` на дифі гілки; один фінальний рев'ю.
- [ ] Merge у `main` лише після підтвердження користувача (`git mv` специфікації й плану в `docs/archive/superpowers/` у merge-коміті).

---

# Етап 2: звуки

### Task 12: Серверний `copy` об'єкта в Storage

**Files:**
- Create: `lib/supabase/copy-object.ts`
- Test: `lib/supabase/__tests__/copy-object.test.ts`

**Interfaces:** Produces `copyStorageObject(bucket: string, fromPath: string, toPath: string): Promise<Result<true>>` через `createAdminClient().storage.from(bucket).copy(fromPath, toPath)`. Повертає `{ ok:false, message }` на помилку.

- [ ] Failing test (моковий admin-клієнт): успіх і помилка Storage. Реалізація, PASS, eslint, commit `feat(storage): server-side object copy helper`.

### Task 13: Копіювання звуків

**Files:**
- Create: `lib/server/content/copy/sounds.ts`
- Modify: `lib/server/content/copy/service.ts` (гілка для `kind: 'sounds'`), `types/content-copy.ts` (`ContentCopyKind = ContentKind | 'sounds'`), `schema.ts`, GET-опції (`loadSoundNames`)
- Test: `lib/server/content/copy/__tests__/sounds.test.ts`

**Interfaces:**
```ts
export async function copySounds(args: {
    sourceCampaignId: string; targetCampaignId: string; ids: string[]; dryRun?: boolean;
}): Promise<{ created: Array<{id:string;name:string}>; skipped: Array<{name:string;reason:'exists'|'limit'|'file-failed'}> }>;
```
Логіка: рядки `campaignSound` джерела; пропуск за назвою (`exists`); ліміт `MAX_SOUNDS_PER_CAMPAIGN` цілі (`limit`); для кожного: `soundObjectPath(url)` → новий шлях цілі (за схемою `soundObjectPath`/`createSoundUploadTicket` для campaignId цілі — вивести розширення з поточного шляху) → `copyStorageObject(SOUNDBOARD_BUCKET, from, to)` → створити рядок із новим `url` (публічний URL бакета для `to`). Порядок: спочатку файл, потім рядок; помилка рядка → `removeSoundObject(to)`. `sortOrder` = кінець списку цілі.

- [ ] Failing tests: ліміт; помилка копіювання файла (`file-failed`, рядка немає); помилка вставки рядка прибирає файл; дубль за назвою; успіх змінює `url` на шлях цілі.
- [ ] Реалізація, PASS, eslint.
- [ ] UI: `ContentCopyButton` на сторінці звуків DM (знайти в `app/campaigns/[id]/dm/` або компоненті саундборду), `ContentCopyDialog` приймає `kind: 'sounds'`.
- [ ] Docs (`docs/architecture/soundboard.md` одним абзацом) + `whats-new`. Один повний прогін тестів і живий прогін (скопіювати звук, відтворити в цілі). Commit `feat(content-copy): copy sounds between campaigns`.

---

# Етап 3: карти

### Task 14: Копіювання карти

**Files:**
- Create: `lib/server/content/copy/maps.ts`
- Modify: `service.ts`, `types/content-copy.ts` (`ContentCopyKind = ContentKind | 'sounds' | 'maps'`), `schema.ts`, GET-опції
- Test: `lib/server/content/copy/__tests__/maps.test.ts` + інтеграційний

**Interfaces:**
```ts
export async function copyMaps(args: {
    sourceCampaignId: string; targetCampaignId: string; ids: string[]; dryRun?: boolean;
}): Promise<{ created: Array<{id:string;name:string}>; skipped: Array<{name:string;reason:'exists'|'limit'|'file-failed'}> }>;
```
Логіка: `BattleMap` (+ `chunks`; без `BattleMapVersion`; `mapVersion: 1`) → нові рядки в цілі (`newContentId` / cuid за схемою моделі); `header.background`/поле фону (перевірити в `lib/server/battle-maps/background-cleanup.ts` → `backgroundOf`) перепризначити на новий об'єкт у бакеті `battle-maps` цілі (`copyStorageObject`, шлях через `ownedBattleMapBackgroundPath`-сумісну схему `<campaignId>/...`); ліміти цілі з `lib/server/battle-maps/campaign-limits.ts`; пропуск за назвою; помилка файла/запису прибирає вже створене (файл і рядок + чанки в транзакції Prisma).

- [ ] Failing tests: чанки скопійовані 1:1, `mapVersion=1`, версій немає; фон скопійований, `url` вказує на цільовий шлях; ліміт цілі; дубль за назвою; відкат при помилці запису прибирає файл.
- [ ] Реалізація, PASS, eslint; UI: кнопка на сторінці `dm/maps` (бібліотека карт; гейт `useMapLibraryEnabled`).
- [ ] Docs (`docs/architecture/map-modes.md` або окремий абзац у `content-api.md`) + `whats-new`; повний прогін тестів; живий прогін (скопіювати карту з фоном, відкрити в цілі); `/simplify`; фінальний рев'ю.
- [ ] Commit `feat(content-copy): copy battle maps between campaigns`.

---

## Self-review (виконано при написанні)

- **Покриття спеки:** вибір цілей і «усі» (Task 5, 9); залежності й перевикористання за назвою (Task 3–4, 1); незалежна копія (Task 1 `detached`); обсяг 13 видів (Task 4, 10), звуки (12–13), карти (14); попередній перегляд `dryRun` (6, 9); по-цільові транзакції (6); кеш (6); i18n/whats-new (9); тести й доки (11, 13, 14).
- **Відхилення від спеки:** вибір елементів у діалозі + кнопка в панелі, меню картки лише для 5 видів (Task 9–10); спека обіцяла «біля кожного елемента» для всіх.
- **Відкриті пункти спеки закрито:** (1) бандл-шлях годиться після двох розширень `importBundle` (Task 1); (2) серверного `copy` у проєкті не було, додано (Task 12); (3) непідтримувані види обробляються в `plan.ts` через `isKindActive` і показуються в `PreviewStep`.
- **Ризики для виконавця:** (a) `exportCampaign` для шарованої (template-layer) кампанії читає рядки через шар: перевірити на інтеграційному тесті, що копіюється видимий вміст; (b) `assertBackgroundRefs` змінюється обережно, щоб не послабити перевірку для імпорту шаблонів; (c) сумісність типу `ContentCopyKind` з `ImportKind` у `loadNames` для `tracks`/`spell-groups`.
