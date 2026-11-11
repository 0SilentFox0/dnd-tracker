# WFRP 5g-0: інфраструктура шаблону Grim d100 — план реалізації

> **Для виконавців:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Кроки з `- [ ]`. Мова коментарів/доків у коді: мінімум коментарів; нові ідентифікатори англійською, документація українською.

**Мета:** кар'єри й профілі видів проходять шари/bundle/sync; шаблон Grim d100 завантажується з `data/templates/grim-d100/*.json` тим самим конвеєром, що SRD.

**Архітектура:** `Career` стає шаруватою моделлю за зразком `Feat` (`CareerBase`, `sourceId`/`sourceHash`, рядок у `BUNDLE_TABLES`/`SYNC_TABLE_SCOPES`). Профіль виду переходить із таблиці `race_profiles` у колонку `profile Json?` моделей `Race`/`RaceBase` (рішення користувача 2026-11-09: клон із шарами не має локальних рядків `races`, FK `race_profiles → races` не працює). Завантажувач SRD узагальнюється під «опис шаблону».

**Tech:** Prisma 6 (шари: `lib/db/layer/config.ts`), Zod, Vitest, tsx-скрипти.

**Spec:** `docs/superpowers/specs/2026-11-09-wfrp-5g0-design.md`. Читати разом із `docs/architecture/rule-systems.md` («Межі 5e-2», «Межі 5e-3»), `docs/architecture/content-api.md`, `.claude/rules/db-deploy.md`.

## Global Constraints

- Міграції expand-only; кожна `CREATE TABLE` також `ENABLE ROW LEVEL SECURITY`; `race_profiles` НЕ видаляти (deprecated, код її не читає й не пише).
- Нічого не мерджити й не пушити (WFRP off main). Коміти на `feat/wfrp`, у кінці повідомлення коміту: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Імпорти `@/…`, без `../../`; `import/no-cycle` увімкнено. Бар'єри шарування з `CLAUDE.md` діють.
- Тести: лише `pnpm test:run <file>` / `pnpm test:related <files>`; eslint лише на змінених файлах (`pnpm exec eslint --fix <files>`); повний suite і repo-wide lint не запускати.
- Не піднімати scope-size (uk 107 KB member, DM 110 KB) і OpenAPI-бюджет (195000) без виміру й запису; цей план нових uk-текстів і маршрутів не додає.
- Хеші `sourceHash` видів без профілю не мають змінитися після міграції (див. Task 2).
- Перед важким прогоном: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- Локальна БД для інтеграції: docker `dnd-tracker-wfrp-db-1` (порт 54322), БД `wfrp`; `pnpm exec prisma generate` після зміни схеми.

## Review Focus

1. Клон шаблону з шарами: вид без локального рядка має профіль у `listRaceProfiles` і `create-wfrp-draft` (тест).
2. Вид без профілю (`profile = null`) не змінює `rowHash` проти хеша до міграції (тест на фіксованому рядку).
3. Sync видаляє кар'єру/талант, на які посилається профіль виду чи tier кар'єри чи яку тримає герой: пропуск + попередження, без втрати даних.
4. Завантажувач ідемпотентний: другий запуск не дублює рядки й не змінює `contentVersion` зайвий раз без змін.
5. Битий файл даних (невідоме ім'я в посиланні, дубль імені, зайве поле) зупиняє завантаження до першого запису в БД.

## Структура файлів

- Змінюються: `prisma/schema.prisma`, `lib/server/templates/{bundle,publish,export-campaign,import-bundle,assert-no-leak,list-templates}.ts`, `lib/server/templates/sync/{classify,apply,layered-apply,context,profile-refs}.ts`, `lib/constants/source-sync.ts`, `lib/server/races/{race-profile,profile-usage}.ts`, `app/api/campaigns/[id]/characters/draft/create-wfrp-draft.ts`, `scripts/srd/lib/{load-template,run-load-template,data-files,types}.ts`, `package.json`.
- Створюються: міграція `prisma/migrations/20261129000000_career_layers_race_profile_column/`, `data/templates/grim-d100/` (manifest + фікстурні дані лише в тестах: `scripts/grim/__tests__/fixtures/`), `scripts/grim/{load-template,validate-data,data}.ts`, тести поруч.

---

### Task 1: Схема й міграція (кар'єри в шарах, профіль у `Race`)

**Files:** Modify `prisma/schema.prisma`; Create міграція `20261129000000_career_layers_race_profile_column/migration.sql`.

**Interfaces — Produces:** `Career.sourceId String?`, `Career.sourceHash String?`, `@@index([campaignId, sourceId])`; модель `CareerBase` (поля = скалярні поля `Career` без `campaignId`/`sourceId`/`sourceHash`, плюс `sourceCampaignId String`, `validFrom Int`, `validTo Int?`, `@@id([id, validFrom])`, `@@index([sourceCampaignId, validFrom, validTo])`, `@@map("careers_base")`); `Race.profile Json?`, `RaceBase.profile Json?`.

- [ ] Відкрити `model Career` (~769), `model FeatBase` (~1603), міграції-зразки `20261124000001_feats_base_xp_cost_max_rank` і `20261128000000_artifacts_base_system_stats`; повторити їхню структуру.
- [ ] Змінити схему; написати `migration.sql` вручну: `ALTER TABLE careers ADD COLUMN sourceId/sourceHash`, індекс; `CREATE TABLE careers_base ...` + `ALTER TABLE "careers_base" ENABLE ROW LEVEL SECURITY`; `ALTER TABLE races ADD COLUMN profile JSONB`, `ALTER TABLE races_base ADD COLUMN profile JSONB`; бекфіл `UPDATE "races" r SET "profile" = rp."profile" FROM "race_profiles" rp WHERE rp."raceId" = r."id"`.
- [ ] Застосувати на локальній `wfrp`: `DATABASE_URL=<wfrp> pnpm exec prisma migrate deploy` (або `migrate dev --name` через docker-БД), `pnpm exec prisma generate`; перевірити в psql, що RLS увімкнено на `careers_base` (`select relrowsecurity from pg_class where relname='careers_base'`).
- [ ] Прогнати `pnpm test:run lib/db` (guard-тести схеми/шарів) — мають пройти або показати, що треба оновити (напр. перелік шарових моделей); оновити.
- [ ] Commit `feat(wfrp): 5g-0 schema — career layers, race profile column`.

### Task 2: `careers` у bundle/publish/sync; профіль у bundle виду; стабільні хеші

**Files:** Modify `lib/server/templates/bundle.ts` (`BUNDLE_TABLES`, `MODEL_TO_KEY` якщо потрібно), `lib/constants/source-sync.ts` (`SYNC_TABLE_SCOPES`), `lib/server/templates/{publish,export-campaign,import-bundle,assert-no-leak,list-templates}.ts`, `lib/server/templates/sync/{classify,apply,layered-apply,context}.ts` — лише там, де `feats` згадується поіменно (знайти: `grep -rn "feats" lib/server/templates lib/db lib/constants/source-sync.ts`); Test: `lib/server/templates/__tests__/bundle-careers.test.ts` (за зразком `bundle-feats.test.ts`), оновити `fake-db.ts` і `bundle-columns.test.ts`.

**Interfaces — Consumes:** Task 1. **Produces:** `BundleTable` містить `"careers"`; `SyncScope` містить `"careers"`; `table("careers","Career","career")` стоїть у `BUNDLE_TABLES` після `feats` (кар'єри посилаються на таланти). `rowHash` рядка `races` не залежить від `profile = null`.

- [ ] Тест 1 (red): `bundle-careers.test.ts` — експорт кампанії з 2 кар'єрами дає `bundle.careers` з id; імпорт у нову кампанію зберігає `tiers` і (на рівні посилань талантів у `tiers[].talents`) ремапить id (як для `feats`); `BundleSchema` приймає відсутній `careers` (`.default([])`, як `feats`).
- [ ] Тест 2 (red): `rowHash` стабільність — зафіксувати очікуваний хеш рядка `races` без `profile` (обчислити поточним кодом до зміни `BUNDLE_TABLES.races.columns`, записати константою) і перевірити, що після додавання колонки `profile` хеш рядка з `profile: null`/без ключа ідентичний. Якщо хеш змінюється — у `rowHash` (`sync/hash.ts:10`) пропускати ключ `profile` лише коли його значення `null`/`undefined`; інші колонки й таблиці не чіпати.
- [ ] Реалізувати реєстрацію `careers` за відбитком `feats` у кожному файлі зі списку; кар'єри мають `tiers[].talents` (id талантів): додати їх до ремапу id в `remap-ids`-шляху імпорту так само, як `feats`-посилання в `backgrounds.originFeatId`/`classes` (знайти, як ремапляться посилання на feats у JSON, і розповсюдити на `careers.tiers`).
- [ ] Профіль виду: `races.profile` вже скаляр `Json?` → автоматично в `columns`, bundle, publish (`publishTemplateVersion`), хеш. Перевірити тестом bundle (експорт виду з профілем → імпорт → `profile` збережено, `careerId`/`featId` усередині профілю ремаплені, бо `remapIds` обходить вкладений JSON; якщо ні — додати профіль у ремап).
- [ ] `pnpm test:related lib/server/templates/bundle.ts lib/server/templates/sync/apply.ts lib/constants/source-sync.ts` зелений; eslint змінених файлів; commit `feat(wfrp): 5g-0 careers in bundle/publish/sync, race profile in bundle`.

### Task 3: Споживачі профілю читають і пишуть `races.profile`

**Files:** Modify `lib/server/races/race-profile.ts`, `lib/server/races/profile-usage.ts`, `app/api/campaigns/[id]/characters/draft/create-wfrp-draft.ts`; Test: існуючі `lib/server/races/__tests__/*`, `create-wfrp-draft` тести + новий `race-profile-layered.test.ts`.

**Interfaces — Produces (форма не змінюється):** `listRaceProfiles(campaignId): Promise<RaceProfileItem[]>`, `saveRaceProfile(campaignId, raceId, profile): Promise<RaceProfileItem>`, `profileReferences(campaignId, {careerId?, featId?}): Promise<boolean>` — API-маршрути, хуки, `RaceProfileItem` лишаються.

- [ ] Тест (red): кампанія-клон шаблону, де вид живе в `races_base` без локального рядка і має `profile` — `listRaceProfiles` повертає його; `profileReferences` бачить `careerId` з цього профілю; `create-wfrp-draft` знаходить профіль за `speciesId` = base id.
- [ ] Читання профілів — через той самий шарований читач видів, що `GET /races` (знайти в `lib/server/content/resources/races.ts` / `lib/db/layer`; не писати власного SQL по `races_base`). `listRaceProfiles` = види кампанії, чий `profile` проходить `SpeciesProfileSchema.safeParse`.
- [ ] `saveRaceProfile`: перевірки `assertCampaignRefs` лишити; запис — через ту ж операцію оновлення виду, що й редактор рас (`lib/server/content/operations.ts` update для `races`, яка для шарового рядка створює override з новим cuid і `sourceId` = base id); прямий `prisma.race.update` для base-виду заборонено. Для локального виду — звичайний update. Прибрати всі звернення до `prisma.raceProfile`.
- [ ] `grep -rn "raceProfile" app lib components` має дати нуль у не-тестовому коді (крім `prisma` моделі); оновити моки в наявних тестах на `race.profile`.
- [ ] `pnpm test:related lib/server/races/race-profile.ts lib/server/races/profile-usage.ts "app/api/campaigns/[id]/characters/draft/create-wfrp-draft.ts"`; eslint; commit `feat(wfrp): 5g-0 race profile read/write via races.profile`.

### Task 4: Ref-integrity у sync (кар'єри, таланти в tier, профіль)

**Files:** Modify `lib/server/templates/sync/{profile-refs,apply,layered-apply,context}.ts`; Test: `lib/server/templates/sync/__tests__/profile-refs.test.ts`, `…/sync-careers.test.ts`.

**Interfaces — Produces:** `isFeatReferenced(db, campaignId, featIds): Promise<boolean>` (профіль виду АБО `tiers[].talents` будь-якої кар'єри; замінює `isFeatUsedByRaceProfile`, старе ім'я лишити тонкою обгорткою тільки якщо є зовнішні споживачі), `isCareerReferenced(db, campaignId, careerIds): Promise<boolean>` (профіль виду `careerTable[].careerId` АБО `Character.career.careerId`), `blockedWarning(scope: "feats" | "careers", name: string): string`; `SyncDb` отримує `career` і не потребує `raceProfile`.

- [ ] Тести (red): (a) `deletedInSource` кар'єра в `careerTable` профілю виду → не видалена, у результаті попередження; (b) та сама, якщо кар'єру тримає герой; (c) талант у `tiers[].talents` кар'єри → не видалений; (d) вільна кар'єра/талант → видаляється; (e) після sync профіль виду з `careerId` неіснуючого рядка дає попередження `dangling` і не змінюється.
- [ ] Реалізація: читати профілі з видів кампанії (шарований читач із Task 3, не `raceProfile`); використати в `deleteRemoved` (`apply.ts:~154`) і `applyItem` (`layered-apply.ts:~81`) для `scope` `feats` і `careers`; dangling-перевірка в кінці `applySync`/`applyLayered` додає warning.
- [ ] `pnpm test:related lib/server/templates/sync/profile-refs.ts`; eslint; commit `feat(wfrp): 5g-0 sync ref-integrity for careers/feats`.

### Task 5: Формат даних Grim і валідатор

**Files:** Create `scripts/grim/data.ts` (читання `data/templates/grim-d100/*.json`), `scripts/grim/validate-data.ts`, `data/templates/grim-d100/manifest.json` (name, credits `""`, counts нулі), `scripts/grim/__tests__/validate-data.test.ts`, `scripts/grim/__tests__/fixtures/{races,careers,feats,units,race-profiles,rules}.json`.

**Interfaces — Produces:**
```ts
type GrimData = { races: Row[]; careers: Row[]; feats: Row[]; units: Row[]; spells: Row[]; artifacts: Row[]; raceProfiles: Array<{ race: string; profile: NamedProfile }>; rules?: Partial<WfrpRulesPatch> };
readGrimData(dir: string): GrimData            // відсутній файл = []
validateGrimData(data: GrimData): { ok: true } | { ok: false; issues: string[] }
```
`NamedProfile` = `SpeciesProfile`, де `careerId`/`talents`/`featId` задані іменами; завантажувач резолвить їх у id.

- [ ] Тести (red) на валідатор: хороша фікстура (1 вид, 2 кар'єри з талантами в tiers, 2 таланти, 1 юніт, 1 профіль) → ok; дубль імені кар'єри → issue; tier кар'єри посилається на неіснуючий талант → issue; профіль на неіснуючий вид/кар'єру/талант → issue; рядок, що не проходить схему ресурсу (`CONTENT_RESOURCES[kind].schemas.create` або `IMPORT_SPECS[kind]` валідація) → issue з іменем рядка.
- [ ] Реалізація: схеми рядків — через `IMPORT_SPECS`/`coerceRecord` (не писати нових zod для полів ресурсу); крос-посилання по `nameKey`; `SpeciesProfileSchema` для структури профілю після резолву імен у фіктивні id.
- [ ] eslint; `pnpm test:run scripts/grim/__tests__/validate-data.test.ts`; commit `feat(wfrp): 5g-0 grim data format and validator`.

### Task 6: Завантажувач Grim і команда

**Files:** Modify `scripts/srd/lib/{load-template,run-load-template,types}.ts` (параметризувати перелік видів: `SRD_KINDS` лишається дефолтом, SRD-поведінка без змін), Create `scripts/grim/load-template.ts`, `package.json` (`constructor:grim-template`), Test: `scripts/grim/__tests__/load-template.test.ts`.

**Interfaces — Consumes:** Task 5 `readGrimData`/`validateGrimData`, Task 3 `saveRaceProfile`-логіка, `ensureSrdTemplate`, `importContent` з `OFFLINE_IMPORT_DEPS`, `publishTemplate`, `bumpContentVersion`. **Produces:** `loadGrimTemplate({ owner?, dir?, allowRemote }): Promise<{ templateId: string; created: boolean; counts: Record<string, number> }>`.

- [ ] Тест (red, на локальній БД як інші `scripts/srd/__tests__` інтеграційні, або з `fake-db` якщо так заведено в цій теці): фікстура → шаблон створений → `publish` → є рядки `*_base` для `races`/`careers`/`feats` → клон кампанії з цього шаблону бачить вид із профілем (`listRaceProfiles`) → другий запуск `loadGrimTemplate` не змінює кількість рядків (ідемпотентність, Review Focus 4); битий файл → кидає до будь-якого запису (Review Focus 5, перевірити `count` рядків до/після).
- [ ] Порядок: валідація → `ensureSrdTemplate(makeTemplateStore(GRIM_TEMPLATE_NAME), { rules: WFRP_RULES ⊕ data.rules, credits: manifest.credits })` → `importContent` за порядком `feats, careers, races, units, spells, artifacts` (`mode:"update"`) → резолв імен у id і запис профілів видів (шлях Task 3) → `bumpContentVersion` → `publishTemplate`. Ім'я шаблону: константа `GRIM_TEMPLATE_NAME` у `lib/constants/campaigns.ts` поруч з `EMPTY_GRIM_TEMPLATE_NAME`, зараз = `"Grim d100"` (остаточну назву обирає користувач у 5g-4; порожній шаблон лишається).
- [ ] `pnpm test:run scripts/srd scripts/grim` (регрес SRD-конвеєра), eslint, commit `feat(wfrp): 5g-0 grim template loader and constructor:grim-template`.

### Task 7: Інтеграція, документація, чекліст (контролер)

- [ ] Прогнати Task 6 інтеграційний сценарій на локальній `wfrp` вручну: `pnpm constructor:grim-template` із фікстурним каталогом (прапор/змінна `GRIM_DATA_DIR`), клон кампанії → зміна фікстури → sync → ref-warnings у UI/API; прибрати тестові шаблон і кампанії.
- [ ] Оновити: `docs/STATUS.md` (рядок WFRP; у «чекліст перед деплоєм» додати міграцію `20261129000000_career_layers_race_profile_column`, нотатку «race_profiles deprecated, DROP після деплою епіку»), `docs/architecture/rule-systems.md` (нова секція «Межі 5g-0» + рядки таблиці «Що де лежить»: профіль у `races.profile`, кар'єри в шарах), `docs/architecture/content-api.md` (`careers` у `BUNDLE_TABLES`/`SYNC_TABLE_SCOPES`), `.claude/rules/db-deploy.md` за потреби.
- [ ] `pnpm test:changed main` зелений; eslint змінених файлів; фінальна Opus-рев'ю `31144d7ea..HEAD` (один раз); `/simplify` на diff гілки частини; commit docs.
- [ ] Памʼять `project-wfrp`: рядок 5g-0 DONE + рішення (profile у `Race`, `race_profiles` deprecated).

## Диспетчеризація SDD (суміжні задачі разом)

1. Task 1 + Task 2 (одна Sonnet-реалізація, спільний контекст схеми/bundle).
2. Task 3.
3. Task 4.
4. Task 5 + Task 6.
5. Task 7 — контролер, фінальне Opus-рев'ю.
Без рев'ю по задачах; повний `test:run` не запускати (лише в pre-deploy гейті епіку).
