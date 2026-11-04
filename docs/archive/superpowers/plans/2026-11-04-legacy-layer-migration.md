# Legacy Layer Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Скрипт, що переводить legacy-клон опублікованого шаблону на шари (незмінені копії → базові рядки, змінені → override, власні → local) з переписуванням усіх посилань, перевіркою еквівалентності в тій самій транзакції, dry-run звітом і відкатом із pre-image.

**Architecture:** Чисте ядро в `lib/server/templates/legacy-migration/` (план = чиста функція над завантаженими рядками; запис/перевірка — в одній інтерактивній транзакції на кампанію під `FOR UPDATE`), CLI `scripts/constructor/legacy-layers.ts`. Плюс одна зміна шару: TTL для позначки «plain campaign».

**Tech Stack:** Prisma 6 (розширення `contentLayer`), Vitest (+ `vitest.integration.config.mts` на локальній БД), tsx. Без нових залежностей і без міграцій схеми.

**Spec:** `docs/superpowers/specs/2026-11-04-legacy-layer-migration-design.md` — таблиця рішень §2.3, реєстр §4.2, компаратор §7.1. Читати перед кожною задачею відповідний розділ.

## Global Constraints

- **Жодних запусків проти prod або prodcopy під час реалізації.** Інтеграційні тести — лише локальна БД (`isLocalDevDatabaseEnv` guard, як у `lib/server/templates/sync/__tests__/layered.integration.test.ts`), з унікальним маркером і прибиранням. Репетиція (Task 10) — лише після окремого «так» користувача.
- HOMM5 `cmuylhk0c0001ia06lg5eommv` — у `PROTECTED_CAMPAIGN_IDS`; жоден шлях коду не пише в кампанію з відмовою eligibility.
- Міграція не викликає `resource.remove`/`removeAll`/`detachRefs`, не видаляє файли Storage, не пише в `*_base`/джерело/інші кампанії. Усі записи в контентні таблиці — через `bypassLayer`.
- Тести під час роботи: `pnpm test:related <files>`; інтеграційні — `pnpm exec vitest run -c vitest.integration.config.mts <file>`; повний `pnpm test:run` і репо-lint — один раз у Task 9.
- `lib/server/templates/legacy-migration/*` без `import "server-only"` (скрипт через tsx), коментарі мінімальні, Cyrillic у коді заборонено (тексти звіту CLI — англійською).
- Новий код групує параметри в об'єкти (див. `feedback-grouped-objects`).

## Review Focus (фінальне opus-ревю)

- Таблиця 2.3: `updated`/`conflict`/`deletedInSource`/`new`/`ignored` після міграції = legacy до (тест паритету в Task 8).
- `remapDeep` переписує ключі об'єктів і `itemRef`, але не складені рядки (`${unit.id}-1-…`).
- Перевірка йде всередині транзакції до commit і через **розширений** клієнт; невдача = rollback.
- `snapshotHash` перераховується разом зі `snapshot`.
- Позначка `plain` має TTL; кампанія з `baseSourceId` ніколи не кешується як plain.

---

### Task 1: TTL позначки «plain campaign»

**Files:** `lib/db/layer/cache.ts`, `lib/db/content-layer.ts` (лише коментар біля `markPlainCampaign`), `lib/db/__tests__/content-layer.test.ts`.

**Interfaces:** `PLAIN_TTL_MS = 60_000`; `isPlainCampaign(campaignId: string, now = Date.now()): boolean`; `markPlainCampaign(campaignId: string, now = Date.now()): void` (LRU зберігає час позначки замість `true`).

- [ ] Тест: позначка дійсна до `now + PLAIN_TTL_MS - 1`, після — `false` і повторний виклик читання робить PK-запит (`layerStats.campaignLookups` +1); після зміни `baseSourceId` в БД (без `invalidateCampaignLayer`) і спливу TTL читання повертає базові рядки.
- [ ] Реалізація; коментар `plain`: «baseSourceId changes once, at legacy migration (Part 5); TTL bounds stale marks on other instances».
- [ ] Commit.

### Task 2: `remapDeep` і `cuidTokens`

**Files:** `lib/server/templates/legacy-migration/remap.ts`, `__tests__/remap.test.ts`.

**Interfaces:**
- `remapDeep<T>(value: T, map: ReadonlyMap<string, string>): T` — `remapIds` для значень (включно з `itemRef` і `itemStats.value`) + ключі об'єктів, що є в `map`.
- `cuidTokens(text: string): string[]` — усі `/c[a-z0-9]{24}/g`.
- `residualKind(value: string, token: string): "exact" | "composite"`.

- [ ] Тести: рядок; масив; вкладений об'єкт; ключ об'єкта (`{ [old]: ["s1"] }` → `{ [new]: ["s1"] }`, значення теж перемаплені); `itemRef` `base:prop:param`; `itemStats.value` як JSON-рядок; складений `${old}-1-1700000000` не змінюється, але `cuidTokens` його знаходить з `residualKind = composite`; `Date` і `null` без змін.
- [ ] Реалізація поверх `remapIds` (не дублювати розбір `itemRef`).
- [ ] Commit.

### Task 3: Реєстр посилальників + тест паритету схеми

**Files:** `lib/server/templates/legacy-migration/referrers.ts`, `types.ts`, `__tests__/referrers-parity.test.ts`.

**Interfaces:**
```ts
type ReferrerMode = "content" | "remap" | "history" | "none" | "global" | "special";
interface Referrer {
  model: Prisma.ModelName;
  mode: ReferrerMode;
  /** where для рядків кампанії (через зв'язок для дочірніх моделей); для `remap` може звужувати (prepared бої, pending пропозиції) */
  scope?: (campaignId: string) => Record<string, unknown>;
  columns?: readonly string[];
  /** перерахунок похідних полів після remap: snapshotHash, href */
  derive?: (row: Record<string, unknown>, campaignId: string) => Record<string, unknown>;
  lockSql?: (campaignId: string) => Prisma.Sql; // SELECT … FOR UPDATE для remap-рядків
}
export const REFERRERS: readonly Referrer[];
export async function referrerRows(db: object, r: Referrer, campaignId: string): Promise<Array<Record<string, unknown>>>;
```
Вміст — точно таблиця spec §4.2 (модель може мати кілька записів з різним `scope`: `BattleScene` prepared → `remap`, решта → `history`; `AiProposal` pending → `remap`, решта → `history`). `BattleParticipant.derive` = `{ snapshotHash: hashJson(snapshot) }`; `PlayerNotification.derive` = `{ href: notificationHref(campaignId, type, refId) }`; `BattleParticipant.sourceId` переписується лише при `sourceType` юніта (перевірити значення в `lib/utils/battle/participant/from-unit.ts`).

- [ ] Тест паритету: кожна модель `Prisma.dmmf.datamodel.models` має ≥ 1 запис у `REFERRERS`; кожен `columns` існує в моделі; 13 моделей з `<Model>Base` мають `mode: "content"`; `*Base` — `global`.
- [ ] Тест: `derive` учасника дає `hashJson` нового snapshot; сповіщення — новий `href`.
- [ ] Commit.

### Task 4: Eligibility

**Files:** `lib/server/templates/legacy-migration/eligibility.ts`, `__tests__/eligibility.test.ts` (fake db за зразком `sync/__tests__/fake-sync-db.ts`).

**Interfaces:**
```ts
export const PROTECTED_CAMPAIGN_IDS: ReadonlySet<string>; // HOMM5
export type IneligibleReason = "ALREADY_LAYERED" | "PROTECTED" | "IS_TEMPLATE" | "NO_SOURCE" | "SOURCE_MISSING" | "SOURCE_NOT_TEMPLATE" | "SOURCE_LAYERED" | "SOURCE_NOT_PUBLISHED" | "SOURCE_UNPUBLISHED_CHANGES" | "LOCALIZED_CONTENT" | "HAS_DERIVED_CAMPAIGNS" | "ACTIVE_BATTLE";
export type Eligibility = { ok: true; sourceId: string; version: number } | { ok: false; reason: IneligibleReason; detail?: string };
export async function checkEligibility(db: object, campaignId: string): Promise<Eligibility>;
```
Порядок перевірок — як у таблиці spec §3. `SOURCE_UNPUBLISHED_CHANGES`: `contentVersion !== latestPublishedVersion` **або** будь-який рядок `cachedExport(S)` має `rowHash` ≠ хешу відкритого базового рядка (або відкритий базовий рядок відсутній в експорті). `LOCALIZED_CONTENT`: `isCanonicalSrdTemplate(source)` і `Object.keys(translationsFor(campaign.locale ?? "en")).length > 0`.

- [ ] Тест на кожну причину + щасливий шлях; HOMM5-id → `PROTECTED` навіть якби мав джерело.
- [ ] Commit.

### Task 5: Планувальник (чиста функція)

**Files:** `lib/server/templates/legacy-migration/plan.ts`, `types.ts`, `__tests__/plan.test.ts`.

**Interfaces:**
```ts
export const LEGACY_UNKNOWN_HASH = "legacy:unknown";
interface PlanInput {
  campaignId: string;
  stored: Record<BundleTable, Row[]>;          // bypassLayer, усі стовпці
  base: Record<BundleTable, Map<string, Row>>; // видимі на version
  baseline: SyncState["tables"];               // з loadSyncContext (з fallback)
  ignored: SyncState;
}
type RowDecision =
  | { kind: "baseRef"; table: BundleTable; localId: string; key: string }
  | { kind: "override"; table: BundleTable; localId: string; key: string; sourceHash: string; reason: "dmEdited" | "templateChanged" | "both" | "noBaseline" | "orphan" }
  | { kind: "local"; table: BundleTable; localId: string; demoted?: "duplicate" | "badSourceId" }
  | { kind: "hide"; table: BundleTable; key: string; pending: boolean };
interface MigrationPlan {
  idMap: Map<string, string>;
  decisions: RowDecision[];
  rows: Record<BundleTable, Row[]>;  // фінальний збережений набір, уже перемаплений, sourceId/sourceHash виставлені
  hides: Array<{ table: string; id: string }>; // table = layeredModels()[model].hideTable
  ignored: SyncState;                 // + pending-маркери pendingKey(k) = Bh
  blockers: Array<{ code: "ID_COLLISION"; table: BundleTable; id: string }>;
  warnings: Array<{ code: "DUPLICATE_SOURCE_ID" | "BAD_SOURCE_ID"; table: BundleTable; id: string }>;
}
export function planLegacyMigration(input: PlanInput): MigrationPlan;
```
Алгоритм — spec §2.2–2.4 (спершу `idMap` з усіх рядків з `sourceId`, потім хеші через `remapDeep` + `rowHash`).

- [ ] Тести — по рядку таблиці §2.3 кожен: `baseRef`; override `dmEdited` (`sourceHash = b`); `templateChanged`; `both`; `noBaseline` → `LEGACY_UNKNOWN_HASH`; `orphan`; local без змін id; hide без pending; hide + pending (`ignored.tables[t]["pending:k"] = Bh`); legacy ignored-ключ зберігається.
- [ ] Тести аномалій: дублікат `sourceId` (переможець — рядок з `Lh = Bh`, інакше найстаріший); `sourceId` не cuid → `local`; id local-рядка ∈ base → блокер.
- [ ] Тест remap усередині контенту: local-скіл з `spellId` і `abilities[].spellId` на sourced-заклинання → базовий id; `skillTrees.skills` → базові id скілів.
- [ ] Commit.

### Task 6: Завантаження, запис, pre-image

**Files:** `load.ts`, `execute.ts`, `preimage.ts`, `service.ts` (поки `dryRunCampaign` + `migrateCampaign` без перевірки), `lib/server/templates/legacy-migration/__tests__/legacy-migration.integration.test.ts` (каркас + фікстура).

**Interfaces:**
```ts
interface MigrationInput extends PlanInput { sourceId: string; version: number; referrers: Array<{ r: Referrer; rows: Row[] }>; legacyItems: SyncItem[] }
export async function loadMigrationInput(db: object, args: { campaignId: string; sourceId: string; version: number }): Promise<MigrationInput>;
export async function writeMigration(tx: Prisma.TransactionClient, args: { input: MigrationInput; plan: MigrationPlan }): Promise<{ referrerCells: PreImage["referrerCells"] }>;
export interface PreImage { campaignId: string; createdAt: string; campaign: { baseSourceId: null; baseVersion: null; contentVersion: number }; sourceSync: Row | null; stored: Record<BundleTable, Row[]>; referrerCells: Array<{ model: string; pk: Record<string, unknown>; column: string; before: unknown; after: unknown }>; plan: { idMap: Array<[string, string]>; hides: MigrationPlan["hides"] }; postContentVersion: number }
export function writePreImage(dir: string, image: PreImage): Promise<string>; // .json.gz, повертає шлях
export function readPreImage(path: string): Promise<PreImage>;
export async function dryRunCampaign(db: object, campaignId: string): Promise<MigrationReport>;
export async function migrateCampaign(db: ExtendedPrisma, args: { campaignId: string; preImageDir: string }): Promise<MigrationReport & { preImagePath?: string }>;
```
- `loadMigrationInput`: `loadSyncContext` + `classify` (лише табличні scope → `legacyItems`; `rules`/`settings` → лічильник для `PENDING_RULES_SETTINGS`), збережені рядки через `bypassLayer`, base на `version` (`validFrom ≤ v`, `validTo null | > v`, `sourceCampaignId = S`), посилальники за реєстром.
- `migrateCampaign`: `prisma.$transaction(…, { timeout: 120_000, maxWait: 10_000 })` → `lockCampaignRow(tx, id, "update")` → `lockSql` посилальників → повторна eligibility → load → plan → блокери ⇒ throw → `writePreImage` → `writeMigration` → (перевірка — Task 7) → commit. Транзакцію обгорнути в `runContentWriteContext(campaignId, tx, …)`, щоб шар бачив tx (`currentTransaction`).
- `writeMigration` (порядок): для кожної `t` — `deleteMany({ where: { campaignId } })` + `createMany(plan.rows[t])` чанками по 200 з `toPrismaJson` (через `bypassLayer`, зберегти `createdAt`/`updatedAt`); `campaignContentHide.createMany({ skipDuplicates: true })`; `campaignSourceSync.update({ ignored, sourceVersion: version })`; посилальники — `update` лише рядків, де `remapDeep` щось змінив (+ `derive`), повертаючи клітинки для pre-image; останнім — `tx.campaign.update({ where: { id }, data: { baseSourceId, baseVersion: version } })` через **розширений** tx-клієнт (гілка `Campaign` скидає кеш шару й memo tx) і `markContentDirty()` — `runContentWriteContext` сам робить рівно один бамп наприкінці (явний `increment` дав би подвійний, якщо шар теж позначить dirty); `postContentVersion = pre + 1`.
- Фікстура інтеграційного тесту (локальна БД): тимчасовий шаблон з рядками в усіх зв'язаних таблицях (група → заклинання → скіл/дерево, раса → юніт із `knownSpells`, сет → артефакт з `itemStats`, трек) → `publishTemplateVersion` → legacy-клон через `createCampaignFromBundle` без шару (шаблон ще не опублікований на момент клону, або напряму `importBundle` + `campaign_source_syncs`) → DM-правки, видалення, новий local-рядок → правка шаблону + повторна публікація → персонаж (`knownSpells`, `backgroundId`, `personalSkillId`, `skillTreeProgress`, інвентар з `itemRef`), `character_skills`, prepared-бій з учасником-юнітом, сповіщення `spell`, `campaign_shows.audio` з `trackId`, `compendium_entries.localId`.

- [ ] Інтеграційний тест: `dryRunCampaign` нічого не пише (лог запитів без `INSERT/UPDATE/DELETE`) і дає очікувані лічильники §7.2; `migrateCampaign` → контентні таблиці містять лише override + local, hides і pending-маркери, посилальники перемаплені, `snapshotHash` = `hashJson(snapshot)`, `baseSourceId/baseVersion` виставлені, `contentVersion` +1; pre-image файл читається назад.
- [ ] Тест: повторний `migrateCampaign` → `ALREADY_LAYERED`, нуль записів; кампанія без джерела → `NO_SOURCE`, нуль записів; помилка, кинута посеред `writeMigration` (ін'єкція), → стан БД ідентичний до виклику.
- [ ] Commit.

### Task 7: Верифікатор у транзакції

**Files:** `verify.ts`, `service.ts`, інтеграційний тест.

**Interfaces:**
```ts
export async function readExposed(db: object, campaignId: string): Promise<Record<BundleTable, Map<string, string>>>; // id → rowHash(pick(row, t.columns)); через розширений клієнт
export function compareExposed(before: Record<BundleTable, Map<string, string>>, after: Record<BundleTable, Map<string, string>>): Array<{ table: BundleTable; id: string; kind: "missing" | "extra" | "changed" }>;
export async function scanResiduals(db: object, args: { campaignId: string; removed: ReadonlySet<string> }): Promise<{ exact: Array<{ model: string; column: string; count: number }>; composite: Array<{ model: string; count: number }>; history: Array<{ model: string; count: number }> }>;
export function syncParity(before: SyncItem[], after: SyncItem[]): Array<{ scope: string; key: string; before?: string; after?: string }>; // ігнорує deletedLocally
```
- «До» = `readExposed` під блокуванням до запису, з `remapDeep(·, idMap)` перед хешем; висячі посилання (id, якого немає серед експонованих id «до» і «після») нормалізуються в `null` на обох боках.
- «Після» = `readExposed` + `classifyLayered(await loadLayeredContext(tx, campaignId, { sourceId, baseVersion }))` + `scanResiduals`.
- Будь-яка розбіжність, exact-залишок або різниця паритету → `throw new LegacyMigrationError("VERIFY_MISMATCH" | "RESIDUAL_REFS", details)` → rollback; звіт містить деталі.
- `verifyFromPreImage(db, path)`: «до» з `preImage.stored` (той самий remap), «після» — поточне читання; для перевірки після commit і після деплою.

- [ ] Тести: на фікстурі Task 6 — успіх; паритет `updated`/`conflict`/`deletedInSource`/`new`/`ignored` до = після; навмисно зламаний реєстр (прибрати `knownSpells` з `Character.columns` у тесті через параметр) → `RESIDUAL_REFS`, БД без змін; навмисно зіпсований план (override позначений як `baseRef`) → `VERIFY_MISMATCH`, БД без змін.
- [ ] Commit.

### Task 8: Undo з pre-image

**Files:** `preimage.ts` (`undoMigration`), `service.ts`, інтеграційний тест.

**Interfaces:** `undoMigration(db: ExtendedPrisma, path: string): Promise<{ ok: true } | { ok: false; conflicts: Array<{ model: string; pk: Record<string, unknown>; column: string }>; reason?: "CONTENT_CHANGED" }>`.

Правила — spec §6.2: відмова, якщо `contentVersion ≠ postContentVersion` або поточна клітинка посилальника ≠ `after`; інакше в одній транзакції під `FOR UPDATE`: видалити збережені рядки 13 таблиць і hides кампанії, `createMany` з `preImage.stored` (bypassLayer), відновити клітинки `before`, `campaign_source_syncs`, `baseSourceId/baseVersion = null`, `contentVersion` +1.

- [ ] Тест кругового шляху: migrate → undo → збережені рядки, посилальники й `campaign_source_syncs` глибоко рівні стану до міграції (крім `contentVersion`), legacy `classify` дає ті самі пункти.
- [ ] Тест: після контентного запису (`withCampaignContentWrite`) undo → `CONTENT_CHANGED`; після зміни `knownSpells` персонажа → конфлікт із цією клітинкою, БД без змін.
- [ ] Commit.

### Task 9: CLI, документація, фінальні прогони

**Files:** `scripts/constructor/legacy-layers.ts`, `scripts/constructor/__tests__/legacy-layers-args.test.ts`, `package.json` (`constructor:legacy-layers`), `docs/architecture/content-api.md` (розділ «Міграція legacy-клонів»: таблиця рішень, реєстр, порядок, кеші), `docs/STATUS.md`.

**Interfaces:** `parseArgs(argv: string[]): { mode: "dry-run" | "apply" | "verify" | "undo"; campaigns: string[]; all: boolean; json?: string; preImage?: string; allowRemote: boolean }` — кидає `UsageError` (exit 2) для: `--apply` без рівно однієї `--campaign`, `--all` з `--apply`, `--verify`/`--undo` без шляху.

- [ ] Тести `parseArgs` (усі заборонені комбінації, типовий dry-run).
- [ ] `main`: `assertSeedTarget(process.env.DATABASE_URL, allowRemote)`; `--all` → усі кампанії з `baseSourceId = null` (звіт, групований за причиною); текстовий звіт за форматом spec §7.2 + `--json`; після `--apply` друкує шлях pre-image і нагадування «wait ≥ 6 min (reference cache 300 s + plain TTL)»; exit 0/1/2. `prisma.$disconnect()` у `finally`.
- [ ] `content-api.md` + рядок `STATUS.md` (стан: код готовий, репетиція/прод не виконувались).
- [ ] `/simplify` на diff гілки; `pnpm exec eslint --fix <touched>`; повний `pnpm test:run` і `pnpm lint` (перевірити `ps`, щоб не було паралельних важких прогонів); інтеграційні тести локально.
- [ ] Commit.

### Task 10 (gate: окреме «так» користувача): репетиція на prodcopy

Не код — runbook для окремої сесії (spec §7.4): свіжий бекап проду → `scripts/db/prodcopy-db.sh` → `prisma migrate deploy` → перевірити, що SRD на prodcopy опублікований на тій самій версії → `pnpm constructor:legacy-layers --all` → по одній кампанії `--apply` → `--verify` → `pnpm dev` на prodcopy + браузерна перевірка (через субагента, за `feedback-browser-context`) → `--undo` однієї кампанії → заміряти тривалість транзакції (якщо > 60 с — spec §10 п. 3). Результат і звіт dry-run — у `STATUS.md` і користувачу; прод — лише за spec §7.5, кожна кампанія окремим «так».

## Self-review

- Spec coverage: §2 → Task 5; §3 → Task 4; §4 → Tasks 2–3, 6, 7 (скан); §5.1 → Task 6; §5.2 → Task 1 + CLI-нагадування; §6 → Tasks 6 (pre-image), 8; §7 → Tasks 7, 10; §8 → Task 9.
- Імена узгоджені: `remapDeep`, `cuidTokens`, `REFERRERS`, `checkEligibility`, `PROTECTED_CAMPAIGN_IDS`, `planLegacyMigration`, `LEGACY_UNKNOWN_HASH`, `loadMigrationInput`, `writeMigration`, `readExposed`, `compareExposed`, `scanResiduals`, `syncParity`, `migrateCampaign`, `dryRunCampaign`, `verifyFromPreImage`, `undoMigration`, `PLAIN_TTL_MS`.
- Без міграцій схеми; без змін публічного API/UI.
