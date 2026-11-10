# WFRP 5g-4: завершення шаблону Grim d100 — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Без per-task рев'ю: одне фінальне Opus-рев'ю гілки після Task 8. Виконавці — Sonnet у свіжій сесії; групи — у розділі «Групи диспетчеризації».

**Goal:** шаблон Grim d100 стає готовим до prod: локалізується тим самим overlay-механізмом, що й SRD (picker `en/uk`, uk-словник Grim зі 100 % покриттям, sync тримається мови кампанії, включно з `rules.tables`), має конвеєр іконок (`icons.json`, промпти, завантаження — prod лише з дозволу користувача), оригінальні назви Ashburner/Crier, wfrp-обізнаний AI-асистент, закриті хвости 5g-3 і задокументовану prod-команду.

**Architecture:** Реєстр `TEMPLATE_LOCALIZATIONS` (клієнтський, без словників) замінює хардкод `SRD_TEMPLATE_NAME` у визначенні «локалізованого офіційного шаблону»; серверний `template-translations.ts` віддає словник за `templateKey + locale`. `localizeSrdBundle` (назву лишаємо) додатково локалізує `careers`, `rules.tables` і, для шаблонів без класів, імена списків заклинань. CLI `srd:i18n` отримує `--template srd|grim`; каталог Grim будує `scripts/grim/i18n.ts`. AI-проєкції отримують wfrp-гілки в чистому модулі `lib/ai/tools/wfrp-view.ts`. Нових механік рушія, полів Prisma, міграцій і AI-інструментів немає.

**Tech Stack:** TypeScript, Next.js 16 server modules, Vitest (`happy-dom` лише для picker), Prisma (інтеграційний тест на локальній БД `wfrp`), tsx-скрипти, sharp (`toWebp`), Supabase Storage (лише в user-gated кроці).

**Spec:** `docs/superpowers/specs/2026-11-10-wfrp-5g4-design.md`; читати разом із `docs/architecture/content-api.md` («Мова контенту SRD: один канонічний шаблон», «Офіційні шаблони на prod», «Sync поверх шарів»), `docs/architecture/i18n.md` («Мова контенту SRD»), `docs/architecture/rule-systems.md` («Межі 5g-0…5g-3»), `.claude/rules/components.md` (Task 1, picker), і планом-зразком `docs/superpowers/plans/2026-11-10-wfrp-5g3-magic-equipment.md`.

## Global Constraints

- Коміти лише на `feat/wfrp` у worktree `/Users/silentfox/Work/dnd-tracker-wfrp`; не мерджити й не пушити. Кожен коміт закінчується рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Тести лише вузько: `pnpm test:run <файли>`, `pnpm test:related <файли>`; eslint лише `pnpm exec eslint --fix <змінені .ts/.tsx>`. Повний `pnpm test:run` і repo-wide `pnpm lint` НЕ запускати (pre-deploy гейт епіку). Перед прогоном — `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; прогін > ~5 хв — убити й звузити.
- Кирилиця заборонена в коді під ESLint, крім `scripts/**`, `data/**` і ratchet-списку `i18n-exempt.json`; нові ідентифікатори — англійською; коментарі мінімальні (лише «чому»).
- **Регресія SRD обов'язкова:** кожен коміт Tasks 1–3 лишає зеленими `lib/server/templates/__tests__/localize-srd-bundle.test.ts`, `lib/server/templates/__tests__/prepare-source.test.ts`, `lib/server/templates/__tests__/list-templates.test.ts`, `lib/server/templates/sync/__tests__/srd-overlay.test.ts`, `scripts/srd/i18n/__tests__/*.test.ts`, а каталог SRD (`extractCatalog(readSrdData())`) — побайтно тим самим (Task 2 Step 1).
- Кожен коміт лишає зеленим `pnpm test:run scripts/grim/__tests__/real-data.test.ts`.
- Нові тексти `messages` — лише: новий текст `errors.srdCanonicalUnavailable` (uk/en, Task 1), перейменований ключ `abilities.validation.traitRangeOnlyBreathRanged` (Task 4). Жодного нового uk-ns у клієнтських scope; словник Grim імпортується лише в `server-only` модулі. `scope-size`/OpenAPI-ліміти не піднімати; якщо тест падає — зупинитися й повідомити контролера.
- Prod (`--allow-remote`, Storage prod, `constructor:grim-template` на prod) не запускати ніколи; Task 6 завантаження — лише `--dry-run` або локальна БД.

## Review Focus

1. **SRD-шлях незмінний.** Канонічний SRD-шаблон: та сама локалізація, ті самі помилки (`SRD_CANONICAL_UNAVAILABLE`, `TEMPLATE_CONTENT_LOCALE`), той самий каталог хешів. Тест: Task 1 (prepare-source/list-templates), Task 2 Step 1 (каталог).
2. **Однозначність канонічного джерела — на кожен `templateKey`.** Два офіційні `en` Grim → 409 при клонуванні Grim і в списку шаблонів, але SRD при цьому клонується. Тест: Task 1 (`prepare-source.test.ts`, `list-templates.test.ts`).
3. **Sync uk-клону Grim одразу після створення — порожній, включно з правилами.** `rulesHashes` рахує `tables` локалізованими з обох боків. Тест: Task 2 (`srd-overlay.test.ts` Grim-кейс), Task 7 (інтеграція).
4. **Списки заклинань без класів.** Переклад `lists` у Grim — одна мапа імен для всіх місць; колізія двох списків → помилка до запису (CLI) і при локалізації. Тест: Task 2, Task 3.
5. **AI d20 без змін.** Для `homm`/`dnd5e` промпт, `get_party`, `read_character`, `get_battle_state`, `read_reference` віддають рівно те, що й до 5g-4. Тест: Task 5 (наявні тести без правок очікувань).

## Перевірки коду (виконані під час планування; Task 1 Step 1 їх відтворює)

| # | Твердження | Результат |
|---|---|---|
| a | Grim уже має `templateKey`/`locale` | **Так.** `makeTemplateStore(GRIM_TEMPLATE_NAME)` (`scripts/srd/lib/template-store.ts:31,42`) пише `templateKey: name`, `locale: DEFAULT_TEMPLATE_LOCALE` (`"en"`), `visibility: official`. Змін завантажувача для ідентичності не треба. |
| b | Хто вирішує «SRD-overlay» | `isCanonicalSrdTemplate`/`isLegacySrdTemplate`/`isOfficialSrdTemplate` (`lib/utils/campaigns/template-locales.ts`) у `prepare-source.ts:50,82`, `list-templates.ts:29,34,38`, `sync/context.ts:52`, `TemplatePicker.tsx:53,90`, `TemplateTiles.tsx:50,59,61`, `lib/hooks/campaigns/useTemplates.ts:37`; кандидати канонічного — запит із `templateKey: SRD_TEMPLATE_NAME` (`prepare-source.ts:57`). `translationsFor` мокається в 5 тестах: `app/api/__tests__/campaign-templates-api.test.ts`, `lib/server/assistant/__tests__/campaign-actions.test.ts`, `lib/server/campaigns/__tests__/source-lifecycle.test.ts`, `lib/server/templates/__tests__/prepare-source.test.ts`, `lib/server/templates/sync/__tests__/srd-overlay.test.ts`. |
| c | `races.profile` має текст? | **Ні.** `SpeciesProfile` = `mods`, `move`, `fate`, `extraWounds`, `talents` (id), `randomTalentCount`, `randomTalents` (`featId`), `careerTable` (`careerId`). Перекладати нічого; тест фіксує, що профіль не змінюється. |
| d | Форма `rules.tables` | `rules.tables[slot]` — **масив рядків** `{ max, text, effects }` (не `.rows`); у Grim слоти `miscastMinor` (10), `miscastMajor` (10), `wrath` (8). `text` під ключем `text`, батько — назва слота → `classOf` дає `"d"` (TEXT_KEYS). `rulesHashes` (`sync/hash.ts:12`) хешує `parseRules(rules).tables`. |
| e | Форма кар'єр | БД: `{ name, icon, class, tiers: [{ name, status?, characteristics, skills, talents: featId[], trappings: string[] }] }` (`fields/careers.ts` `toBody`). Seed — плоский (`tier1_name`, `tier1_trappings`…). `status` («Brass 3») парсить downtime — не перекладати; `skills` — ключі, не перекладати. |
| f | Herald / Charcoal Burner | `Herald` — **і кар'єра** (клас Courtier, рівні `Page, Herald, Emissary, Lord Herald`), **і її рівень 2**; `Charcoal Burner` — кар'єра (Peasant, `Kiln Hand, Charcoal Burner, Forest Collier, Master Collier`) і рівень 2. `race-profiles.json` посилається на обидві кар'єри (`careerTable`, 2+2 рядки). Тести їх не згадують. |
| g | Пайплайн агентів-перекладачів SRD | `i18n/todo/AGENT_PROMPT.md` у репозиторії **немає** (todo ігнорується git) — повний промпт у Task 7. `extract` перед записом видаляє наявні `NN.jsonl` у `todo/<locale>`. |
| h | Іконки | Генератора зображень у репозиторії немає: SRD-картинки згенеровано зовні (`~/Downloads/fantasy-tokens`, CSV + PNG), скрипти лише конвертують (`toWebp`) і вантажать. Ікона потрапляє в рядок через `importContent` (поле `icon`/`avatar`), як `withIcons` у SRD. Колонки: юніти `avatar`, решта `icon` (`fields/*.ts`). |
| i | AI | `Character` не має HP-колонок; Wounds max = `woundsMax(readCharacteristics(row))`, кар'єра — `characteristics.career` (`careerId`, `tier`). Учасник бою має `abilities.characteristics`. `read_reference` для артефакта вже віддає повний рядок (включно з `systemStats`); список юнітів — `toUnit` з `characteristics` (для d20 — дефолти). `context-tools.test.ts` мокає `loadBattle` з `meta: {}` (без `rules`). |
| j | M2 / NaN | `importContent` при `dryRun` повертається до `prepareCreate` (`import-content.ts:226`), тож прев'ю не бачить `SYSTEM_STATS_UNSUPPORTED`. `recipeValues` (`scripts/grim/units.ts:144`) — `rangeFtOf(e, Number(e.rangeFt))`: без `rangeFt` дає `NaN`. |

**Розбіжності зі spec (явно):**

1. Spec §1 `TEMPLATE_LOCALIZATIONS: { locales, kinds }` — `kinds` не потрібен: `localizeSrdBundle` обходить усі таблиці, порожні — no-op. Реєстр: `{ locales }`.
2. Spec §2 «`races.profile`: переклад текстових полів» — текстових полів немає (перевірка c); лише тест незмінності.
3. Spec §2 `rules.tables[*].rows[*].text` — фактично `rules.tables[slot][i].text` (перевірка d).
4. Spec §4 «рівень Herald → Crier» — `Herald` є і кар'єрою (перевірка f). План: кар'єра `Herald` → `Crier`, її рівні `Page, Crier, Emissary, High Crier`; кар'єра `Charcoal Burner` → `Ashburner`, рівень 2 → `Ashburner` (рівні 1/3/4 без змін).
5. Spec §5 «`grimCoverage` попереджає про відсутні іконки» — до user-gated завантаження всі 186 без іконок, а `real-data.test` вимагає порожнього `grimCoverage`. План: окрема `grimIconGaps` (попередження CLI завантажувача й `assets:grim-icons`), валідатор помиляється лише на зайві/невалідні записи `icons.json`.
6. Spec §5 «генерація» — зображення генерує користувач зовні за промптами (перевірка h); план дає промпти + субʼєкти, конвертацію/завантаження й підмішування.
7. Spec §6 «рядок про рульову систему (`homm`/`dnd5e`/`wfrp`) … без зміни для d20» — рядок додається лише для `wfrp`; для d20 промпт байт-у-байт той самий.
8. Spec §6 «артефакти — `systemStats`» у `read_reference` — уже є (перевірка i); лише тест.
9. Код помилки `SRD_CANONICAL_UNAVAILABLE` лишається (спільний для всіх ключів), змінюється лише текст на загальний.

## Структура файлів

- Створюються: `lib/server/templates/template-translations.ts`, `data/templates/grim-d100/i18n/uk.json`, `data/templates/grim-d100/i18n/glossary/uk.json`, `scripts/srd/i18n/templates.ts`, `scripts/grim/i18n.ts`, `scripts/grim/icons.ts`, `data/templates/grim-d100/icons.json`, `scripts/assets/grim-icons/{prompts,upload}.ts`, `scripts/assets/grim-icons/cli.ts`, `scripts/assets/icon-subjects/grim-{units,spells,artifacts,identity}.json`, `lib/ai/tools/wfrp-view.ts`; тести `scripts/grim/__tests__/{i18n,icons,i18n-real}.test.ts`, `scripts/grim/__tests__/localized-clone.integration.test.ts`, `scripts/assets/__tests__/grim-icons.test.ts`, `lib/ai/tools/__tests__/wfrp-view.test.ts`.
- Видаляється: `lib/server/templates/srd-translations.ts`.
- Змінюються: `lib/utils/campaigns/template-locales.ts`, `lib/server/templates/{prepare-source,list-templates,localize-srd-bundle}.ts`, `lib/server/templates/sync/context.ts`, `components/campaigns/templates/{TemplatePicker,TemplateTiles}.tsx`, `lib/hooks/campaigns/useTemplates.ts`, `lib/srd/i18n/catalog.ts`, `scripts/srd/i18n/{cli,batches,store}.ts`, `scripts/grim/{load-template,validate-data,units}.ts`, `data/templates/grim-d100/{careers,race-profiles}.json`, `lib/server/content/define-resource.ts`, `lib/server/content/import/import-content.ts`, `lib/server/content/resources/artifacts.ts`, `lib/utils/abilities/schema/effects.ts`, `lib/ai/context/prompt.ts`, `lib/ai/tools/{party,reference}.ts`, `lib/server/battles/read-service.ts`, `messages/{uk,en}/{errors,abilities}.json`, `package.json`, `.gitignore`, доки `docs/architecture/{rule-systems,content-api,i18n}.md`, `docs/STATUS.md`.

## Групи диспетчеризації

| Група | Задачі | Модель | Примітка |
|---|---|---|---|
| A | Task 1 + Task 2 | Sonnet | реєстр + локалізація bundle; SRD-регресія — головний ризик (якщо падає неочевидно — ескалація на Opus) |
| B | Task 3 + Task 4 | Sonnet | CLI `--template grim`; перейменування й хвости 5g-3 |
| C | Task 5 | Sonnet | AI-проєкції |
| D | Task 6 | Sonnet | іконки: код + ~186 субʼєктів |
| E | Task 7 | Sonnet ×(N+1) | контролер: 1 агент — глосарій/extract; N паралельних агентів-перекладачів (по одному на порцію, ≤5 одночасно); 1 агент — apply/normalize/status/інтеграція |
| F | Task 8 | Sonnet | CSV round-trip, доки |

Opus — лише фінальне рев'ю (diff від `cae48a2f1`). Орієнтовна вартість: ~10–14 Sonnet-диспетчеризацій + 1 Opus-рев'ю; найдорожча — Task 7 (переклад ~40–50 тис. символів).

---

### Task 1: Реєстр локалізацій шаблонів і узагальнення SRD-коду

**Files:**
- Create: `lib/server/templates/template-translations.ts`, `data/templates/grim-d100/i18n/uk.json` (вміст `{}`)
- Delete: `lib/server/templates/srd-translations.ts`
- Modify: `lib/utils/campaigns/template-locales.ts`, `lib/server/templates/{prepare-source,list-templates}.ts`, `lib/server/templates/sync/context.ts`, `components/campaigns/templates/{TemplatePicker,TemplateTiles}.tsx`, `lib/hooks/campaigns/useTemplates.ts`, `messages/{uk,en}/errors.json`
- Test: `lib/server/templates/__tests__/{prepare-source,list-templates}.test.ts`, `lib/server/templates/sync/__tests__/srd-overlay.test.ts`, `components/campaigns/__tests__/{template-picker-language,template-tiles}.test.tsx`, моки в `app/api/__tests__/campaign-templates-api.test.ts`, `lib/server/assistant/__tests__/campaign-actions.test.ts`, `lib/server/campaigns/__tests__/source-lifecycle.test.ts`

**Interfaces (Produces):**

```ts
// lib/utils/campaigns/template-locales.ts (client-safe; no dictionaries)
export const TEMPLATE_CONTENT_LOCALES = ["en", "uk"] as const;
export type TemplateContentLocale = (typeof TEMPLATE_CONTENT_LOCALES)[number];
export const SRD_CONTENT_LOCALES = TEMPLATE_CONTENT_LOCALES;          // alias, schemas keep importing it
export type SrdContentLocale = TemplateContentLocale;                  // alias
export type TemplateLocalization = { templateKey: string; locales: readonly TemplateContentLocale[] };
export const TEMPLATE_LOCALIZATIONS: Readonly<Record<string, { locales: readonly TemplateContentLocale[] }>> = {
  [SRD_TEMPLATE_NAME]: { locales: TEMPLATE_CONTENT_LOCALES },
  [GRIM_TEMPLATE_NAME]: { locales: TEMPLATE_CONTENT_LOCALES },
};
export function localizationOf(source: TemplateIdentity): TemplateLocalization | null; // official template + registered key, any locale
export const isLocalizableTemplate = (s: TemplateIdentity) => localizationOf(s) !== null;
export const isCanonicalTemplate = (s: TemplateIdentity) => isLocalizableTemplate(s) && (s.locale == null || s.locale === "en");
export const isLegacyLocalizedTemplate = (s: TemplateIdentity) => isLocalizableTemplate(s) && s.locale === "uk";
// SRD wrappers keep their exact semantics:
export const isOfficialSrdTemplate = (s: TemplateIdentity) => isLocalizableTemplate(s) && s.templateKey === SRD_TEMPLATE_NAME;
export const isCanonicalSrdTemplate = (s) => isOfficialSrdTemplate(s) && (s.locale == null || s.locale === "en");
export const isLegacySrdTemplate = (s) => isOfficialSrdTemplate(s) && s.locale === "uk";

// lib/server/templates/template-translations.ts
import "server-only";
export function templateTranslationsFor(templateKey: string, locale: TemplateContentLocale): Translations; // {} for en/unknown
```

`template-translations.ts` статично імпортує `@/data/templates/srd-5.2/i18n/uk.json` і `@/data/templates/grim-d100/i18n/uk.json` у `Record<string, Partial<Record<TemplateContentLocale, Translations>>>`.

- [ ] **Step 1: Перевірки a/b.**

```bash
cd /Users/silentfox/Work/dnd-tracker-wfrp
grep -n "templateKey: name\|locale, templateKey" scripts/srd/lib/template-store.ts
grep -rn "isCanonicalSrdTemplate\|isLegacySrdTemplate\|isOfficialSrdTemplate" app components lib | grep -v __tests__
grep -rln "srd-translations" app components lib
```

Expected: збіг із перевірками a/b. Розбіжність — зупинитися й повідомити контролера.

- [ ] **Step 2: Падаючі тести.**
  - Усі 5 моків `vi.mock("@/lib/server/templates/srd-translations", () => ({ translationsFor: … }))` → `vi.mock("@/lib/server/templates/template-translations", () => ({ templateTranslationsFor: (_key: string, locale: string) => (locale === "uk" ? dictionary.values : {}) }))` (у файлах без `dictionary` — та сама логіка, що була).
  - `prepare-source.test.ts`, новий `describe("Grim source preparation")` (у `beforeEach` додати `f.addCampaign({ id: "grim", kind: "template", visibility: "official", templateKey: GRIM_TEMPLATE_NAME, locale: "en" })` і рядок `career` `{ id: id("c"), campaignId: "grim", name: "Archivist", class: "Academic", tiers: [] }`; `dictionary.values` + `[hashText("n", "Archivist")]: "Архіваріус"`):
    - `prepare("grim", { contentLocale: "uk" })` → `contentLocale: "uk"`, `bundle.careers[0].name === "Архіваріус"`.
    - `prepare("grim", { contentLocale: "en" })` → без помилки, `contentLocale: "en"`.
    - другий офіційний `en` Grim → `prepare("grim", …)` відхиляє `SRD_CANONICAL_UNAVAILABLE` (409), а `prepare("en")` (SRD) — успішний.
    - `isLocalizableTemplate({ kind: "template", visibility: "official", templateKey: GRIM_TEMPLATE_NAME, locale: "en" })` → `true`; `EMPTY_GRIM_TEMPLATE_NAME` і приватний Grim → `false`; `isCanonicalSrdTemplate` на Grim → `false`.
  - `list-templates.test.ts`: офіційний Grim (`templateKey: GRIM_TEMPLATE_NAME`, `locale: "en"`) у картці має `availableLocales: ["en", "uk"]`; два канонічні Grim → `visibleTemplates` кидає `SRD_CANONICAL_UNAVAILABLE`; канонічний SRD + канонічний Grim — разом без помилки.
  - `srd-overlay.test.ts`: `loadSyncContext` для клону Grim має `srdOverlay: true` (повний Grim-кейс sync — Task 2).
  - `template-picker-language.test.tsx`: канонічна картка Grim (`templateKey: GRIM_TEMPLATE_NAME`, `availableLocales: ["en", "uk"]`) показує селект мови й при виборі шле `contentLocale`, як SRD-кейс файлу.
  - `template-tiles.test.tsx`: канонічна Grim-плитка показує мову `en` (як SRD); legacy `uk` Grim прихована.
- [ ] **Step 3:** `pnpm test:run lib/server/templates/__tests__/prepare-source.test.ts lib/server/templates/__tests__/list-templates.test.ts lib/server/templates/sync/__tests__/srd-overlay.test.ts components/campaigns/__tests__/template-picker-language.test.tsx components/campaigns/__tests__/template-tiles.test.tsx` — FAIL.
- [ ] **Step 4: Реалізація.**
  - `template-locales.ts` — за Interfaces; імпорт `GRIM_TEMPLATE_NAME` з `@/lib/constants/campaigns`.
  - `prepare-source.ts`: `const localization = localizationOf(requested)`; `overlay = mode !== "save" && localization !== null`; перевірка `contentLocale` — `!localization.locales.includes(options.contentLocale)`; запит кандидатів — `templateKey: localization.templateKey`; перевірка `canonical` — `isCanonicalTemplate(canonical) && canonical.templateKey === localization.templateKey`; дефолт мови — `isLegacyLocalizedTemplate(requested) ? "uk" : "en"`; `translations = overlay ? templateTranslationsFor(localization.templateKey, contentLocale as TemplateContentLocale) : null`.
  - `list-templates.ts`: `toCard` — `...(isCanonicalTemplate(t) && { availableLocales: localizationOf(t)!.locales })`; `visibleTemplates` — рахувати канонічні по `templateKey` (`Map<string, number>`), будь-який > 1 → throw; фільтр — `!isLegacyLocalizedTemplate`.
  - `sync/context.ts`: `const localization = isCanonicalTemplate(found) ? localizationOf(found) : null`; `srdOverlay = localization !== null` (назву поля не міняємо); перевірка мови — `localization.locales`; `templateTranslationsFor(localization.templateKey, contentLocale)`.
  - `TemplatePicker.tsx`, `useTemplates.ts`: `isCanonicalSrdTemplate` → `isCanonicalTemplate`; `TemplateTiles.tsx`: `isCanonicalTemplate`/`isLegacyLocalizedTemplate`.
  - `messages/en/errors.json` `srdCanonicalUnavailable`: `"The official English source of this template is missing or ambiguous. Ask an administrator to check the official templates."`; uk: `"Офіційне англійське джерело цього шаблону відсутнє або неоднозначне. Попросіть адміністратора перевірити офіційні шаблони."`.
  - Видалити `srd-translations.ts`; `data/templates/grim-d100/i18n/uk.json` = `{}` + `\n`.
- [ ] **Step 5:** тести Step 3 + `app/api/__tests__/campaign-templates-api.test.ts lib/server/assistant/__tests__/campaign-actions.test.ts lib/server/campaigns/__tests__/source-lifecycle.test.ts lib/server/templates/__tests__/localize-srd-bundle.test.ts lib/hooks/campaigns/__tests__/useTemplates.test.tsx lib/i18n/__tests__/scope-size.test.ts` — PASS; `pnpm test:related lib/utils/campaigns/template-locales.ts lib/server/templates/prepare-source.ts` — PASS; eslint на змінених файлах.
- [ ] **Step 6: Commit** `feat(wfrp): 5g-4 template localization registry`.

### Task 2: Локалізація кар'єр, правил і списків заклинань

**Files:**
- Modify: `lib/srd/i18n/catalog.ts`, `lib/server/templates/localize-srd-bundle.ts`
- Test: `lib/server/templates/__tests__/localize-srd-bundle.test.ts`, `lib/server/templates/sync/__tests__/srd-overlay.test.ts`, `scripts/srd/i18n/__tests__/catalog.test.ts`

**Interfaces (Produces):**
- `classOf` + два правила (до `return null`): `if (key === "trappings" && parent === "tiers") return "d";` і `if (key === "class" && path.length === 1) return "n";`.
- `export function localizeRules(rules: unknown, tr: Translations): unknown` (у `localize-srd-bundle.ts`): якщо `rules.tables` — record, повертає `{ ...rules, tables: mapStrings(tables, (k, text, parent, path) => translateText(tr, k, text, parent, path)) }`, інакше `rules`; той самий об'єкт, якщо нічого не змінилось (порівняння `JSON.stringify`).
- `localizeSrdBundle`: `TABLES` += `"careers"`; повертає `{ ...out, rules: localizeRules(bundle.rules, translations) }`; для шаблону без класів (`bundle.classes.length === 0`) `lists` спеллів (верхній рівень і `choices`) перекладаються мапою `listNames = translatedNames(distinctLists.map((name) => ({ name })), translations, "spell lists")`, де `distinctLists` — унікальні рядки `bundle.spells[*].lists`; з класами — як зараз (`maps.classes`).

- [ ] **Step 1: Знімок каталогу SRD до змін.**

```bash
pnpm exec tsx --tsconfig tsconfig.scripts.json -e 'import { extractCatalog } from "./lib/srd/i18n/catalog"; import { readSrdData } from "./scripts/srd/lib/data-files"; const c = extractCatalog(readSrdData()); console.log(c.length, require("crypto").createHash("sha1").update(c.map((e) => e.hash).sort().join()).digest("hex"))' > /private/tmp/srd-catalog-before.txt; cat /private/tmp/srd-catalog-before.txt
```

(Якщо скрипт з `-e` не резолвить `@/` — покласти той самий код у тимчасовий файл у scratchpad і запустити `pnpm exec tsx --tsconfig tsconfig.scripts.json <файл>`.) Записати число й хеш у звіт.
- [ ] **Step 2: Падаючі тести** (`localize-srd-bundle.test.ts`, новий `describe("Grim bundle")`; словник `grimTr` з `hashText` для: `n` `Archivist`→`Архіваріус`, `n` `Copyist`→`Переписувач`, `n` `Academic`→`Учені`, `d` `Quill and ink`→`Перо й чорнило`, `d` `A smell of scorched hair.`→`Запах паленого волосся.`, `n` `School of Embers`→`Школа Жару`, `n` `Ember Dart`→`Жарова стріла`):
  1. Кар'єра `{ id, name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", status: "Brass 3", characteristics: ["int"], skills: ["lore:herbs"], talents: ["feat-id"], trappings: ["Quill and ink"] }] }` → назва, клас, рівень, спорядження перекладені; `status`, `characteristics`, `skills`, `talents` — без змін.
  2. Вид із `profile` (`careerTable: [{ careerId: "career-id", max: 50 }]`, `talents: ["feat-id"]`) → `profile` `toEqual` вхідному.
  3. `rules: { advancement: { x: 1 }, tables: { miscastMinor: [{ max: 100, text: "A smell of scorched hair.", effects: [{ type: "condition", key: "deafened", levels: 1 }] }] } }` → `text` перекладено, `effects` і `advancement` без змін; `rules` без `tables` повертається тим самим об'єктом (`toBe`).
  4. Без класів: спелл `{ name: "Ember Dart", lists: ["School of Embers"] }` → `lists: ["Школа Жару"]`; два списки, що перекладаються в однаковий рядок → `toThrow(/spell lists/)`.
  5. Регресія: фікстура `fixture()` файлу (з класом `Wizard`) з SRD-словником `tr` дає той самий результат, що й до змін (наявні тести без правок).
  - `srd-overlay.test.ts`, новий `describe("localized Grim synchronization")`: джерело `templateKey: GRIM_TEMPLATE_NAME`, `rules: { tables: { miscastMinor: [{ max: 100, text: "A smell of scorched hair.", effects: [] }] } }`, рядок `career` `{ name: "Archivist", class: "Academic", tiers: [] }`; `makeClone("uk")` → `diff()` = `[]`; правила клону мають перекладений `text`; зміна `dictionary.values` для `text` → `diff()` показує рядок правил `tables` (та сама поведінка, що для зміни перекладу рядка в SRD-кейсі «handles English fallback…»). Якщо `addCampaign` фейкової БД не приймає `rules`/`templateKey` для джерела — дописати це у `fake-sync-db.ts` мінімально.
  - `catalog.test.ts`: `classOf("trappings", "tiers")` = `"d"`, `classOf("class", "", ["class"])` = `"n"`, `classOf("class", "x", ["x", "class"])` = `null`, `classOf("status", "tiers")` = `null`.
- [ ] **Step 3:** `pnpm test:run lib/server/templates/__tests__/localize-srd-bundle.test.ts lib/server/templates/sync/__tests__/srd-overlay.test.ts scripts/srd/i18n/__tests__/catalog.test.ts` — FAIL.
- [ ] **Step 4: Реалізація** за Interfaces. `translatedNames` для `careers` — без нормалізатора (як інші таблиці).
- [ ] **Step 5: Регресія каталогу SRD.** Повторити команду Step 1 у `/private/tmp/srd-catalog-after.txt`; `diff` двох файлів — порожній. Інакше — правило `classOf` зачепило SRD-рядок: звузити правило (не змінювати SRD-дані), повторити.
- [ ] **Step 6:** тести Step 3 + `lib/server/templates/__tests__/prepare-source.test.ts scripts/srd/i18n/__tests__/overlay.test.ts lib/server/templates/sync/__tests__/sync-careers.test.ts lib/server/templates/sync/__tests__/hash.test.ts` — PASS; `pnpm test:related lib/srd/i18n/catalog.ts lib/server/templates/localize-srd-bundle.ts` — PASS; eslint.
- [ ] **Step 7: Commit** `feat(wfrp): 5g-4 localize careers, rule tables and spell lists`.

### Task 3: CLI `pnpm srd:i18n … --template grim`

**Files:**
- Create: `scripts/grim/i18n.ts`, `scripts/srd/i18n/templates.ts`, `scripts/grim/__tests__/i18n.test.ts`
- Modify: `lib/srd/i18n/catalog.ts`, `scripts/srd/i18n/{cli,batches}.ts`, `.gitignore`

**Interfaces (Produces):**

```ts
// lib/srd/i18n/catalog.ts
export type TemplateData = Readonly<Record<string, unknown>>;
export interface CatalogEntry { hash: string; cls: TextClass; en: string; kinds: string[] }   // was SrdKind[]
export function extractCatalog(data: TemplateData, kinds: readonly string[] = SRD_KINDS): CatalogEntry[];

// scripts/grim/i18n.ts
export const GRIM_I18N_DIR: string;                       // path.join(GRIM_DATA_DIR, "i18n")
export const GRIM_CATALOG_KINDS = [...GRIM_ROW_KINDS, "spellLists", "rules"] as const;
export function grimCatalogData(data: GrimData): Record<(typeof GRIM_CATALOG_KINDS)[number], unknown[]>;
export const grimCatalog = (data: GrimData): CatalogEntry[] => extractCatalog(grimCatalogData(data), GRIM_CATALOG_KINDS);
export function grimI18nIssues(data: GrimData, tr: Translations): string[];

// scripts/srd/i18n/templates.ts
export interface I18nTemplate { dir: string; catalog(): CatalogEntry[]; issues(tr: Translations): string[] }
export const I18N_TEMPLATES: Record<"srd" | "grim", I18nTemplate>;
export function templateOf(args: string[]): { template: I18nTemplate; rest: string[] }; // "--template <srd|grim>", default srd; rest без цих двох токенів
```

`grimCatalogData`: `careers` → `{ name, class, tiers: [1..4].map((n) => ({ name: row[`tier${n}_name`], trappings: row[`tier${n}_trappings`] ?? [] })) }` (та сама форма, що в БД, тож хеші збігаються з `localizeSrdBundle`); `spellLists` → унікальні `spells[*].lists` як `{ name }`; `rules` → `data.rules?.tables ? [data.rules.tables] : []`; решта видів — як є (`raceProfiles` не входить — перевірка c). `grimI18nIssues`: (1) `translatedNames` по кожному з `GRIM_ROW_KINDS` і по `spellLists` у `try/catch` → текст помилки; (2) кожен перекладений `lists[0]` спелла входить до перекладених значень `GRIM_SPELL_LISTS` (`scripts/grim/spells.ts`) — інакше `spells "X": list "Y" does not resolve after translation`. Для SRD `issues: () => []`.

- [ ] **Step 1: Падаючі тести** `scripts/grim/__tests__/i18n.test.ts` (фікстури `scripts/grim/__tests__/fixtures` через `readGrimData(fixturesDir)` + реальний `readGrimData()`):
  1. `grimCatalog(readGrimData())` містить `n` для кожної назви кар'єри, рівня, класу кар'єри, списку `GRIM_SPELL_LISTS`, і `d` для кожного `text` з `rules.tables` та кожного `trappings`; не містить `status` рівнів і ключів навичок (`lore:herbs`).
  2. Хеш-сумісність: для кар'єри `Archivist` з реального каталогу `localizeSrdBundle` з словником `{ [hashText("d", firstTrapping)]: "X" }` над рядком у формі БД (`CAREERS_IMPORT.toBody`-форма: `tiers[].trappings`) перекладає саме цей рядок.
  3. `grimI18nIssues(data, {})` = `[]`; словник, що перекладає `School of Embers` і `School of Gloam` в один рядок → issue з `spell lists`; дві кар'єри в одну назву → issue з `careers`.
  4. `templateOf(["apply", "--template", "grim", "a.jsonl"])` → `rest` = `["apply", "a.jsonl"]`; `--template xyz` → throw.
  5. SRD: `extractCatalog(readSrdData())` (дефолтні `kinds`) — довжина з Task 2 Step 1.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/i18n.test.ts` — FAIL.
- [ ] **Step 3: Реалізація.** `catalog.ts` — за Interfaces (`SrdKind` у `kinds` → `string`; `batches.ts` `PHASE_A_KINDS` тип → `readonly string[]`, додати `"careers"`). `cli.ts`: на початку `const { template, rest } = templateOf(process.argv.slice(2))`; `[command, locale, ...args] = rest`; усі `extractCatalog(readSrdData())` → `template.catalog()`; `readTranslations/writeTranslations/readGlossary(locale, template.dir)`; `todoDir` → `path.join(template.dir, "todo", locale)`. `apply`: після `mergeApplied` — `const issues = template.issues(merged)`; якщо не порожньо — надрукувати, `process.exitCode = 1`, **не писати** словник. Usage-коментар файлу — дописати `[--template srd|grim]`. `.gitignore` + `data/templates/grim-d100/i18n/todo/`.
- [ ] **Step 4: Смоук.** `pnpm srd:i18n status uk --template grim` — друкує рядки `<kind>/<cls> 0/N`; `pnpm srd:i18n status uk` (SRD) — ті самі числа, що до змін (порівняти з `git stash`-вільним прогоном на `HEAD~` не треба: досить, що сума `N` = довжина з Task 2 Step 1). Загальну кількість рядків Grim записати у звіт.
- [ ] **Step 5:** `pnpm test:run scripts/grim/__tests__/i18n.test.ts scripts/srd/i18n/__tests__` — PASS; eslint.
- [ ] **Step 6: Commit** `feat(wfrp): 5g-4 srd:i18n template option and grim catalog`.

### Task 4: Перейменування Ashburner/Crier і хвости 5g-3 (M2, M7, NaN)

**Files:**
- Modify: `data/templates/grim-d100/{careers,race-profiles}.json`, `lib/server/content/define-resource.ts`, `lib/server/content/import/import-content.ts`, `lib/server/content/resources/artifacts.ts`, `lib/utils/abilities/schema/effects.ts`, `messages/{uk,en}/abilities.json`, `scripts/grim/units.ts`, `docs/architecture/rule-systems.md`
- Test: `lib/server/content/__tests__/artifact-system-stats.test.ts`, `lib/utils/abilities/schema/__tests__/trait-effects.test.ts`, `scripts/grim/__tests__/units.test.ts`

**Interfaces (Produces):**
- `ContentResource` (`define-resource.ts`) + `checkImport?(actor: Actor, input: Create | Update): Promise<void>` — лише перевірки без побічних ефектів; `importContent` при `dryRun` для кожного `plan.status === "pending"` викликає його й перетворює `ContentError` на рядок `status: "error"` з `contentErrorIssues(error)` (як у циклі запису).
- `artifactsResource.checkImport = async (actor, data) => void (await systemStatsColumn(actor.campaignId, data.systemStats))`.

- [ ] **Step 1: Дані.** `careers.json`: кар'єра `"name": "Herald"` → `"Crier"`, `tier2_name` `"Herald"` → `"Crier"`, `tier4_name` `"Lord Herald"` → `"High Crier"`; кар'єра `"Charcoal Burner"` → `"Ashburner"`, `tier2_name` → `"Ashburner"`. `race-profiles.json`: 4 рядки `careerId` (`Herald` ×2 → `Crier`, `Charcoal Burner` ×2 → `Ashburner`). `grep -rn "Herald\|Charcoal" data/templates/grim-d100 scripts/grim` — порожньо. `rule-systems.md` «Залишки 5g-1»: прибрати пункт «Назви Charcoal Burner … рішення за користувачем».
- [ ] **Step 2: Падаючі тести.**
  - `artifact-system-stats.test.ts`: «dry-run preview rejects systemStats in a d20 campaign»: `useRules({})`, `importContent(actor, "artifacts", { rows: [{ name: "Plate", slot: "armor", systemStats: armour }], mode: "create", dryRun: true }, deps)` → `report.results[0].status === "error"`, `JSON.stringify(report.results)` містить `API_ERRORS.SYSTEM_STATS_UNSUPPORTED`, `db.artifact.create` не викликано; той самий рядок у `WFRP_RULES` → `status: "created"`.
  - `trait-effects.test.ts:44`: очікуваний ключ `abilities.validation.traitRangeOnlyBreathRanged`.
  - `units.test.ts`: `rebuildTrait({ id: "breath", name: "Breath +5", effects: [{ kind: "wfrpAttack", attack: "breath", damage: 5 }] })` і так само `ranged` без `rangeFt` → ефект має скінченне `rangeFt` = дефолт рецепта (`BREATH_DEFAULT_RANGE_FT` / `RANGED_DEFAULT_RANGE_FT`), не `NaN`.
- [ ] **Step 3:** `pnpm test:run lib/server/content/__tests__/artifact-system-stats.test.ts lib/utils/abilities/schema/__tests__/trait-effects.test.ts scripts/grim/__tests__/units.test.ts` — FAIL.
- [ ] **Step 4: Реалізація.** `effects.ts:318` message → `"abilities.validation.traitRangeOnlyBreathRanged"`; у `messages/{uk,en}/abilities.json` перейменувати ключ (текст той самий). `units.ts` `recipeValues` case `breath`/`ranged`: `rangeFt: rangeFtOf(e, id === "breath" ? BREATH_DEFAULT_RANGE_FT : RANGED_DEFAULT_RANGE_FT)` (імпорт з `@/lib/utils/rules/systems/wfrp/traits/constants`). M2 — за Interfaces.
- [ ] **Step 5:** тести Step 3 + `scripts/grim/__tests__/real-data.test.ts scripts/grim/__tests__/validate-data.test.ts lib/server/content/__tests__/import-content.test.ts lib/i18n/__tests__/label-keys-abilities.test.ts lib/server/content/__tests__/openapi.test.ts` — PASS; `pnpm test:related lib/server/content/import/import-content.ts lib/server/content/define-resource.ts` — PASS; eslint.
- [ ] **Step 6: Commit** `fix(wfrp): 5g-4 original career names and 5g-3 tails`.

### Task 5: AI-контекст обізнаний із wfrp

**Files:**
- Create: `lib/ai/tools/wfrp-view.ts`, `lib/ai/tools/__tests__/wfrp-view.test.ts`
- Modify: `lib/ai/context/prompt.ts`, `lib/ai/tools/{party,reference}.ts`, `lib/server/battles/read-service.ts`
- Test: `lib/ai/context/__tests__/prompt.test.ts`, `lib/ai/tools/__tests__/{party,context-tools}.test.ts`

**Interfaces (Produces):**

```ts
// lib/ai/tools/wfrp-view.ts (pure; no prisma)
export type WfrpCareerRef = { id: string; name: string; tiers: unknown };
export type WfrpHeroView = { characteristics: Record<CharacteristicKey, number>; woundsMax: number; fate: number; career: { name: string; tier: number; tierName: string | null } | null };
export const characteristicValues: (c: Characteristics) => Record<CharacteristicKey, number>;      // value(c, k)
export function wfrpHeroView(row: { characteristics?: unknown }, careers: readonly WfrpCareerRef[]): WfrpHeroView;
export function wfrpParticipantView(p: BattleParticipant): { name: string; side: string; wounds: string; status: string; characteristics?: Record<CharacteristicKey, number> };
export const WFRP_SYSTEM_LINE = "Rule system: Grim d100 (percentile). Tests roll d100 against a characteristic; success levels (SL) measure the margin. Heroes have Wounds instead of hit points, Fate/Fortune points and careers with tiers; battles track Momentum. There is no AC and no ability scores.";

// lib/ai/tools/party.ts
export type PartyMember = { id: string; name: string; level: number; race: string; notes: string | null } & ({ class: string; armorClass: number } | WfrpHeroView);
export async function partySummary(campaignId: string, limit?: number, rules?: Ruleset): Promise<PartyMember[]>; // rules ?? await loadRules(campaignId)
```

Рішення: wfrp визначається `systemKeyOf(rules) === "wfrp"`; для d20 вибірка, форма й текст — без змін.

- [ ] **Step 1: Падаючі тести.**
  - `wfrp-view.test.ts`: `wfrpHeroView({ characteristics: { base: { ws: 35, t: 40, s: 30, wp: 30 }, career: { careerId: "c1", tier: 2, ticks: [] }, fate: 2 } }, [{ id: "c1", name: "Archivist", tiers: [{ name: "Copyist" }, { name: "Archivist" }] }])` → `characteristics.ws === 35`, `woundsMax` = `woundsMax(readCharacteristics(row))`, `fate: 2`, `career: { name: "Archivist", tier: 2, tierName: "Archivist" }`; невідомий `careerId` → `career: null`; `wfrpParticipantView` з `combatStats { currentHp: 7, maxHp: 12, status: "active" }` і `abilities.characteristics` → `wounds: "7/12"`, без `ac`.
  - `party.test.ts`: мок `@/lib/server/campaigns/rules` (`loadRules`) + `prisma.career.findMany`; wfrp-правила (`WFRP_RULES`) → `findMany` select містить `characteristics: true` і член має `career`, `woundsMax`, без `armorClass`; правила за замовчуванням → член `{ id, name, level, class, race, armorClass, notes }` без `characteristics`, `career.findMany` не викликано.
  - `prompt.test.ts`: `campaign.findUnique` з `rules: WFRP_RULES` → текст містить `"Rule system: Grim d100"`, партія з `woundsMax`; наявні кейси (без `rules`) — текст **не** містить `"Rule system:"` (очікування наявних кейсів не змінювати).
  - `context-tools.test.ts`: `get_battle_state` з `meta: { rules: WFRP_RULES }` → учасник `{ name, side, wounds: "cur/max", status, characteristics }` без `ac`, `hp`; наявний кейс з `meta: {}` — без змін. `read_reference` unit у wfrp-кампанії (мок `loadRules` → `WFRP_RULES`) має `characteristics` як мапу чисел (`{ ws: 35, … }`), у d20 — як було. `read_reference` artifact повертає `systemStats` рядка (мок `prisma.artifact.findFirst` з `systemStats`).
- [ ] **Step 2:** `pnpm test:run lib/ai/tools/__tests__/wfrp-view.test.ts lib/ai/tools/__tests__/party.test.ts lib/ai/context/__tests__/prompt.test.ts lib/ai/tools/__tests__/context-tools.test.ts` — FAIL.
- [ ] **Step 3: Реалізація.**
  - `party.ts`: `rules ??= await loadRules(campaignId)`; wfrp → select `{ id, name, level, race, notes, characteristics }` + `prisma.career.findMany({ where: { campaignId }, select: { id: true, name: true, tiers: true } })`, мапа `({ characteristics, ...c }) => ({ ...c, ...wfrpHeroView({ characteristics }, careers) })`; d20 — наявний код. Опис `get_party`: `"Player heroes of the campaign: id, name, level, class, race, AC, DM notes (Grim d100 campaigns: race, career and tier, characteristics, Wounds and Fate instead of class and AC)."`.
  - `read_character`: `rules = await loadRules(ctx.campaignId)`; wfrp → select без `strength…charisma`, `armorClass`, `speed`, `morale`, плюс `characteristics`; результат `{ ...rest, ...wfrpHeroView(...), biography }` (кар'єри — той самий `career.findMany`). Опис доповнити `"Grim d100: characteristics, career, Wounds and Fate instead of ability scores and AC."`.
  - `prompt.ts`: `const rules = parseRules(campaign.rules)`; `role` + `` ...(systemKeyOf(rules) === "wfrp" ? [WFRP_SYSTEM_LINE] : []) `` перед `.join("\n")`; `partySummary(campaignId, 20, rules)`; блок `party` — `party.map(promptMember)`, де `promptMember` для d20 бере `{ id, name, level, class, race, armorClass }` (як зараз), для wfrp `{ id, name, level, race, career, woundsMax }`.
  - `read-service.ts` `readLegacyBattleState`: `const wfrp = battle.meta.rules?.system?.key === "wfrp"`; `participants: battle.participants.map((p) => (wfrp ? wfrpParticipantView(p) : { …як зараз }))`. Опис `get_battle_state` доповнити `"; Grim d100 battles show Wounds and characteristics instead of HP/AC"`.
  - `reference.ts` `listOf("unit")`: `const wfrp = systemKeyOf(await loadRules(campaignId)) === "wfrp"`; для wfrp — `characteristics: characteristicValues(u.characteristics)`, інакше рядок як зараз. Артефакт — без змін коду.
- [ ] **Step 4:** тести Step 2 + `lib/ai/tools/__tests__/registry.test.ts lib/ai/context/__tests__/assistant-context.test.ts lib/ai/tools/__tests__/define-translate.test.ts` — PASS; `pnpm test:related lib/ai/tools/party.ts lib/ai/context/prompt.ts lib/server/battles/read-service.ts lib/ai/tools/reference.ts` — PASS; eslint.
- [ ] **Step 5: Commit** `feat(wfrp): 5g-4 wfrp-aware AI context`.

### Task 6: Іконки Grim: `icons.json`, підмішування, промпти, завантаження

**Files:**
- Create: `scripts/grim/icons.ts`, `data/templates/grim-d100/icons.json` (`{ "feats": {}, "careers": {}, "races": {}, "spells": {}, "units": {}, "artifacts": {} }`), `scripts/assets/grim-icons/{prompts,upload,cli}.ts`, `scripts/assets/icon-subjects/grim-{units,spells,artifacts,identity}.json`, `scripts/grim/__tests__/icons.test.ts`, `scripts/assets/__tests__/grim-icons.test.ts`
- Modify: `scripts/grim/load-template.ts`, `package.json`
- Test: `scripts/grim/__tests__/real-data.test.ts`

**Interfaces (Produces):**

```ts
// scripts/grim/icons.ts
export type GrimIcons = Record<GrimRowKind, Record<string, string>>;      // name -> public URL
export const GRIM_ICONS_FILE: string;                                     // path.join(GRIM_DATA_DIR, "icons.json")
export const GRIM_ICON_COLUMN: Record<GrimRowKind, "icon" | "avatar">;   // units: avatar, rest: icon
export function readGrimIcons(dir?: string): GrimIcons;                   // missing file/kind -> {}
export function writeGrimIcons(icons: GrimIcons, dir?: string): void;    // kinds in GRIM_ROW_KINDS order, names sorted
export function withGrimIcons(data: GrimData, icons: GrimIcons): GrimData; // sets the column only where a URL exists
export function grimIconIssues(data: GrimData, icons: GrimIcons): string[]; // `icons: careers "X" is not in the catalog`, `icons: units "X" url must be https`
export function grimIconGaps(data: GrimData, icons: GrimIcons): string[];   // `icons: spells "X" has no icon`

// scripts/assets/grim-icons/prompts.ts
export type GrimPromptRow = { recordId: string; kind: GrimRowKind; name: string; file: string; prompt: string }; // recordId `${kind}:${name}`, file `${kind}/${slug(name)}.png`
export function grimPromptRows(data: GrimData, subjects: GrimSubjects): GrimPromptRow[]; // throws on a missing subject
export type GrimSubjects = { units: Record<string, string>; spells: Record<string, { palette: string; subject: string }>; artifacts: Record<string, string>; identity: Record<string, string> }; // identity keys `${kind}:${name}` for feats/careers/races

// scripts/assets/grim-icons/upload.ts
export const GRIM_ICON_SIZE: Record<GrimRowKind, number>;   // units 384, rest 256
export const GRIM_ICON_BUCKET: Record<GrimRowKind, string>; // units/spells/artifacts: ASSET_BUCKET[kind] (attach-lib); races "race-icons"; feats "feat-icons"; careers "career-icons"
export function planGrimUploads(rows: GrimPromptRow[], dir: string): Array<{ row: GrimPromptRow; path: string; missing: boolean }>;
```

CLI `scripts/assets/grim-icons/cli.ts` (`package.json`: `"assets:grim-icons": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/assets/grim-icons/cli.ts"`):
- `pnpm assets:grim-icons prompts [--out docs/assets/icon-prompts/grim-d100]` — пише `<kind>.csv` (`record_id,name,output_filename,prompt`) і `README.md` (через `toCsv`/`toMarkdown`-подібний формат із `scripts/assets/icon-prompts/compose.ts`; `assertCleanPrompt`, унікальні `file`); промпти: юніти `composeCreature(subject, "portrait")`, заклинання `composeSpell(subject, palette)`, предмети `composeItem(subject, rarityFlair(rarity))`, види/кар'єри/таланти `composeSkill(subject, "neutral gold", null)`.
- `pnpm assets:grim-icons upload <templateId> --dir <images> [--dry-run] [--allow-remote]` — за зразком `upload-identity-icons.ts`: `toWebp(png, GRIM_ICON_SIZE[kind])`, об'єкт `${templateId}/${kind}/${slug}-${sha1(webp).slice(0, 8)}.webp`, `staticAssetUploadOptions("image/webp")`, `ensureBucket`; без `--dry-run` — `assertSeedTarget(DATABASE_URL, --allow-remote)` і перевірка, що кампанія — `kind: template`, `name: GRIM_TEMPLATE_NAME`; після — `writeGrimIcons` (злиття зі старими, лише імена каталогу); у кінці друкує `grimIconGaps`; відсутні файли → `process.exitCode = 1`.

- [ ] **Step 1: Падаючі тести.**
  - `icons.test.ts`: `withGrimIcons` ставить `avatar` юніту й `icon` кар'єрі лише для імен з URL, не мутує вхід; `grimIconIssues` ловить ім'я поза каталогом і `http://`; `grimIconGaps` на порожньому `icons` дає по рядку на кожен запис; `readGrimIcons` у теці без файлу → усі види `{}`.
  - `grim-icons.test.ts`: `grimPromptRows(readGrimData(), subjects)` для реальних субʼєктів — 186 рядків (= сума `GRIM_ROW_KINDS`), `file` унікальні, жоден `prompt` не має `findForbiddenTerms` (`scripts/grim/forbidden-terms.ts`); видалений субʼєкт → throw з іменем; `planGrimUploads(rows, tmp)` позначає відсутні PNG.
  - `real-data.test.ts`: «icons.json has no stale or invalid entries» — `grimIconIssues(data, readGrimIcons())` = `[]`.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/icons.test.ts scripts/assets/__tests__/grim-icons.test.ts scripts/grim/__tests__/real-data.test.ts` — FAIL.
- [ ] **Step 3: Код** за Interfaces. `load-template.ts`: `const icons = readGrimIcons(dir)`; `grimIconIssues` → додати до помилок валідації (throw тим самим повідомленням); `grimIconGaps` → `console.warn` (кожен рядок); імпорт — `importSrdData(withGrimIcons(data, icons), …)`.
- [ ] **Step 4: Субʼєкти (дані).** Для кожного запису каталогу — англійський субʼєкт 6–20 слів (предмет зображення без тексту/літер, без GW-назв, у тоні grimdark, без імен власних каталогу): `grim-units.json` (30, ключ — назва), `grim-spells.json` (30, `{ palette, subject }`, палітра з `PALETTES` у `compose.ts` за школою: Embers — вогняна, Gloam — тіньова, Fenlore/Thornwitchery — природна, Hearth Rites — золота, Cantrips — нейтральна), `grim-artifacts.json` (56), `grim-identity.json` (4 види + 16 кар'єр + 50 талантів, ключі `races:Lowlander`, `careers:Archivist`, `feats:Blade Practice`). Тест Step 1 — PASS.
- [ ] **Step 5: Смоук.** `pnpm assets:grim-icons prompts --out /private/tmp/grim-prompts` — 6 CSV, 186 рядків; `pnpm assets:grim-icons upload x --dir /private/tmp/none --dry-run` — друкує 186 «немає файлу» і `exitCode 1`, нічого не пише. Каталог `docs/assets/icon-prompts/grim-d100/` згенерувати командою без `--out` і закомітити (як SRD/HOMM5 промпти).
- [ ] **Step 6:** тести Step 2 + `scripts/grim/__tests__/load-template.integration.test.ts` не запускати (Task 7); `pnpm test:run scripts/assets/__tests__ scripts/grim/__tests__/coverage.test.ts` — PASS; eslint.
- [ ] **Step 7: Commit** `feat(wfrp): 5g-4 grim icon pipeline`.

**User-gated (не в цій задачі, лише runbook Task 8):** генерація PNG за `docs/assets/icon-prompts/grim-d100/*.csv`, QA-прохід на вшитий текст (переглянути кожне зображення; список у STATUS, не блокує), `upload` на локальну БД, потім prod з `--allow-remote` лише з явного дозволу.

### Task 7: uk-словник Grim (пакети агентів) та інтеграція на БД `wfrp`

**Files:**
- Create: `data/templates/grim-d100/i18n/glossary/uk.json`, `scripts/grim/__tests__/i18n-real.test.ts`, `scripts/grim/__tests__/localized-clone.integration.test.ts`
- Modify: `data/templates/grim-d100/i18n/uk.json`

**Процес (контролер):**

- [ ] **Step 1 (агент «підготовка», Sonnet): глосарій.** `glossary/uk.json` (≈40–80 термінів, англ. → укр.) зібрати з уже перекладеного wfrp-UI: `messages/{en,uk}/{wfrpCreation,wfrpCareers,wfrpMagic,wfrpTables,wfrpEquipment,wfrpEquipmentEditor,wfrpCorruption,wfrpDowntime,wfrpTraits,battleWfrp,gameTerms}.json` — пари однакових ключів для: 10 характеристик (WS, BS, S, T, I, Ag, Dex, Int, WP, Fel), Wounds, Fate, Fortune, Resilience, Resolve, Corruption, Momentum, SL/Success Levels, Advantage, назв станів (`ablaze`, `bleeding`, `blinded`, `broken`, `deafened`, `entangled`, `fatigued`, `prone`, `stunned`, `surprised`, `unconscious`), якостей/вад зброї, груп зброї, класів кар'єр (Academic, Burgher, Courtier, Peasant, Ranger, Riverfolk, Rogue, Warrior), монет (Brass/Silver/Gold), рівнів магії (Cantrips, petty/arcane/…). Терміни без пари в UI — вирішити й позначити у звіті. Потім `pnpm srd:i18n extract uk --template grim --phase A --max-chars 12000` → `data/templates/grim-d100/i18n/todo/uk/NN.jsonl`; кількість порцій і символів — у звіт контролеру. Коміт глосарію: `chore(wfrp): 5g-4 grim uk glossary`.
- [ ] **Step 2 (N агентів-перекладачів, Sonnet, паралельно ≤5): фаза A.** Кожен агент отримує номер порції `NN` і промпт нижче. Після всіх — Step 3.
- [ ] **Step 3 (агент «apply», Sonnet):** `pnpm srd:i18n apply uk --template grim data/templates/grim-d100/i18n/todo/uk/*.out.jsonl` → `прийнято N, відхилено M`; якщо `M > 0` або `grimI18nIssues` — `extract … --phase A` знову (лишаться тільки відсутні/відхилені) і ще одна хвиля Step 2 лише для цих порцій (максимум 2 повтори, далі — звіт контролеру). Потім `extract uk --template grim --phase B --max-chars 12000` → хвиля Step 2 (тепер з `NN.names.json`) → `apply` так само. Наприкінці `pnpm srd:i18n normalize uk --template grim` і `pnpm srd:i18n status uk --template grim` — **кожен рядок `N/N … 100% симв.`**. Коміт словника: `feat(wfrp): 5g-4 grim uk dictionary`.

Промпт агента-перекладача (дослівно, підставити `NN`):

```
You translate one batch of the Grim d100 tabletop template (an original grimdark percentile RPG) from English to Ukrainian.
Worktree: /Users/silentfox/Work/dnd-tracker-wfrp. Do not run tests, lint, git or any pnpm command; only read the inputs and write one output file.

Inputs:
- data/templates/grim-d100/i18n/todo/uk/NN.jsonl — one JSON object per line: {"h": hash, "c": "n" | "d", "en": English text}.
- data/templates/grim-d100/i18n/glossary/uk.json — mandatory terms (English -> Ukrainian). Use them exactly, inflecting nouns as Ukrainian grammar requires.
- data/templates/grim-d100/i18n/todo/uk/NN.names.json (may be absent) — names that are already translated; when an English name from it appears inside a "d" text, use the given Ukrainian name.

Output: data/templates/grim-d100/i18n/todo/uk/NN.out.jsonl — one line per input line, same order: {"h": "<same hash>", "t": "<Ukrainian>"}. Valid JSON per line, UTF-8, no comments, no extra lines.

Rules:
1. c = "n" (names: careers, career tiers, talents, species, spells, spell lists, units, items, trait/ability names, ingredients): a natural Ukrainian name, Title case only on the first word unless a proper noun; translate the meaning, do not transliterate English; keep it short. Unique names must stay distinct from each other.
2. c = "d" (descriptions, trappings, miscast/wrath table texts): fluent literary Ukrainian in a dark, sober register; same meaning, no additions, no omissions.
3. Keep unchanged: every number and sign (+1, 10, 240), dice tokens in Latin letters exactly as written (d10, 2d6, d100), units "ft", Markdown (*, _, backticks), line breaks, {placeholders}, parentheses with counts like "(12)".
4. Characteristic abbreviations (WS, BS, S, T, I, Ag, Dex, Int, WP, Fel) and SL: use the glossary forms.
5. Never introduce names or terms from Warhammer or any other published setting; if the English has none, the Ukrainian must have none.
6. If a line is not translatable text (a code, a key), copy "en" into "t" unchanged.
Finish with a one-line report: batch NN, lines written.
```

- [ ] **Step 4 (агент «apply»): тест словника.** `scripts/grim/__tests__/i18n-real.test.ts`: кожен хеш `grimCatalog(readGrimData())` має переклад у `readTranslations("uk", GRIM_I18N_DIR)`; `grimI18nIssues(data, uk)` = `[]`; `checkTranslation(entry.en, uk[entry.hash])` = `[]` для всіх; немає двох однакових перекладів для різних `n`-записів одного виду. `pnpm test:run scripts/grim/__tests__/i18n-real.test.ts scripts/grim/__tests__/i18n.test.ts` — PASS.
- [ ] **Step 5: Інтеграція** `scripts/grim/__tests__/localized-clone.integration.test.ts` (шапка, моки, `marker`, `afterAll`-прибирання — як у `real-data.integration.test.ts`, з тим самим guard «Grim уже існує → throw»):
  1. `loadGrimTemplate({ owner, allowRemote: false })` → `created: true`; другий запуск → `published: { added: 0, changed: 0, removed: 0 }`.
  2. Клон `createCampaignForUser(userId, { name: `${marker}-uk`, templateId, contentLocale: "uk" }, { defer: () => undefined })` → кампанія `locale: "uk"`; кожна кар'єра/спелл/юніт/предмет/талант/вид має `name` = переклад (`translateText(uk, "name", en)`), кількості = `data.*.length`; `rules.tables.miscastMinor[0].text` = переклад; `races.profile` клону після мапи id — та сама структура, що в `en`-клоні.
  3. Те саме з `contentLocale: "en"` → імена англійські.
  4. Обидва клони: `visible(classify(await loadSyncContext(scoped, cloneId)))` = `[]` (helpers з `lib/server/templates/sync/__tests__/helpers.ts`).
  5. `lists`: у uk-клоні кожен `spell.lists[0]` ∈ `new Set(Object.values(GRIM_SPELL_LISTS).flat().map((l) => translateText(uk, "name", l)))`.

  Прогін (облікові дані — з `.env.local`, БД `wfrp`; спершу `docker ps | grep 54322` і `docker exec dnd-tracker-wfrp-db-1 psql -U postgres -d wfrp -Atc "select count(*) from campaigns where kind='template' and name='Grim d100'"` = `0`, інакше спитати контролера):

```bash
DATABASE_URL=postgresql://<user>:<pw>@localhost:54322/wfrp DIRECT_URL=postgresql://<user>:<pw>@localhost:54322/wfrp \
  pnpm exec vitest run --config vitest.integration.config.mts scripts/grim/__tests__/localized-clone.integration.test.ts scripts/grim/__tests__/real-data.integration.test.ts scripts/grim/__tests__/load-template.integration.test.ts
```

  Expected: PASS; після — той самий `count` = `0` (шаблон прибрано `afterAll`). Якщо uk-клон дає непорожній sync-diff — **не** правити тест: зупинитися й повідомити контролера (це баг Task 2).
- [ ] **Step 6:** eslint на нових `.ts`; **Commit** `test(wfrp): 5g-4 grim dictionary and localized clone integration`.

### Task 8: CSV round-trip і документація

**Files:**
- Modify: `lib/server/content/__tests__/import-export.test.ts`, `docs/architecture/{rule-systems,content-api,i18n}.md`, `docs/STATUS.md`

- [ ] **Step 1: Тести** (`import-export.test.ts`, нові кейси в наявних `describe`):
  1. `exampleCsv(actor, "units", { loadNames, locale: "en" })` → заголовки містять `t(UNITS_IMPORT поле characteristics labelKey)`; `exampleCsv(…, "artifacts", …)` — заголовок `systemStats`; `exampleCsv(…, "careers", …)` — заголовки `tier1_*…tier4_*`; усі читаються без issues.
  2. Кар'єра: запис `{ id: "c1", name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", status: "Brass 3", characteristics: ["int"], skills: ["research"], talents: ["f1"], trappings: ["Quill and ink", "Candle stub"] }] }` (з `NAMES.feats = [{ id: "f1", name: "Lettered" }]`) → `exportCsv(…, "careers", …)` → `readBack` → `value` дорівнює `careerToImportRecord(record)` без `id`, з `tier1_talents: ["Lettered"]`; `rows[0].issues` = `[]`.
  3. Артефакт `systemStats` (зброя з «Ростеру» 5g-3, `Light Crossbow`) → `exportCsv` → `readBack` → `value.systemStats` `toEqual` вхідному.
  4. `races` експорт не має колонки `profile` (`IMPORT_SPECS.races.fields` без `profile`) — фіксує рішення.
  `pnpm test:run lib/server/content/__tests__/import-export.test.ts` — PASS (поведінка вже є; якщо кейс падає — це баг, повідомити контролера, не правити очікування). Commit `test(wfrp): 5g-4 wfrp csv round-trip`.
- [ ] **Step 2: `rule-systems.md`** — розділ «Межі 5g-4» після «Межі 5g-3» (7–10 пунктів): реєстр `TEMPLATE_LOCALIZATIONS` (SRD + Grim, `en/uk`, канонічний — офіційний `en` на кожен ключ); що локалізується (назви/описи всіх видів, кар'єри з рівнями й спорядженням, `rules.tables[*].text`, списки заклинань однією мапою; не локалізуються `status` рівнів, ключі навичок, `profile`, `creatureType` юнітів); uk-словник Grim і `--template grim`; перейменування Ashburner/Crier; іконки (186, `icons.json` за іменем, gaps — попередження, завантаження user-gated); AI (рядок системи лише для wfrp, проєкції); CSV: `races.profile` не імпортується й не експортується (посилання за id; профіль редагується лише в UI виду); хвости 5g-3 закрито (M2 прев'ю, M7 ключ, NaN). Розбіжності зі spec 1–9 з «Перевірок коду». У «Звірити з книгою» — нічого нового.
- [ ] **Step 3: `content-api.md`.** «Мова контенту SRD: один канонічний шаблон» → заголовок «Мова контенту офіційних шаблонів», текст узагальнити на реєстр (SRD і Grim; словники `data/templates/<template>/i18n/uk.json`; `pnpm srd:i18n <cmd> <locale> [--template srd|grim]`; `apply` відмовляє при колізіях/нерезолвлених списках). У «Офіційні шаблони на prod» — підрозділ «Grim d100 (runbook, нічого не виконано)»:
  1. Передумова: епік змерджено, 10 міграцій `feat/wfrp` (перелік у STATUS п.1) застосовано на prod деплоєм.
  2. Репетиція на prodcopy: свіжа копія, `pnpm constructor:grim-template --owner <id>` (локально), другий запуск → `+0 ~0 -0`, клон `en` і `uk` через UI, sync порожній.
  3. Свіжий бекап prod (`DIRECT_URL`).
  4. `pnpm constructor:grim-template --owner <id> --allow-remote` з prod-`DATABASE_URL`; власник — `dmUserId` наявних офіційних шаблонів.
  5. Перевірка: picker пропонує Grim з мовами `en/uk`; клон `uk` — український контент.
  6. Іконки окремим кроком: PNG за `docs/assets/icon-prompts/grim-d100/`, QA на вшитий текст, `pnpm assets:grim-icons upload <templateId> --dir <images> --allow-remote`, коміт `icons.json`, повторний `constructor:grim-template --allow-remote` (публікує іконки новою версією).
  7. Після деплою епіку — окрема міграція DROP `race_profiles` (STATUS п.1).
- [ ] **Step 4: `i18n.md`** «Мова контенту SRD» → поширити на офіційні шаблони з реєстру; словник Grim — серверний, у клієнтські scope не потрапляє.
- [ ] **Step 5: `docs/STATUS.md`** — у рядку WFRP після речення про 5g-3: «**5g-4 (завершення шаблону Grim d100) реалізовано на `feat/wfrp`, не змерджено:** локалізація офіційних шаблонів через реєстр (Grim `en/uk`, словник 100 %), sync з правилами, кар'єри Ashburner/Crier, wfrp-обізнаний AI-асистент, конвеєр іконок (зображення й prod-завантаження — за користувачем), хвости 5g-3; spec/план `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g4*`, межі — «Межі 5g-4», prod-runbook — content-api.md. Далі: архітектурний огляд (п.0), перед merge — п.1–5.» Окремим пунктом нижче: «Іконки Grim: згенерувати 186 PNG, QA вшитого тексту (список сюди), завантажити».
- [ ] **Step 6:** `pnpm test:run scripts/grim` (без integration) і `pnpm test:related scripts/grim/load-template.ts scripts/grim/i18n.ts scripts/grim/icons.ts lib/server/templates/localize-srd-bundle.ts lib/utils/campaigns/template-locales.ts` — PASS. **Commit** `docs(wfrp): 5g-4 boundaries, prod runbook and status`.

Після Task 8 (контролер):
1. Фінальне Opus-рев'ю (diff від `cae48a2f1`): Review Focus 1–5; вибіркове читання uk-словника (назви кар'єр/заклинань, таблиці мискастів) на якість і GW-запозичення; узгодженість реєстру й SRD-обгорток.
2. Одна хвиля виправлень (Sonnet), вузькі тести.
3. `/simplify` по diff гілки (1–2 агенти): кандидати — SRD-обгортки `isOfficialSrdTemplate`/`isCanonicalSrdTemplate`/`isLegacySrdTemplate`, якщо лишились лише в тестах; назва поля `srdOverlay`.
4. Оновити пам'ять `project-wfrp.md` (5g-4 готово; відкрито: іконки й prod — за користувачем; далі архітектурний огляд п.0). Повний `pnpm test:run` і repo-wide `pnpm lint` — лише в pre-deploy гейті епіку.

## Self-review

- **Покриття spec:** §1 реєстр — Task 1; §2 кар'єри/профіль/правила/списки — Task 2 (+ валідатор після накладки — `grimI18nIssues`, Task 3; sync правил — Task 2 і Task 7); §3 словник і CLI — Tasks 3, 7 (`status` 100 %); §4 перейменування — Task 4; §5 іконки — Task 6 (+ runbook Task 8); §6 AI — Task 5; §7 CSV — Task 8; §8 runbook — Task 8; §9 хвости — Task 4; «Тестування»: SRD-регресія (Global Constraints, Task 2 Step 1/5), інтеграція на `wfrp` (Task 7), бюджети `scope-size`/OpenAPI (Tasks 1, 4).
- **Розбіжності зі spec:** 9 пунктів у «Перевірках коду».
- **Узгодженість імен:** `TEMPLATE_CONTENT_LOCALES`, `TemplateContentLocale`, `TEMPLATE_LOCALIZATIONS`, `localizationOf`, `isLocalizableTemplate`, `isCanonicalTemplate`, `isLegacyLocalizedTemplate`, `templateTranslationsFor`, `localizeRules`, `TemplateData`, `GRIM_I18N_DIR`, `GRIM_CATALOG_KINDS`, `grimCatalogData`, `grimCatalog`, `grimI18nIssues`, `I18N_TEMPLATES`, `templateOf`, `checkImport`, `wfrpHeroView`, `wfrpParticipantView`, `characteristicValues`, `WFRP_SYSTEM_LINE`, `GrimIcons`, `readGrimIcons`, `writeGrimIcons`, `withGrimIcons`, `grimIconIssues`, `grimIconGaps`, `grimPromptRows`, `planGrimUploads`, `GRIM_ICON_SIZE`, `GRIM_ICON_BUCKET` визначені в Tasks 1–6 і вживаються лише так.
- **Плейсхолдери:** `<user>:<pw>` — з `.env.local`; `<id>`/`<templateId>`/`<images>` — у user-gated runbook; `NN` — номер порції, який видає `extract`.
