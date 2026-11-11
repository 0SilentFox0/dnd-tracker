# E0: пакети шаблонів — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan part-by-part. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Шаблон стає пакетом даних `data/templates/<key>/` з маніфестом, slug, стабільними шляхами іконок і перекладом за ключем; 4-й пакет на наявній системі додається без правок core.

**Architecture:** Маніфести пакетів індексуються генератором у `TEMPLATE_REGISTRY` (client-safe) і server-only словники; `templateKey` відокремлюється від назви. `slug` — метадані ідентичності рядка (поза хешами й CRUD), його пише лише шар імпорту. Один CLI `template:*` замінює `scripts/srd` + `scripts/grim` пайплайни; специфіка джерела й системи живе в адаптерах `scripts/templates/`.

**Tech Stack:** Next.js 16, TypeScript strict, Prisma 6 (PostgreSQL), zod, vitest, tsx-скрипти.

**Spec:** `docs/superpowers/specs/2026-11-10-architecture-modularity-design.md` (розд. 3, 4.1–4.3, 5, 7 E0, 9). Виконавець читає і план, і ці розділи.

## Global Constraints

- Worktree `../dnd-tracker-wfrp`, гілка `feat/wfrp`. **Не мерджити, не пушити, нічого на prod.** Скрипти запускати лише проти localhost (`assertSeedTarget`), без `--allow-remote`.
- Ключі пакетів: `srd-5.2`, `grim-d100`, `heroes-homm`, `srd-5.2-empty`, `grim-d100-empty`. Ключ = імʼя теки, `^[a-z0-9][a-z0-9.-]*$`.
- Міграції expand-only; нових `CREATE TABLE` немає. Жива HOMM5 і d20-колонки не змінюються.
- Інваріанти CLAUDE.md чинні: layering (`lib/api` → hooks → components), i18n без кирилиці в коді, `import/no-cycle`, мінімум коментарів.
- `lib/` і `app/` не імпортують зі `scripts/`. У `data/templates/<key>/` немає `.ts`.
- Тести під час роботи: `pnpm test:related <файли>` / `pnpm test:run <файл>`; lint: `pnpm exec eslint --fix <файли>`. **Повний `test:run` і repo-wide lint не запускати** (один раз наприкінці E0, окремим рішенням користувача). Integration: `pnpm test:integration <файл>` проти локальної БД.
- Кожна задача = окремий комміт `feat(templates): …` / `refactor(templates): …` з `Co-Authored-By`.
- Ревʼю після задач немає; концерни виконавець пише у звіт, одне фінальне ревʼю (Opus) після частини 5.
- Нових npm-залежностей немає.

## Рішення архітектора (відхилення від spec і уточнення)

| # | Рішення | Чому |
|---|---|---|
| D1 | `slug` поза хешами: `contentRowHash` видаляє `slug` завжди (і коли null) | `pick` включає колонку; наявні `sourceHash` мають лишитися чинними |
| D2 | `slug` не входить у create/update zod-схеми, ресурси й API. Пише лише імпорт (`writeSlug`) | ідентичність пакета, не вміст; уникаємо ~23 правок prisma-викликів |
| D3 | Імпорт зіставляє: slug → name. Рядок, знайдений за name без slug, отримує slug (це і є backfill) | id зберігаються, окремий SQL-backfill не потрібен |
| D4 | `BUNDLE_FORMAT_VERSION` лишається 1 | рядки bundle — `looseObject`, колонки з Prisma enum, slug проходить сам; v1 без slug читається |
| D5 | Sync/import-bundle: якщо в цільовій кампанії slug уже зайнятий іншим рядком, вхідний рядок записується з `slug: null` | частковий unique `(campaignId, slug)`; без цього P2002 |
| D6 | Валідатори систем у E0: `scripts/templates/systems/<system>.ts`, реєстр `PACK_HOOKS` | `systems/schemas.ts` імпортує клієнтський компонент; server-only `SystemSchemas` — це E1.4 |
| D7 | Види поза `importContent` (`skillTrees`, `tracks`) імпортує CLI напряму: upsert за slug зі збереженням id | Heroes має 7 дерев і ~97 треків; `ImportKind` їх не знає |
| D8 | `rules.json` — повний `Ruleset` у кожному пакеті. `WFRP_RULES` лишається в коді (дефолт системи, ~83 тести); `SRD_RULES` стає читачем `rules.json` | мінімум правок тестів |
| D9 | Grim `race-profiles.json` лишається файлом пакета (`extras`), обробляє `PACK_HOOKS.wfrp.afterImport` | не вид контенту |
| D10 | Порядок імпорту: топологічний з `refKindsOf(IMPORT_SPECS[kind])`; цикл `artifacts ↔ artifact-sets` розвʼязано фіксованим правилом «sets після artifacts, `setId` дописується другим проходом» лише якщо пакет має обидва види | заміна `GRIM_ROW_KINDS` / `SRD_KINDS` |
| D11 | Slug-формат рядка: `^[a-z0-9][a-z0-9_-]*$` (SRD має `srd-2024_aboleth`) | наявні slug SRD не перейменовуємо |
| D12 | `TEMPLATE_CONTENT_LOCALES` лишається tuple-константою в коді (для `z.enum`); `manifest.locales` валідовано проти неї | маніфест не може бути джерелом tuple |
| D13 | Шлях нових іконок: `templates/<templateKey>/<kind>/<slug>-<sha8>.webp`; старі URL (`<templateId>/…`, `sets/…`) чинні. `attach-assets` не змінюється | R7; `templateKey` змінює значення, тож шлях `sets/<slug(templateKey)>` для нових attach зміниться — прийнятно |
| D14 | `ContentKind` виводиться з runtime-списку `CONTENT_KINDS` у нейтральному модулі (`lib/constants/content-kinds.ts`); `lib/server/content/define-resource.ts` його реекспортує. `lib/utils/templates/**` не імпортує з `lib/server/**` навіть типів | `manifest.ts` client-safe і потрібен zod-схемі та `scripts/`; один список замість дубля з exhaustiveness-перевіркою |
| D15 | `localizationOf().templateKey` — завжди ключ пакета з реєстру, не значення колонки. Запити до БД за ключем пакета йдуть лише через `templateKeyWhere(keys)` (`registry.ts`), яка до backfill покриває `templateKey = null` і ключ-назву; джерела compendium-import = `compendiumTemplateKeys()`. Обидві знімаються/спрощуються разом із `LEGACY_KEY_BY_NAME` у 4.4 | Review Focus 3: prod до backfill; словники ключовано ключем пакета |
| D16 | `groupTemplates` ключує `templateKeyOf(card) ?? card.templateKey ?? card.name`: сирий `templateKey` лишається для ключів поза реєстром (приватні шаблони, `heroes-homm` до 5.1) | без нього такі картки групувалися б за назвою |
| D17 | `manifest.names` містить усі `TEMPLATE_CONTENT_LOCALES` незалежно від `manifest.locales` (в оболонках `names.uk = names.en`); `spell-fx-by-name` живе в `data/library/` (кириличні ключі, `data/**` поза i18n-лінтом). У частині 3 `SRD_KINDS` у `lib/utils/templates/i18n/{catalog,overlay}.ts` замінюється видами з `manifest.kinds` | тип spec 4.2; `lib/` під забороною кирилиці |
| D18 | Імпорт-шар НЕ піднімає `contentVersion`, якщо рядок відрізняється лише slug: у `template:import` (частина 4) такі рядки пишуться лише через `writeSlug` без `markContentDirty()` (або лоадер відновлює версію, як Grim). До цього `constructor:srd-template` не запускати на prod для backfill | prodcopy: версія SRD 2437→3656 від backfill; план 2.3/spec розд. 9 вимагають незмінної версії; причина: `writePlan` (import-content.ts ~:202-215) викликає update для кожного знайденого рядка і `markContentDirty` (~:293) |
| D19 | `loadKeys`/`writeSlug` обовʼязкові в `ImportDeps`; одна мапа kind→table | мовчки пропущений slug ламає перейменування рядка (Review Focus 1) |
| D20 | `TEMPLATES_DIR` визначено лише в `scripts/templates/lib/pack.ts` | env-перевизначення потрібне тестам fixture-pack (частина 4) |
| D21 | import-bundle не читає `takenSlugs` з БД: ціль завжди нова/очищена кампанія; колізії slug перевіряються лише всередині bundle (D5 для sync/apply без змін) | дельти замість читань |

## Файлова структура

```
lib/schemas/template-manifest.ts            zod TemplateManifestSchema
lib/utils/templates/manifest.ts             type TemplateManifest, ContentKind/IconBucket-типи
lib/utils/templates/registry.ts             TEMPLATE_REGISTRY, templateOf, templatesOfSystem, templateKeyOf, LEGACY_KEY_BY_NAME, localizationOf
lib/utils/templates/slug.ts                 slugify, isSlug
lib/utils/templates/i18n/{catalog,overlay,keys}.ts   (з lib/srd/i18n; keys.ts — нове, ключі v2)
lib/server/templates/dictionaries.ts        templateTranslationsFor (server-only), читає data/templates/dictionaries.server.ts
data/templates/manifests.ts                 ЗГЕНЕРОВАНО template:index
data/templates/dictionaries.server.ts       ЗГЕНЕРОВАНО template:index
data/templates/<key>/{manifest.json, rules.json, <kind>.json, icons.json, i18n/<locale>.json}
scripts/templates/cli.ts                    template:<index|build|validate|import|publish|icons|i18n|export|backfill-keys>
scripts/templates/lib/{pack,index-gen,store,import-order,import-pack,validate,icons-file,icons-upload,i18n-store,i18n-convert,export}.ts
scripts/templates/systems/{index,wfrp}.ts   PACK_HOOKS
scripts/templates/<key>/build.ts            адаптер джерела (srd-5.2: Open5e; grim-d100: немає)
scripts/templates/__tests__/**              + fixtures/fixture-pack/
prisma/migrations/20261130000000_content_slug/migration.sql
```

Видаляються наприкінці E0 (задача 4.4): `lib/srd/i18n/`, `lib/utils/campaigns/template-locales.ts` (вміст → registry), `lib/server/templates/template-translations.ts`, `scripts/srd/i18n/templates.ts`, `scripts/grim/{data,load-template,empty-template,icons,validate-data}.ts`, `scripts/srd/{load-template,empty-template}.ts`, `scripts/assets/tokens-5e/icons-file.ts`, `scripts/assets/grim-icons/cli.ts`, константи `*_TEMPLATE_NAME`.

## Review Focus

1. **Перейменування англійської назви рядка в пакеті** (slug той самий): імпорт має оновити рядок за slug, а не створити дубль; переклад і іконка лишаються. → тест у 2.3.
2. **Клон, створений до E0 (рядки без slug), синхронізується з шаблоном після backfill slug:** 0 «змінених» рядків, `contentVersion` шаблону без змін. → тести в 2.1 і 2.3.
3. **Офіційний шаблон з `templateKey = null` або старим ключем-назвою** (prod до backfill): список шаблонів, клон, uk-накладання, compendium-import працюють через `LEGACY_KEY_BY_NAME`. → тест у 1.3.
4. **Переклад застарів** (англійський текст змінено): накладається старий переклад, `i18n status` показує stale, `publish` відмовляє. Плейсхолдери `{x}` не збігаються → лишається англійський. → тести в 3.1, 3.2.
5. **Колізія slug** у пакеті (два рядки одного виду), у `include`, і при sync у кампанію з локальним рядком того ж slug: перші два — помилка валідатора з назвами рядків; третє — D5. → тести в 2.1, 4.2.

---

# Частина 1: маніфест, реєстр, templateKey (E0.1–E0.3)

Один виконавець, три задачі послідовно.

### Задача 1.1: `TemplateManifest`, маніфести SRD/Grim, `template:index` (E0.1)

**Files:**
- Create: `lib/utils/templates/manifest.ts`, `lib/schemas/template-manifest.ts`, `scripts/templates/lib/{pack,index-gen}.ts`, `scripts/templates/cli.ts`, `data/templates/{manifests.ts,dictionaries.server.ts}` (згенеровані), `data/templates/{srd-5.2-empty,grim-d100-empty}/manifest.json`
- Modify: `data/templates/{srd-5.2,grim-d100}/manifest.json`, `scripts/srd/lib/data-files.ts:26-41` (пише новий формат), `scripts/grim/data.ts:44` (`readGrimManifest` читає новий), `package.json` (`template:index`, загальний вхід `template`), тести `scripts/srd/__tests__/data-integrity*.test.ts`, `scripts/grim/__tests__/real-data.test.ts` (поля маніфесту)
- Test: `lib/schemas/__tests__/template-manifest.test.ts`, `scripts/templates/__tests__/index-gen.test.ts`

**Interfaces — Produces:**
```ts
// lib/utils/templates/manifest.ts
export type PackKind = ContentKind | "skillTrees";          // ContentKind з CONTENT_RESOURCES (13) + D7
export interface TemplateManifest { /* рівно spec 4.2 */ kinds: readonly PackKind[]; extras?: readonly string[] /* D9, напр. ["race-profiles"] */ }
// lib/schemas/template-manifest.ts
export const TemplateManifestSchema: z.ZodType<TemplateManifest>;   // strict; key regex; locales[0]==="en"; locales ⊆ TEMPLATE_CONTENT_LOCALES; names має всі locales
// scripts/templates/lib/pack.ts
export const TEMPLATES_DIR: string;                         // env TEMPLATES_DIR ?? cwd/data/templates
export function listPackKeys(dir?: string): string[];       // теки з manifest.json, sorted
export function readManifest(key: string, dir?: string): TemplateManifest;   // parse + перевірка key === імʼя теки
export function packPath(key: string, file: string, dir?: string): string;
// scripts/templates/lib/index-gen.ts
export function renderManifestsModule(keys: string[]): string;
export function renderDictionariesModule(packs: { key: string; locales: string[] }[]): string;   // лише locales без "en", для яких існує i18n/<locale>.json
export function writeIndex(dir?: string): void;
```
`manifests.ts`: `import m0 from "./srd-5.2/manifest.json"; … export const MANIFESTS = { "srd-5.2": m0, … } as const;`. `dictionaries.server.ts`: `import "server-only"; export const DICTIONARY_LOADERS: Record<string, Partial<Record<string, () => Promise<{ default: unknown }>>>>` з `() => import("./<key>/i18n/<locale>.json")`.

Міграція маніфестів: `name` → `names{en,uk}`; SRD: `key "srd-5.2"`, `system "dnd5e"`, `compendium: true`, `source` + `license` усередину `source.license`, `generatedAt` видалити; Grim: `key "grim-d100"`, `system "wfrp"`, `extras ["race-profiles"]`, `counts.raceProfiles` видалити; `counts["spell-groups"]` лишається (це `ContentKind`). `names.en` = чинні відображувані назви: `"5e SRD 5.2"`, `"Grim d100"`, `"5e (empty)"`, `"Grim d100 (empty)"`. `rules: { file: "rules.json" }` вказується вже зараз; сам файл для SRD і оболонок зʼявиться в 4.3 (валідатор існування файла — теж там).

**Тест-кейси:**
- схема приймає обидва реальні маніфести; відхиляє: key з великою літерою, `locales: ["uk","en"]`, невідомий kind, `names` без локалі, зайве поле.
- `readManifest` кидає, якщо `key` ≠ імʼя теки.
- свіжість: `renderManifestsModule(listPackKeys())` дорівнює вмісту `data/templates/manifests.ts` (те саме для словників).
- у `data/templates/*/` немає `.ts` файлів (glob).

- [ ] Тести (failing) → реалізація → `pnpm template:index` → тести зелені → `pnpm test:related` на змінені файли → комміт.

### Задача 1.2: `TEMPLATE_REGISTRY`, заміна констант, переїзд i18n-ядра (E0.2)

**Files:**
- Create: `lib/utils/templates/registry.ts`, `lib/server/templates/dictionaries.ts`
- Move (`git mv`): `lib/srd/i18n/{catalog,overlay}.ts` → `lib/utils/templates/i18n/`; типи `SrdData`/`SrdKind`, які вони імпортують зі `scripts/srd/lib/types`, замінити локальними нейтральними (`TemplateData = Record<string, unknown[]>`, `kind: string`)
- Delete: `lib/utils/campaigns/template-locales.ts` (експорти переїжджають у registry; `TEMPLATE_CONTENT_LOCALES`, `TemplateContentLocale` → `lib/utils/templates/manifest.ts`), `lib/server/templates/template-translations.ts`
- Modify (імпортери, список зі звіту розвідника): `types/campaigns.ts:3`, `components/campaigns/templates/{TemplatePicker,TemplateTiles}.tsx`, `lib/hooks/campaigns/useTemplates.ts`, `lib/api/campaigns.ts:7`, `lib/schemas/{campaigns,templates}.ts`, `lib/server/campaigns/{action-service,create-campaign}.ts`, `lib/server/templates/{list-templates,prepare-source,localize-template-bundle}.ts`, `lib/server/templates/sync/{context,name-references}.ts`, `lib/server/compendium-import/{presentation.ts:38,repository.ts:52,67}`, `scripts/grim/i18n.ts`, `scripts/srd/i18n/{catalog,overlay}.ts`, `app/dev/fx-spells/page.tsx:8` (перенести `spell-fx-by-name` у `lib/utils/spells/` або прибрати імпорт зі `scripts`), усі `vi.mock("@/lib/server/templates/template-translations")` у тестах → `dictionaries`
- Test: `lib/utils/templates/__tests__/registry.test.ts`

**Interfaces — Produces:**
```ts
// lib/utils/templates/registry.ts  (client-safe: імпортує лише data/templates/manifests.ts)
export const TEMPLATE_REGISTRY: Readonly<Record<string, TemplateManifest>>;
export const templateOf: (key: string) => TemplateManifest | undefined;
export const templatesOfSystem: (system: string) => TemplateManifest[];
export const LEGACY_KEY_BY_NAME: Readonly<Record<string, string>>;   // {"5e SRD 5.2":"srd-5.2","Grim d100":"grim-d100","Heroes":"heroes-homm","5e (empty)":"srd-5.2-empty","Grim d100 (empty)":"grim-d100-empty"}
export function templateKeyOf(c: { templateKey?: string | null; name?: string | null }): string | null;
//   templateKey у реєстрі → він; інакше LEGACY_KEY_BY_NAME[templateKey ?? name] ?? null
export type TemplateIdentity = { kind?: string; visibility?: string; templateKey?: string | null; name?: string | null; locale?: string | null };
export function localizationOf(source: TemplateIdentity): TemplateLocalization | null;   // null, якщо не official template, ключ не в реєстрі або locales.length < 2
export const isLocalizableTemplate, isCanonicalTemplate, isLegacyLocalizedTemplate;    // сигнатури без змін
export const DEFAULT_TEMPLATE_KEY = "srd-5.2-empty";                // для useTemplateSelection
// lib/server/templates/dictionaries.ts
export async function templateTranslationsFor(templateKey: string, locale: TemplateContentLocale): Promise<Translations>;  // {} якщо немає
```
`templateTranslationsFor` стає async (динамічний імпорт): оновити два виклики (`prepare-source.ts:88`, `sync/context.ts:60`). Усі місця, що викликають `localizationOf`, мають передавати `name` у select (перевірити `list-templates.ts`, `prepare-source.ts`, `sync/context.ts`, `app/campaigns/page.tsx:49`).

Заміни: compendium-import фільтрує `templatesOfSystem(...)`-незалежно: `templateOf(templateKeyOf(c))?.compendium === true`; `useTemplateSelection` дефолт = `templateKeyOf(t) === DEFAULT_TEMPLATE_KEY`; `groupTemplates` ключує `templateKeyOf(card) ?? card.name`; `list-templates` canonical-унікальність рахує за `templateKeyOf`.

У цій задачі константи `*_TEMPLATE_NAME` у `lib/constants/campaigns.ts` **лишаються** (ними ще користуються `scripts/`), але з `lib/`, `app/`, `components/` (нетестових) зникають. Видалення — 4.4.

**Тест-кейси:**
- `TEMPLATE_REGISTRY` ключі = `listPackKeys()` (exhaustiveness з теками).
- `templateKeyOf`: новий ключ; legacy ключ-назва `"5e SRD 5.2"` → `srd-5.2`; `templateKey: null, name: "Heroes"` → `heroes-homm`; невідоме → null. (Review Focus 3)
- `localizationOf`: SRD official → `{templateKey:"srd-5.2", locales:["en","uk"]}`; оболонка → null; не-official → null.
- `templateTranslationsFor("srd-5.2","uk")` непорожній; `("srd-5.2","en")` і невідомий ключ → `{}`.
- grep-тест: у `lib app components types` (без `__tests__`) немає `from "@/scripts/`.
- Оновити наявні: `prepare-source`, `srd-overlay`, `list-templates*`, `template-variants`, `template-picker*`, compendium-import integration (створюють шаблон із `templateKey: "srd-5.2"`).

- [ ] Тести → реалізація → `pnpm exec tsc --noEmit -p tsconfig.json` (типи по всьому графу) → `pnpm test:related lib/utils/templates/registry.ts lib/server/templates/dictionaries.ts lib/utils/templates/i18n/catalog.ts` → комміт.

### Задача 1.3: `templateKey` ≠ назва, `template:backfill-keys` (E0.3)

**Files:**
- Create: `scripts/templates/lib/store.ts` (з `scripts/srd/lib/template-store.ts` + `ensureSrdTemplate`), команда `backfill-keys` у `cli.ts`
- Modify: `scripts/srd/lib/{template-store,load-template,run-load-template}.ts`, `scripts/{srd,grim}/empty-template.ts`, `scripts/grim/load-template.ts`, `scripts/seed/seed-example-demo.ts:112`, `scripts/assets/tokens-5e/{upload-tokens-5e.ts:49,upload-identity-icons.ts:52}`, `scripts/assets/grim-icons/cli.ts:93` (guard за `templateKeyOf(campaign) === key`), `scripts/constructor/create-official-templates.ts` (пише `templateKey: "heroes-homm"`)
- Test: `scripts/templates/__tests__/store.test.ts` (переписаний `scripts/srd/__tests__/template-store.test.ts`), `scripts/templates/__tests__/backfill-keys.test.ts`

**Interfaces — Produces:**
```ts
// scripts/templates/lib/store.ts
export interface TemplateStore { findTemplate(): Promise<TemplateRow | null>; findOfficialOwner(): Promise<string | null>;
  create(input: { userId: string; rules: Ruleset; credits: string; description?: string }): Promise<TemplateRow>;
  update(id: string, input: { rules: Ruleset; credits: string; description?: string }): Promise<TemplateRow> }
export function makeTemplateStore(manifest: TemplateManifest, locale?: string): TemplateStore;
export function ensureTemplate(store: TemplateStore, opts: { owner?: string; rules: Ruleset; credits: string; description?: string }): Promise<{ id: string; dmUserId: string; created: boolean }>;
export function planKeyBackfill(rows: { id: string; name: string; templateKey: string | null; locale: string | null }[]): { id: string; from: string | null; to: string }[];
```
`findTemplate`: official template, де `templateKey = manifest.key` **або** (`templateKey IN (null, names.en)` і `name = names.en`), з `templateLocaleWhere`; >1 кандидата → помилка. `create` пише `name: manifest.names.en`, `templateKey: manifest.key`. `update` дописує `templateKey: manifest.key` (самолікування legacy-рядка) без підняття `contentVersion`, якщо змінився лише ключ.
`backfill-keys [--apply]`: без прапора друкує план; UPDATE лише `templateKey` в official templates (включно з legacy uk-варіантами: той самий ключ, інша `locale`); `contentVersion` не чіпає.

**Тест-кейси:** `findTemplate` знаходить за новим ключем, за legacy ключем-назвою, за `null`+name; `create` пише ключ ≠ назва; `planKeyBackfill`: 5 рядків (SRD en, SRD uk-legacy, Heroes null, обидві оболонки) → 5 оновлень, уже мігрований рядок → 0; невідома назва пропускається.

- [ ] Тести → реалізація → `pnpm template backfill-keys` (dry) на локальній БД `wfrp`, показати план у звіті → комміт.

---

# Частина 2: slug, сховище, icons.json (E0.4–E0.7)

Один виконавець, чотири задачі. Перед стартом прочитати `.claude/rules/db-deploy.md`.

### Задача 2.1: міграція slug, генератор + careers, slug поза хешами (E0.4)

**Files:**
- Create: `prisma/migrations/20261130000000_content_slug/migration.sql`, `lib/utils/templates/slug.ts`
- Modify: `prisma/schema.prisma` (поле `slug String?` на 14 моделях; видалити ручний `CareerBase` `:789-804`), `scripts/db/gen-base-models.ts:12-26` (+`Career`), `lib/utils/content/row-hash.ts:7`, `lib/db/layer/config.ts:27` (`NOT_HASHED` + `slug`), `lib/server/templates/sync/classify.ts:26` (`changed()` пропускає `slug`), `lib/server/templates/sync/apply.ts` і `lib/server/templates/import-bundle.ts:80` (D5)
- Test: `lib/utils/content/__tests__/row-hash.test.ts`, `lib/utils/templates/__tests__/slug.test.ts`, `prisma/__tests__/base-models-parity.test.ts` (Career увійде сам), `lib/server/templates/sync/__tests__/{hash,classify,apply}.test.ts`, `lib/server/templates/__tests__/{import-bundle,publish}.test.ts`

**Interfaces — Produces:**
```ts
// lib/utils/templates/slug.ts
export const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;
export const isSlug: (s: string) => boolean;
export function slugify(name: string): string;   // NFKD, прибрати діакритику, lower, [^a-z0-9]+ → "-", trim "-"; порожній результат → кидає
// lib/server/templates/slug-collisions.ts
export function dropTakenSlugs<T extends { id: string; slug?: string | null }>(incoming: T[], taken: ReadonlyMap<string, string /* id власника */>): T[];
```
SQL (вручну, не `migrate dev` автогенерація для індексів): для кожної з 14 таблиць `ALTER TABLE "<t>" ADD COLUMN "slug" TEXT;` + `CREATE UNIQUE INDEX "<t>_campaignId_slug_key" ON "<t>" ("campaignId","slug") WHERE "slug" IS NOT NULL;`; для 14 `*_base`: `ADD COLUMN "slug" TEXT;` + `CREATE INDEX "<t>_base_sourceCampaignId_slug_idx" ON "<t>_base" ("sourceCampaignId","slug");`. Частковий unique — лише в SQL з коментарем, за прецедентом `20261027000100_world_map_single_root`. У `schema.prisma` для base — `@@index([sourceCampaignId, slug])` (генератор має його додати: правка `gen-base-models.ts`).
Порядок: додати `Career` у `CONTENT_MODELS`, видалити ручний блок, `pnpm exec tsx scripts/db/gen-base-models.ts`, `pnpm exec prisma migrate dev --name content_slug --create-only`, замінити тіло SQL на описане вище, перевірити, що для `careers_base` diff лише `slug` + індекс (жодного DROP/ALTER інших колонок; якщо є — зупинитись і повідомити), `pnpm exec prisma migrate dev`. Потім `pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url …` має показувати лише відсутні в схемі partial-індекси або нічого; результат — у звіт.

**Тест-кейси:**
- `contentRowHash("Feat", row)` однаковий для `slug: undefined | null | "x"` (Review Focus 2).
- `changed()` не повертає `slug` у `changedFields`.
- publish: шаблон, де рядкам лише дописали slug, не створює нової версії base-рядків; base-рядки отримують slug UPDATE-ом (додати цей UPDATE у `publishTemplateVersion`: для відкритих base-рядків з тим самим hash і іншим slug).
- import-bundle / sync apply: вхідний рядок зі slug, зайнятим іншим локальним рядком, записується зі `slug: null`; без колізії slug копіюється (Review Focus 5).
- `slugify`: `"Fireball of Ash"` → `fireball-of-ash`; `"Zweihänder +2"` → `zweihander-2`; кирилиця без латиниці → кидає.
- `migrations-rls`, `content-base-fk-drift`, `fk-indexes` зелені.

- [ ] Тести → схема/міграція → реалізація → `pnpm test:run prisma/__tests__ lib/utils/content/__tests__/row-hash.test.ts lib/server/templates` → комміт.

### Задача 2.2: slug в імпорті (E0.4/E0.5, D2–D3)

**Files:**
- Modify: `lib/server/content/import/import-content.ts` (`planRow :130`, deps), `lib/server/content/import/names.ts` (`loadNames` → також slug), `types/content-import.ts` (`ContentImportInput.rows[i]` допускає `slug?: string`)
- Create: `lib/server/content/import/slug.ts`
- Test: `lib/server/content/import/__tests__/import-slug.test.ts`

**Interfaces — Produces:**
```ts
// deps
loadKeys(campaignId: string, kind: ImportKind): Promise<{ id: string; name: string; slug: string | null }[]>;   // замінює loadNames
writeSlug(campaignId: string, kind: ImportKind, id: string, slug: string): Promise<void>;                       // prisma[delegate].update, delegate з BUNDLE_TABLES за kind
```
`slug` читається з сирого запису **до** `coerceRecord` (не поле `IMPORT_SPECS`), валідований `isSlug`. Зіставлення: `bySlug.get(slug) ?? byName.get(nameKey(name))`. Після create/update: якщо у записі є slug і він відрізняється від збереженого → `writeSlug`. Дубль slug у пакеті записів → помилка рядка (як дубль name). Запис без slug поводиться як раніше.

**Тест-кейси:** (а) новий рядок зі slug → створено, slug записано; (б) наявний за name без slug → update того самого id + slug (backfill, D3); (в) наявний за slug з **іншою** назвою → update того самого id, name змінено, дубля немає (Review Focus 1); (г) два записи з одним slug → помилка другого; (д) невалідний slug → помилка рядка; (е) запис без slug — поведінка без змін (наявні тести імпорту зелені).

- [ ] Тести → реалізація → `pnpm test:related lib/server/content/import/import-content.ts` → комміт.

### Задача 2.3: slug у data-файлах SRD і Grim, backfill у БД (E0.5)

**Files:**
- Modify: `scripts/srd/lib/data-files.ts:49-57` (`toImportRows` більше не стрипає slug), `data/templates/grim-d100/{feats,careers,races,spells,units,artifacts}.json` (поле `slug` першим ключем), `data/templates/grim-d100/race-profiles.json` (`race` → slug раси; `careerId`/`talents`/`featId` лишаються назвами до 4.2), `scripts/grim/data.ts` (тип рядка зі slug), `scripts/grim/__tests__/fixtures/*.json`
- Create: одноразовий `scripts/templates/lib/add-slugs.ts` (`addSlugs(rows): rows` — `slugify(name)`, колізія → кидає з обома назвами); після застосування файл лишається для 4-го пакета (`template:build` викликає для рядків без slug лише з прапором `--init-slugs`)
- Test: `scripts/templates/__tests__/add-slugs.test.ts`; оновити `scripts/srd/__tests__/data-integrity.test.ts` (slug відповідає `SLUG_RE`, унікальний у виді), `scripts/grim/__tests__/real-data.test.ts` (те саме)

Slug Grim фіксується у файлах раз і далі не перераховується з назви. Backfill у локальній БД: `pnpm constructor:srd-template` і `pnpm constructor:grim-template` (поки старі лоадери) в режимі update → рядки отримують slug через 2.2(б); у звіті: кількість створених рядків має бути 0, `contentVersion` шаблону SRD не змінився, base-рядки мають slug.

**Тест-кейси:** `addSlugs` стабільний і кидає на колізії; усі рядки реальних пакетів мають унікальний валідний slug; integration (`scripts/grim/__tests__/load-template.integration.test.ts`): повторне завантаження → 0 created, slug заповнені; integration SRD-клон: клон до backfill → backfill → `sync` показує 0 змінених рядків (Review Focus 2; розширити `layered.integration` або `srd-overlay`).

- [ ] Тести → дані → локальний backfill на БД `prodcopy` → комміт.

### Задача 2.4: бакети, шляхи, єдиний `icons.json` (E0.6, E0.7)

**Files:**
- Modify: `lib/constants/storage.ts:6-9` (`"career-icons"` у `ICON_BUCKETS`; `TEMPLATE_ASSET_PREFIX = "templates/"`), `lib/utils/common/image-url.ts:73-90` (`templateAssetPath`, `isSharedAssetUrl`), `scripts/assets/grim-icons/upload.ts:13` (бакет з константи), `data/templates/grim-d100/icons.json` (ключі — slug; зараз порожній, лише формат)
- Create: `scripts/templates/lib/icons-file.ts` (замінює `scripts/assets/tokens-5e/icons-file.ts` і файлову частину `scripts/grim/icons.ts`); старі модулі стають re-export-ами до 4.4
- Test: `lib/utils/common/__tests__/image-url.test.ts`, `scripts/templates/__tests__/icons-file.test.ts`; `lib/__tests__/icon-buckets-immutable.test.ts` покриє новий бакет сам (перевірити, що зелений)

**Interfaces — Produces:**
```ts
// lib/utils/common/image-url.ts
export function templateAssetPath(templateKey: string, kind: string, slug: string, sha8: string): string;   // templates/<key>/<kind>/<slug>-<sha8>.webp
export function isSharedAssetUrl(url: string): boolean;   // true для sets/ і templates/ у бакетах ICON_BUCKETS
// scripts/templates/lib/icons-file.ts
export type IconsFile = Record<string, Record<string, string>>;      // kind → slug (або "<slug>/<subId>") → url
export function readIcons(key: string, dir?: string): IconsFile;
export function writeIcons(key: string, icons: IconsFile, dir?: string): void;   // ключі відсортовані
export function withIcons<T extends { slug: string }>(rows: T[], icons: Record<string, string> | undefined, column?: string): T[];   // не перезаписує явний icon у рядку
export function iconIssues(data: Record<string, { slug: string }[]>, icons: IconsFile): string[];   // ключ без рядка
export function iconGaps(data: Record<string, { slug: string }[]>, icons: IconsFile): string[];     // рядок без іконки (warning)
```
`next.config` не змінюється (патерн `**.supabase.co/storage/v1/object/public/**` уже покриває). Старі URL у `srd-5.2/icons.json` не перезаписуються.

**Тест-кейси:** `templateAssetPath("grim-d100","careers","rat-catcher","ab12cd34")`; `isSharedAssetUrl` true для `templates/…` і `sets/…`, false для `<cuid>/…` і чужого бакета; `iconIssues` ловить осиротілий ключ; `withIcons` за slug; read/write round-trip зберігає порядок.

- [ ] Тести → реалізація → `pnpm test:related` → комміт.

---

# Частина 3: переклад за ключем (E0.8)

Один виконавець, дві задачі.

### Задача 3.1: ключі v2, накладання, stale

**Files:**
- Create: `lib/utils/templates/i18n/keys.ts`
- Modify: `lib/utils/templates/i18n/{catalog,overlay}.ts`, `lib/server/templates/localize-template-bundle.ts`, `lib/server/templates/sync/name-references.ts`, `lib/server/templates/dictionaries.ts` (тип `TranslationsV2`)
- Test: `lib/utils/templates/i18n/__tests__/{keys,overlay}.test.ts`, `lib/server/templates/__tests__/localize-template-bundle.test.ts`

**Interfaces — Produces:**
```ts
// keys.ts
export interface TranslationEntry { text: string; en: string }
export type TranslationsV2 = Record<string, TranslationEntry>;      // ключ "<kind>/<slug>/<fieldPath>"
export interface KeyedString { key: string; kind: string; slug: string; fieldPath: string; cls: TextClass; en: string }
export function fieldPathOf(path: readonly (string | number)[], containers: readonly unknown[]): string;
//   сегмент масиву: елемент має `id` → "[#<id>]"; інакше має `name` (унікальний у масиві) → "[=<slugify(name)>]"; інакше "[<index>]"
export function extractKeyed(data: Record<string, { slug: string }[]>, kinds: readonly string[]): KeyedString[];
export function rulesKeyed(rules: unknown): KeyedString[];           // kind "rules", slug "_", шлях від rules.tables
export type EntryStatus = "ok" | "stale" | "missing" | "orphan";
export function statusOf(catalog: KeyedString[], tr: TranslationsV2): Record<EntryStatus, string[]>;
// overlay.ts
export function translateAt(tr: TranslationsV2, key: string, en: string): string;   // tr[key]?.text, якщо плейсхолдери {x} збігаються з en; stale накладається
export function applyOverlay<T extends Record<string, { slug: string }[]>>(data: T, tr: TranslationsV2, kinds: readonly string[]): T;
```
`localizeTemplateBundle(bundle, translations: TranslationsV2)`: рядок bundle має `slug` (колонка з 2.1); рядок без slug не перекладається (лишається англійським). Карти перекладених назв для посилань (spell lists, `perform.attack`, itemStats) будуються з `"<kind>/<slug>/name"`. Перевірка колізій назв лишається. `classOf`/`isTranslatable` без змін (визначають, які поля перекладні).

**Тест-кейси:** `fieldPathOf` для `abilities[#id].description`, `tiers[=name].trappings`, масиву рядків за індексом; `translateAt`: ok; stale (en змінено) → все одно переклад; розбіжність плейсхолдерів → англійський; відсутній → англійський (Review Focus 4). `statusOf` усі 4 статуси. `localizeTemplateBundle`: два рядки з однаковим англійським name у різних видах отримують різні переклади; рядок без slug не чіпається; перейменування англійського name за того ж slug зберігає переклад. Наявні тести `localize-template-bundle`, `srd-overlay`, `localized-clone.integration` переведені на v2-фікстури.

- [ ] Тести → реалізація → `pnpm test:related lib/utils/templates/i18n/keys.ts lib/server/templates/localize-template-bundle.ts` → комміт (після 3.2, разом: проміжний стан із v1-словниками неробочий).

### Задача 3.2: конвертер словників і `template:i18n`

**Files:**
- Create: `scripts/templates/lib/{i18n-store,i18n-convert}.ts`, команда `i18n` у `cli.ts`
- Modify: `data/templates/{srd-5.2,grim-d100}/i18n/uk.json` (v2), `scripts/grim/i18n.ts` (каталог через `extractKeyed`; careers-reshape і `spellLists` лишаються як підготовка даних), `scripts/srd/i18n/cli.ts` → тонкий аліас на `template i18n`, `package.json`
- Delete: `scripts/srd/i18n/templates.ts`
- Test: `scripts/templates/__tests__/i18n-convert.test.ts`; оновити `scripts/srd/i18n/__tests__/*`, `scripts/grim/__tests__/{i18n,i18n-real}.test.ts`, `scripts/srd/__tests__/{data-integrity-i18n,icons-i18n-parity}.test.ts`

**Interfaces — Produces:**
```ts
export function convertV1(catalog: KeyedString[], v1: Record<string, string>): { v2: TranslationsV2; unmatched: string[] /* v1-хеші без запису каталогу */ };
//   для кожного KeyedString: hash = hashText(cls, en); якщо v1[hash] → v2[key] = { text: v1[hash], en }
export function readTranslations(key: string, locale: string, dir?: string): TranslationsV2;
export function writeTranslations(key: string, locale: string, tr: TranslationsV2, dir?: string): void;   // ключі відсортовані, один запис на рядок
```
CLI: `template i18n <extract|apply|normalize|status> <key> <locale>` — ті самі підкоманди, що `srd:i18n`, каталог з `extractKeyed(readPack(key))` + `rulesKeyed`. `status` друкує лічильники ok/stale/missing/orphan і повертає код 1, якщо stale > 0 або missing > 0 (для `publish`, 4.2). `apply` приймає пакети перекладу у форматі `{ key, text }`. Глосарії (`i18n/glossary/uk.json`) без змін.

Конвертація: запустити `convertV1` для обох пакетів, записати `uk.json`; у звіті — кількість записів до/після і `unmatched` (очікувано 0 для Grim; для SRD допустимі одиниці, перелічити).

**Тест-кейси:** `convertV1` розгортає один v1-хеш у N ключів; `unmatched` рахується; round-trip read/write стабільний; реальні словники: `statusOf` дає 0 missing і 0 stale для Grim, для SRD missing не більше, ніж було до конвертації (зафіксувати число в тесті як верхню межу).

- [ ] Тести → реалізація → конвертація → `pnpm template:index` → тести 3.1 + 3.2 → комміт.

---

# Частина 4: спільний CLI, правила як дані, generic-тести (E0.9, E0.11, E0.12)

Один виконавець, чотири задачі.

### Задача 4.1: читання пакета, порядок імпорту, валідатор

**Files:**
- Modify: `scripts/templates/lib/pack.ts` (+`readPack`)
- Create: `scripts/templates/lib/{import-order,validate}.ts`, `scripts/templates/systems/{index,wfrp}.ts`
- Move: wfrp-перевірки з `scripts/grim/validate-data.ts` (п. 3–7 переліку розвідника: profiles, tables, careerTiers, featAbilities, spells/units/artifacts) і `scripts/grim/{coverage,equipment,spells,units}.ts` → `scripts/templates/systems/wfrp/`; `scripts/grim/forbidden-terms.ts` → `scripts/templates/grim-d100/forbidden-terms.ts` (пакет-специфічне, викликає `PACK_HOOKS`-незалежний хук пакета, див. нижче)
- Test: `scripts/templates/__tests__/{import-order,validate}.test.ts`; `scripts/grim/__tests__/validate-data.test.ts` переїжджає в `scripts/templates/__tests__/wfrp-pack.test.ts` з тими самими кейсами

**Interfaces — Produces:**
```ts
// pack.ts
export interface Pack { manifest: TemplateManifest; rules: Ruleset; rows: Partial<Record<PackKind, PackRow[]>>; extras: Record<string, unknown>; icons: IconsFile }
export type PackRow = { slug: string; name?: string; origin?: { template: string; slug: string } } & Record<string, unknown>;
export function readPack(key: string, dir?: string): Pack;       // файл виду: `<kind>.json`; відсутній файл для kind з manifest.kinds → кидає
// import-order.ts
export function importOrder(kinds: readonly PackKind[]): PackKind[];   // топологія refKindsOf; D10; стабільна за manifest.kinds при рівності
// systems/index.ts
export interface PackIssue { level: "error" | "warning"; kind?: string; slug?: string; message: string }
export interface PackHooks { validatePack?(pack: Pack): PackIssue[]; afterImport?(ctx: { pack: Pack; templateId: string; idBySlug: Record<string, Record<string, string>> }): Promise<void> }
export const PACK_HOOKS: Readonly<Record<string, PackHooks>>;    // ключ = система; d20-системи: {}
export const PACK_ADAPTERS: Readonly<Record<string, { validate?(pack: Pack): PackIssue[] }>>;   // ключ = пакет; grim-d100: forbidden terms
// validate.ts
export function validatePack(pack: Pack, opts?: { registry?: Record<string, TemplateManifest> }): PackIssue[];
```
`validatePack` (generic, у такому порядку): маніфест (схема; `system` ∈ `RULE_SYSTEM_REGISTRY`; `include.from` існує і того ж модуля системи — мапа `SYSTEM_MODULE = { homm: "d20", dnd5e: "d20", wfrp: "wfrp" }` у `scripts/templates/systems/index.ts`), `rules` (`RulesetSchema`, `rules.system.key === manifest.system`), рядки (`slug` валідний і унікальний у виді; `coerceRecord` + `CONTENT_RESOURCES[kind].schemas.create.safeParse` як у чинному `validateRows`; дубль name), посилання (`field.ref`/`nestedRef` резолвляться за name у межах пакета, як чинний `validateLinks`), `counts` = фактичні, іконки (`iconIssues` → error, `iconGaps` → warning), переклади (для кожної locale ≠ en: `statusOf` → orphan = error, missing/stale = warning тут, error у `publish`), `PACK_HOOKS[system].validatePack`, `PACK_ADAPTERS[key].validate`.
`afterImport` wfrp: `writeRaceProfiles` (з `scripts/grim/load-template.ts`), посилання за slug раси, назви feat/career → id.

**Тест-кейси:** `importOrder(["units","spells","spell-groups","races"])` → groups, spells, races, units; пакет з artifacts + artifact-sets не зациклюється; `validatePack` на fixture-пакеті (`scripts/templates/__tests__/fixtures/fixture-pack/`, система `dnd5e`, 2 feats + 1 spell-group + 2 spells, `locales ["en","uk"]`): 0 issues; мутації фікстури дають рівно одну помилку кожна: дубль slug (повідомлення містить обидва name), биті посилання, `system` невідомий, `rules.system.key` ≠ `system`, `counts` невірні, осиротілий ключ іконки, orphan-переклад, `include` з пакета іншого модуля (Review Focus 5). Усі кейси старого `validate-data.test.ts` зелені через новий вхід.

- [ ] Тести → реалізація → `pnpm test:run scripts/templates` → комміт.

### Задача 4.2: команди `build`, `validate`, `import`, `publish`, `icons`

Враховує D18.

**Files:**
- Create: `scripts/templates/lib/{import-pack,build,icons-upload}.ts`, `scripts/templates/srd-5.2/build.ts` (обгортка чинного `scripts/srd/build.ts` + `lib/build-data`), команди в `cli.ts`
- Modify: `package.json` — `"template": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/templates/cli.ts"`, `"template:index"`; `constructor:srd-template` → `pnpm template import srd-5.2 --publish`, `constructor:grim-template` → `… grim-d100 --publish`, `constructor:empty-5e-template` → `… srd-5.2-empty --publish`, `constructor:empty-grim-template`, `srd:build` → `template build srd-5.2`, `assets:grim-icons upload` / `assets:tokens-5e` / `assets:identity-icons` → `template icons <key>` (prompts-підкоманда grim лишається як є)
- Test: `scripts/templates/__tests__/{import-pack,build-include,cli-args}.test.ts`, integration `scripts/templates/__tests__/import-pack.integration.test.ts` (переписані `scripts/grim/__tests__/{load-template,real-data,localized-clone}.integration.test.ts`)

**Interfaces — Produces:**
```ts
// import-pack.ts
export interface ImportPackResult { templateId: string; created: boolean; perKind: Record<string, { created: number; updated: number; skipped: number; errors: number }> }
export async function importPack(key: string, opts: { owner?: string; dryRun?: boolean; allowRemote?: boolean; dir?: string }): Promise<ImportPackResult>;
export async function publishPack(key: string, opts: { allowRemote?: boolean }): Promise<{ contentVersion: number; changedRows: number }>;
// build.ts
export function applyIncludes(pack: Pack, sources: Record<string, Pack>): Pack;   // копіює рядки з origin {template, slug} та їх icons-url; конфлікт slug → кидає
// icons-upload.ts
export async function uploadIcons(key: string, opts: { dir: string; dryRun?: boolean; allowRemote?: boolean; kinds?: string[] }): Promise<{ uploaded: number; skipped: number }>;
```
`importPack`: `assertSeedTarget` → `readPack` → `validatePack` (error → exit 1) → `ensureTemplate(makeTemplateStore(manifest), { rules: pack.rules, credits: manifest.credits ?? "" })` → для kind у `importOrder`: `importContent(actor, kind, { mode: "update", rows: withIcons(rows, icons[kind]) }, OFFLINE_IMPORT_DEPS)` (ImportKind) або `upsertBySlug` (D7: `skillTrees`, `tracks`; пряме prisma, зіставлення slug, id зберігається) → `PACK_HOOKS[system].afterImport` → звіт. `dryRun`: транзакція з відкатом або `importContent` dry-режим (якщо є; інакше — обгортка з `throw` rollback-маркером), друкує `perKind`. `publishPack`: `statusOf` для кожної locale має 0 stale/missing (інакше exit 1) → `publishTemplate`.
`uploadIcons`: файл `<dir>/<kind>/<slug>.png` → `toWebp` → `ensureBucket` → `templateAssetPath(key, kind, slug, sha8)` → `writeIcons`; бакет: `manifest.icons.bucketByKind[kind] ?? ASSET_BUCKET[kind]`; розмір — з наявних `TOKEN_SIZE`/`GRIM_ICON_SIZE`/`IDENTITY_SIZE` (звести в одну мапу `ICON_SIZE_BY_KIND`, units 384, решта 256). Guard: шаблон у БД має `templateKeyOf === key`. **Реальних заливок у цій задачі немає** — лише `--dry-run` тест планування.
`template build <key>`: якщо є `scripts/templates/<key>/build.ts` — запускає адаптер (мережа; у тестах не викликається), потім `applyIncludes`, оновлює `counts`, пише файли; `--init-slugs` → `addSlugs`.

**Тест-кейси:** unit — `applyIncludes`: `"all"` і список slug, `origin` проставлено, конфлікт slug кидає, відсутній slug у джерелі кидає; `cli-args`: невідомий ключ пакета → помилка зі списком ключів. Integration (локальна БД, skip без неї): `importPack("grim-d100")` двічі → другий раз 0 created / 0 errors; `importPack` fixture-пакета створює шаблон з `templateKey` фікстури; клон з uk-накладанням отримує українські назви (переписаний `localized-clone`); `publishPack` при stale-перекладі відмовляє (Review Focus 4).

- [ ] Тести → реалізація → на БД `prodcopy`: `pnpm template import srd-5.2 --dry-run` (очікувано 0 created; якщо шаблон SRD на prodcopy без slug — усі updated лише через slug) → результат у звіт → комміт.

### Задача 4.3: правила як дані, оболонки (E0.11)

**Files:**
- Create: `data/templates/{srd-5.2,srd-5.2-empty,grim-d100-empty}/rules.json`
- Modify: `data/templates/grim-d100/rules.json` (патч → повний Ruleset = `mergeRules(WFRP_RULES, patch)`), `scripts/srd/lib/rules-preset.ts` (`export const SRD_RULES = RulesetSchema.parse(readJson("data/templates/srd-5.2/rules.json"))`; 3 lib-тести, що імпортують `@/scripts/srd/lib/rules-preset`, перевести на `import rules from "@/data/templates/srd-5.2/rules.json"` + `RulesetSchema.parse`), `scripts/templates/lib/validate.ts` (файл rules обовʼязковий)
- Test: `scripts/templates/__tests__/rules-data.test.ts`

**Тест-кейси:** `rules.json` кожного пакета проходить `RulesetSchema`; `srd-5.2-empty` deep-equals `srd-5.2`; `grim-d100-empty` deep-equals `WFRP_RULES`; `grim-d100` deep-equals старий `mergeRules(WFRP_RULES, <старий патч>)` (зафіксувати snapshot до заміни); оболонка: `kinds: []`, `locales: ["en"]`, `importPack` створює шаблон без рядків (integration; замінює `scripts/grim/__tests__/empty-template.test.ts` і srd-аналог).

- [ ] Тести → дані → `pnpm template:index` → комміт.

### Задача 4.4: generic-тести, fixture-4-й-пакет, прибирання (E0.12)

**Files:**
- Create: `scripts/templates/__tests__/{all-packs,fourth-pack}.test.ts`
- Delete: перелік із розділу «Файлова структура» (старі лоадери, `icons-file.ts`, `scripts/grim/icons.ts`, `grim-icons/cli.ts` upload-частина, `lib/srd/`), константи `SRD_TEMPLATE_NAME`, `EMPTY_5E_TEMPLATE_NAME`, `EMPTY_GRIM_TEMPLATE_NAME`, `GRIM_TEMPLATE_NAME` з `lib/constants/campaigns.ts`; тести, що їх дублюють
- Modify: `docs/architecture/content-api.md`, `docs/architecture/rule-systems.md` (розділ про шаблони: ключі, маніфест, CLI), `docs/STATUS.md`

**Тест-кейси:**
- `all-packs`: `for key of Object.keys(TEMPLATE_REGISTRY)` → `validatePack(readPack(key))` без error; реєстр ↔ теки ↔ `DICTIONARY_LOADERS` ↔ `manifest.locales` взаємно узгоджені; `LEGACY_KEY_BY_NAME` значення ∈ реєстру.
- `fourth-pack`: копіює fixture-пакет у tmp-теку `TEMPLATES_DIR`, викликає `renderManifestsModule`/`validatePack`/`importOrder` → зелений без жодного файла поза tmp; grep-перевірка: у `lib app components types` немає рядків `"srd-5.2"`, `"grim-d100"`, `"heroes-homm"` поза `lib/utils/templates/registry.ts` (мапа legacy і `DEFAULT_TEMPLATE_KEY`) і тестами.
- grep: `_TEMPLATE_NAME` відсутній у репозиторії.

- [ ] Тести → видалення → `pnpm exec tsc --noEmit` → `pnpm test:run scripts/templates lib/utils/templates lib/server/templates` → `pnpm exec knip` лише якщо швидкий (інакше пропустити й зазначити) → комміт.

---

# Частина 5: Heroes як пакет (E0.10, E0.10b)

Два виконавці: 5.1–5.2 (один), 5.3 (переклад; паралельні Sonnet-агенти за видами). Потрібна локальна БД `prodcopy` (зібрана 2026-11-11 з дозволу користувача; якщо відсутня — зупинитись і спитати, не збирати самостійно).

### Задача 5.1: `template export`, пакет `heroes-homm` українською (E0.10)

**Files:**
- Create: `scripts/templates/lib/export.ts`, команда `export`, `data/templates/heroes-homm/{manifest.json,rules.json,spell-groups.json,spells.json,races.json,units.json,artifacts.json,artifact-sets.json,main-skills.json,skills.json,skillTrees.json,tracks.json,icons.json}`, `scripts/templates/heroes-homm/slugs.json`
- Test: `scripts/templates/__tests__/export.test.ts`

**Interfaces — Produces:**
```ts
export function bundleToPack(bundle: Bundle, manifest: TemplateManifest, slugs: Record<string, Record<string /* row id */, string /* slug */>>): Pack;
//   id-посилання всередині рядків (groupId, setId, artifactIds, spellId, mainSkillId, …) → назви, як очікують IMPORT_SPECS ref-поля; icon-URL рядків → icons.json; рядок без slug у мапі → кидає
```
`template export heroes-homm --from <templateCampaignId>`: `exportCampaign(prisma, id)` → `bundleToPack` → файли. Маніфест: `key "heroes-homm"`, `system "homm"`, `names { en: "Heroes", uk: "Heroes" }`, `locales ["en"]` на цьому кроці (вміст ще український; `uk` додасться в 5.3), `kinds` усі 10. `rules.json`: правила шаблону + явний `system: { key: "homm" }`, пропущені секції доповнені `parseRules`.
`slugs.json` (R19): англійські slug вручну. Генерує Sonnet-агент за видами: вхід — українська назва + опис, вихід — `{ id, slug }`; правила: офіційна англійська назва HoMM V, де вона є (`Аватар Смерті` → `avatar-of-death`), kebab-case, унікальність у виді; `skillTrees` → slug раси; `tracks` → `slugify` англійської/латинської назви треку або `track-<nn>`. Мапа комітиться (джерело істини для backfill).

**Тест-кейси:** `bundleToPack` на малому фіктивному bundle: посилання за id стають назвами, іконки переїжджають у `icons`, відсутній slug кидає; реальний пакет: `validatePack(readPack("heroes-homm"))` без error (входить в `all-packs`); `counts` збігаються з кількістю рядків шаблону на prodcopy.

- [ ] Тести → експорт з prodcopy → slugs → `pnpm template:index` → комміт.

### Задача 5.2: імпорт зі збереженням id (E0.10)

**Files:**
- Modify: `scripts/templates/lib/import-pack.ts` (якщо треба для `upsertBySlug`), `scripts/constructor/create-official-templates.ts` (шапка: застаріло, шаблон Heroes створює `template import heroes-homm`), `scripts/seed/seed-library.ts` (шапка: застаріло для створення шаблону; `data/library` лишається — його імпортують тести)
- Test: integration `scripts/templates/__tests__/heroes-roundtrip.integration.test.ts`

Послідовність на `prodcopy`: `template backfill-keys --apply` → `template import heroes-homm --dry-run` → `template import heroes-homm` → `template publish heroes-homm`.

**Тест-кейси / перевірки (числа — у звіт):** після імпорту множина id рядків шаблону Heroes по кожній таблиці **ідентична** множині до імпорту (0 created, 0 deleted); кожен рядок має slug; вміст рядків не змінився (порівняння `rowHash` до/після: 0 відмінностей); `templateKey = "heroes-homm"`; кампанія HOMM5 (`createdFromId`) не має жодного зміненого рядка (`updatedAt` max до = після); другий `import` → 0 updated.

- [ ] Перевірки → integration-тест (skip без prodcopy) → комміт.

### Задача 5.3: EN-база й uk-overlay (E0.10b)

**Files:**
- Modify: `data/templates/heroes-homm/*.json` (англійські name і тексти), `manifest.json` (`locales ["en","uk"]`, `names.uk`), `data/templates/heroes-homm/rules.json` (таблиці, якщо є текст)
- Create: `data/templates/heroes-homm/i18n/uk.json`, `data/templates/heroes-homm/i18n/glossary/uk.json`
- Test: входить в `all-packs`; додати кейс у `heroes-roundtrip.integration`

Порядок:
1. Зняти український каталог: `extractKeyed(readPack("heroes-homm"))` → `uk-source.json` у scratch (ключ → український текст).
2. Глосарій HoMM V (фракції, істоти, школи магії, навички, артефакти): один Sonnet-агент складає `glossary/uk.json` `{ uk: en }` з офіційних англійських назв; контролер (Fable) переглядає лише спірні терміни зі звіту.
3. Переклад uk → en пакетами за видами (units, spells, skills, artifacts+sets, races+main-skills+groups, tracks без перекладу): Sonnet-агент на вид, вхід — записи каталогу + глосарій, вихід — `{ key, en }`. Правила: назви за глосарієм; плейсхолдери `{x}`, числа, формули кубиків без змін; жодної кирилиці у виході.
4. Застосувати: англійський текст у data-файли за ключем; `i18n/uk.json[key] = { text: <український оригінал>, en: <новий англійський> }`. Посилання за назвою (ref-поля) оновити на англійські назви тим самим проходом (мапа name uk → en за slug).
5. `validatePack` (0 error, 0 missing/stale/orphan) → `template:index`.
6. На `prodcopy`: `template import heroes-homm` → шаблон стає англійським (id ті самі, змінюється вміст → `publish` підніме версію; це очікувано й стосується лише шаблону). Клон з `locale uk` → назви й тексти дорівнюють українському оригіналу.

**Тест-кейси:** у data-файлах пакета немає кирилиці (regex-тест); `statusOf` 0 missing/0 stale/0 orphan; integration: клон Heroes з uk-накладанням → для вибірки 20 рядків на вид name і description збігаються з текстами шаблону до 5.3 (зняти snapshot перед кроком 4); HOMM5 без змін.

- [ ] Кроки 1–6 → тести → комміт (дані й словник одним коммітом).

---

## Після частини 5

1. Одне фінальне ревʼю гілки (Opus) за діапазоном коммітів E0 з фокусом на розділ «Review Focus» і D1–D13; одна хвиля виправлень (Sonnet).
2. Перевірка етапу зі spec (на `prodcopy`): `template validate` по всіх пакетах; `template import <key> --dry-run` для SRD → 0 created; clone → sync → uk-накладання для SRD, Grim, Heroes; re-publish SRD → `contentVersion` без змін.
3. `/simplify` (1 агент) на diff E0; оновити `docs/architecture/*` і `STATUS.md`; пам'ять `project-architecture-modularity`.
4. Повний `pnpm test:run` і repo-wide lint — лише за окремим «так» користувача.
5. Не робиться в E0: prod-backfill ключів і slug, заливка іконок (після E1, U8).
