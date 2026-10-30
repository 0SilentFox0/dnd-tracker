# Template content i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Офіційний шаблон «5e SRD 5.2» доступний за мовами (першою — `uk`) з одним перемикачем мови у виборі шаблону й токен-ощадним пайплайном перекладу.

**Architecture:** Переклад = каталог `хеш англійського тексту → переклад` на мову; `overlay` накладає його на SRD-дані перед імпортом; кожна мова — окремий офіційний шаблон (рядок `campaigns` із `locale`/`templateKey`), UI групує їх в одну картку.

**Tech Stack:** TypeScript, tsx-скрипти (`scripts/srd`), Prisma (1 expand-only міграція), vitest, TanStack Query, next-intl.

**Spec:** `docs/superpowers/specs/2026-10-30-template-content-i18n-design.md`

## Global Constraints

- Міграція лише `ALTER TABLE campaigns ADD COLUMN locale TEXT, ADD COLUMN "templateKey" TEXT` (nullable, expand-only; нових таблиць немає, RLS не потрібен).
- `id`, `slug`, числа, ефекти, `trigger`, `damageDice` та інші нетекстові поля переклад не змінює; `slug` у каталозі не бере участі.
- Кирилиця дозволена лише в `data/**`, `scripts/**` (exempt); у `lib/`, `components/`, `app/` — ключі `messages/*`.
- Слой: компонент → хук → `lib/api/*`; ключі запитів — у `campaignKeys`; імпорт з барелів доменів; `@/`-аліаси.
- Рядок `en` = `locale null` або `"en"`. Нові рядки пишуть `en` явно, наявний прод-шаблон не бекфілиться.
- Правки лише з `eslint --fix <змінені файли>`, `pnpm test:related`; повний `pnpm test:run` один раз перед merge; не пушити; перед commit `git branch --show-current` (= `feat/template-i18n`).
- Мінімум коментарів. Відповіді користувачу українською.

## Review Focus

- Переклад із зайвими/відсутніми числами, кубиками (`2d6`, `+5`), `**`, посиланнями → `validate` відхиляє, рядок лишається англійським.
- Markdown-таблиця з іншою кількістю рядків/колонок (`|`) після перекладу → відхиляється.
- Два різні англійські імена одного виду → однаковий переклад (колізія): збирання шаблону падає з переліком.
- Посилання за назвою (`spellId`, `lists`, `groupId`…) на запис без перекладу: лишається англійським і збігається з англійською назвою запису.
- Шаблон мови без жодного перекладу = точна копія `en`; частково перекладений — fallback по рядках.
- Картка шаблону з одним варіантом мови: перемикач не показується; старий рядок без `locale` показується як `en`.

---

### Task 1: Колонки `locale`/`templateKey` і список шаблонів із варіантами

**Files:**
- Modify: `prisma/schema.prisma` (модель `Campaign`, після `credits`), `lib/server/templates/list-templates.ts`, `types/campaigns.ts` (`TemplateCard`)
- Create: `prisma/migrations/20261115000000_template_locale/migration.sql`
- Test: `lib/server/templates/__tests__/list-templates.test.ts` (за зразком наявних тестів у теці)

**Interfaces:**
- Produces: `TemplateCard` + `{ locale: string | null; templateKey: string | null }`; константа `DEFAULT_TEMPLATE_LOCALE = "en"` у `lib/constants/campaigns.ts`.

- [ ] **Step 1:** Додати поля `locale String?` і `templateKey String?` в `Campaign`; створити міграцію (`pnpm exec prisma migrate dev --name template_locale`), перевірити, що SQL містить лише два `ADD COLUMN`.
- [ ] **Step 2:** Падаючий тест: `listTemplates` повертає `locale`, `templateKey` у картках (мок/ тестова БД за зразком сусідніх тестів).
- [ ] **Step 3:** Додати `locale: true, templateKey: true` у `select`, поля — у `toCard` і `TemplateCard`.
- [ ] **Step 4:** `pnpm test:related lib/server/templates/list-templates.ts`, `pnpm exec eslint --fix <файли>`, commit `feat(templates): locale and templateKey columns`.

### Task 2: Групування варіантів мови й перемикач у виборі шаблону

**Files:**
- Create: `lib/utils/campaigns/template-variants.ts`, `lib/utils/campaigns/__tests__/template-variants.test.ts`
- Modify: `lib/hooks/campaigns/useTemplates.ts`, `components/campaigns/NewCampaignForm.tsx` (і картка шаблону, що його рендерить — знайти через `useTemplateSelection`), `messages/{uk,en}/campaigns.json` (підпис «Мова шаблону»), `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json`
- Test: `lib/hooks/campaigns/__tests__/useTemplates.test.tsx`

**Interfaces:**
- Produces:
```ts
export interface TemplateGroup { key: string; cards: Record<string, TemplateCard>; locales: string[] }  // locale → card
export function groupTemplates(cards: TemplateCard[]): TemplateGroup[]        // key = templateKey ?? name; locale = card.locale ?? "en"
export function pickVariant(group: TemplateGroup, uiLocale: string): TemplateCard  // uiLocale якщо є, інакше "en", інакше перший
```
- `useTemplateSelection()` додатково повертає `{ groups, locale, setLocale }`; `selection.templateId` = id обраного варіанта.

- [ ] **Step 1:** Тести `groupTemplates`/`pickVariant`: два рядки з однаковим `templateKey` → одна група з `["en","uk"]`; рядок без `templateKey` групується за `name`; `pickVariant("uk")` без uk-варіанта → en; одна картка → `locales.length === 1`.
- [ ] **Step 2:** Реалізувати чисті функції; пройти тести.
- [ ] **Step 3:** Хук: група й `locale` (початково `useLocale()`), `setSelection({ templateId })` при зміні мови; тест хука: зміна мови міняє `selection.templateId`.
- [ ] **Step 4:** UI: у картці групи `Select`/сегмент мов (назви — `lib/i18n/native-language-names.ts`), показується лише при `locales.length > 1`; кожна картка «mine» — без змін. Ключі `campaigns.templateLanguage` у обох локалях.
- [ ] **Step 5:** Запис у `whats-new.ts` (`templateLanguages`) і `whatsNew.templateLanguages.{title,body}` у обох `messages/*/whatsNew.json` (тест ключів проходить).
- [ ] **Step 6:** `pnpm test:related …`, eslint по змінених, commit.

### Task 3: Каталог і накладка (чисте ядро)

**Files:**
- Create: `scripts/srd/i18n/{catalog,overlay}.ts`, `scripts/srd/i18n/__tests__/{catalog,overlay}.test.ts`
- Reuse: `scripts/srd/lib/types.ts` (`SrdData`, `SrdKind`), `readSrdData`

**Interfaces:**
```ts
export const NAME_KEYS = ["name", "label", "nameTemplate"] as const;      // клас "n"
export const TEXT_KEYS = ["description", "text", "equipmentText"] as const; // клас "d"
export const REF_KEYS: Record<string, SrdKind> = { spellId: "spells", groupId: "spell-groups", school: "spell-groups", lists: "classes", spellList: "classes", originFeatId: "feats", bases: "artifacts" };

export interface CatalogEntry { hash: string; cls: "n" | "d"; en: string; kinds: SrdKind[] }
export const hashText: (cls: "n" | "d", en: string) => string;      // sha1(cls + "\0" + en) → hex[0..10]
export function extractCatalog(data: SrdData): CatalogEntry[];       // унікальні за hash; пропускає рядки без ≥3 літер підряд
export type Translations = Record<string, string>;                   // hash → переклад
export function applyOverlay(data: SrdData, tr: Translations): SrdData;
```
`applyOverlay`: глибока копія; кожен рядок під `NAME_KEYS`/`TEXT_KEYS`, що має переклад, замінюється; потім будується `names: Record<SrdKind, Map<en, tr>>` з верхньорівневих `name` кожного виду, і значення (рядок або елемент масиву) під `REF_KEYS` замінюється за мапою виду `REF_KEYS[key]`. Рядок із `name`-класу під ключем `name` у вкладених `abilities` теж перекладається через каталог. Колізія (два різні англ. імені одного виду → однаковий переклад) → `throw new Error("Колізія назв (<kind>): …")`.

- [ ] **Step 1:** Тести `catalog`: дедуплікація однакових текстів; рядок `"1d6"`/`"+5"` пропущено; `cls` розрізняє `name` і `description` з однаковим текстом; `slug`/`id` не потрапляють.
- [ ] **Step 2:** Тести `overlay`: підміна `description` у `choices[].options[]`; `spellId: "Fireball"` → переклад назви заклинання; відсутній переклад → англійське; `lists: ["Wizard","Cleric"]` переписується поелементно; колізія кидає помилку; вихідний `data` не мутується.
- [ ] **Step 3:** Реалізувати, пройти тести, commit.

### Task 4: Перевірка перекладу

**Files:**
- Create: `scripts/srd/i18n/validate.ts`, `scripts/srd/i18n/__tests__/validate.test.ts`

**Interfaces:**
```ts
export function checkTranslation(en: string, tr: string): string[]   // порожній масив = ок; елементи — коди: "numbers" | "dice" | "markup" | "table-shape" | "lines" | "empty"
```
Правила: непорожній; мультисет чисел і кубиків (`\d+d\d+`, `[+-]\d+`, цілі числа) збігається (слова-числівники не зважаємо); кількість `**`, `\n\n`-абзаців, рядків, що починаються з `|`, і `|` в кожному рядку таблиці збігається; `Table: ` префікс-рядок присутній в обох або в жодному (префікс «Table:» лишається англійським).

- [ ] **Step 1:** Тести: ок-випадок; зникле число; змінений кубик; таблиця з іншою кількістю колонок; втрачений `**`; порожній переклад.
- [ ] **Step 2:** Реалізувати, пройти, commit.

### Task 5: CLI `extract` / `apply` / `status` і глосарій

**Files:**
- Create: `scripts/srd/i18n/cli.ts` (підкоманди), `scripts/srd/i18n/store.ts` (читання/запис `i18n/<locale>.json`, `glossary/<locale>.json`), тести `scripts/srd/i18n/__tests__/cli.test.ts`
- Create: `data/templates/srd-5.2/i18n/.gitkeep`, `data/templates/srd-5.2/i18n/glossary/uk.json`
- Modify: `package.json` (`"srd:i18n": "tsx --tsconfig tsconfig.scripts.json scripts/srd/i18n/cli.ts"`), `scripts/srd/lib/types.ts`/`data-files.ts` (`SrdManifest.locales: string[]`, `readSrdManifest` не ламається на старих файлах)

**Interfaces:**
- `pnpm srd:i18n extract <locale> [--phase A|B] [--max-chars 22000] [--out <dir>]` → пише порції `todo/<locale>/NN.jsonl` (рядок `{"h","c":"n|d","en"}`) лише для хешів без перекладу; фаза A = види `races|feats|backgrounds|classes` (усі класи) + усі `n`-рядки решти видів; B = решта `d`-рядків.
- `pnpm srd:i18n apply <locale> <file.jsonl ...>` → кожен рядок `{"h","t"}` проходить `checkTranslation(en з каталогу, t)`; валідні зливаються в `i18n/<locale>.json` (відсортовані ключі, `JSON.stringify(_, null, 2)`); невалідні пишуться в `todo/<locale>/rejected.jsonl` з кодами; друкує лічильники. `todo/` в `.gitignore`.
- `pnpm srd:i18n status <locale>` → покриття за видами/класами (переклад / усього символів).
- Глосарій: `{ "Saving Throw": "рятівний кидок", … }` ≈ 80–120 термінів 5e (характеристики, стани, школи, типи шкоди, дії, відпочинок); читається лише в промпті агентів, не в коді.

- [ ] **Step 1:** Тести на чистих функціях `planBatches(entries, maxChars)` (порції не перевищують ліміт, дерево стабільне), `mergeApplied(existing, lines, catalog)` (валідні вливаються, невалідні — у rejected, повтор ідемпотентний).
- [ ] **Step 2:** Реалізувати підкоманди, `.gitignore`, скрипт у `package.json`, поле `locales` у маніфесті (`["en"]` до першого apply).
- [ ] **Step 3:** `pnpm test:related scripts/srd/i18n`, eslint, commit.

### Task 6: Завантажувач за мовою й тест цілісності

**Files:**
- Modify: `scripts/srd/load-template.ts`, `scripts/srd/lib/template-store.ts` (`makeTemplateStore(name, locale)`), `scripts/srd/lib/load-template.ts` (`TemplateStore.create` пише `locale`, `templateKey`), `scripts/srd/lib/data-files.ts` (`readSrdData(dir, locale?)` застосовує `applyOverlay`), `docs/…` пізніше
- Test: `scripts/srd/__tests__/data-integrity.test.ts` (додати цикл по мовах з `manifest.locales`), `scripts/srd/lib/__tests__/template-store.test.ts` якщо є

**Interfaces:**
- `pnpm constructor:srd-template [--locale uk] …`: `findTemplate` шукає `{ name, official, locale: locale === "en" ? { in: [null, "en"] } : locale }`; при створенні пише `locale` та `templateKey: "srd-5.2"`; `en` без `--locale` поводиться як раніше. Ім'я шаблону однакове для всіх мов; опис береться з `i18n/description.<locale>` не потрібен — лишається англійським `SRD_TEMPLATE_DESCRIPTION`.
- `readSrdData(dir?, locale?: string)`: без `locale`/`en` — без змін; інакше `applyOverlay(data, readTranslations(locale))`.

- [ ] **Step 1:** Тест: `readSrdData(dir, "uk")` на мініфікстурі з одним перекладом дає переклад лише там, де він є; решта — англійська.
- [ ] **Step 2:** Реалізувати `--locale` (`assertSeedTarget` як є); `staleSpellColumns` і `resolveSchoolRefs` працюють з перекладеними назвами шкіл (мапа за назвою з БД).
- [ ] **Step 3:** `data-integrity.test.ts`: для кожної `manifest.locales` проганяє `importContent` dry-run без помилок і попереджень.
- [ ] **Step 4:** `pnpm test:related scripts/srd`, eslint, commit.

### Task 7: Переклад, фаза A (виконують Sonnet-агенти)

**Files:** `data/templates/srd-5.2/i18n/uk.json`, `glossary/uk.json`

- [ ] **Step 1:** Скласти глосарій `uk` (Sonnet, одна порція ≈ 100 термінів) — показати користувачу вибірку; узгодити.
- [ ] **Step 2:** `pnpm srd:i18n extract uk --phase A`; пілот: перша порція `races` (≈17 тис. симв.) → один агент Sonnet: вхід — глосарій + JSONL порції, вихід — JSONL `{"h","t"}` без англійського; `apply`; показати користувачу 5–6 прикладів (Draconic Ancestors, таблиця, назви).
- [ ] **Step 3:** Після згоди — решта порцій фази A послідовно (один агент на порцію, без паралельного Opus), після кожної `apply`; `rejected.jsonl` → лише ці хеші повторною маленькою порцією (не більше 2 раундів, інакше лишаються англійською).
- [ ] **Step 4:** `pnpm srd:i18n status uk` (очікується 100 % фази A), `pnpm test:related scripts/srd` (integrity з `uk`), commit даних окремим комітом.

### Task 8: Документація й фініш

**Files:** `docs/architecture/content-api.md` (розділ «Шаблон SRD 5.2» + нова підсекція «Мови шаблону»), `docs/architecture/i18n.md` (посилання), `docs/STATUS.md`

- [ ] **Step 1:** Описати каталог, `srd:i18n`, `--locale`, групування, як додати нову мову (4 кроки), що наявні кампанії не мігруються; фаза B — відкрита.
- [ ] **Step 2:** Один раз `pnpm test:run` (перед цим `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`), `pnpm exec eslint` по змінених, `/simplify` по diff гілки (1–2 агенти).
- [ ] **Step 3:** Фінальне рев'ю одним Opus-агентом по diff; виправлення; commit. Merge і push — лише за словом користувача; нагадати про прод: міграція їде з main, потім `pnpm constructor:srd-template --locale uk --allow-remote`.

## Self-review
- Спек покритий: каталог/хеш (T3), накладка й refs (T3), валідація (T4), CLI й нова мова (T5), завантажувач і шаблон на мову (T6), колонки й перемикач (T1–T2), економія токенів і фази (T5, T7), документація (T8).
- Типи узгоджені: `Translations`, `CatalogEntry`, `TemplateGroup`, `checkTranslation`, `applyOverlay`, `readSrdData(dir, locale)`.
- Відкрите: перелік `NAME_KEYS`/`TEXT_KEYS` уточнюється тестом цілісності (`languages`, `alignment` юнітів поза перекладом, доки не підтверджено, що вони не enum).
