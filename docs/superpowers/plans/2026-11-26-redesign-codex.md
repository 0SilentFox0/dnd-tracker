# «Кодекс»: форми бібліотеки, «Основне» героя, довідник, імпорт, правила — план реалізації

> **Для виконавців:** ОБОВ'ЯЗКОВИЙ навик — superpowers:subagent-driven-development. Кроки — чекбокси `- [ ]`.

**Мета:** широкий каркас форм («Майстерня») і на ньому — форми бібліотеки з переглядом, вкладка «Основне» героя, довідник `/info` у вигляді «список + деталь», покроковий майстер імпорту `/dm/compendium` і «Книга правил» `/dm/rules`.

**Архітектура:** спершу L0 розширює кіт `components/hud` (широкий `HudFormPage`, рейка вкладок, меню «⋯», сегментований перемикач, контейнерні утиліти `.ds-*`). Потім смуги L1/L3/L4/L5 паралельно, кожна у своїх файлах, і наостанок L2. Хуки, API, Zod-схеми й поля форм не змінюються, крім явно названих місць.

**Стек:** Next.js 16, React 19, Tailwind 4 (контейнерні запити `@container` вбудовані), Radix Tabs, next-intl, Vitest.

**Спека:** `docs/superpowers/specs/2026-11-26-sheet-library-compendium-rules-redesign.md`. Розділ «Рішення власника 2026-11-26» має пріоритет над тілом спеки. Візуальна мова: `docs/superpowers/specs/2026-11-25-design-system.md` + поправка «вайб таверни» (`docs/archive/superpowers/2026-11-25-design-system-migration-design.md`), правила DS у `docs/architecture/ui-layers.md#дизайн-система-ds` і `.claude/rules/components.md`.

**Робоче дерево:** `/Users/silentfox/Work/dnd-tracker-codex`, гілка `feat/redesign-codex` (від `origin/main` `ac12c9281`). `node_modules` у дереві немає: перший агент запускає `pnpm install --frozen-lockfile`. Основну теку `/Users/silentfox/Work/dnd-tracker` не чіпати: там працює інша сесія.

## Статус A24

A24 (мінімум листа: липка колонка стягу, опис із «Більше», Зберегти/Скасувати в шапці, `ds-panel` під блоками) **вже в main**: Ч8a `4065dac30` (коміти `8d7d3beaa` two-column sheet + editor actions in header, `4760f9cf5` basic tab on ds-panel). Отже **L2 розблокована**, але за наказом власника виконується останньою. Файлу `A24-brief.md` у репо немає: база для L2 — нинішній код `SheetIdentityPanel` (проп `actions`) і `CharacterBasicInfo`.

## Глобальні обмеження

- Мова UI-текстів — лише через `messages/{uk,en}/<ns>.json`; кирилиця в коді й коментарях заборонена (ESLint + ratchet). Нові коментарі — англійською, мінімальні.
- Компонент ≤ 7 пропсів (`lib/__tests__/props-budget.test.ts`). `HudForm` — виняток рівно на 10 (`ratchets/props-budget-exempt.json`), більшим він не стає.
- Сирі `<button|input|select|img>` поза `components/ui`/`components/hud` заборонені (`raw-controls`). Діалоги — лише `ResponsiveDialog`, підтвердження — лише `useConfirm`.
- Шари: `hud` не імпортує `common` і домени; системний UI (`systems/*/ui`) бере з core тільки `ui/hud/common` + `SYSTEM_UI_KIT` (`scripts/shared/ui-layers.mjs`).
- Акцент — `--hud-accent` (золото); малиновий — лише для небезпеки, помилок і HP. Кути: контроли 8 (`rounded-lg`), панелі 12 (`rounded-xl`), таби 6 (`rounded-md`). Кожен клікабельний елемент має hover (`ds-interactive`).
- Брейкпоінти: phone < 640, md 640–1023, lg 1024–1279, xl 1280–1599, 2xl ≥ 1600.
- **Бюджети i18n не піднімати** (`lib/i18n/test/route-budgets.ts`, `CAMPAIGN_BASE_LIMIT_KB`). Квоти смуг — у розділі «i18n».
- Тести: агент пише тести і запускає ЛИШЕ свої файли `pnpm test:run <files>`. Повного прогону до гейту немає. Лінт — `pnpm exec eslint --fix <свої файли>`.
- Коміти: лише явні шляхи (`git add <path>...`), ніколи `git add -A/.`. Повідомлення закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ratchet-файли (`ratchets/*.json`) смуги не змінюють. Якщо запис зменшився або зник, це фіксує крок інтеграції (I.2). Ріст ratchet заборонений.

## Фокус ревізії

1. **Одна кнопка «Зберегти»** на `wide` при будь-якій ширині (1920/1280/390/320): дії — один DOM-вузол, submit поза `<form>` з `form={FORM_ID}`. Тест у T0.1 + перевірка в живому прогоні.
2. **Невалідне поле на прихованій вкладці/рейці**: `useRevealInvalidTab` має перемикати вкладку і в режимі `rail`, і для вкладки з `hidden`-тригером (фільтр правил). Тест у T0.2 і T4.2.
3. **Порожні/дивні дані**: світогляд із вільним рядком («any alignment») показується сирим; новий герой без імені/раси має заглушку стягу «?»; довідник з 0 записів після фільтра показує `EmptyState` у деталі. Тести в T2.2, T2.3, T3.2.
4. **«Назад» на телефоні**: у довіднику закриває sheet деталі (`router.push`), у правилах повертає зі сторінки розділу до змісту. Тести хуків T3.2 / T4.3.
5. **Застаріла перевірка імпорту**: після 15 хв основна кнопка стає «Перевірити знову», а «Імпортувати» недоступне. Зміна категорій після перевірки показує notice і скидає перевірку. Тести в T5.2/T5.3.

---

## Звірка зі спекою (що в коді інакше)

| Твердження спеки | Факт у `origin/main` | Рішення |
|---|---|---|
| `compendium` у `CAMPAIGN_NAMESPACES` — перенести в route-local `ExtendLocaleScope`, узгодити `core-namespaces.ts` | Скоупи вже розщеплено: `compendium` живе в паках `contentLibrary`/`contentTransfer` (`lib/i18n/route-scopes.ts`), а `core-namespaces.ts` — це лише повний перелік. `compendium` потрібен і на сторінках контенту (`SourceNotes`, `ContentTransferButtons`) | Скоуп **не переносимо**, `core-namespaces.ts` не чіпаємо. L5 вкладається в квоту (нижче) |
| Неймспейс `dashboard` має запас ≈ 0 | Кожен маршрут має ≈ 0,55–0,58 KB запасу (виміряно uk gzip: `[id]` 27,63/28,2; `[id]/info` 64,62/65,2) | Для L3 лишаємо нетто ≤ 0 — запас потрібен L0/L2/L4 |
| `gameTerms` — кореневий скоуп, ліміт 20 KB | `gameTerms` входить у `CAMPAIGN_BASE` (15,62 / 16,2 KB) і тому в кожен маршрут кампанії | 18 ключів світогляду = +0,17 KB (виміряно) — у межах квоти L2 |
| `rules` у кампанійному скоупі | Пак `rules` є на `[id]`, `[id]/info`, `[id]/character`, `[id]/battles`, `[id]/dm/rules` | Квота L4 ≤ +0,12 KB |
| Тур онбордингу «довідник» (`demoTours`, `clickFromTarget`) треба оновити | У `lib/onboarding/demo-tours.ts` немає кроків для `/info` і немає `data-tour` у `components/campaigns/info` | Нічого не робимо |
| Кар'єра WFRP (`CareersPage`) — «той самий каркас, якщо на `HudFormPage`» | Не на `HudFormPage` | Поза обсягом |
| Скіл: `SkillCreateForm`, `MainSkillEditForm` | Є ще `systems/skilltrees/ui/content/skills/EditSkill.tsx` (теж `HudFormPage`) | Додано в T1.4 |
| `HudForm` має `triggerClassName`, ніхто не передає | Передає `components/rules/RulesForm.tsx` (`"flex-none px-3"`) | T0.2 переводить цей виклик на `tabStyles` |
| Шапка `wide` липне на `--hud-top` | Змінна в коді — `--shell-header-h` (так у `HudTabs`) | Використовуємо `--shell-header-h` |
| `HudForm.error` → `FormAlert` | `hud` не може імпортувати `common` (`FormAlert` у `components/common/states`) | Помилку рендерить сам `HudForm`: `<p role="alert">` з токенами `text-hud-danger` |
| `useExpiry` дає зворотний відлік | `useExpiry(iso)` повертає лише `boolean`; TTL 15 хв зашито в `lib/server/compendium-import/service/token.ts` | Константу виносимо в `lib/constants/compendium-import.ts`; показуємо «Перевірка чинна до HH:MM» (абсолютний час, без цокання) + `useExpiry` |
| `useRulesForm` має віддати `dirtyKeys` | Уже обчислює `dirtyKeys` всередині, назовні віддає лише `isDirty` | T4.1 лише експортує його + `resetKey` |
| `SwitchField`/`NumberField` отримають `layout="row"` | `NumberField` уже має 7 пропсів; `SwitchField` — 8 | Пропсів не додаємо: рядки дає контейнерна утиліта `.ds-setting-rows` + атрибути `data-slot` |
| Колір/герб раси для живого стягу — з `options.races` | `options.races: { id, name }[]` — кольору й герба немає | Стяг бере колір і герб зі збережених даних (fallback зі спеки) |
| `HudSegmented` — спершу перевірити `HudChipTabs` | `HudChipTabs` — це `<nav>` з посиланнями/`aria-pressed`: семантика навігації, без roving focus | Новий `HudSegmented` (radiogroup) з тими самими класами чипа (`HUD_CHIP_CLASS` експортується з `HudChipTabs`) |
| Системні форми (клас, передісторія, скіл, набір) рендерять `SourceNotes` і `ClassReferenceDetail` | Системний UI не має права імпортувати `content-import/shared/SourceNotes` і `campaigns/info/*` | Два нові рядки `SYSTEM_UI_KIT` (T1.3 і T1.5) + рядки в `ui-layers.md` (I.3) |
| Зони перетягування в кіті немає? | Підтверджено: немає (`onDrop` не знайдено в `ui/hud/common`) | Новий `FileDropZone` у `components/common/fields/` |
| Roving-tabindex хук | У `lib/hooks/common` немає | Новий `useRovingIndex` (L0), його використовують `HudSegmented`, `AlignmentGrid`, `ReferenceList` |

Усі інші шляхи зі спеки існують: форми §1, `SheetIdentityPanel`, `CharacterBasicInfo`, `BasicEditTab`, `NewCharacterForm`, `MonsterStatblock`, `DraftBasicSection`, `CompendiumImport` і кроки, `useCompendiumImport`, `section-registry`, `file-button`, `RulesPatchOffer`.

---

## i18n: квоти смуг (uk gzip, виміряно на `origin/main`)

Мінімальний запас серед маршрутів, які зачіпає редизайн, — ≈ 0,55 KB. Квоти розраховано так, щоб навіть найгірший маршрут (`[id]/info` = база + `rules` + `dashboard`) мав ≥ 0,1 KB запасу.

| Смуга | Неймспейс (пак) | Квота | Ключі |
|---|---|---|---|
| L0 | `common` (база) | ≤ +0,10 | `ui.preview` «Перегляд», `ui.previewTitle` «Як бачать гравці», `actions.more` «Більше дій» |
| L2 | `gameTerms` (база) | ≤ +0,20 | `alignments.<camelKey>.{name,short}` × 9 (виміряно +0,17) |
| L2 | `characterProfile` (characterSheet) | ≤ +0,03 | `portrait.change` «Змінити портрет» |
| L3 | `dashboard` | **нетто ≤ 0** | + `reference.detail.{empty,edit,close}`, `reference.list.{showAll,found}`, `reference.rail.sections`; − `reference.jump.*`, `reference.count.*`, `reference.shown.*`, `reference.search.filtersActive` |
| L4 | `rules` | ≤ +0,12 | `page.groups.{system,combat,characters,world,other}`, `page.changed`, `page.changedSections`, `page.resetSection`, `page.filter`, `page.demoReadOnly` |
| L5 | `compendium` (contentLibrary) | ≤ +0,12 | спека §3b, мінус `import.close`, `import.previewTtl`, `runs.report`. Кнопки «Далі/Назад/Імпортувати» беруться з `common.actions`, якщо там є відповідник |
| I | `whatsNew` | ≈ 0 | `trimWhatsNew` показує лише останні записи: новий запис витісняє старий |

**Як міряти свою квоту:** T0.3 додає `scripts/shared/i18n-ns-gzip.ts <ns...>`, який друкує uk/en gzip KB для заданих неймспейсів. Агент запускає його до і після своєї правки (`pnpm exec tsx scripts/shared/i18n-ns-gzip.ts dashboard`). `scope-size.test.ts` під час паралельної роботи бачить чужі незакомічені правки, тому його запускає лише гейт. Ключі завжди додаються в `uk` і `en` (тест `parity`).

---

## Межі файлів (паралельні смуги не перетинаються)

| Спільний файл | Власник |
|---|---|
| `components/hud/hud.css`, `components/hud/index.ts`, `components/hud/form/*`, `components/hud/page/HudChipTabs.tsx`, `components/ui/switch-field.tsx`, `components/ui/labeled-input.tsx` (лише `data-slot`) | L0 |
| `lib/hooks/common/index.ts`, `messages/*/common.json` | L0 |
| Усі виклики `HudFormPage title=/aside=` (міграція на `header`) | L0, T0.1 (до старту паралельних смуг) |
| `scripts/shared/ui-layers.mjs` (`SYSTEM_UI_KIT`) | L1 (T1.3, потім T1.5 — послідовно) |
| `components/content-import/shared/SourceNotes.tsx` | L1 (T1.1). L5 його не чіпає |
| `components/common/shell/StepIndicator.tsx`, `components/common/fields/FileDropZone.tsx` | L5 |
| `lib/hooks/campaigns/index.ts` | L3 (L4 барель не змінює: `useRulesForm` уже експортовано) |
| `lib/hooks/characters/index.ts`, `messages/*/{gameTerms,characterProfile}.json` | L2 |
| `messages/*/dashboard.json` | L3 · `messages/*/rules.json` — L4 · `messages/*/compendium.json` — L5 |
| `lib/onboarding/whats-new.ts`, `messages/*/whatsNew.json`, `docs/**`, `ratchets/*.json` | Інтеграція (I) |
| `components/units/MonsterStatblock.tsx` | L2 (L1 чіпає лише `components/units/form/*`) |
| `components/rules/**`, `systems/*/rules/sections.ts` (лише поле `group`) | L4 (після одного рядка T0.2 у `RulesForm`) |

## Хвилі й розподіл агентів (усі агенти — Sonnet)

| Хвиля | Агент | Задачі | Файли (коротко) |
|---|---|---|---|
| 1 | **A0** | T0.1, T0.2, T0.3 | `components/hud/**`, `hud.css`, `lib/hooks/common/useRovingIndex.ts`, `common.json`, виклики `HudFormPage`, `scripts/shared/i18n-ns-gzip.ts` |
| 2 ‖ | **A1** | T1.1, T1.2 | `components/units/form/*`, `components/spells/form/forms/*`, `components/artifacts/ArtifactForm.tsx`, сторінки `app/.../dm/{units,spells,artifacts}/[...]/page.tsx`, `SourceNotes.tsx` |
| 2 ‖ | **A2** | T1.3, T1.4 | `components/races/*Form*`, `components/feats/FeatForm.tsx`, `systems/d20/ui/content/{classes,backgrounds}/*Form*`, `systems/skilltrees/ui/content/**/{*Form*,EditSkill.tsx}`, `systems/artifactsets/ui/content/*`, сторінки цих видів, `ui-layers.mjs` |
| 2 ‖ | **A3** | T3.1, T3.2 | `components/campaigns/info/{detail,rows,layout}/*`, `lib/hooks/campaigns/useReferenceSelection.ts` + барель |
| 2 ‖ | **A4** | T4.1, T4.2 | `lib/utils/rules/{sections,core-sections,section-groups}.ts`, `systems/*/rules/sections.ts`, `lib/hooks/campaigns/useRulesForm.ts`, `components/rules/**` |
| 2 ‖ | **A5** | T5.1, T5.2 | `components/common/fields/FileDropZone.tsx`, `components/common/shell/StepIndicator.tsx`, `components/content-import/compendium/**`, `lib/hooks/compendium-import/**`, `lib/constants/compendium-import.ts`, `lib/server/compendium-import/service/token.ts` (лише імпорт константи), `compendium.json` |
| 3 ‖ | **A6** | T3.3 | `components/campaigns/info/InfoReferenceClient.tsx`, старі картки (видалення), `app/campaigns/[id]/info/*`, `lib/hooks/campaigns/useInfoReferenceFilters.ts`, `dashboard.json` |
| 3 ‖ | **A7** | T1.5, T1.6 (після T3.1) | `lib/utils/{spells,artifacts,characters/classes}/reference-preview.ts`, форми закляття/артефакту/класу/раси/риси/передісторії (лише `side`), `ui-layers.mjs` |
| 3 ‖ | **A8** | T4.3 | `app/campaigns/[id]/dm/rules/page.tsx`, `components/rules/RulesForm.tsx` (демо), `rules.json` |
| 3 ‖ | **A9** | T5.3 | `components/content-import/compendium/{steps,report}/*`, `ContentImportWizard.tsx`, `app/campaigns/[id]/dm/compendium/page.tsx` |
| 3 ‖ | **A10** | T2.1, T2.2 | `components/character-profile/{sheet/SheetBanner,sheet/PortraitDialog,IdentityDraft}.tsx`, `SheetIdentityPanel.tsx`, `ProfileEditor.tsx`, `lib/utils/characters/alignment.ts`, `lib/hooks/characters/useAlignmentLabel.ts`, `components/characters/basic/AlignmentGrid.tsx`, місця показу світогляду, `gameTerms.json`, `characterProfile.json` |
| 4 | **A11** | T2.3, T2.4 | `components/characters/basic/*`, `components/character-profile/tabs/BasicEditTab.tsx`, `ProfileEditor.tsx` (меню «⋯»), `components/characters/NewCharacterForm.tsx` |
| 5 | контролер + агенти | I.1–I.6 | гейт, огляд, фікс, живий прогін, /simplify, документація |

У хвилі 3 файли A7 (форми) не перетинаються з файлами A1/A2: ті вже закінчили роботу у хвилі 2. A10 і A11 ідуть послідовно, бо обидва змінюють `ProfileEditor.tsx`.

---

## L0 — каркас (агент A0)

### T0.1 `HudFormPage` wide + утиліти `.ds-*`

**Файли:** змінити `components/hud/form/HudFormPage.tsx`; створити `components/hud/form/HudFormSide.tsx` (`'use client'`); `components/hud/hud.css`; `messages/{uk,en}/common.json`; міграція всіх викликів (`grep -rln HudFormPage app components systems` — 24 файли: settings/*, help/*, library/sounds, dm/show/[deckId], dm/rules/page, BattleSetupForm, NewCampaignForm, NewCharacterForm, PlayerDraftForm, WfrpDraftForm і форми бібліотеки). Тест: `components/hud/form/__tests__/HudFormPage.test.tsx` (новий), `components/hud/__tests__/ds-utilities.test.ts`.

**Інтерфейс:**
```ts
export interface HudFormPageHeader {
    title: ReactNode;
    aside?: ReactNode;
    back?: { href: string; label: ReactNode };  // breadcrumb «Бібліотека › <вид>»
    menu?: ReactNode;                            // HudFormMenu
}
export function HudFormPage(props: {
    header: HudFormPageHeader;
    width?: 'narrow' | 'wide';   // default 'narrow' = нинішній max-w-3xl
    actions?: ReactNode;         // one DOM node; sticky top ≥lg, sticky bottom <lg
    side?: ReactNode;            // <aside aria-label={t('ui.preview')}>
    children: ReactNode;
    className?: string;
}): JSX.Element  // 6 props
```
`HudFormPage` лишається серверно-сумісним. Кнопку «Перегляд» (< lg) і `ResponsiveDialog hud` з тим самим `side` рендерить клієнтський `HudFormSide({ children })`.

**CSS (`hud.css`, неочевидне — ескіз):**
```css
.hud-form-wide { display:grid; gap:16px 24px; grid-template-columns:minmax(0,1fr);
  grid-template-areas:"head" "rail" "main" "actions"; }
.hud-form-wide > .hud-form-head{grid-area:head} .hud-form-wide > .hud-form-actions{grid-area:actions}
.hud-form-wide > .hud-form-side{grid-area:side; display:none}
.hud-form-wide .hud-form-body, .hud-form-wide form[data-layout=rail],
.hud-form-wide form[data-layout=rail] > [data-slot=hud-tabs]{display:contents}
.hud-form-wide [data-slot=hud-tabs-list]{grid-area:rail} .hud-form-wide [data-slot=hud-tabs-panels]{grid-area:main}
.hud-form-wide > .hud-form-body:not(:has(form[data-layout=rail])){grid-area:main; display:block}
.hud-form-actions{position:sticky; bottom:0; order:99}
@media (min-width:1024px){
  .hud-form-wide{grid-template-columns:minmax(0,1fr) 320px; grid-template-areas:"head actions" "rail side" "main side"}
  .hud-form-wide > .hud-form-side{display:block; position:sticky; top:calc(var(--shell-header-h,57px) + 64px); align-self:start}
  .hud-form-actions{top:var(--shell-header-h,57px); bottom:auto; z-index:21}
}
@media (min-width:1280px){ .hud-form-wide{grid-template-columns:208px minmax(0,1fr) 360px;
  grid-template-areas:"head head actions" "rail main side"} }
@media (min-width:1600px){ .hud-form-wide{grid-template-columns:208px minmax(0,1fr) 400px} }
.hud-form-wide:not(:has(> .hud-form-side)) { /* no side: main spans side column */ }
.hud-form-wide:has([data-wide-tab=true]) > .hud-form-side{display:none}
.hud-form-wide:has([data-wide-tab=true]) [data-slot=hud-tabs-panels]{grid-column:main-start / -1}
.ds-fields{display:grid; gap:16px 20px; grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))}
.ds-fields--num{grid-template-columns:repeat(auto-fill,minmax(7rem,1fr))}
.ds-span{grid-column:1 / -1}
.ds-list-grid{display:grid; gap:16px; grid-template-columns:minmax(0,1fr)}
@container (min-width:52rem){ .ds-list-grid{grid-template-columns:repeat(2,minmax(0,1fr))} }
.ds-setting-rows > * + *{border-top:1px solid color-mix(in srgb,var(--hud-rule) 50%,transparent)}
.ds-setting-rows > *{padding-block:12px}
.ds-setting-rows > [data-slot=switch-field]{flex-direction:row-reverse; justify-content:space-between}
.ds-setting-rows > [data-slot=form-field]{display:grid; grid-template-columns:1fr auto; align-items:center; column-gap:16px}
@media (max-width:399px){ .ds-setting-rows > [data-slot=form-field]{grid-template-columns:1fr} }
```
Головна колонка (`[data-slot=hud-tabs-panels]` і `.hud-form-body`) має `container-type:inline-size`. Колонка без `side` розтягується на колонку бічної: для `.hud-form-wide:not(:has(> .hud-form-side))` виконавець задає `grid-template-areas`, у яких `main` займає місце `side`. Атрибут `data-slot="switch-field"` додається в `components/ui/switch-field.tsx`, а `data-slot="form-field"` — у `FormField` (`components/ui/labeled-input.tsx`), якщо його там ще немає.

**Рішення:** шапка `wide` = крихти (`back`) · `h1.hud-title` · `aside` · праворуч [Перегляд < lg] [`menu`]. Дії `.hud-form-actions`: ≥ lg — тло `bg-hud-page/95` + `backdrop-blur`; < lg — нижній липкий бар. `narrow` поводиться як зараз: дії з `actions` теж рендеряться вузлом `.hud-form-actions`, але в нормальному потоці внизу. `.orn` стоїть під шапкою.

- [ ] Тести (`HudFormPage.test.tsx`): (1) `narrow` за замовчуванням має `max-w-3xl`, `side` не рендериться; (2) `wide` рендерить `<aside aria-label="Перегляд">` з `side` і рівно одну кнопку з `actions`; (3) `<button type="submit" form="f">` в `actions` сабмітить `<form id="f">` у `children` (`fireEvent.click` → `onSubmit` викликано); (4) `header.back` дає посилання з `href`; (5) клік «Перегляд» відкриває діалог із вмістом `side`. `ds-utilities.test.ts`: `hud.css` містить `.ds-fields`, `.ds-fields--num`, `.ds-span`, `.ds-list-grid`, `.ds-setting-rows`, `.hud-form-wide`.
- [ ] Реалізація + міграція викликів (`title={a} aside={b}` → `header={{ title: a, aside: b }}`, механічно, без інших змін).
- [ ] `pnpm test:run components/hud` + тести мігрованих файлів, які вже існують (`pnpm test:related <змінені файли>`); `pnpm exec tsc --noEmit`.
- [ ] Коміт `feat(hud): wide form page layout and ds field utilities`.

### T0.2 Рейка вкладок, `HudTab.badge/wide/group/hidden`, `HudForm.tabStyles`

**Файли:** `components/hud/form/HudTabs.tsx`, `HudForm.tsx`, `reveal-invalid-tab.ts` (за потреби), `components/rules/RulesForm.tsx` (один рядок: `triggerClassName="flex-none px-3"` → `tabStyles={{ trigger: 'flex-none px-3' }}`). Тести: `components/hud/form/__tests__/{HudTabs,HudForm}.test.tsx`.

**Інтерфейс:**
```ts
export interface HudTab<T extends string = string> {
    id: T; label: ReactNode; content: ReactNode; invalid?: boolean; icon?: ReactNode;
    badge?: ReactNode;   // counter after label
    wide?: boolean;      // active → form gets data-wide-tab=true (side hidden by CSS)
    group?: string;      // rail only: presentation heading when group changes
    hidden?: boolean;    // trigger not rendered, panel stays mounted (rules filter)
}
type HudTabsStyles = {
    content?: string; trigger?: string;
    variant?: 'default' | 'sheet' | 'rail';
    rail?: { from?: 'lg' | 'xl'; mobile?: 'row' | 'list' };  // default { from:'xl', mobile:'row' }
};
// HudForm: triggerClassName → tabStyles?: HudTabsStyles; actions?: ReactNode (optional) — still 10 props
```
**Рішення:** у режимі `rail` нижче брейкпоінта `from` вкладки — звичайний горизонтальний ряд (`mobile:'row'`) або повноширинний вертикальний список (`mobile:'list'`, для змісту правил). Radix `orientation` береться з `useMediaQuery` (`lib/hooks/common`): `vertical`, коли рейка вертикальна. `TabsList` отримує `data-slot="hud-tabs-list"`, обгортка панелей — `data-slot="hud-tabs-panels"`, корінь `Tabs` — `data-slot="hud-tabs"`. `HudForm` ставить на `<form>` атрибути `data-layout={variant==='rail'?'rail':undefined}` і `data-wide-tab`. Тригер рейки: hover `bg-hud-raised`; активний — `shadow-[inset_2px_0_0_var(--hud-accent)] text-hud-ink`. Якщо `actions` не передано, `ActionBar` не рендериться, а `error` показується як `<p role="alert">` над вкладками.

- [ ] Тести: (1) `variant:'rail'` при `matchMedia(min-width:1280px)=true` → `tablist` має `aria-orientation="vertical"`; ↓ переводить фокус на наступну вкладку; (2) `badge` рендериться в тригері; (3) активна вкладка з `wide` → `form[data-wide-tab="true"]`; (4) `hidden: true` — тригера немає, панель у DOM; (5) `group` — заголовок `role="presentation"` між групами; (6) `HudForm` без `actions` не рендерить `ActionBar`, а `error="x"` дає `role="alert"` перед `tablist`; (7) невалідний `required` input на неактивній вкладці під `rail` → submit перемикає на неї вкладку (наявна поведінка `useRevealInvalidTab`); те саме — для вкладки з `hidden`.
- [ ] Реалізація, `pnpm test:run components/hud/form components/rules/__tests__/rules-form.test.tsx`.
- [ ] Коміт `feat(hud): rail tabs, tab badge/wide/group/hidden, HudForm.tabStyles`.

### T0.3 `HudFormMenu`, `HudSegmented`, `useRovingIndex`, ключі `common`, скрипт вимірювання i18n

**Файли:** створити `components/hud/HudFormMenu.tsx`, `components/hud/HudSegmented.tsx`, `lib/hooks/common/useRovingIndex.ts`, `scripts/shared/i18n-ns-gzip.ts`; змінити `components/hud/index.ts`, `lib/hooks/common/index.ts`, `components/hud/page/HudChipTabs.tsx` (експорт `HUD_CHIP_CLASS`, `HUD_CHIP_ACTIVE_CLASS` без зміни поведінки), `messages/{uk,en}/common.json`. Тести: `components/hud/__tests__/{HudFormMenu,HudSegmented}.test.tsx`, `lib/hooks/common/__tests__/useRovingIndex.test.tsx`.

```ts
export function useRovingIndex(o: {
    count: number; active: number; onMove: (index: number) => void; cols?: number; loop?: boolean;
}): { tabIndex: (i: number) => 0 | -1; onKeyDown: (e: KeyboardEvent) => void; itemRef: (i: number) => (el: HTMLElement | null) => void }
// ←/→ ±1, ↑/↓ ±cols (cols=1 → ↑/↓ ±1), Home/End; focuses the new item, then onMove(i)

export interface HudFormMenuItem { label: ReactNode; onSelect: () => void; tone?: 'danger'; confirm?: ConfirmOptions; disabled?: boolean }
export function HudFormMenu(p: { items: HudFormMenuItem[]; label?: string }): JSX.Element  // label default t('actions.more')

export function HudSegmented<T extends string>(p: {
    id: string; value: T | null; options: { value: T; label: ReactNode }[];
    onValueChange: (v: T) => void; label: string; disabled?: boolean;
}): JSX.Element   // role=radiogroup aria-label, items role=radio aria-checked, roving
```
**Рішення:** `HudFormMenu` — `HudIconButton` («⋯», `aria-label=label`) + `DropdownMenu` з `components/ui/dropdown-menu`. Пункт із `confirm` спершу питає `useConfirm()(confirm)` і викликає `onSelect` лише після `true`. `tone:'danger'` дає `text-hud-danger`. Пункт `confirm` не потрібен, якщо дія вже сама питає підтвердження: так, `dmActions.remove()` вже має `useConfirm` у `useDmCharacterEditor`, тож подвійного confirm не робити. Скрипт `i18n-ns-gzip.ts` друкує `uk`/`en` gzip KB (level 9, як у `scope-size.test.ts`) через `loadMessages`.

- [ ] Тести: `useRovingIndex` — →/←, ↓ з `cols:3` (0→3), Home/End, межі без `loop`. `HudFormMenu` — пункт без confirm викликає `onSelect`; з confirm і відповіддю `false` — не викликає, з `true` — викликає (рендер у `ConfirmProvider`, `components/ui/__tests__/render-with-confirm.tsx`). `HudSegmented` — `role=radiogroup`, клік → `onValueChange`, → переводить фокус і вибір, `aria-checked` на активному, `disabled` блокує.
- [ ] Реалізація, `pnpm test:run components/hud lib/hooks/common/__tests__/useRovingIndex.test.tsx`; `pnpm exec tsx scripts/shared/i18n-ns-gzip.ts common` (дельта ≤ 0,10).
- [ ] Коміт `feat(hud): form menu, segmented radiogroup, roving index hook`.

---

## L1 — форми бібліотеки

**Спільний рецепт для кожної форми (T1.1–T1.4):**
1. `HudFormPage width="wide" header={{ title, aside, back: { href: \`/campaigns/${campaignId}/dm/<kind>\`, label: tc('dmSections.<kind>') }, menu }} actions={<>Скасувати / Зберегти form={FORM_ID}</>} side={…}`.
2. `HudForm tabStyles={{ variant: 'rail' }}` без `actions`, з `error`.
3. «Видалити» прибрати з ряду дій і перенести в `menu={<HudFormMenu items={[{ label: tc('actions.delete'), tone: 'danger', onSelect: remove }]} />}`. Якщо хук видалення сам не питає підтвердження — передати `confirm: { …, destructive: true }`.
4. Сітки полів: `grid md:grid-cols-2` → `ds-fields`; числові кластери (КЗ, швидкість, хіти, рівень, CR, дальність) → `ds-fields ds-fields--num`; опис, textarea і списки → `ds-span`. Повторювані редактори (атаки, риси, підкласи, вибори, учасники набору) → `ds-list-grid`. Секції — `HudSection` з `panel`.
5. Edit-форма рендерить `side={<SourceNotes campaignId kind targetId />}`, а сторінка `app/.../page.tsx` прибирає свій `<SourceNotes>`. Create-форма `side` не передає, доки немає перегляду (T1.5).
6. Помилка збереження — через `HudForm.error`, а не в ряду кнопок.

Поля, хуки, схеми й порядок вкладок не змінюються.

### T1.1 Юніт (створення + редагування) + `SourceNotes` (агент A1)
**Файли:** `components/units/form/{UnitEditForm,UnitCreateForm,UnitBasicInfo,UnitStatblockFields,UnitAttacks}.tsx`, `app/campaigns/[id]/dm/units/[unitId]/page.tsx`, `components/content-import/shared/SourceNotes.tsx` (`Disclosure` → `HudSection` без рамки, щоб у бічній колонці виглядати як панель; `defaultOpen` прибрати). Тести: наявні в `components/units/**/__tests__` + новий `components/units/form/__tests__/UnitEditForm-layout.test.tsx`.
- [ ] Тест: «Видалити» є в меню «⋯» (`getByRole('button',{name:'Більше дій'})` → `menuitem` «Видалити»), у ряду дій його немає; submit має `form=`; `SourceNotes` рендериться в `aside` (мок `useSourceNotes`).
- [ ] Реалізація за рецептом; атаки — `ds-list-grid`.
- [ ] `pnpm test:run components/units components/content-import/shared` → коміт `feat(units): wide workbench form`.

### T1.2 Закляття (створення + редагування) + артефакт (A1)
**Файли:** `components/spells/form/forms/{SpellCreateForm,SpellEditForm,SpellFormBody}.tsx`, `components/artifacts/ArtifactForm.tsx`, `app/campaigns/[id]/dm/{spells/[spellId],artifacts/[artifactId]}/page.tsx`. Вкладки артефакта, що залежать від слота, вже умовні — це лише перевірити.
- [ ] Тест (додати до наявних тестів форм): edit-форма закляття рендерить `aside`; `ArtifactForm` — 6 тригерів рейки без переносу (`tablist` має `aria-orientation="vertical"` при xl).
- [ ] Реалізація, `pnpm test:run components/spells/form components/artifacts` → коміт.

### T1.3 Раса, риса, передісторія, клас (агент A2)
**Файли:** `components/races/RaceEditForm.tsx`, `components/feats/FeatForm.tsx`, `systems/d20/ui/content/backgrounds/BackgroundForm.tsx`, `systems/d20/ui/content/classes/ClassForm.tsx`, сторінки `app/campaigns/[id]/dm/{races/[raceId],feats/[featId],backgrounds/[backgroundId],classes/[classId]}/page.tsx`, `scripts/shared/ui-layers.mjs` (+ `'@/components/content-import/shared/SourceNotes'` у `SYSTEM_UI_KIT`).
**Рішення:** вкладки «Таблиця» і «Мапа» класу мають `wide: true`. Підкласи й риси класу, а також вибори передісторії й риси переходять на `ds-list-grid`.
- [ ] Тест (`systems/d20/ui/content/classes/__tests__/ClassForm-layout.test.tsx`): активна вкладка таблиці → `form[data-wide-tab="true"]`; на інших вкладках атрибута немає.
- [ ] Реалізація; `pnpm exec eslint scripts/shared/ui-layers.mjs systems/d20/ui/content` (зона пропускає `SourceNotes`); `pnpm test:run` наявних тестів цих форм → коміт.

### T1.4 Скіл, гілка, набір артефактів (A2)
**Файли:** `systems/skilltrees/ui/content/skills/form/SkillCreateForm.tsx`, `systems/skilltrees/ui/content/skills/EditSkill.tsx`, `systems/skilltrees/ui/content/main-skills/MainSkillEditForm.tsx`, `systems/artifactsets/ui/content/{ArtifactSetForm,ArtifactSetsPage}.tsx`. Учасники набору переходять на `ds-list-grid`. `side` = лише `SourceNotes` (перегляд — P2).
- [ ] Наявні тести зелені (`pnpm test:run systems/skilltrees systems/artifactsets`) → коміт `feat(library): wide forms for system content`.

### T1.5 Перегляди партії 1: закляття, артефакт, клас (агент A7, після T3.1)
**Файли:** створити `lib/utils/spells/reference-preview.ts`, `lib/utils/artifacts/reference-preview.ts`, `lib/utils/characters/classes/reference-preview.ts` + `__tests__/` поруч; змінити `SpellCreateForm`/`SpellEditForm`, `ArtifactForm`, `ClassForm`; `scripts/shared/ui-layers.mjs` (+ `'@/components/campaigns/info/detail/ClassReferenceDetail'`).
```ts
toSpellReferencePreview(data: <тип form.data хука форми закляття>, ctx: { id?: string; groupName?: string | null }): SpellForReference
toArtifactReferencePreview(data: <тип form.data ArtifactForm>, ctx: { id?: string; setName?: string | null }): ArtifactForReference
toClassReferencePreview(data: <тип form.data ClassForm>, ctx: { id?: string }): ClassForReference
```
**Рішення:** `side` = `<HudSection title={tc('ui.previewTitle')} panel><XReferenceDetail campaignId item={useDeferredValue(preview)} isDM={false} /></HudSection>` + під ним `SourceNotes` (лише для edit). `isDM={false}` — щоб не було ✎. Відсутні в формі поля (власники артефакта, `groupName`) отримують порожні значення.
- [ ] Тести адаптерів: мінімальні дані форми → валідний `*ForReference` (назва, рівень/школа, `owners: []`); порожній опис → `''`, а не `undefined`; дані з ефектами → ефекти в результаті.
- [ ] Реалізація; `pnpm test:run lib/utils/spells lib/utils/artifacts lib/utils/characters/classes` → коміт.

### T1.6 Перегляди раси, риси, передісторії наявними картками (A7)
**Файли:** `RaceEditForm.tsx`, `FeatForm.tsx`, `BackgroundForm.tsx` (лише `side`). Використовуються `components/races/RaceCard.tsx`, `components/feats/FeatCard.tsx`, `systems/d20/ui/content/backgrounds/BackgroundCard.tsx`. Адаптер пишеться лише тоді, коли тип пропа картки ≠ `form.data` (тоді чиста функція поруч у `lib/utils/<domain>/`). `RaceCard`/`FeatCard` для системної `BackgroundForm` не потрібні: вона бере свою `BackgroundCard`.
- [ ] Тест: форма раси рендерить `RaceCard` з поточною назвою з форми (зміна інпуту → оновлений текст у `aside`).
- [ ] Коміт `feat(library): player preview column, batch 1`.

---

## L3 — довідник `/info` «Кодекс»

Тека `components/campaigns/info/` → `layout/`, `rows/`, `detail/` (+ `InfoReferenceClient.tsx` у корені).

### T3.1 `*ReferenceDetail` і `*ReferenceRow` з нинішніх карток (агент A3)
**Файли:** створити `detail/{Spell,Skill,Artifact,Class}ReferenceDetail.tsx`, `detail/ArtifactSetBlock.tsx` (вміст `ArtifactSetReferenceCard`), `detail/AppearanceBlock.tsx`, `rows/{Spell,Skill,Artifact,Class}ReferenceRow.tsx`. Старі `*ReferenceCard` поки лишаються (їх видаляє T3.3). Тести: `components/campaigns/info/detail/__tests__/*.test.tsx`, `rows/__tests__/rows.test.tsx`.
```ts
XReferenceDetail(p: { campaignId: string; item: XForReference; isDM: boolean })
XReferenceRow(p: { item: XForReference; selected: boolean; onSelect: () => void })   // + rowProps from ReferenceList via cloneElement/render fn
AppearanceBlock(p: { text: string | null; canEdit: boolean; onSave: (text: string) => Promise<unknown> })
```
**Рішення:** тіло = нинішній `AccordionContent` без `AccordionItem`. Шапка: іконка 64 (`EntityIcon`), назва `hud-title`, мета-чипи; секції «Вигляд», «Механіка», «Ефекти», «Як виглядає в бою» (`SpellBattlePreview`), «У кого», «Набір». У рядку 56 px: іконка 32, `hud-sc` 15, мета-рядок, теги/аватари ≤ 3, шеврон; `[content-visibility:auto] [contain-intrinsic-size:56px]`. Вибраний рядок — `aria-current="true"`, `shadow-[inset_2px_0_0_var(--hud-accent)] bg-hud-panel-2`. Рядки — `HudButton` (сирий `<button>` заборонений). ДМ-редагування вигляду — наявні `useUpdateSpellAppearance` / `useUpdateSkillAppearance` (і аналоги, якщо вони є для артефакта/класу; якщо немає — ✎ там немає).
- [ ] Тести: `SpellReferenceDetail` для ДМ — ✎ → textarea → «Зберегти» викликає мутацію з новим текстом; для гравця кнопки ✎ немає. Рядок — `aria-current` лише у вибраного, клік → `onSelect`.
- [ ] `pnpm test:run components/campaigns/info` → коміт.

### T3.2 `ReferenceLayout`/`Rail`/`List` + `useReferenceSelection` (A3)
**Файли:** `layout/{ReferenceLayout,ReferenceRail,ReferenceList}.tsx`; `lib/hooks/campaigns/useReferenceSelection.ts` + барель `lib/hooks/campaigns/index.ts`; тести `layout/__tests__/ReferenceList.test.tsx`, `lib/hooks/campaigns/__tests__/useReferenceSelection.test.tsx`.
```ts
ReferenceLayout(p: { rail: ReactNode; list: ReactNode; detail: ReactNode; detailOpen: boolean; onDetailClose: () => void; detailTitle: ReactNode })
ReferenceRail(p: { filters: ReferenceFilters; counts: Record<SectionTab, number> })
ReferenceList<T>(p: { groups: { key: string; title: ReactNode; accent?: string; items: T[] }[]; selected: string | null;
    onSelect: (key: string) => void; renderRow: (item: T, row: { selected: boolean; onSelect: () => void; tabIndex: 0 | -1; ref: (el: HTMLElement | null) => void }) => ReactNode;
    keyOf: (item: T) => string; limit?: number; onShowAll?: () => void })   // 7 props
type RefKey = `${'spell' | 'skill' | 'artifact' | 'class'}:${string}`;
useReferenceSelection(o: { visible: RefKey[]; section: { value: SectionTab; set: (s: SectionTab) => void }; autoSelect: boolean }):
    { selected: RefKey | null; select: (key: RefKey) => void; clear: () => void; isOpen: boolean }
```
**Рішення:** URL `?s=<section>&e=<kind>:<id>`. На ≥ lg (`useIsMobile() === false`) — `router.replace(url, { scroll: false })`, на телефоні — `router.push`, щоб «назад» закривав sheet (`isOpen` = `e` присутній). `autoSelect` (xl) вибирає перший видимий запис **без** запису в URL. Якщо вибраний запис зникає з `visible` (фільтр), вибір скидається. Розкладка: xl — `grid-cols-[220px_minmax(0,1fr)_440px]`; lg — ряд `HudChipTabs` + кнопка «Фільтри» (`Popover`), `list | detail 400`; < lg — список, а деталь у `ResponsiveDialog hud` (`detailOpen`). Пошук липкий, `/` фокусує його (через наявний `shortcut-guard`). Лічильник знайденого має `aria-live="polite"`. Групи — липкі підзаголовки, без згортання. Roving-навігація — `useRovingIndex`.
- [ ] Тести хука: (1) `select('spell:1')` на desktop → `replace` з `e=spell%3A1`; на mobile → `push`; (2) `autoSelect` вибирає перший і не викликає `replace`; (3) початковий URL `?s=spells&e=spell:2` → `section.set('spells')` і `selected='spell:2'`; (4) `visible` без вибраного → `selected=null`. Тести `ReferenceList`: групи рендерять заголовки; `limit=2` + «Показати всі» викликає `onShowAll`; ↓ переводить фокус на наступний рядок; вибраний має `aria-current`.
- [ ] `pnpm test:run components/campaigns/info lib/hooks/campaigns/__tests__/useReferenceSelection.test.tsx` → коміт.

### T3.3 `InfoReferenceClient` + сторінка + i18n (агент A6)
**Файли:** `components/campaigns/info/InfoReferenceClient.tsx`; видалити `ReferenceGroupSection.tsx`, `ReferenceSectionAccordion.tsx`, `ReferenceSearchBar.tsx` (фільтри переїжджають у `ReferenceRail`), `*ReferenceCard.tsx`; `app/campaigns/[id]/info/page.tsx` (`HudPage` без `width="md"` → `lg`); `lib/hooks/campaigns/useInfoReferenceFilters.ts` (прибрати `filtersOpen`, якщо після змін не використовується) + його тест; `messages/{uk,en}/dashboard.json`; `app/campaigns/[id]/info/__tests__/page.test.tsx`.
**Рішення:** секція «Усі» — один список із секціями-заголовками, по 6 записів і «Показати всі N →» (перемикає секцію). Пошук у «Усі» показує всі збіги без обрізання. Якщо результатів 0 — у деталі `EmptyState` «Нічого не знайдено» + «Скинути фільтри». Перед видаленням ключів `grep -rn "reference\.\(jump\|count\|shown\)" components app lib` має повернути 0.
- [ ] Тести `page.test.tsx`: рендер без акордеонів (`queryByRole('button',{expanded})` — немає); рядок закляття → деталь з назвою; гравець не бачить ✎. Для i18n: `pnpm test:run lib/i18n/__tests__/label-keys-dashboard.test.ts lib/i18n/__tests__/parity.test.ts`; `i18n-ns-gzip.ts dashboard` → дельта ≤ 0.
- [ ] Коміт `feat(info): codex list + detail reference`.

---

## L4 — «Книга правил» `/dm/rules`

### T4.1 Групи розділів + `dirtyKeys`/`resetKey` (агент A4)
**Файли:** `lib/utils/rules/sections.ts` (`RulesSection.group?: RulesGroup`), `lib/utils/rules/core-sections.ts`, `systems/{d20,wfrp,morale,heroscaling,deathsaves,opportunity,inspiration,retaliation}/rules/sections.ts` (лише поле `group`); створити `lib/utils/rules/section-groups.ts` + `lib/utils/rules/__tests__/section-groups.test.ts`; `lib/hooks/campaigns/useRulesForm.ts` + `__tests__/useRulesForm.test.tsx`.
```ts
export type RulesGroup = 'system' | 'combat' | 'characters' | 'world';
export function groupSectionKeys(keys: readonly string[], sections: SectionMap): { group: RulesGroup | 'other'; keys: string[] }[]
// order: system, combat, characters, world, other; empty groups dropped; key order preserved
// useRulesForm(campaignId, opts?: { initial?: Ruleset }) → + dirtyKeys: readonly (keyof Ruleset)[]; resetKey(key): void
```
**Розподіл:** `system` — system; `combat` — critical(s), initiative, saves, concentration, conditions, actions, defaultAttacks, deathSaves, morale; `characters` — classes, formulas, heroScaling, advancement; `world` — outOfCombat, encounters, items, spellIngredients, tables, edition. Виконавець звіряє з реальними ключами `allSections()`. Ключ без групи потрапляє в `other`. Ядро не називає систем: кожен модуль задає `group` у власному `sections.ts`.
- [ ] Тести: `groupSectionKeys` — розділ без `group` → `other`; порожні групи відкидаються; порядок збережено. `useRulesForm` — `set` → `dirtyKeys` містить ключ; `resetKey` прибирає лише його; `initial` → `form` готовий без запиту (`enabled:false`).
- [ ] `pnpm test:run lib/utils/rules lib/hooks/campaigns/__tests__/useRulesForm.test.tsx lib/__tests__/system-contract.test.ts lib/__tests__/d6pool-battle.test.ts` → коміт.

### T4.2 `RulesForm` → зміст / розділ / бічна колонка (A4)
**Файли:** `components/rules/RulesForm.tsx`, `components/rules/RulesSection.tsx` (контейнер `ds-panel ds-setting-rows`, бейдж «змінено», «Скинути розділ»), створити `components/rules/RulesSide.tsx` (склад системи, змінені розділи зі «Скинути», `form.hint`), `components/rules/RulesTocFilter.tsx`; `app/campaigns/[id]/dm/rules/page.tsx` (лише недемо-гілка: `HudFormPage width="wide"`, а `actions` прокидає `RulesForm`) — див. **Рішення**. Тести: `components/rules/__tests__/rules-form*.test.tsx`.
**Рішення:** `RulesForm` сам рендерить `HudFormPage` (сторінка передає лише `campaignId` і заголовок), бо дії (`isDirty`, «Змінено: N») і `side` живуть у хуку форми. Вкладки — `HudForm tabStyles={{ variant:'rail', rail:{ from:'lg', mobile:'list' } }}`. Перша вкладка — «Система й модулі» (`SystemSection` без змін, `group:'system'`). `HudTab.group` — назва групи, `HudTab.badge` — золота крапка для `dirtyKeys`, `HudTab.hidden` — розділ, відсіяний фільтром (`useSearch` з `lib/hooks/common` за `label`/`description`). Фільтр стоїть у `header` `HudTabs`. У шапці сторінки — чип складу «D&D 5e · +Мораль» + «Змінити», який перемикає вкладку на `system`.
- [ ] Тести: (1) зміст має заголовки груп, розділ без `group` — під «Інше»; (2) зміна поля → крапка біля розділу + «Змінено: 1» біля кнопок; «Скинути розділ» прибирає крапку; (3) фільтр «ініц» лишає лише «Ініціатива», панелі решти в DOM; (4) невалідне поле у відфільтрованому розділі → submit відкриває цей розділ.
- [ ] `pnpm test:run components/rules` → коміт `feat(rules): rule book layout`.

### T4.3 Демо лише для читання, `?section=`, i18n (агент A8)
**Файли:** `app/campaigns/[id]/dm/rules/page.tsx` (гілка `isDemo`), `components/rules/RulesForm.tsx` (проп `readOnly`), `components/rules/useRulesSection.ts` (новий презентаційний URL-хук поруч із єдиним читачем — дозволено `ui-layers.md` «Де що лежить»; барель `lib/hooks/campaigns` не чіпаємо, бо ним володіє L3), `messages/{uk,en}/rules.json`.
```ts
useRulesSection(keys: readonly string[]): { section: string | null; setSection: (k: string | null) => void }
// ?section=<key>; desktop replace, phone push; unknown key → null
RulesForm(p: { campaignId: string; title: ReactNode; readOnly?: boolean; initial?: Ruleset })
```
**Рішення:** спершу перевірити, чи `CONTENT_OPERATIONS['rules.get']` пускає демо-гостя. Якщо так — `RulesForm readOnly`. Якщо ні — `page.tsx` передає `initial={parseRules(campaign.rules)}`. Режим `readOnly`: вміст у `<fieldset disabled>`, без дій, банер `rules.page.demoReadOnly`. JSON-гілку `<pre>` і серверний збір `labels` видалити. На телефоні без `?section` показується зміст (`mobile:'list'`, панелі приховано); з `?section` — розділ і «‹ Зміст».
- [ ] Тести: демо → немає `<pre>`, є `fieldset[disabled]` і банер, немає кнопки «Зберегти»; `useRulesSection` — `?section=initiative` → `section='initiative'`; невідомий ключ → `null`; на mobile — `push`. i18n: `label-keys-rules`, `parity`; `i18n-ns-gzip.ts rules` → дельта ≤ 0,12.
- [ ] Коміт `feat(rules): read-only demo and section links`.

---

## L5 — майстер імпорту `/dm/compendium`

Тека `components/content-import/compendium/` → `steps/`, `layout/`, `report/` (≤ 10 файлів у кожній).

### T5.1 `FileDropZone`, крок «Файл», історія (агент A5)
**Файли:** створити `components/common/fields/FileDropZone.tsx` (+ `__tests__/FileDropZone.test.tsx`), `compendium/steps/FileStep.tsx` (з `CompendiumFileStep.tsx`, `git mv`), `compendium/report/CompendiumHistory.tsx` (замість `CompendiumRunsList.tsx`).
```ts
FileDropZone(p: { accept: string; onFile: (f: File) => void; label: ReactNode; hint?: ReactNode;
    file?: { name: string; size: number; meta?: ReactNode } | null; disabled?: boolean; busy?: boolean })   // 7
CompendiumHistory(p: { campaignId: string; wizard: CompendiumImportController })
```
**Рішення:** зона — `ds-inset`, пунктирна рамка `border-dashed border-hud-accent/40`; drag-over і hover — `border-hud-accent`. Сама зона — `HudButton`, Enter/Space відкривають вибір через наявний `FileButton`. Коли файл вибрано, зона стає карткою: назва, розмір (`formatBytes` з `lib/utils/ops/format.ts` — `common` не може імпортувати `lib/utils/ops`, тому функцію перенести в `lib/utils/common/format.ts` і реекспортувати зі старого місця), видання, [Замінити]. Рядок історії: «Імпорт #<6 символів id>» + підсумок із `run.report` + [Відкрити звіт]; пагінація — `PagerNav`. `createdAt` — P2, не робимо.
- [ ] Тести: drop файлу → `onFile`; Enter на зоні відкриває input (spy на `click`); `disabled` ігнорує drop; з `file` показано назву й «Замінити»; історія — рядок без сирого повного id.
- [ ] `pnpm test:run components/common/fields components/content-import` → коміт.

### T5.2 Каркас майстра, рейка, підсумок, перегляд кроку, крок «Категорії» (A5)
**Файли:** створити `compendium/layout/{CompendiumWizardLayout,CompendiumStepRail,CompendiumSummary}.tsx`, `compendium/steps/CategoriesStep.tsx` (з `CompendiumCategories` + `CompendiumMaterials` + `CompendiumAdvanced`, які переїжджають у `steps/`), `lib/hooks/compendium-import/{useCompendiumWizardView,usePreviewExpiry}.ts` + барель + тести, `lib/constants/compendium-import.ts` (файл існує; додати `COMPENDIUM_PREVIEW_TTL_MS = 15 * 60_000`, `token.ts` імпортує константу), `components/common/shell/StepIndicator.tsx` (+ `onSelect?: (i: number) => void`, `max?: number`; недоступні кроки `aria-disabled`).
```ts
useCompendiumWizardView(state: CompendiumImportController['state']): { step: 0|1|2|3|4; setStep: (s: number) => void; maxStep: number }
// maxStep = compendiumStep(state) (move fn from CompendiumSteps.tsx); view auto-advances when maxStep grows; setStep clamps to ≤ maxStep
usePreviewExpiry(preview: unknown | null): { expiresAt: string | null; expired: boolean }   // stamp on null→preview, wraps useExpiry
CompendiumWizardLayout(p: { rail: ReactNode; step: ReactNode; summary: ReactNode; embedded?: boolean })
CompendiumStepRail(p: { wizard: CompendiumImportController; view: WizardView })
CompendiumSummary(p: { wizard: CompendiumImportController; view: WizardView; expiry: PreviewExpiry })
```
**Рішення:** розкладка — `@container`: ≥ 72rem `grid-cols-[240px_minmax(0,1fr)_340px]`, 48–72rem — `StepIndicator` угорі + `крок | підсумок 300`, < 48rem — один стовпець, а підсумок стає липким нижнім баром (у діалозі — у `footer`). Основна кнопка підсумку за кроком: Файл → «Далі» (недоступна без файлу), Категорії → «Перевірити» (`runPreview`), Перевірка → «Далі», Підтвердження → «Імпортувати» (`disabled` без `rights` або коли не `readyToImport`; при `expired` — «Перевірити знову»), Результат → «Новий імпорт» (`close`). Пресети категорій — `HudSegmented` (без активного, якщо вибір не збігається з жодним). Якщо `preview` існує і `view.step === 1`, показується notice `wizard.resetNotice`. Внутрішній `ActionBar` категорій прибирається. Зміна кроку — `motion-rise` з напрямом через `useTabDirection`.
- [ ] Тести: `useCompendiumWizardView` — автоперехід 0→1 після вибору файлу, 1→2 після preview; `setStep(4)` при `maxStep=2` → 2. `usePreviewExpiry` — fake timers: після 15 хв `expired=true`. `CompendiumSummary` — підпис кнопки на кожному кроці; без прав «Імпортувати» `disabled`; `expired` → «Перевірити знову» викликає `runPreview`. Повернення до категорій із preview → notice видно.
- [ ] `pnpm test:run lib/hooks/compendium-import components/content-import components/common/shell` → коміт.

### T5.3 Перевірка, підтвердження, результат, вбудований режим, i18n (агент A9)
**Файли:** `compendium/report/{CompendiumVerdict,CompendiumReportTabs}.tsx` (з `CompendiumReport.tsx`; `CompendiumDependencies` без зовнішнього `Disclosure`), `compendium/steps/{CheckStep,ConfirmStep,ResultStep}.tsx`, `compendium/CompendiumImport.tsx` (композиція + `HudFormMenu` «Почати заново» з `confirm`, якщо є preview/result), видалити `CompendiumSteps.tsx`, `CompendiumProgress.tsx` (фаза → `role="status"` у заголовку кроку), `components/content-import/ContentImportWizard.tsx`, `app/campaigns/[id]/dm/compendium/page.tsx`, `messages/{uk,en}/compendium.json`, тести `CompendiumImport.test.tsx`, `CompendiumSteps.test.tsx` (→ видалити/перенести), `CompendiumProgress.test.tsx` (→ видалити/перенести), `report/__tests__/*`, `components/content-import/__tests__/ContentImportWizard.test.tsx`.
```ts
CompendiumVerdict(p: { report: CompendiumReport; blockerActions?: ReactNode })
CompendiumReportTabs(p: { campaignId: string; report: CompendiumReport; committed?: boolean; initialTab?: 'records' | 'deps' | 'sources' | 'media' })
```
**Рішення:** підвкладки — `HudChipTabs` з кнопками. Якщо є блокери або непов'язані залежності, `initialTab='deps'`. Посилання з блокера (`DEPENDENCIES_ANCHOR`) перемикає вкладку замість прокрутки. Підтвердження: «Що зміниться» з `report` (categories/coverage), чекбокс прав з accent-золотом (замість `accent-hud-crimson`) і «Перевірка чинна до {time}» / банер «Перевірка застаріла». Результат: заголовок «Імпорт завершено», `CompendiumMediaReport`, ті самі підвкладки з `committed`; сирого runId немає. Вбудований режим (`initialFile`) — без шапки, історії й `OnboardingHint`; підсумок іде в `footer` діалогу.
- [ ] Тести: блокери → активна вкладка «Залежності»; вбудований режим не рендерить історію і `h1`; «Почати заново» з preview питає confirm; результат не містить runId. i18n: `label-keys-compendium*`, `parity`; `i18n-ns-gzip.ts compendium` → дельта ≤ 0,12.
- [ ] `pnpm test:run components/content-import lib/hooks/compendium-import` → коміт `feat(compendium): step-by-step import wizard`.

---

## L2 — «Основне» героя (останнім: A10, потім A11)

### T2.1 `SheetBanner`, чернетка ідентичності, портрет у стязі (агент A10)
**Файли:** створити `components/character-profile/sheet/SheetBanner.tsx`, `components/character-profile/sheet/PortraitDialog.tsx`, `components/character-profile/IdentityDraft.tsx`; змінити `SheetIdentityPanel.tsx` (бере `SheetBanner` і накладає чернетку), `ProfileEditor.tsx` (`IdentityDraftProvider value={form.basicInfo.data}` у режимі редагування), `messages/{uk,en}/characterProfile.json` (`portrait.change`). Тести: `components/character-profile/__tests__/sheet-banner.test.tsx` (оновити), `__tests__/identity-draft.test.tsx` (новий).
```ts
type BannerHero = { name: string; avatar: string | null; raceColor: string | null; raceIcon: string | null; level?: number };
SheetBanner(p: { hero: BannerHero; onPortrait?: () => void; size?: 'sm' | 'lg'; className?: string })
IdentityDraftProvider(p: { value: IdentityDraft | null; children: ReactNode }); useIdentityDraft(): IdentityDraft | null
type IdentityDraft = Partial<Pick<SheetIdentity, 'name' | 'race' | 'subrace' | 'className' | 'subclass' | 'alignment' | 'avatar' | 'level'>>  // назви полів — як у типі sheet.identity
PortraitDialog(p: { open: boolean; onOpenChange: (o: boolean) => void; value: string; onChange: (v: string) => void })
```
**Рішення:** `bannerPalette` переїжджає в `SheetBanner.tsx`. Колір і герб раси беруться зі збережених даних: `options.races` їх не має. Порожнє ім'я в чернетці → ініціал «?», нейтральний колір. З `onPortrait` портрет — `HudButton` з hover/focus-затемненням і підписом `portrait.change` (порожній — `portrait.add`). `PortraitDialog` = `ResponsiveDialog hud` + `ImageUpload` (`maxSide` 1200) і лише змінює поле форми.
- [ ] Тести: без `onPortrait` — портрет не кнопка; з ним — кнопка з підписом; у редакторі зміна інпуту імені → шапка показує нове ім'я; клік по портрету → діалог з `ImageUpload`.
- [ ] `pnpm test:run components/character-profile/__tests__/sheet-banner.test.tsx components/character-profile/__tests__/identity-draft.test.tsx` → коміт.

### T2.2 `AlignmentGrid` і переклад світоглядів (A10)
**Файли:** створити `lib/utils/characters/alignment.ts` (+ `__tests__/alignment.test.ts`), `lib/hooks/characters/useAlignmentLabel.ts` (+ барель), `components/characters/basic/AlignmentGrid.tsx` (+ тест); змінити `messages/{uk,en}/gameTerms.json`, місця показу: `SheetIdentityPanel.tsx` (рядок «хто»), `components/units/MonsterStatblock.tsx`, `components/characters/player-draft/DraftBasicSection.tsx` (підписи опцій), `systems/wfrp/ui/creation/IdentityStep.tsx` (підписи опцій з `ALIGNMENTS`). `UnitStatblockFields` — це вільний `Input`, лишається як є.
```ts
export type AlignmentKey = 'lawfulGood' | 'neutralGood' | 'chaoticGood' | 'lawfulNeutral' | 'trueNeutral' | 'chaoticNeutral' | 'lawfulEvil' | 'neutralEvil' | 'chaoticEvil';
alignmentKey(value: string | null | undefined): AlignmentKey | null   // case/space-insensitive match on ALIGNMENTS
alignmentLabelKey(value: string, form: 'name' | 'short'): string | null   // 'alignments.lawfulGood.name'
useAlignmentLabel(): (value: string | null | undefined, form?: 'name' | 'short') => string   // fallback: raw string, '' for null
AlignmentGrid(p: { id: string; value: string | null; onChange: (v: string | null) => void; allowNone?: boolean; noneLabel?: ReactNode })
```
**Рішення:** зберігаються канонічні англійські рядки `ALIGNMENTS`. Клітинка — `OptionButton role="radio" variant="form"` з коротким підписом; повна назва — у `aria-label`/`title`. Roving — `useRovingIndex({ cols: 3 })`. На телефоні клітинки 44 px. uk: Законно-добрий/ЗД, Нейтрально-добрий/НД, Хаотично-добрий/ХД, Законно-нейтральний/ЗН, Істинно нейтральний/Н, Хаотично-нейтральний/ХН, Законно-злий/ЗЗ, Нейтрально-злий/НЗ, Хаотично-злий/ХЗ. en: Lawful Good/LG … Chaotic Evil/CE.
- [ ] Тести: `alignmentKey` для 9 значень + `'any alignment'` → `null`; `useAlignmentLabel` → uk-назва і сирий fallback; `AlignmentGrid` — 9 `radio` + «Без», клік → `onChange('Lawful Good')`, «Без» → `onChange(null)`, ↓ з 0 фокусує 3, `aria-checked` на вибраному; `MonsterStatblock` з `'Chaotic Evil'` показує «Хаотично-злий». `label-keys-gameTerms`, `parity`; `i18n-ns-gzip.ts gameTerms` → ≤ 0,20.
- [ ] Коміт `feat(characters): alignment grid and translated alignments`.

### T2.3 Композиція «Основне» + «Видалити» в «⋯» (агент A11)
**Файли:** `components/characters/basic/CharacterBasicInfo.tsx`, `CharacterClassesField.tsx`, `BasicPanel.tsx`, `components/character-profile/tabs/BasicEditTab.tsx`, `components/character-profile/ProfileEditor.tsx` (`HudFormMenu` у слоті `actions` перед Скасувати/Зберегти), тести `components/characters/basic/__tests__/CharacterBasicInfo.test.tsx`, `components/character-profile/__tests__/*editor*.test.tsx`.
**Рішення:** секцію «Портрет» прибрати повністю (і з `NewCharacterForm`, де вона приходить через `CharacterBasicInfo`). Картки — `@container` сітка `@[56rem]:grid-cols-2`: «Особа» (ім'я `hud-title text-xl required` на всю ширину; Тип — `HudSegmented`; «Гравець» лише для героя гравця) | «Походження» (раса/підраса `ds-fields`, `AlignmentGrid allowNone`). «Клас і рівень» займає всю ширину: рядки `CharacterClassesField` (клас | підклас | степер | кістка | ✕), підсумок у футері, «Перейти на класи» — у слоті дії заголовка `BasicPanel`. Легасі-режим — `ds-fields ds-fields--num`. Тайл «Хіти» (`CharacterHpPreview` у `ds-inset`) стоїть праворуч від «Клас і рівень» при ≥ 56rem. Якщо для тайла `CharacterBasicInfo` потребував би 8-го пропса — передати його через наявний об'єктний проп (`slots`/`hide`-подібний) або рендерити в `BasicEditTab` у тій самій сітці. «Видалити героя» прибирається з `BasicEditTab` і стає пунктом `HudFormMenu` (`tone:'danger'`, без `confirm`: `dmActions.remove()` уже питає). Поля, `hide.*`, `isPlayerView`, `classMode` не змінюються.
- [ ] Тести: немає тексту «Портрет» ні в редакторі, ні в новому герої; тип — `radiogroup` з двома `radio`; «Видалити» є лише в меню «⋯»; світогляд — `radiogroup` з 10 опціями.
- [ ] `pnpm test:run components/characters/basic components/character-profile` → коміт.

### T2.4 `NewCharacterForm` на `wide` зі стягом ліворуч (A11)
**Файли:** `components/characters/NewCharacterForm.tsx` + тест `components/characters/__tests__/NewCharacterForm*.test.tsx`.
**Рішення:** `HudFormPage width="wide"` без `side`. `children` = `<div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">` зі `SheetBanner size="lg" sticky onPortrait` і `HudForm` з горизонтальними вкладками (без рейки). На < lg стяг 104 px стоїть поруч з іменем угорі. Портрет змінюється лише через стяг (`PortraitDialog`). Заглушка «?» і нейтральний колір — поки ім'я й раса порожні.
- [ ] Тести: стяг з «?» при порожньому імені; клік по портрету → діалог; секції «Портрет» немає; submit і далі створює героя (наявний тест зелений).
- [ ] Коміт `feat(characters): new hero form on workbench with banner`.

---

## Інтеграція (хвиля 5, контролер)

- [ ] **I.1 Що нового:** запис `{ id: '2026-11-26-codex', date: '2026-11-26', audience: 'all' }` у `lib/onboarding/whats-new.ts` + `whatsNew.2026-11-26-codex.{title,body}` в `messages/{uk,en}/whatsNew.json` («Довідник, імпорт і правила — новий вигляд; широкі форми бібліотеки»). Коміт.
- [ ] **I.2 Гейт** (по одному важкому процесу; спершу `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`): `pnpm exec tsc --noEmit` → `pnpm cycles` → `pnpm lint:dirs --changed main` → `pnpm test:run` (один раз, повний; містить `scope-size`, `route-scopes*`, `props-budget`, `ui-layers`, `cyrillic-comments`, `system-contract`). Застарілі записи ratchet (`props-budget-exempt`, `raw-controls-exempt`, `ui-layers-exempt`) регенерувати командами з `ui-layers.md` — лише в бік зменшення. Якщо бюджет i18n перевищено, ключі скорочує смуга, що вийшла за квоту; бюджет не піднімаємо.
- [ ] **I.3 Огляд:** один агент Opus — фінальний огляд усієї гілки проти спеки й цього плану (`git diff main...HEAD`). Потім один агент Sonnet виправляє знахідки Critical/Important і чинні Minor. Після нього — перезапуск лише зачеплених тестів.
- [ ] **I.4 Живий прогін** (Sonnet-агент; `next build` + `next start`, не `next dev`; локальна копія БД `prodcopy_<suffix>`): ширини 1920 / 1280 / 390 / 320, палітри tavern і parchment. Сценарії: юніт (ред.: «⋯» → Видалити з confirm-скасуванням, SourceNotes збоку), закляття (нове + ред., перегляд оновлюється при введенні), клас (вкладка «Таблиця» ховає бічну), герой «Основне» (ред.: ім'я → стяг, портрет через стяг, сітка світогляду, «⋯» → Видалити) і новий герой, довідник (xl список+деталь, ✎ ДМ; телефон: sheet, «назад» закриває), майстер імпорту (SRD JSON: 5 кроків на 1600 і 390 + вбудований діалог з бібліотеки), правила (xl зміст/розділ/бічна, «Змінено: N», фільтр; телефон: зміст → розділ → «назад»; демо-кампанія лише для читання). Перевірити: рівно одна видима «Зберегти», немає горизонтального скролу на 320. Таблиця прогресу — у звіті агента.
- [ ] **I.5 /simplify** — 1 агент на diff гілки; потім `pnpm test:related` на змінених ним файлах.
- [ ] **I.6 Документація:** `docs/architecture/ui-layers.md` (каркас `HudFormPage wide`, `.ds-fields*`/`.ds-list-grid`/`.ds-setting-rows`, `HudTabs` rail, `HudFormMenu`, `HudSegmented`, `useRovingIndex`, `FileDropZone`, два нові пункти `SYSTEM_UI_KIT`); `.claude/rules/components.md` (рядки kit-таблиці: segmented → `HudSegmented`, меню дій форми → `HudFormMenu`); `docs/STATUS.md`; `git mv` спеки й плану в `docs/archive/superpowers/` у merge-коміті. Злиття в main — лише за згодою власника.

## Самоперевірка плану проти спеки

- §0 → T0.1–T0.3 · §1 → T1.1–T1.6 (скіли/юніти: перегляд — P2, поза планом) · §2 → T2.1–T2.4 · §3 → T3.1–T3.3 · §3b → T5.1–T5.3 (P2 `createdAt`, «Відкрити бібліотеку <вид>» — поза планом) · §4 → T4.1–T4.3 · §6 живий прогін → I.4 · whats-new/docs → I.1, I.6.
- Ctrl/⌘+S (P2 спеки) і «Копіювати посилання» в деталі (P2) — не робимо.
