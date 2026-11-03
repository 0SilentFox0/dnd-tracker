# Content Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Один part = одна сесія/гілка; між parts оновлювати `docs/STATUS.md`.

**Goal:** Шаблони зберігаються один раз, кампанії тримають лише свої доповнення/перекриття, патчі шаблону доходять до всіх клонів, а поточні дані (кампанія HOMM5) не змінюються.

**Architecture:** П'ять частин. 1–2 не змінюють модель даних (індекси, пул, ретеншн, контракт іконок, версія шаблону + бейдж + «застосувати безпечне»). 3 — spike і рішення про механізм шарів. 4 — базове сховище опублікованих версій шаблону + прозорий шар читання/запису в `lib/db.ts` (Prisma client extension) + створення кампанії без копіювання. 5 — прибрати copy-on-clone.

**Tech Stack:** Next.js 16, Prisma 6.19 (`$extends` query hooks), PostgreSQL 17 / Supabase, Vitest. Без нових залежностей.

**Spec:** `docs/superpowers/research/2026-11-03-db-structure-review.md` (розділи 3–4). Деталі sync: `lib/server/templates/sync/*`, `docs/architecture/content-api.md`.

## Global Constraints

- **HOMM5 (`cmuylhk0c0001ia06lg5eommv`) не має джерела (`createdFromId = null`) — у новій моделі це «кампанія без базового шару», усі її рядки локальні. Жоден task не переписує рядки існуючих кампаній; перед кожним part — `scripts/db/backup-database.sh` на прод і перевірка на prodcopy.**
- Міграції expand-only; кожен `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`).
- Усі помилки — ключі з `lib/constants/api-errors.ts`; тексти в `messages/{uk,en}`; Cyrillic у коді заборонено ESLint.
- Тести лише `pnpm test:related`/`test:changed` під час роботи; повний прогін один раз у кінці part.
- Іконки/картинки: файли в бакетах `*-icons` **ніколи не видаляються** (див. Part 1, Task 1.4).
- Єдиний клон на prodcopy/prod — `TEST` (`cmvsbkvht0001jm085zswmt85`, від SRD). Перед Part 4 його видалити (підтвердити з користувачем), щоб не писати міграцію даних для клонів.

## Review Focus

- Кампанія, що редагує базовий рядок (override), і потім отримує патч того ж рядка → має бути `conflict`, а не тихе перезаписування (Part 4, Task 4.4 тест).
- DM видаляє базове заклинання (hide), шаблон його оновлює → рядок лишається прихованим, не «воскресає» (Task 4.3 тест).
- Персонаж із `knownSpells` на базовий id після апгрейду версії далі бачить заклинання (Task 4.4 тест).
- `removeAllContent`/масове видалення на кампанії з базовим шаром → приховує базові, видаляє локальні, не чіпає шаблон (Task 4.3 тест).
- Два DM одночасно створюють кампанії з одного шаблону → без копіювання це 2 INSERT у `campaigns`, транзакцій на 60 с більше немає (Task 4.5 тест на відсутність `createMany` контент-таблиць).

---

## Part 1 — Швидкі безпечні виправлення (гілка `fix/db-quick-wins`)

### Task 1.1: Відсутні індекси

**Files:** `prisma/schema.prisma`, нова міграція `prisma/migrations/<ts>_missing_indexes/migration.sql`.

- [ ] Додати `@@index` у schema: `Campaign([createdFromId])`, `CharacterSkills([skillTreeId])`, `MainSkill([spellGroupId])`, `AiThread([scenarioPageId])`, `PlayerNotification([campaignId])`, `WorldPosition([mapId])`, `WorldReveal([characterId])`, `WorldTravelLog([mapId])`, `WorldTravelLog([toMarkerId])`, `WorldTravelLog([byUserId])`, `WorldNote([authorUserId])`, `WorldNote([characterId])`, `AcquaintanceNote([authorUserId])`, і для 13 контентних таблиць `@@index([campaignId, sourceId])` (потрібен Part 4).
- [ ] `pnpm exec prisma migrate dev --name missing_indexes` проти локальної БД; перевірити, що SQL містить лише `CREATE INDEX`.
- [ ] Тест `prisma/__tests__/fk-indexes.test.ts`: парсить schema (як скрипт у research, розділ 3.2) і падає, якщо FK-колонка не є першою колонкою жодного індексу/унікального ключа. Виняток-список порожній.
- [ ] Commit.

### Task 1.2: Пул з'єднань

**Files:** `lib/db.ts`, `lib/__tests__/db-pool.test.ts`.

**Interfaces:** `export function withSafePoolLimits(databaseUrl?: string, env?: { VERCEL?: string; NODE_ENV?: string; PRISMA_CONNECTION_LIMIT?: string }): string | undefined`.

- [ ] Тест: pooler-URL на Vercel → `connection_limit=5`, `pool_timeout=10`; `PRISMA_CONNECTION_LIMIT=8` → 8; dev → 10; не-pooler без Vercel → URL без змін; уже задані параметри не перезаписуються.
- [ ] Експортувати функцію, значення за замовчуванням для Vercel 5 (Supavisor transaction mode тримає десятки клієнтів; Fluid Compute обслуговує кілька запитів на інстанс).
- [ ] Додати `PRISMA_CONNECTION_LIMIT` у `.env.example` і `docs/architecture/platform.md` (розділ egress/пул); після деплою подивитись у Supabase → Database → Pooler на кількість клієнтів.
- [ ] Commit.

### Task 1.3: Ретеншн історії боїв

**Files:** `lib/server/battles/cleanup.ts` (new), `lib/server/battles/__tests__/cleanup.test.ts`, `app/api/cron/assistant-cleanup/route.ts`, `lib/constants/battle.ts` (або існуючий файл лімітів), `docs/architecture/battle.md`.

**Interfaces:** `cleanupBattleSnapshots(now?: Date, db?: Pick<Prisma.TransactionClient, "battleScene" | "battleSnapshot">): Promise<{ battles: number; snapshots: number }>`.

Правило: `battle_snapshots` видаляються лише для `status = "completed"` з `completedAt < now − 90 днів`; `battle_events` і `battle_participants` не чіпаються (результат бою і журнал лишаються). Перед реалізацією перевірити читачів `battleSnapshot`: лише `lib/utils/battle/store/history.ts` (історія/відкат активного бою) і `save-battle.ts`.

- [ ] Тест із fake db (за зразком `lib/server/notifications/__tests__`): completed+старий → видалено; completed+свіжий, active, prepared → ні.
- [ ] Реалізація; виклик у cron route поряд із `cleanupAssistantData`/`cleanupReadNotifications`; рядок у `battle.md`.
- [ ] Commit.

### Task 1.4: Контракт спільних іконок

Відповідь на питання «чи можна без впливу на юзерів»: так. Жоден код не видаляє файли з `*-icons` (тільки `battle-music-storage.ts` видаляє треки), `resolveImageForPersistence` зберігає будь-який URL нашого Storage як є, а нове завантаження від DM іде під `{його campaignId}/{random}` і ніколи не перезаписує файл шаблону. Існуючі URL (у т.ч. з префіксом старого шаблону `cmvs44ooc…`) лишаються назавжди. Зміни стосуються лише **нових** завантажень сидера і правил.

**Files:** `lib/constants/storage.ts`, `lib/utils/common/image-url.ts`, `scripts/assets/attach-lib.ts`, `lib/__tests__/icon-buckets-immutable.test.ts`, `docs/architecture/platform.md`.

**Interfaces:** `SHARED_ASSET_PREFIX = "sets/"`; `sharedAssetPath(setKey: string, fileHash: string, ext: string): string` → `sets/<slug(setKey)>/<hash><ext>`; `isSharedAssetUrl(url: string): boolean`.

- [ ] Тест: `sharedAssetPath("5e SRD 5.2", "abc", ".webp") === "sets/5e-srd-5-2/abc.webp"`; `isSharedAssetUrl` true для public URL проєкту з цим префіксом, false для `{campaignId}/…`.
- [ ] `attach-lib.ts`: шлях об'єкта = `sharedAssetPath(templateKey ?? campaignId, sha1(file), ext)`, `upsert: false` (існуючий файл = той самий вміст, пропустити). Старий шлях лишається для вже завантажених.
- [ ] Статичний guard-тест (за зразком `lib/__tests__/item-readers-guard.test.ts`): у `lib/`, `app/`, `scripts/` немає `.remove(` над бакетами зі списку `ICON_BUCKETS`; список у `lib/constants/storage.ts`.
- [ ] `platform.md`: абзац «Спільні ассети: шаблонні іконки незмінні, шлях за хешем, видалення заборонене; локальна заміна DM = новий файл у його префіксі».
- [ ] Commit; `/simplify`; повний `pnpm test:run`; оновити `docs/STATUS.md`; merge у main.

---

## Part 2 — Версія шаблону, бейдж, «застосувати безпечне» (гілка `feat/template-version`)

### Task 2.1: `contentVersion` на кампанії

**Files:** `prisma/schema.prisma` (`Campaign.contentVersion Int @default(0)`, `CampaignSourceSync.sourceVersion Int?`), міграція `content_version`, `lib/server/content/write.ts`, `lib/server/campaigns/version.ts` (new), `scripts/srd/lib/run-load-template.ts`, тести `lib/server/content/__tests__/write.test.ts` (існуючий або новий), `lib/server/campaigns/__tests__/version.test.ts`.

**Interfaces:** `bumpContentVersion(db: Pick<Prisma.TransactionClient, "campaign">, campaignId: string): Promise<number>` (повертає нове значення).

- [ ] Тест: `withCampaignContentWrite` після успішного callback збільшує версію на 1 (один раз навіть при вкладених викликах у тому ж контексті); при помилці — ні.
- [ ] Реалізація: у `withCampaignContentWrite` після `callback` і до завершення транзакції; окремі сервіси, що пишуть поза ним (rules `lib/server/campaigns/rules.ts`, skill-trees `lib/server/skills/skill-tree-service.ts`, імпорт `lib/server/content/import/*`, sync apply) — перевірити, що проходять через `withCampaignContentWrite`; де ні — додати виклик `bumpContentVersion`.
- [ ] Сидер SRD: наприкінці `loadSrdTemplate` один bump.
- [ ] `applySourceChanges`/`saveState`: записувати `sourceVersion = source.contentVersion` у `campaign_source_syncs`; при створенні клону (`createCampaignFromBundle`) — теж.
- [ ] Commit.

### Task 2.2: Дешевий бейдж «є оновлення» і кеш бандла джерела

**Files:** `lib/server/campaigns/dashboard.ts`, `types/campaigns.ts`, `lib/server/templates/bundle-cache.ts` (new), `lib/server/templates/prepare-source.ts`, `lib/server/templates/sync/context.ts`, `components/dashboard/*` (плитка джерела), `messages/{uk,en}/dashboard.json`, тести.

**Interfaces:** `sourceUpdateState(db, campaignId): Promise<{ sourceId: string; sourceVersion: number; syncedVersion: number | null; hasUpdates: boolean } | null>`; `cachedExport(db, sourceId, contentVersion): Promise<Bundle>` — in-memory LRU на 4 бандли (ключ `${sourceId}:${contentVersion}`; `unstable_cache` не підходить — елемент > 2 МБ).

- [ ] Тест `dashboard.test.ts`: без джерела → null; `sourceVersion > syncedVersion` → `hasUpdates: true`; `syncedVersion` null (старі клони) → true.
- [ ] Тест `bundle-cache.test.ts`: другий виклик з тією ж версією не читає БД; нова версія — читає.
- [ ] Реалізація; `prepareCampaignSource` і `loadSyncContext` беруть бандл через `cachedExport`.
- [ ] Плитка на дашборді DM: «Шаблон оновлено (v{n})» + лінк на екран sync; ключі в обох локалях.
- [ ] Commit.

### Task 2.3: Операція `source.apply-safe`

**Files:** `lib/server/content/operations.ts`, `lib/server/templates/sync/apply.ts`, `lib/server/templates/sync/service.ts`, `app/api/campaigns/[id]/source/apply-safe/route.ts`, `lib/api/campaigns.ts`, `lib/hooks/campaigns/*`, `lib/ai/tools/content.ts` (MCP `source_apply_safe`), OpenAPI тест, тести apply.

**Interfaces:** `applySafeSourceChanges(db: SyncDb, campaignId: string, access?: { userId: string }): Promise<SourceApplyResult>` = classify → вибрати всі `new`/`updated` (`SYNC_DEFAULT_ON`), не `ignored` → `applySourceChanges` з цим списком; `conflict`/`deleted*` не чіпаються.

- [ ] Тест: набір із new+updated+conflict → застосовано 2, conflict лишився; ignored пропущено; повторний виклик → `applied: 0`.
- [ ] Реалізація, роут (`need: write`, під `lockCampaignRow`), кнопка «Застосувати безпечні оновлення» на плитці з Task 2.2, MCP-інструмент, запис у `content-api.md` і `whats-new.ts` + ключі `whatsNew.<id>`.
- [ ] Commit; `/simplify`; повний прогін; STATUS; merge.

---

## Part 3 — Spike і рішення (гілка `spike/content-layers`, не мерджиться)

Мета: за 1 сесію довести, що прозорий шар у `lib/db.ts` тримає існуючі читачі (≈190 місць `findMany/findUnique/count` по 13 моделях, 8 `include` між контентними моделями, 2 фільтри за відношенням у `update-race.ts`).

### Task 3.1: Прототип на одній моделі (`Spell`)

**Files:** `prisma/schema.prisma` (модель `SpellBase` → таблиця `spells_base`: усі колонки `Spell` крім `campaignId/sourceId/sourceHash` + `sourceCampaignId String`, `validFrom Int`, `validTo Int?`, `@@id([id, validFrom])`, `@@index([sourceCampaignId, validFrom, validTo])`), `campaigns.baseSourceId String?`, `campaigns.baseVersion Int?`, таблиця `campaign_content_hides (campaignId, table, id, @@id)`, `lib/db/content-layer.ts` (new), `lib/db.ts`, тести `lib/db/__tests__/content-layer.test.ts`.

**Interfaces:**
- `LAYERED_MODELS: Record<"Spell", { base: "spellBase"; table: "spells" }>` (у Part 4 розширюється до 13).
- `contentLayer()` — `Prisma.defineExtension` з `query.$allModels.{findMany,findFirst,findUnique,count,update,updateMany,delete,deleteMany}`:
  - читання з `where.campaignId: string` → `locals = query(args)`; `base = spellBase.findMany({ where: { ...whereWithoutCampaignId, sourceCampaignId, validFrom: { lte: v }, OR: [{ validTo: null }, { validTo: { gt: v } }], id: { notIn: [...localIds, ...hiddenIds] } } })`; злиття, `orderBy`/`take`/`skip` застосовуються до об'єднання в пам'яті; `include`/`select` відношень між контентними моделями резолвляться через той самий шар (батч по id).
  - `update`/`delete` за базовим id без локального рядка → спочатку матеріалізувати (вставити копію базового рядка з тим самим `id`, `sourceId = id`, `sourceHash = hash`), потім виконати; `delete` базового → рядок у `campaign_content_hides`; `updateMany`/`deleteMany` з `campaignId` → матеріалізувати/приховати відповідні базові.
  - `(sourceCampaignId, version)` кампанії — LRU у пам'яті, інвалідація при зміні `baseVersion`.
  - кампанія без `baseSourceId` (HOMM5) → чистий passthrough, нуль додаткових запитів.
- Локалізація SRD-оверлею: застосовується до базових рядків при читанні (`localizeSrdBundle` вже чиста функція), кеш `${sourceId}:${version}:${locale}`.

- [ ] Тести з реальною локальною БД (`lib/server/assistant/__tests__/*storage.integration.test.ts` — зразок): кампанія без бази → ідентична поведінка; з базою → union, hide, override-on-update, `count`, `take`, `include: { spellGroup }` (група локальна й базова), `findUnique({ where: { id } })` базового id.
- [ ] Прогнати **повний** `pnpm test:run` з розширенням увімкненим: зафіксувати, які тести падають і чому (fake-db у тестах, `$transaction`, `createScopedDatabase` proxy).
- [ ] Записати висновок у `docs/superpowers/specs/2026-11-xx-content-layers-design.md`: go (розширення) / no-go → запасний варіант: Postgres view `spells_effective` (union у SQL, Prisma `view`, читачі перейменовуються механічно, запис лишається в фізичних таблицях).

**Gate:** Part 4 стартує лише після рішення користувача за цим документом. Нижче — задачі для варіанта «розширення»; для view-варіанта Task 4.2–4.3 переписуються (читачі), решта без змін.

---

## Part 4 — Базове сховище і шари (гілка `feat/content-layers`, worktree)

### Task 4.1: Схема базового сховища

**Files:** `prisma/schema.prisma`, міграція `content_base`, `prisma/__tests__/base-models-parity.test.ts`.

- [ ] 13 моделей `<Model>Base` за правилом з Task 3.1 (генерувати текст схеми скриптом `scripts/db/gen-base-models.ts`, щоб не писати руками); `campaign_content_hides`; поля `campaigns.baseSourceId/baseVersion`; FK між контентними моделями (`spells.groupId → spell_groups`, `units.raceId`, `artifacts.setId`, `skills.{spellId,spellGroupId,mainSkillId,spellNewSpellId,grantedSpellId}`, `main_skills.spellGroupId`, `spells.summonUnitId`, `characters.backgroundId`) → прибрати з БД (`DROP CONSTRAINT`, expand-only; relation-поля в Prisma лишаються як `relationMode`-подібні ручні include через шар). Міграція не торкається даних.
- [ ] Parity-тест: через `Prisma.dmmf` для кожної пари `<Model>`/`<Model>Base` множина колонок збігається з точністю до `campaignId/sourceId/sourceHash` ↔ `sourceCampaignId/validFrom/validTo`.
- [ ] Commit.

### Task 4.2: Публікація версії шаблону

**Files:** `lib/server/templates/publish.ts` (new), `lib/server/templates/__tests__/publish.test.ts`, `lib/server/content/operations.ts` (`template.publish`, лише DM шаблону/власник official), `scripts/srd/lib/run-load-template.ts`, UI кнопка на сторінці шаблону.

**Interfaces:** `publishTemplateVersion(db, templateId): Promise<{ version: number; added: number; changed: number; removed: number }>` — експорт поточних рядків шаблону (`exportCampaign`), порівняння з відкритими базовими рядками (`validTo = null`) за `rowHash`: новий/змінений → закрити старий (`validTo = v`) і вставити з `validFrom = v`; зниклий → закрити; `v = contentVersion` після bump. Ідемпотентно: повторна публікація без змін → нулі і версія не росте.

- [ ] Тести: перша публікація = усі рядки; зміна одного → 1 changed, 2 рядки в історії; видалення → closed; ідемпотентність.
- [ ] Реалізація; сидер SRD публікує наприкінці; `docs/architecture/content-api.md`.
- [ ] Commit.

### Task 4.3: Шар читання/запису для 13 моделей

**Files:** `lib/db/content-layer.ts` (розширити з Task 3.1), `lib/db/__tests__/content-layer.test.ts`, 8 місць `include` (`lib/cache/reference-data.ts`, `read-artifacts-list.ts`, `operation-service.ts`, `import/export.ts`, `load-character-context.ts`, `read-skills-list.ts`) — перевірити, що резолвляться шаром або замінити на явний батч, `lib/server/races/update-race.ts` (фільтр `race: { equals }` → через шар).

- [ ] Тести на кожну модель: union/hide/override/updateMany/deleteMany/removeAll, `count`, `findUnique` базового id; «кампанія без бази — нуль додаткових запитів» (лічильник у fake db).
- [ ] Тест із Review Focus: `removeAllContent` на кампанії з базою → `campaign_content_hides` отримує всі базові id, шаблон незмінний.
- [ ] Повний `pnpm test:run`.
- [ ] Commit.

### Task 4.4: Sync поверх шарів

**Files:** `lib/server/templates/sync/{context,classify,apply}.ts`, тести sync, `lib/server/campaigns/dashboard.ts`.

Нова семантика: `baseline` для базового рядка = рядок на `baseVersion`; для override — `sourceHash` локального рядка; `ignored` як є. Класифікація: лише рядки, що змінились між `baseVersion` і поточною версією (`validFrom > baseVersion` або `validTo > baseVersion`) ∪ локальні override/hide. Apply: `new`/`updated` без override → нічого не пишемо, лише `baseVersion = v`; `updated` з override → `conflict`/`updated` за старим `pairStatus`; `deletedInSource` з override → лишити локальним (`sourceId = null`); hide → лишається hide.

- [ ] Тести: апгрейд без override = 1 UPDATE `campaigns`; override + патч → conflict; hide + патч → hidden; `knownSpells` персонажа на базовий id після апгрейду резолвиться через `getCachedSpells`.
- [ ] Реалізація; `apply-safe` з Part 2 працює без змін.
- [ ] Commit.

### Task 4.5: Створення кампанії без копіювання

**Files:** `lib/server/campaigns/create-campaign.ts`, `lib/server/templates/prepare-source.ts`, `lib/server/campaigns/action-service.ts` (`create`, `clone`, `template.save`), тести `create-campaign.test.ts`, `source-lifecycle.test.ts`.

- `create` з шаблону, що має опубліковану версію → `baseSourceId = template.id`, `baseVersion = latest`, `locale` як зараз, **без** `importBundle`; `campaign_source_syncs` не створюється (стан = `baseVersion`).
- `clone` кампанії / `template.save` → нова кампанія з тим самим `baseSourceId/baseVersion` + копія лише локальних рядків і hides (малий бандл); `remapIds` тільки для локальних id.
- Шаблон без опублікованої версії (приватний, старий) → поточний шлях (бандл) до Part 5.

- [ ] Тести: create → 0 `createMany` на контентних таблицях; clone HOMM5-подібної кампанії (без бази) → поведінка як сьогодні; `template.save` з кампанії з базою → шаблон з базою + локальні.
- [ ] Реалізація; `/simplify`; повний прогін; STATUS; `docs/architecture/content-api.md` розділ «Шари контенту».
- [ ] Перед merge: видалити `TEST` на prod (підтвердження користувача), бекап, деплой, `constructor:srd-template` → публікація v1, створити тестову кампанію з SRD і перевірити у браузері книгу магії/юнітів/артефактів та бій.

---

## Part 5 — Прибрати copy-on-clone (гілка `chore/remove-copy-clone`)

- [ ] `createCampaignFromBundle`: бандл лише для файлового імпорту (`content_import`, `/import`) і для шаблонів без опублікованої версії → усі офіційні шаблони публікуються, приватні старі — `template.publish` при першому клоні (автоматично в `prepareCampaignSource`).
- [ ] Видалити `campaign_source_syncs.baseline` з коду (колонка лишається, expand-only), `fallbackBaseline`, `remapIds` для шляху create (лишити для import/clone локальних), `assert-no-leak` адаптувати (базові id дозволені).
- [ ] Кеш довідників (`lib/cache/reference-data.ts`): ключ базової частини = `${sourceId}:${version}:${locale}`, локальна частина — на кампанію; інвалідація локальної при записі, базової при `baseVersion` зміні.
- [ ] Оновити `docs/architecture/content-api.md`, `platform.md`, `CLAUDE.md` (правило: «контентні моделі читаються лише з `where.campaignId`; базові таблиці напряму не читати»), `whats-new`.
- [ ] Повний прогін, `/simplify`, STATUS, merge, деплой, бекап до.

## Self-review

- Spec coverage: 3.1 ↔ Part 4–5; 3.2 індекси/ретеншн ↔ 1.1/1.3; 3.3 пул/кеш ↔ 1.2/5; 3.4 іконки ↔ 1.4; патчі push ↔ 2.2/2.3/4.4.
- Невизначеність свідомо винесена в Part 3 (gate); Part 4 написано для варіанта «розширення».
- Імена: `bumpContentVersion`, `cachedExport`, `applySafeSourceChanges`, `publishTemplateVersion`, `contentLayer`, `campaign_content_hides`, `baseSourceId/baseVersion` — використані узгоджено.
