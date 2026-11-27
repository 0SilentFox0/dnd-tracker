# Game-style UI Ч8: редизайн нечіпаних сторінок (хвилі) — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** перевести сторінки, яких не торкнулася Ч8a, на DS «вайб таверни»: форми бібліотеки на широкому каркасі «Майстерня», вкладка «Основне» героя, довідник `/info`, майстер імпорту, правила, список і створення битв, «Показ» і «Сценарій» на широких моніторах.

**Architecture:** хвиля 0 додає спільний каркас у `components/hud` (`HudFormPage width`, рейка вкладок, `HudFormMenu`, `HudSegmented`) і `FileDropZone`; три хвилі (= три spec-и) лише компонують і рестайлять наявні домени поверх цього каркасу. Логіка, API, схеми й Pusher-протоколи не змінюються, крім явно названих винятків (розділ «Розбіжності»).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (`@container`, `:has`), Radix Tabs, next-intl (route scopes), TanStack Query, Vitest + happy-dom, `@dnd-kit` (нова залежність, хвиля 3).

**Spec:** три затверджені spec-и (розділ «Рішення власника 2026-11-26» у кожному перекриває решту тексту):
- D-B: [`2026-11-26-sheet-library-compendium-rules-redesign.md`](../specs/2026-11-26-sheet-library-compendium-rules-redesign.md) — хвиля 1 (+ §0 каркас → хвиля 0);
- D-A: [`2026-11-26-dm-battles-and-creation-redesign.md`](../specs/2026-11-26-dm-battles-and-creation-redesign.md) — хвиля 2;
- D-C: [`2026-11-26-show-and-scenario-wide-redesign.md`](../specs/2026-11-26-show-and-scenario-wide-redesign.md) — хвиля 3.

Візуальна мова: [DESIGN.md](../specs/2026-11-25-design-system.md) + «Поправка власника 2026-11-25: вайб таверни» в [Ч8a spec](../specs/2026-11-25-design-system-migration-design.md). Правила кіту — `.claude/rules/components.md`, шари — `docs/architecture/ui-layers.md`.

## Global Constraints

- Акцент — золото: `text-hud-accent-fg`, `border-hud-accent`, `bg-hud-accent text-hud-accent-ink`; малиновий (`hud-crimson*`, `hud-hp*`) лише HP, шкода, небезпека, деструктив, помилки. Основна `Button` — золота. Жодного hex у компонентах, жодного `hud-gold` (тест-заборона).
- Поверхні `ds-panel` / `ds-inset` / `ds-raised`; м'яка тінь замість рамки панелі; контроли зберігають 1px рамку.
- Радіуси: контроли `rounded-lg`, панелі/оверлеї `rounded-xl`, таби/чіпи `rounded-md`; сирі `rounded-[Npx]` заборонені.
- Кожен клікабельний елемент має hover (кіт або `ds-interactive`); `prefers-reduced-motion` вимикає зсуви.
- Обидві палітри `tavern` і `parchment` (parchment-акцент — темне золото).
- Компонент ≤ 7 пропсів (ratchet `ratchets/props-budget-exempt.json` лише спадає); колбеки й поля групуються в об'єкти.
- Тека компонентів ≤ ~10 файлів — підтеки за відповідальністю.
- Діалоги — лише `ResponsiveDialog`; підтвердження — `useConfirm()`; сповіщення — `useNotify()`; без сирих `<button|input|select|img>` поза `components/ui`/`components/hud` (ratchet `raw-controls`).
- Компоненти й `app/**` не імпортують `@/lib/api/*` і не роблять `fetch`; дані — хуки `lib/hooks/<domain>` (barrel `index.ts`), ключі запитів — фабрики `keys.ts`.
- Шари: `ui` → `hud` → `common` → домен → `systems/<id>/ui` → `app`; `hud` не імпортує `common`.
- Тексти лише в `messages/{uk,en}/<ns>.json`; кирилиця в коді заборонена (ESLint), нові коментарі англійською (ratchet `cyrillic-comments`), коментарі мінімальні.
- Заборонені зони (не змінювати): `lib/server/**` (винятки — лише два файли з розбіжності R7, якщо власник погодить), `lib/utils/battle/{pipeline,turn}/**`, `components/fx/**`, `components/battle/wizards/**`, `usePlayerTurn`.
- Не чіпати `/Users/silentfox/Work/dnd-tracker` (основна тека); вся робота — у worktree `/Users/silentfox/Work/dnd-tracker-ch8` і його похідних worktree смуг.
- **Тести:** агенти пишуть тести, але **не запускають** (правило власника «тести наприкінці частини»); агент запускає лише `pnpm exec eslint --fix <свої файли>`. Контролер наприкінці кожної хвилі: `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main`. Один повний `pnpm test:run` — наприкінці частини (після хвилі 3).
- Мова документів — українська; ідентифікатори — англійські. Коміти — Conventional Commits англійською.

## Review Focus

1. **Одна кнопка «Зберегти» поза `<form>`** у широких формах: на 390 і 1600 видно рівно одну, `form={FORM_ID}` сабмітить, Enter у полі сабмітить, `disabled` під час збереження — тест у T0.2 і в кожній мігрованій формі (T1.1–T1.6).
2. **Невалідне поле на прихованій вкладці рейки** (`keepMounted` + вертикальна орієнтація на xl) — `useRevealInvalidTab` перемикає вкладку, крапка «невалідно» на пункті рейки — тест у T0.3.
3. **Вільні/старі значення** — світогляд «any alignment»/`null`, битва з учасником, якого видалено, фон мапи не preview-safe, колода зі зниклою сценою — показ без падіння з fallback — тести в T1.8, T2.1, T3.1.
4. **`localStorage`/`sessionStorage` недоступні** (приватне вікно) — режим пульта, розміщення рейки, згортання груп каталогу повертаються до дефолтів без винятку — тести в T2.4, T3.5, T3.7.
5. **Взаємовиключні праві панелі** на ≥1600: AI-панель сценарію і рейка показу; бічна колонка форми і вкладка `wide` — тести в T0.3, T3.7.

---

## 1. Контекст

### 1.1 Що вже зроблено (Ч8a, гілка `feat/game-ui-ch8`)

Токени DS і дві палітри, кодмод золота (ratchet `hud-gold` → заборона), форм-кіт (`components/ui`, `components/hud/{form,page}`, `components/common/fields`), `AccountShell` + профіль/налаштування, двоколонковий лист персонажа й редактор (A24: банер ліворуч, Save/Cancel у шапці, щільніша «Основне» на `ds-panel`), дашборд, `/ops`, золотий акцент (поправка 2026-11-25). Фінальний огляд Opus виправлено (`fea089827`), повний набір 2998/0 після злиття main з route scopes (`577113f4c`). **Не повторювати в цьому плані.**

**Стан гілки:** Ч8a **не злито в main** — чекає «так» власника (див. R1).

### 1.2 Що лишається (цей план)

| Хвиля | Spec | Сторінки |
|---|---|---|
| 0 | D-B §0 + хвости | каркас «Майстерня», `HudSegmented`, `FileDropZone`; хвости STATUS |
| 1 | D-B §1–§4, §3b | форми бібліотеки, «Основне» героя, `/info`, `/dm/compendium`, `/dm/rules` |
| 2 | D-A | `/dm/battles`, `/dm/battles/new`, `/dm/battles/[id]` (форма) |
| 3 | D-C | `/dm/show`, `/dm/show/[deckId]`, `/show` (DM), `/dm/scenario/**`, `/dm/graph` |

### 1.3 Хвости зі STATUS — закрити першими (T0.1)

1. Кнопка «Наступний хід» на 390/540 (`c0b6c40d7`: короткий підпис «Далі», зона 40 px) — у браузері не перевірена.
2. «Перший клік Зберегти після набору не спрацював, другий — так» (recheck I1–I3) — відтворити вручну; якщо відтворюється — виправити.
3. Стенд `ch8_live`: видалити тестового персонажа «ТЕСТ ch8» (HOMM5) і старий бій без `rules.system` (500 `unknownSystem`).
4. STATUS п.(5) «жива перевірка I1–I3» — уже PASS за `.superpowers/sdd/2026-11-25-design-system-migration/progress.md`; оновити рядок.
5. Мінори `final-review.md`, що лягають у хвилі: M9 (h3 під h1 у `BasicPanel`) → T1.8; M10 (graph draft = highlight) → T3.9; `SelectItem` без явного hover → T0.5. Мертвий клас `hud-form-page` у `responsive-dialog` уже прибрано (перевірено `grep`), закрити.

---

## 2. Розбіжності (spec ↔ spec ↔ код) і рішення за замовчуванням

Кожна — з рішенням, яке план бере, доки власник не скаже інакше. Позначені **(?)** — питання до власника.

| # | Розбіжність | Рішення плану |
|---|---|---|
| R1 **(?)** | Завдання каже «Ч8a уже в main», а Ч8a лежить на `feat/game-ui-ch8`, не злито (progress: «ready for merge on owner «так»»). | Рекомендовано: злити Ч8a в main, хвилі вести на новій гілці `feat/game-ui-ch8-waves` у тому ж worktree. Інакше — продовжувати на `feat/game-ui-ch8` (план від цього не змінюється). |
| R2 | `HudFormPage width="wide"`: D-A — `max-w-page` (min(90vw,160rem)) без сітки; D-B — 1440 px сітка рейка/основна/бічна. | `width?: 'narrow' \| 'wide' \| 'page'`: `wide` — за D-B; `page` — для форми битви (D-A), повна ширина без сітки. |
| R3 | D-B §0 зливає `title`+`aside` у `header`, «щоб було ≤ 7». `title, aside, width, actions, side, children, className` = рівно 7. | `header` не вводимо; 28 викликів `HudFormPage` не переписуються. Крихти — частина `title` (ReactNode). |
| R4 | D-B: `HudForm.error` показує `FormAlert` над вкладками; `FormAlert` у `components/common`, а `hud` не може імпортувати `common`. | `HudForm` рендерить власний рядок помилки (`role="alert"`, іконка `AlertCircle`, `text-hud-crimson-fg`) — ту ж розмітку, що в `ActionBar error`. |
| R5 | i18n у spec-ах описано за старою моделлю (`CAMPAIGN_NAMESPACES` із ~0 запасу, перенос `compendium` у route-local, нові `showDm`/`scenarioDm`, перенос `battleSetup` у scope `dm/battles`, правка `core-namespaces.ts`). Після `c4ccb2afe` діють route scopes: `PACKS`/`ROUTE_SCOPES` у `lib/i18n/route-scopes.ts`, бюджети на маршрут у `lib/i18n/test/route-budgets.ts`. `compendium` уже тільки в `contentLibrary`/`contentTransfer`, `battleSetup` — у пакеті `battle`. | Жодних нових неймспейсів і правок `core-namespaces.ts`. Ключі — у наявні ns. Червоний бюджет маршруту — підняти **лише бюджет свого маршруту** до виміряного + 0.5 KB і записати в звіт. |
| R6 | Тіла довідника (`*ReferenceDetail`) мають слугувати переглядом у формах (§1), але їхні тексти — `dashboard.reference.card.*`, а редакторські маршрути (`EDITOR`, `CONTENT_EDIT`, `SYSTEM_EDIT`) не мають пакета `dashboard` → `MISSING_MESSAGE`. | У T1.10 перенести `reference.card.*` у неймспейси виду з пакета `characterSheet` (є і на `/info`, і на всіх редакторах): `spells.reference.*`, `artifacts.reference.*`, `classes.reference.*`, `skills.reference.*`. Сторож `route-scopes.test.ts` має пройти. |
| R7 **(?)** | Заборонена зона `lib/server/**`, а D-A §2.6 вимагає новий `lib/server/battles/list-cards.ts` (raw-запит прев'ю + обличчя + переможець) і `thumb` у select `lib/server/battle-maps/library-service.ts`. | Дозволити лише ці два файли (читання, без змін запису). Переможець — з `battle_events.details->>'battleResult'` (його пише `completeBattle`), без змін пайплайна. Без згоди — T2.1 без прев'ю мапи й переможця (лише колонки `battle_scenes`), T2.7 без `thumb`. |
| R8 | D-A §5 «`useBattleForm` не змінюється» ↔ рішення власника 4 «Створити й почати». | Мінімальне розширення `useBattleForm`: `submit({ start: true })` → після створення `startBattle(campaignId, id, {})` (той самий виклик, що в `useScenarioPlay`) → `router.push`. |
| R9 | D-B: `gameTerms` — «кореневий скоуп (ліміт 20 KB)». Насправді `gameTerms` у `CAMPAIGN_BASE` (ліміт 16.2 KB, виміряно 15.7). 18 ключів світоглядів можуть перевищити. | Короткі ключі (`name`, `short`), виміряти; якщо червоне **(?)** — підняти `CAMPAIGN_BASE_LIMIT_KB` до виміряного + 0.2 з дозволу власника (альтернатива — `characters` ns, але `MonsterStatblock` живе в пакеті `units` без `characters`). |
| R10 | D-B §1: «Кар'єра (wfrp) — перевірити, чи на `HudFormPage`». Не на ньому (`grep`). | Кар'єри поза обсягом хвилі 1. |
| R11 | D-A: «сегмент перемикає `setSide`» — такого методу немає. | Зміна сторони = `actions.addToSide(id, type, side)` для наявного учасника (`placeOnSide` оновлює `side`, зберігає кількість/резерв). |
| R12 | D-C: індикатор збереження — «перевикористати `SaveStatus`». `SaveStatus` прив'язаний до `DraftState` сценарію і змінних книги. | Індикатор колоди — `HudPill` (`● Не збережено` / `Збережено`). |
| R13 | D-C: «⇥ Сховати пульт (H)» ↔ рішення власника 1 «Режим ведучого / Чиста сцена, запам'ятовується». | Один збережений стан `mode: 'host' \| 'clean'`; `H` і перемикач змінюють його. |
| R14 | Ліміт файлів у теці: `components/character-profile/sheet` уже 17, `components/show/editor` 10, `components/show/stage` 9. | Нові файли — у підтеки: `sheet/banner/`, `show/editor/{deck,slides}/`, `show/stage/rail/`. |
| R15 **(?)** | Відомий баг main: WFRP `dm/battles/new` — «No definition for base module: d20» (`useBattleSetup.ts:54` `FALLBACK_SYSTEM_KEY` до завантаження правил; немає `SystemGate` у `dm/battles/layout.tsx`). Живий прогін хвилі 2 на WFRP-кампанії впаде. | Поза обсягом (D-A не міняє `useBattleSetup`); прогін хвилі 2 — на d20/HOMM5. Якщо власник хоче — окрема задача T2.12 (`SystemGate` у layout). |
| R16 | D-C: `@dnd-kit` — нова залежність (рішення власника 2). | Лише агент C1 правит `package.json`/`pnpm-lock.yaml` (`pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`); повний `test:run` наприкінці частини обов'язковий (модульний граф не бачить змін залежностей). |
| R17 | Паралельні смуги однієї хвилі ділять один JSON повідомлень (`battleSetup.json` у хвилі 2, `show.json` у хвилі 3), а агенти в одному worktree конфліктують за `index.lock` і перезаписують файли (досвід Ч8a: «swept WIP»). | Паралельні смуги працюють у власних worktree (`isolation: "worktree"`, гілка `…-<lane>`, `node_modules` — симлінк з основного worktree); контролер зливає смуги в порядку, наведеному в хвилі. Спільний файл дозволено лише той, що названо в таблиці хвилі, і лише різні підоб'єкти. |

---

## 3. Reuse (перевірено в репо 2026-11-26)

| Що | Де | Як використовується |
|---|---|---|
| `HudFormPage`, `HudForm`, `HudTabs`/`HudTab`, `HudSection`, `SheetTabList`, `useRevealInvalidTab` | `components/hud/form/*` | розширюються (хвиля 0), не дублюються |
| `HudPage`, `HudPageHeader`, `HudChipTabs`, `HudPanel`, `HudPill`, `HudSectionTitle`, `HudSheetHeading`, `HudCard`, `HudTile` | `components/hud/page/*` | сторінки списків, фільтри, бейджі, заголовки секцій |
| `HudButton`, `HudIconButton`, `HudToggleChip`, `HudToolbar`, `OptionButton` | `components/hud/*` | кнопки/чіпи; `OptionButton` — радіо-картки, але не сегмент (тому нове `HudSegmented`) |
| `Button`, `ResponsiveDialog`, `Popover`, `Tooltip`, `DropdownMenu`, `Disclosure`, `SideSheet`, `FullscreenOverlay`, `BoundedNumberInput`, `FileButton`, `Tabs`, `ActionBar`, `SelectField`, `SwitchField` | `components/ui/*` | без змін API; `FileButton` — всередині `FileDropZone` |
| `ActionsMenu`, `EntityIcon`, `OptimizedImage`, `DmEntityCard` | `components/common/entity/*` | меню «⋯» карток (битви, колоди), аватари сторін, прев'ю через `next/image` |
| `EmptyState`, `SearchEmptyState`, `LoadingState`, `SectionLoading`, `QueryState`, `ErrorState`, `FormAlert` | `components/common/states/*` | стани сторінок (`FormAlert` — лише в доменах) |
| `SearchInput`, `ImageUpload`, `IconUrlField` | `components/common/fields/*` | пошук, портрет у діалозі банера |
| `StepIndicator`, `PagerNav` | `components/common/shell/*` | рейка майстра імпорту на lg, пагінація історії |
| `PageTransition`, `AccountShell`, `PaletteSwitcher` | `components/layout/*` | без змін; перехід сторінок уже глобальний |
| `useSearch`, `useMediaQuery`, `useTabDirection`, `useSmoothHeight`, `useSwipeTabs`, `useExpiry`, `useConfirm`, `useNotify`, `useFileImport`, `useCoarsePointer`, `useReducedMotion`, `createStorageValue`/`createStorageFlag`/`createSessionFlag`/`useStorageValue` | `lib/hooks/common/*` | фільтри, брейкпоінти з деревом, анімація вкладок, відлік чинності, пам'ять стану з try/catch |
| `useRulesForm` (уже рахує `dirtyKeys`), `useInfoReferenceFilters`, `useCampaignModules` | `lib/hooks/campaigns/*` | `dirtyKeys` лише виставляється назовні |
| `useBattleListSections`, `useDeleteBattleCard`, `useResetBattleCard`, `useDeleteAllBattles`, `useBattleSetup`, `useBattleParticipants`, `useBattleMapEditor`, `useBattleLibraryMap`, `useSetupUnitsFilter`, `useFairBalance`, `useXpBalance`, `useBalanceSuggestions`, `useBattleForm`, `useGridCalibration` | `lib/hooks/battles/**` | без змін (крім фільтра в `useBattleListSections` і `start` у `useBattleForm`) |
| `useBattleMaps`, `useBattleMapMutations().create` | `lib/hooks/battle-maps/*` | сітка бібліотеки, «Зберегти в бібліотеку» |
| `MapEditorScreen`, `EditorSidebar`, `UvttImportSection` | `components/maps/**` | джерело для `MapWorkbench` |
| `MapBackgroundSection`, `MapCellToolsSection`, `GridTypeChoice`, `GridCalibration`, `DoorToolOptions`, `MapMotionPanel`, `SetupParticipantRow`, `AutopickCard`, `BalanceSummary`, `XpBalanceSummary`, `BattleFormBasicInfo` | `components/battle/{setup,map}/**` | вміст нових панелей/складу без переписування |
| `isPreviewSafeBackground` | `lib/utils/battle/grid/map-editor.ts` | фільтр фону прев'ю |
| `battleSceneListSelect`, `listCampaignBattles` | `lib/utils/battle/store/scene-list-select.ts`, `lib/server/battles/list-battles.ts` | база для `loadBattleListCards` |
| `SpellReferenceCard`, `ArtifactReferenceCard`, `ClassReferenceCard`, `SkillReferenceCard`, `ArtifactSetReferenceCard`, `RaceCard`, `FeatCard`, `BackgroundCard`, `SourceNotes` | `components/campaigns/info`, `components/{races,feats}`, `systems/d20/ui/content/backgrounds`, `components/content-import/shared` | тіла → `*ReferenceDetail`; картки — перегляд у формах |
| `useUpdateSpellAppearance` | `lib/hooks/spells` | «✎ Вигляд» у деталі |
| `useCompendiumImport`, `useCompendiumReports`, `useSourceNotes`, `compendiumStep` | `lib/hooks/compendium-import/*`, `components/content-import/compendium/CompendiumSteps.tsx` | майстер — без змін логіки |
| `ALIGNMENTS` | `lib/constants/alignment.ts` | порядок 3×3 |
| `sectionsOfComposition`, `RulesSection` (мета розділу) | `lib/utils/rules/{section-registry,sections}.ts` | + поле `group` |
| `useShowState`, `useShowControl`, `useShowKeys`, `useDeckEditor`, `useDecks`, `useScenarioPages`, `useShowDockExpanded`, `groupIndex` | `lib/hooks/{show,scenario}`, `lib/utils/scenario/index-groups.ts` | пульт, редактор колоди, індекс |
| `ShowTransport`, `ShowDeckStrip`, `ShowWorldControls`, `SoundboardPanel`, `SlideDialog` (внутрішній `SlideForm`) | `components/show/**`, `components/soundboard` | вміст рейки й інспектора |

**Нове і чому:** `HudSegmented` (`HudChipTabs` — це `<nav>` з посиланнями/`aria-pressed`, не `radiogroup` з roving tabindex); `HudFormMenu` (кнопка «⋯» з підтвердженням у шарі `hud`, де `ActionsMenu` із `common` недоступний); `FileDropZone` (у `common`/`ui` зони перетягування немає — перевірено); `MapWorkbench` (виділення з `MapEditorScreen`, щоб форма битви й редактор бібліотеки мали один UX); `loadBattleListCards` (у списку бракує прев'ю/облич/переможця, а тягнути весь `map` заборонено egress-ом); `useReferenceSelection`, `useCompendiumWizardView`, `useBattleSetupView`, `useShowHostMode` (стан нових розкладок, якого раніше не було); `groupDecksByScene`, `nextSceneOf`, `alignmentLabel`, адаптери перегляду (чисті функції без аналогів).

---

## 4. i18n, whats-new, ratchet-и, заборонені зони

**Ключі.** Лише наявні неймспейси (R5). Розподіл:

| Хвиля/смуга | Файли `messages/{uk,en}/` | Маршрути (бюджет у `lib/i18n/test/route-budgets.ts`) |
|---|---|---|
| W0 | `common.json`: `form.preview`, `form.previewTitle` («Як бачать гравці»), `form.more` («Ще дії»), `form.saving` (якщо немає) | root + `CAMPAIGN_BASE` — нетто ≤ +4 короткі ключі; перевірити `scope-size` |
| W1 B3 | `gameTerms.json` (`alignments.<key>.{name,short}`), `characterProfile.json` (`portrait.change`) | `CAMPAIGN_BASE` (R9), `[id]/character*`, `[id]/dm/characters*` |
| W1 B4 | `dashboard.json` (≈+6/−13), `spells/artifacts/classes/skills.json` (перенос `reference.card.*`, R6) | `[id]/info`, редактори контенту |
| W1 B5 | `rules.json` (≈+9) | `[id]/dm/rules` |
| W1 B6 | `compendium.json` (≈+14/−3) | `[id]/dm/compendium`, маршрути з `contentLibrary`/`contentTransfer` |
| W2 A1–A4 | `battleSetup.json` — підоб'єкти `list.*` (A1), `participants.*`/`balance.*` (A2), `map.*` (A3), `form.*` (A4); видалення за D-A §4 | `[id]/dm/battles` |
| W3 C1/C2 | `show.json` — `decksPage.*`/`deckEditor.*`/`addSlides.*` (C1), `rail.*`/`mode.*` (C2) | `[id]/dm/show`, `[id]/show` |
| W3 C3 | `scenario.json` (`indexAside.*`, `play.toRail/toDock`) | `[id]/dm/scenario` |

Правила: тести перевіряють ключі (`label-keys-*.test.ts`, `parity.test.ts`, `untranslated.test.ts`, `route-scopes*.test.ts`); не-React код повертає ключі; перекладені назви світоглядів — лише показ, збережене значення лишається канонічним англійським.

**whats-new.** Один запис у фінальній задачі T4.2: `lib/onboarding/whats-new.ts` → `{ id: '2026-11-ch8-redesign', date: <дата злиття>, audience: 'all' }` + `whatsNew.2026-11-ch8-redesign.{title,body}` в обох мовах (форми бібліотеки на всю ширину, нові довідник/правила/імпорт, список і створення битв, пульт показу, широкий сценарій). Довідка (`lib/onboarding/help`, `messages/*/help.json`): оновити статті, що описують старі вкладки битви/майстер імпорту.

**Ratchet-и й сторожі** (усі лише спадають): `props-budget` (≤ 7; `HudForm` уже у винятках з 10 — не росте), `cyrillic-comments`, `raw-controls`, `ui-layers` (`hud` без `common`), `hud-gold` (заборона), `system-imports-exempt`/`system-literals-exempt` (групи правил задають самі модулі), `import-cycles` (`pnpm cycles`), `route-scopes` (сторожі а/б/в), `system-contract` + `d6pool` (правила).

**Заборонені зони:** див. Global Constraints. `data-tour` і `OnboardingHint` id зберігаються на нових місцях: `battle.list`, `battle.card`, `battle.open`, `dm.battles`, `dm.battle-setup`, `dm.map-walls`, `battle.map-doors`, `show.decks`, `show.deck-card`, `show.start`, `show.present`, `show.stage`, `show.nav`; тур довідника в `lib/onboarding/demo-tours.ts` — оновити селектори в T1.12.

---

## 5. Порядок і розклад агентів

```
W0:  [W0-A хвости, живий]  ‖  [W0-B каркас форм T0.2→T0.4]  ‖  [W0-C T0.5→T0.6]
      └─ контролер: злиття, tsc/cycles/lint
W1:  пакет 1 (≤4 паралельно): B1 форми-1 ‖ B2 форми-2 ‖ B4 довідник ‖ B5 правила
     пакет 2: B3 «Основне» ‖ B6 імпорт
     пакет 3: B7 перегляди (після B1, B2, T1.10)
      └─ контролер: злиття смуг, tsc/cycles/lint → ЖИВИЙ ПРОГІН W1
W2:  A1 список ‖ A2 учасники ‖ A3 мапа (T2.8 після T2.2 A1)  →  A4 оболонка (після A2, A3)
      └─ контролер → ЖИВИЙ ПРОГІН W2
W3:  C1 показ: список/редактор ‖ C2 пульт ‖ C4 граф  →  C3 сценарій (після T3.5)
      └─ контролер → ЖИВИЙ ПРОГІН W3
Фінал: повний test:run → /simplify (1) → Opus-рев'ю → фікс → docs/STATUS/whats-new → злиття з git mv
```

Хвилі 1–3 можуть перекриватися (файли не перетинаються), але живий прогін кожної — окремо; за замовчуванням — послідовно (економія контексту контролера: нова сесія на хвилю, див. `feedback-context-150k`).

**Порядок злиття смуг у гілку хвилі:** W1 — B5, B4, B1, B2, B6, B3, B7; W2 — A1, A2, A3, A4; W3 — C2, C1, C4, C3.

---

## 6. Хвиля 0 — каркас і хвости

### Task T0.1: Хвости STATUS (агент W0-A, Sonnet, браузер)

**Files:** Modify: `docs/STATUS.md` (рядок Ч8a, п.(5)); за потреби `components/character-profile/ProfileEditor.tsx` (лише якщо «перший клік» відтворився).

- [ ] Зібрати стенд: `pnpm build && pnpm start -p 3100` з `DATABASE_URL` на `ch8_live` (не `next dev`). Обидві палітри.
- [ ] Бій на HOMM5/d20: плашка раунду, iframe 390 і 540 — підпис «Далі», `aria-label` повний, зона ≥ 40 px, клік передає хід; desktop 1280 — повний підпис. Скріни зменшені.
- [ ] Редактор листа: набрати ім'я й одразу клікнути «Зберегти» (реальний `type`, не `fill`) ×3; якщо перший клік губиться — `superpowers:systematic-debugging`, фікс у `ProfileEditor` і тест-кейс «submit одразу після введення».
- [ ] Видалити на `ch8_live` (лише ця БД — перевірити `current_database()`): персонажа «ТЕСТ ch8», бій без `rules.system`.
- [ ] STATUS: п.(5) закрито з посиланням на progress; результат «Далі»; прибрано стенд-дані.
- [ ] Commit: `chore(ch8): close status tails` (+ `fix(sheet): …`, якщо був фікс).

### Task T0.2: `HudFormPage` — `width`, `actions`, `side`; утиліти DS (агент W0-B)

**Files:**
- Modify: `components/hud/form/HudFormPage.tsx`, `components/hud/hud.css`, `components/hud/form/index.ts`
- Test: `components/hud/form/__tests__/HudFormPage.test.tsx`

**Interfaces — Produces:**
```ts
export type HudFormPageWidth = 'narrow' | 'wide' | 'page';
export function HudFormPage(props: {
    title: ReactNode;           // may contain breadcrumbs
    aside?: ReactNode;
    width?: HudFormPageWidth;   // default 'narrow' = current markup unchanged
    actions?: ReactNode;        // ONE node: sticky in header ≥ lg, sticky bottom < lg
    side?: ReactNode;           // wide only: right column ≥ lg, «Перегляд» dialog < lg
    children: ReactNode;
    className?: string;
}): JSX.Element;
```
CSS (`hud.css`): `.ds-fields`, `.ds-fields--num`, `.ds-span`, `.ds-list-grid` (container-based: 1 колонка < 52rem, 2 від 52rem), `.ds-setting-row` (`grid-cols-[1fr_auto]`, `py-3`, роздільник `border-hud-rule/50`, < 400 px контрол під підписом), `.hud-wide-body` (сітка нижче).

**Рішення:**
- `narrow` — нинішня розмітка байт-у-байт (форми акаунта, `NewCampaignForm`, `PlayerDraftForm`, `WfrpDraftForm` не змінюються).
- `wide`: `max-w-[1440px]`, тіло — `.hud-wide-body`; `page`: `max-w-page`, без `ornate`, без сітки (форма битви).
- Сітка — неочевидне місце, дати дослівно:
```css
.hud-wide-body { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "main"; }
@media (min-width: 1024px) { .hud-wide-body { grid-template-columns: minmax(0,1fr) 320px; grid-template-areas: "rail rail" "main side"; } }
@media (min-width: 1280px) { .hud-wide-body { grid-template-columns: 208px minmax(0,1fr) 360px; grid-template-areas: "rail main side"; } }
@media (min-width: 1600px) { .hud-wide-body { grid-template-columns: 208px minmax(0,1fr) 400px; } }
.hud-wide-body > form, .hud-wide-body [data-hud-tabs-root] { display: contents; }
.hud-wide-body [data-hud-rail] { grid-area: rail; }
.hud-wide-body [data-hud-main], .hud-wide-body [data-hud-tabs-panels] { grid-area: main; container-type: inline-size; }
.hud-wide-side { grid-area: side; }
@media (max-width: 1023px) { .hud-wide-side { display: none; } }
.hud-wide-body:has([data-active-wide="true"]) .hud-wide-side { display: none; }
@media (min-width: 1024px) { .hud-wide-body:has([data-active-wide="true"]) [data-hud-tabs-panels] { grid-column: main / side; } }
```
- `actions`: корінь — `flex flex-col` (< lg: шапка, `.orn`, тіло, потім `actions` з `order-last sticky bottom-0 bg-hud-page/95`), ≥ lg — шапка `grid-cols-[minmax(0,1fr)_auto]`, `actions` у другій колонці `sticky top-[var(--shell-header-h,57px)]` з blur; тінь — `data-scrolled` через наявний `useScrolledPast` якщо доступний у `hud` (інакше без тіні — не винаходити).
- `HudFormPage` лишається серверно-сумісним (його рендерять серверні `app/help/**`): стан діалогу перегляду — в окремому клієнтському `HudFormPreviewButton.tsx` поруч.
- `side` < lg: кнопка «Перегляд» (`common.form.preview`) у шапці → `ResponsiveDialog hud` з тим самим вузлом `side` (рендер лише коли відкрито — інакше два DOM-вузли перегляду в тестах).
- `<aside aria-label={t('form.previewTitle')}>`.

**Test cases:**
- `narrow` без нових пропсів — снапшот класів кореня не змінився (`max-w-3xl`).
- `wide` + `actions` з `<Button type="submit" form="f">` → `getAllByRole('button', { name: 'Зберегти' })` має довжину 1; клік сабмітить `<form id="f">` у `children`.
- `wide` + `side` → `aside` з `aria-label`; `page` → немає `aside`, корінь `max-w-page`.
- `matchMedia` < lg мок → кнопка «Перегляд» відкриває діалог із вмістом `side`.

- [ ] Тести → реалізація → `pnpm exec eslint --fix` своїх файлів → commit `feat(hud): wide form page with actions and side`.

### Task T0.3: Рейка вкладок, `HudTab.badge/wide`, `HudForm.tabStyles` (агент W0-B)

**Files:** Modify: `components/hud/form/HudTabs.tsx`, `components/hud/form/HudForm.tsx`, `components/rules/RulesForm.tsx` (лише `triggerClassName` → `tabStyles={{ trigger: 'flex-none px-3' }}` — єдиний виклик); Test: `components/hud/form/__tests__/HudTabs-rail.test.tsx`, `HudForm.test.tsx`.

**Interfaces — Produces:**
```ts
export interface HudTab<T extends string = string> {
    id: T; label: ReactNode; content: ReactNode;
    invalid?: boolean; icon?: ReactNode;
    badge?: ReactNode;   // count after the label
    wide?: boolean;      // active tab takes the side column
}
styles?: { content?: string; trigger?: string; variant?: 'default' | 'sheet' | 'rail' };
// HudForm: `triggerClassName` removed → `tabStyles?: HudTabsProps['styles']`; `actions?` optional.
```
**Рішення:** `variant='rail'`: корінь Tabs має `data-hud-tabs-root`, список — `data-hud-rail`, панелі — `data-hud-tabs-panels`; Radix `orientation` = `useMediaQuery('(min-width: 1280px)') ? 'vertical' : 'horizontal'`; на xl список вертикальний липкий (`sticky top-[…]`), пункт: hover `bg-hud-raised`, активний — ліва риска 2 px `--hud-accent` + `text-hud-ink`; `invalid` — крапка `hud-crimson`; `badge` — `.hud-num text-hud-muted`. Корінь отримує `data-active-wide={activeTab.wide ? 'true' : undefined}`. `HudForm` без `actions` не рендерить `ActionBar`; `error` → рядок помилки над вкладками (R4). Кількість пропсів `HudForm` = 10 (як у винятку).

**Test cases:** `aria-orientation="vertical"` при xl-моку; ↓ переводить фокус на наступний пункт; невалідне поле в прихованій панелі (`keepMounted`) → submit перемикає вкладку і пункт має крапку; активна вкладка `wide` → `data-active-wide="true"`; `HudForm` без `actions` — немає `ActionBar`, `error` → `role="alert"` над tablist.

- [ ] Тести → реалізація → lint → commit `feat(hud): rail tabs, tab badge and wide tab`.

### Task T0.4: `HudFormMenu` + `common.form.*` ключі (агент W0-B)

**Files:** Create: `components/hud/form/HudFormMenu.tsx`; Modify: `components/hud/form/index.ts`, `messages/{uk,en}/common.json`; Test: `components/hud/form/__tests__/HudFormMenu.test.tsx`.

**Interfaces — Produces:**
```ts
export interface HudFormMenuItem { label: string; onSelect: () => void | Promise<unknown>; tone?: 'danger'; confirm?: string; }
export function HudFormMenu(props: { items: HudFormMenuItem[]; label: string }): JSX.Element | null; // null when items empty
```
**Рішення:** `HudIconButton` (`MoreHorizontal`, `aria-label={label}`) + `DropdownMenu` з `ui`; пункт із `confirm` → `useConfirm()` (з `lib/hooks/common`) і `onSelect` лише після «так»; `tone='danger'` → `text-hud-crimson-fg`.

**Test cases** (у `ConfirmProvider`): пункт без `confirm` викликає `onSelect`; з `confirm` — діалог, «Скасувати» не викликає, «Так» викликає; порожній `items` → нічого не рендериться.

- [ ] Тести → реалізація → lint → commit `feat(hud): form overflow menu`.

### Task T0.5: `HudSegmented` + hover `SelectItem` (агент W0-C)

**Files:** Create: `components/hud/HudSegmented.tsx`; Modify: `components/hud/index.ts`, `components/ui/select.tsx` (hover `SelectItem`); Test: `components/hud/__tests__/HudSegmented.test.tsx`.

**Interfaces — Produces:**
```ts
export interface HudSegmentedOption<T extends string> { value: T; label: ReactNode; ariaLabel?: string }
export function HudSegmented<T extends string>(props: {
    id: string; value: T | null; options: HudSegmentedOption<T>[];
    onValueChange: (value: T) => void; label: string; disabled?: boolean;
}): JSX.Element;
```
**Рішення:** `role="radiogroup"` + `aria-label`, кнопки `role="radio"` `aria-checked`, roving tabindex (←/→/Home/End змінюють вибір), вибраний — `bg-hud-panel-2 text-hud-ink shadow-[inset_0_-2px_0_var(--hud-accent)]`, `rounded-md`, `ds-interactive`, висота 40 (phone 44). Пункт можна стилізувати через `data-value` (для `SideToggle`).

**Test cases:** клік обирає; `ArrowRight` з останнього переходить на перший; `disabled` — клавіші й клік ігноруються; `value=null` — tabindex 0 на першому.

- [ ] Тести → реалізація → lint → commit `feat(hud): segmented control`.

### Task T0.6: `FileDropZone` (агент W0-C)

**Files:** Create: `components/common/fields/FileDropZone.tsx`; Test: `components/common/fields/__tests__/FileDropZone.test.tsx`.

**Interfaces — Produces:**
```ts
export function FileDropZone(props: {
    accept: string; onFiles: (files: File[]) => void; multiple?: boolean;
    disabled?: boolean; label: ReactNode; hint?: ReactNode;
    file?: { name: string; size: number; meta?: ReactNode; onReplace: () => void } | null;
}): JSX.Element;
```
**Рішення:** `ds-inset`, пунктирна рамка `border-hud-line`; `dragover`/hover — `border-hud-accent`; `preventDefault` лише в межах зони; фільтр за `accept` (MIME/розширення) до виклику `onFiles`; клавіатура — вбудований `FileButton` (без сирого `<input>`); з `file` — картка файлу з розміром (`Intl.NumberFormat`) і «Замінити».

**Test cases:** drop 2 файлів при `multiple=false` → `onFiles` з 1; файл з неприйнятим розширенням відкидається; `disabled` — drop ігнорується; Enter на кнопці відкриває вибір (мок `click` прихованого input `FileButton`); `file` → картка й «Замінити».

- [ ] Тести → реалізація → lint → commit `feat(common): file drop zone`.

**Кінець W0 (контролер):** злиття W0-B, W0-C; `tsc`, `pnpm cycles`, `lint:dirs --changed`. Без живого прогону (крім T0.1).

---

## 7. Хвиля 1 — D-B: форми бібліотеки, «Основне», довідник, імпорт, правила

Смуги й файли (не перетинаються):

| Агент | Задачі | Файли |
|---|---|---|
| B1 | T1.1–T1.3 | `components/units/form/**`, `components/spells/form/**`, `components/artifacts/Artifact*.tsx`, `app/campaigns/[id]/dm/{units,spells,artifacts}/**/page.tsx` |
| B2 | T1.4–T1.6 | `components/races/RaceEditForm.tsx`, `components/feats/FeatForm.tsx`, `systems/d20/ui/content/{backgrounds,classes}/**`, `systems/skilltrees/ui/content/{skills,main-skills}/**`, `systems/artifactsets/ui/content/**`, `app/campaigns/[id]/dm/{races,feats,backgrounds,classes}/**/page.tsx` |
| B3 | T1.7–T1.9 | `components/character-profile/sheet/{SheetIdentityPanel.tsx,banner/**}`, `components/character-profile/{ProfileEditor.tsx,tabs/BasicEditTab.tsx}`, `components/characters/{basic/**,NewCharacterForm.tsx,player-draft/DraftBasicSection.tsx}`, `systems/wfrp/ui/creation/IdentityStep.tsx`, `lib/utils/characters/alignment.ts`, `lib/hooks/characters/useAlignmentLabel.ts`, `messages/*/{gameTerms,characterProfile}.json` |
| B4 | T1.10–T1.12 | `components/campaigns/info/**`, `lib/hooks/campaigns/{useReferenceSelection.ts,index.ts}`, `app/campaigns/[id]/info/**`, `lib/onboarding/demo-tours.ts`, `messages/*/{dashboard,spells,artifacts,classes,skills}.json` |
| B5 | T1.14–T1.16 | `lib/utils/rules/{sections,core-sections}.ts`, `systems/*/rules/sections.ts` (лише поле `group`), `lib/hooks/campaigns/useRulesForm.ts`, `components/rules/**`, `systems/*/ui/rules/**` (лише якщо дублюють рядок), `app/campaigns/[id]/dm/rules/page.tsx`, `messages/*/rules.json` |
| B6 | T1.17–T1.19 | `components/content-import/{compendium/**,ContentImportWizard.tsx}`, `lib/hooks/compendium-import/useCompendiumWizardView.ts` (+ `index.ts`), `app/campaigns/[id]/dm/compendium/page.tsx`, `messages/*/compendium.json` |
| B7 | T1.13 | `lib/utils/{spells,artifacts}/…-preview.ts`, `lib/utils/characters/classes/class-preview.ts`, рядки `side` у формах B1/B2, `components/units/{MonsterStatblock.tsx,form/UnitStatblockFields.tsx}` (лише показ світогляду) |

Спільний рецепт для T1.1–T1.6 (кожна форма, створення й редагування):
1. `HudFormPage width="wide"`, `title` = крихти «Бібліотека › <Вид>» (посилання на список) + назва; `aside` як було.
2. `HudForm tabStyles={{ variant: 'rail' }}` без `actions`; дії → `HudFormPage.actions`: [`HudFormMenu` з «Видалити» (`tone='danger'`, `confirm` — наявний текст підтвердження; якщо видалення вже має свій `useConfirm` у хуку — без `confirm`)] [Скасувати] [Зберегти `type="submit" form={FORM_ID}`, «Збереження…» при pending].
3. Помилка збереження → `HudForm.error` (над вкладками), не в ряду кнопок.
4. Сітки полів `md:grid-cols-2`/`grid-cols-2` → `.ds-fields` / `.ds-fields--num` (числа) / `.ds-span` (описи, textarea); повторювані редактори → `.ds-list-grid`; секції — `HudSection panel`.
5. `SourceNotes` з `page.tsx` → проп форми `side?: ReactNode` (передається в `HudFormPage.side`); якщо бюджет пропсів форми вичерпано — у наявний об'єктний проп. Окремий блок над формою зникає.
6. Поля, умови, схеми, хуки, порядок вкладок, тексти — без змін.
**Тест-кейси для кожної форми:** наявні тести зелені (оновити селектори кнопок); одна кнопка «Зберегти»; «Видалити» лише в «⋯» і через confirm; `SourceNotes` у `aside`; помилка мутації → `role="alert"` над tablist.

### Task T1.1: Юніт (B1)
Files: `components/units/form/{UnitCreateForm,UnitEditForm}.tsx` + поля статблоку (числа `.ds-fields--num`), атаки `.ds-list-grid`; `app/campaigns/[id]/dm/units/[unitId]/page.tsx`. `side` — лише `SourceNotes` (перегляд юніта — P2). Commit `feat(units): wide workbench form`.

### Task T1.2: Закляття (B1)
Files: `components/spells/form/forms/{SpellCreateForm,SpellEditForm,SpellFormBody}.tsx`, `app/campaigns/[id]/dm/spells/[spellId]/page.tsx`. Вкладка «Ефекти» з `badge` = кількість ефектів. Commit `feat(spells): wide workbench form`.

### Task T1.3: Артефакт (B1)
Files: `components/artifacts/ArtifactForm.tsx` (+ поля `Artifact*Fields.tsx` лише сітки), `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx`. 6 вкладок — у рейці; умовні вкладки слоту — як є. Commit `feat(artifacts): wide workbench form`.

### Task T1.4: Раса, риса, передісторія (B2)
Files: `components/races/RaceEditForm.tsx`, `components/feats/FeatForm.tsx`, `systems/d20/ui/content/backgrounds/BackgroundForm.tsx` + `page.tsx` трьох видів. Вибори (`ChoiceListEditor`) — у `.ds-list-grid` через `className` контейнера, без правки `components/choices/**`. Commit `feat(content): wide forms for race, feat, background`.

### Task T1.5: Клас d20 (B2)
Files: `systems/d20/ui/content/classes/ClassForm.tsx` (+ `ClassFeaturesEditor`, `ClassColumnsEditor` лише сітки), `app/campaigns/[id]/dm/classes/[classId]/page.tsx`. Вкладки «Таблиця» і «Мапа» — `wide: true`. Тест: активна «Таблиця» → `data-active-wide`. Commit `feat(classes): wide workbench form`.

### Task T1.6: Скіл, гілка, набір артефактів (B2)
Files: `systems/skilltrees/ui/content/skills/{EditSkill.tsx,form/SkillCreateForm.tsx}`, `systems/skilltrees/ui/content/main-skills/MainSkillEditForm.tsx`, `systems/artifactsets/ui/content/ArtifactSetsPage.tsx` (лише форма набору; учасники `.ds-list-grid`). Системний UI бере лише `ui/hud/common` — `HudFormMenu`/`HudSegmented` із `hud` дозволені. Commit `feat(systems): wide forms for skills and artifact sets`.

### Task T1.7: `SheetBanner`, живий стяг, портрет у стязі (B3)

**Files:** Create: `components/character-profile/sheet/banner/{SheetBanner.tsx,IdentityDraft.tsx,PortraitDialog.tsx}`; Modify: `SheetIdentityPanel.tsx`, `ProfileEditor.tsx`; Test: `components/character-profile/sheet/banner/__tests__/*.test.tsx`, оновити `sheet-banner.test.tsx`.

**Interfaces — Produces:**
```ts
export interface BannerHero { name: string; avatar: string | null; raceColor: string | null; raceIcon: string | null; level?: number }
export function SheetBanner(p: { hero: BannerHero; onPortrait?: () => void; size?: 'sm' | 'lg'; className?: string }): JSX.Element;
export function IdentityDraftProvider(p: { value: IdentityDraft | null; children: ReactNode }): JSX.Element;
export function useIdentityDraft(): IdentityDraft | null;   // name, race, subrace, classes, alignment, avatar, level
export function PortraitDialog(p: { open: boolean; onOpenChange: (v: boolean) => void; value: string | null; onChange: (url: string | null) => void }): JSX.Element;
```
**Рішення:** `ProfileEditor` обгортає дерево `IdentityDraftProvider value={form.basicInfo.data}`; `SheetIdentityPanel` накладає чернетку на `sheet.identity`; колір/герб раси — з `options.races` за назвою, fallback — збережені. Портрет у редакторі: hover/focus — затемнення + «Змінити портрет»; клік → `PortraitDialog` (`ResponsiveDialog hud` + `ImageUpload maxSide 1200`), змінює лише поле форми. Переглядач листа — без `onPortrait`.

**Test cases:** зміна імені у формі → шапка показує нове ім'я; клік по портрету → діалог з `ImageUpload`; без `onPortrait` — портрет не кнопка; раса без кольору в опціях → збережений колір.

- [ ] Тести → реалізація → lint → commit `feat(sheet): live banner with portrait editing`.

### Task T1.8: Світогляд 3×3, композиція «Основне», «Видалити» в «⋯» (B3)

**Files:** Create: `lib/utils/characters/alignment.ts`, `lib/hooks/characters/useAlignmentLabel.ts` (+ barrel), `components/characters/basic/AlignmentGrid.tsx`; Modify: `components/characters/basic/{CharacterBasicInfo,BasicPanel,CharacterClassesField}.tsx`, `components/character-profile/tabs/BasicEditTab.tsx`, `ProfileEditor.tsx` (пункт меню), `SheetIdentityPanel.tsx` (рядок «хто»), `components/characters/player-draft/DraftBasicSection.tsx`, `systems/wfrp/ui/creation/IdentityStep.tsx` (лише якщо використовує `ALIGNMENTS`), `messages/{uk,en}/{gameTerms,characterProfile}.json`; Test: `lib/utils/characters/__tests__/alignment.test.ts`, `components/characters/basic/__tests__/{AlignmentGrid,CharacterBasicInfo}.test.tsx`.

**Interfaces — Produces:**
```ts
export type AlignmentKey = 'lawfulGood' | 'neutralGood' | 'chaoticGood' | 'lawfulNeutral' | 'trueNeutral' | 'chaoticNeutral' | 'lawfulEvil' | 'neutralEvil' | 'chaoticEvil';
export function alignmentKeyOf(value: string | null | undefined): AlignmentKey | null; // canonical ALIGNMENTS string → key
export function alignmentLabel(value: string | null | undefined, t: (key: string) => string, form?: 'name' | 'short'): string; // fallback: raw value; '' for null
export function useAlignmentLabel(): (value: string | null | undefined, form?: 'name' | 'short') => string;
export function AlignmentGrid(p: { id: string; value: string | null; onChange: (v: string | null) => void; allowNone?: boolean; noneLabel?: string }): JSX.Element;
```
**Рішення:** ключі `gameTerms.alignments.<key>.{name,short}` (R9 — виміряти бюджет). `AlignmentGrid` — `role="radiogroup"`, 3×3 з `ALIGNMENTS` + «Без», roving tabindex по сітці (←/→/↑/↓), активна — `border-hud-accent`, клітинки 44 px на phone. Композиція «Основне» за D-B §2B (картки «Особа» | «Походження» поруч при контейнері ≥ 56rem, «Клас і рівень» на всю ширину з тайлом «Хіти» `ds-inset`), **без секції «Портрет»** і в редакторі, і в `NewCharacterForm`. «Тип» — `HudSegmented`. «Видалити героя» → `HudFormMenu` у шапці редактора; червона кнопка у вкладці зникає; `dmActions.remove()` уже підтверджує? — якщо так, пункт без `confirm`. M9: заголовок секцій `h2`, не `h3` під `h1`.

**Test cases:** `alignmentLabel('Lawful Good')` → перекладене ім'я; `'any alignment'` → сирий рядок; `null` → `''`; `AlignmentGrid` — клік, «Без» → `null`, `ArrowDown` з LG → LN, `aria-checked`; «Основне» без «Портрет»; «Видалити героя» лише в «⋯».

- [ ] Тести → реалізація → lint → commit `feat(characters): alignment grid and basic tab composition`.

### Task T1.9: `NewCharacterForm` на `wide` зі стягом ліворуч (B3)

**Files:** Modify: `components/characters/NewCharacterForm.tsx`; Test: `components/characters/__tests__/NewCharacterForm.test.tsx`.
**Рішення:** `HudFormPage width="wide"` без `side`; тіло ≥ lg `grid-cols-[200px_minmax(0,1fr)]`: `SheetBanner size="lg"` sticky з `onPortrait` (той самий `PortraitDialog`), порожні ім'я/раса → «?» і нейтральний колір; вкладки горизонтально праворуч (без рейки); < lg — стяг 104 px поруч з іменем. **Test cases:** портрет лише через стяг; ініціали «?» на порожній формі; submit — та сама семантика.
- [ ] Тести → реалізація → lint → commit `feat(characters): new character form with banner`.

### Task T1.10: `*ReferenceRow` / `*ReferenceDetail`, перенос ключів карток (B4)

**Files:** Create: `components/campaigns/info/rows/{Spell,Skill,Artifact,Class}ReferenceRow.tsx`, `components/campaigns/info/detail/{Spell,Skill,Artifact,Class}ReferenceDetail.tsx` (+ `ArtifactSetBlock.tsx` зі змісту `ArtifactSetReferenceCard`); Modify: наявні `*ReferenceCard.tsx` тимчасово рендерять `*Detail` в `AccordionContent` (видалення — T1.12); `messages/{uk,en}/{dashboard,spells,artifacts,classes,skills}.json`; Test: `components/campaigns/info/detail/__tests__/*.test.tsx`.

**Interfaces — Produces:**
```ts
export function SpellReferenceDetail(p: { campaignId: string; item: SpellForReference; isDM: boolean }): JSX.Element;
// same shape: SkillReferenceDetail (SkillForReference), ArtifactReferenceDetail (ArtifactForReference, + sets?: ArtifactSetForReference[] via item), ClassReferenceDetail (ClassForReference)
export function SpellReferenceRow(p: { item: SpellForReference; selected: boolean; onSelect: (id: string) => void }): JSX.Element; // 56px, aria-current
```
**Рішення:** R6 — тексти `dashboard.reference.card.*` переносяться у `<kind>.reference.*` (пакет `characterSheet`); `Detail` бере їх звідти. ДМ: «✎» у «Вигляд» → textarea + Зберегти/Скасувати (`useUpdateSpellAppearance` і аналоги); гравець — лише текст. Шапка деталі: іконка 64, `hud-title`, мета-чипи.

**Test cases:** ДМ ✎ → textarea → «Зберегти» викликає мутацію; гравець не бачить ✎; рядок — `aria-current="true"` при `selected`; `route-scopes` сторож: ключі `spells.reference.*` доступні на `[id]/dm/spells/[spellId]`.

- [ ] Тести → реалізація → lint → commit `refactor(info): reference rows and details`.

### Task T1.11: `ReferenceLayout`/`Rail`/`List` + `useReferenceSelection` (B4)

**Files:** Create: `components/campaigns/info/layout/{ReferenceLayout,ReferenceRail,ReferenceList}.tsx`, `lib/hooks/campaigns/useReferenceSelection.ts`; Modify: `lib/hooks/campaigns/index.ts`; Test: `lib/hooks/campaigns/__tests__/useReferenceSelection.test.tsx`, `components/campaigns/info/layout/__tests__/ReferenceList.test.tsx`.

**Interfaces — Produces:**
```ts
export type ReferenceKind = 'spell' | 'skill' | 'artifact' | 'class';
export interface ReferenceRef { kind: ReferenceKind; id: string }
export function useReferenceSelection(visible: readonly ReferenceRef[], opts: { autoSelect: boolean }): {
    selected: ReferenceRef | null; select: (ref: ReferenceRef) => void; clear: () => void; isOpen: boolean;
}; // URL ?e=<kind>:<id> via router.replace (desktop) / router.push (phone, so Back closes the sheet); auto-pick first never writes URL
export function ReferenceLayout(p: { rail: ReactNode; list: ReactNode; detail: ReactNode; detailOpen: boolean; onDetailClose: () => void; detailTitle: string }): JSX.Element;
export function ReferenceList<T>(p: { groups: { key: string; title: string; accent?: string; items: T[] }[]; selected: string | null; onSelect: (id: string) => void; renderRow: (item: T, selected: boolean) => ReactNode; limit?: number; onShowAll?: () => void }): JSX.Element;
```
**Рішення:** сітка xl `220px 1fr 440px`, lg — `HudChipTabs` секцій + «Фільтри» у `Popover`, < lg — деталь у `ResponsiveDialog hud` (90 dvh). Групи — липкі підзаголовки, без акордеонів; рядки `content-visibility: auto; contain-intrinsic-size: 56px`. Клавіатура: `/` → пошук, ↑/↓ roving, Esc — очистити пошук/закрити sheet; лічильник `aria-live="polite"`.

**Test cases:** `?e=spell:abc` на старті → `selected`; автовибір першого не змінює URL; `select` на phone → `push`; `ReferenceList` — «Показати всі N» при `limit`, ↓ переводить фокус, `aria-current`.

- [ ] Тести → реалізація → lint → commit `feat(info): codex layout and selection`.

### Task T1.12: `InfoReferenceClient` + сторінка + i18n + тур (B4)

**Files:** Modify: `components/campaigns/info/InfoReferenceClient.tsx`, `ReferenceSearchBar.tsx` (фільтри → рейка), `app/campaigns/[id]/info/page.tsx` (`HudPage width="lg"`), `lib/onboarding/demo-tours.ts`, `messages/{uk,en}/dashboard.json`; Delete: `ReferenceSectionAccordion.tsx`, `ReferenceGroupSection.tsx`, `*ReferenceCard.tsx`; Test: оновити `app/campaigns/[id]/info/__tests__/page.test.tsx`.
**Рішення:** режим «Усі» — секції по 6 + «Показати всі N →»; пошук у «Усі» без обрізання; 0 збігів → `EmptyState` + «Скинути фільтри» в панелі деталі. i18n: +6 (`reference.detail.{empty,edit,close}`, `reference.list.{showAll,found}`, `reference.rail.sections`), −13 (`reference.jump.*`, `reference.count.*`, `reference.shown.*`, `reference.search.filtersActive`). Тека `info/` ≤ 10 у корені.
**Test cases:** секція «Заклинання» показує групи; пошук знаходить у всіх секціях; тур довідника знаходить нові селектори.
- [ ] Тести → реалізація → lint → commit `feat(info): codex reference page`.

### Task T1.13: Перегляд «Як бачать гравці» у формах (B7; після B1, B2, T1.10)

**Files:** Create: `lib/utils/spells/spell-preview.ts`, `lib/utils/artifacts/artifact-preview.ts`, `lib/utils/characters/classes/class-preview.ts` (+ тести в `__tests__/`); Modify: `side` у `SpellFormBody`/`SpellEditForm`/`SpellCreateForm`, `ArtifactForm`, `ClassForm`, `RaceEditForm` (`RaceCard`), `FeatForm` (`FeatCard`), `BackgroundForm` (`BackgroundCard`); `components/units/MonsterStatblock.tsx` і `components/units/form/UnitStatblockFields.tsx` — показ світогляду через `useAlignmentLabel` (з T1.8).
**Interfaces — Consumes:** `*ReferenceDetail` (T1.10), `HudFormPage.side` (T0.2), `useAlignmentLabel` (T1.8).
```ts
export function toSpellReferencePreview(data: SpellFormData, ctx: { id?: string; groupName?: string | null }): SpellForReference;
export function toArtifactReferencePreview(data: ArtifactFormData, ctx: { id?: string }): ArtifactForReference;
export function toClassReferencePreview(data: ClassFormData, ctx: { id?: string }): ClassForReference;
```
(точні імена типів форм — звірити з `components/spells/form`, `components/artifacts`, `systems/d20`; адаптер для класу живе в `lib/utils`, тому тип форми класу має бути в `types/` або `lib/` — якщо він у `systems/d20/ui`, адаптер кладеться в `systems/d20/rules/` і `ClassForm` передає `side` сам.)
**Рішення:** `side` = заголовок «Як бачать гравці» + `Detail` з `isDM=false` від `useDeferredValue(form.data)` + `SourceNotes` (якщо є). Складний адаптер не встигає — `side` лише `SourceNotes`, задача не блокує.
**Test cases:** порожня форма → адаптер не падає (дефолти); зміна назви → перегляд оновлюється; адаптер чистий (той самий вхід → той самий вихід).
- [ ] Тести → реалізація → lint → commit `feat(forms): player preview side column`.

### Task T1.14: Групи правил, `dirtyKeys`/`resetKey`/`initial` (B5)

**Files:** Modify: `lib/utils/rules/sections.ts` (+ `group?: RulesSectionGroup`), `lib/utils/rules/core-sections.ts`, `systems/{d20,wfrp,morale,deathsaves,heroscaling,opportunity,inspiration,retaliation}/rules/sections.ts` (лише `group`), `lib/hooks/campaigns/useRulesForm.ts`; Test: `lib/hooks/campaigns/__tests__/useRulesForm-dirty.test.tsx`, `lib/utils/rules/__tests__/section-groups.test.ts`.
```ts
export type RulesSectionGroup = 'system' | 'combat' | 'characters' | 'world';
// useRulesForm(campaignId, opts?: { initial?: Ruleset }) returns also:
//   dirtyKeys: ReadonlySet<keyof Ruleset>; resetKey: (key: keyof Ruleset) => void;
```
**Рішення:** `dirtyKeys` уже рахується (масив) — лише `new Set(...)` назовні; `resetKey` видаляє ключ із `changes`. Розподіл груп — за D-B §4, звірити з реальними ключами; без `group` → «Інше». `initial` — якщо API правил не віддає демо-гостю (перевірити першим кроком: `app/api/campaigns/[id]/rules`), то `useQuery` з `initialData` і `enabled: false`.
**Test cases:** `set` → `dirtyKeys.has(key)`; повернення до серверного значення → ключ зник; `resetKey`; розділ без `group` → «Інше»; `system-contract` і `d6pool` — без змін поведінки (тести наявні).
- [ ] Тести → реалізація → lint → commit `feat(rules): section groups and per-section dirty state`.

### Task T1.15: «Книга правил» — зміст, розділ, бічна колонка (B5)

**Files:** Modify: `components/rules/{RulesForm,RulesSection,NumberField}.tsx`; Create: `components/rules/book/{RulesToc,RulesAside,RulesChangedChip}.tsx`; Test: `components/rules/__tests__/RulesForm-book.test.tsx`.
**Рішення:** `HudFormPage width="wide"` з власною рейкою: Radix Tabs `orientation="vertical"`, `keepMounted`, групи — `role="presentation"` підзаголовки в tablist; перший пункт «Система й модулі» (`SystemSection` + `ModuleWizard` без змін); шапка — чип складу «D&D 5e · +Мораль» + «Змінити» (відкриває розділ), «Змінено: N», Скасувати/Зберегти в `actions`; крапка `●` золото в змісті, бейдж «змінено», «Скинути розділ»; фільтр змісту `useSearch`; бічна колонка (xl): склад системи, змінені розділи з «Скинути», `form.hint`. `.ds-setting-row` — через `layout="row"` у `NumberField` і `className` у `SwitchField` (якщо вже рядок — не дублювати); системні розділи отримують це автоматично. Phone: перший екран — зміст-картки; розділ на весь екран з «‹ Зміст».
**Test cases:** групи в змісті; зміна поля → крапка й «Змінено: 1»; «Скинути розділ» скидає лише його; фільтр ховає невідповідні пункти.
- [ ] Тести → реалізація → lint → commit `feat(rules): rules book layout`.

### Task T1.16: Демо лише для читання, `?section=`, i18n (B5)

**Files:** Modify: `app/campaigns/[id]/dm/rules/page.tsx` (прибрати `<pre>JSON`; передати `initialRules` за потреби), `components/rules/RulesForm.tsx`, `messages/{uk,en}/rules.json` (`page.groups.{system,combat,characters,world,other}`, `page.changed`, `page.resetSection`, `page.filter`, `page.demoReadOnly`; видалити `system.wizard.step`, якщо стане зайвим).
**Рішення:** демо — `<fieldset disabled>` + банер, без кнопок; `?section=<key>` через `router.replace`, на phone «назад» повертає до змісту (push).
**Test cases:** демо — немає `<pre>`, поля disabled, немає «Зберегти»; `?section=initiative` відкриває розділ.
- [ ] Тести → реалізація → lint → commit `feat(rules): demo read-only and section links`.

### Task T1.17: Крок «Файл» + історія (B6)

**Files:** Create: `components/content-import/compendium/steps/FileStep.tsx` (замість `CompendiumFileStep.tsx`), `components/content-import/compendium/history/CompendiumHistory.tsx` (замість `report/CompendiumRunsList.tsx`); Test: `__tests__/FileStep.test.tsx`, `CompendiumHistory.test.tsx`.
**Interfaces — Consumes:** `FileDropZone` (T0.6), `useCompendiumImport`, `useCompendiumReports`, `PagerNav`.
**Рішення:** зона → картка файлу (назва, розмір, `edition`, «Замінити»); читання — спінер у картці; помилка — `FormAlert` під зоною. Історія: «Імпорт #<6 символів id>» + підсумок зі `run.report` (готово/записів) + «Відкрити звіт»; дата — P2 (поза обсягом: потребує зміни route).
**Test cases:** drop JSON → `selectFile`; «Замінити» знову відкриває вибір; рядок історії без звіту показує лише id.
- [ ] Тести → реалізація → lint → commit `feat(compendium): file step and import history`.

### Task T1.18: Каркас майстра + `useCompendiumWizardView` + «Категорії» (B6)

**Files:** Create: `components/content-import/compendium/layout/{CompendiumWizardLayout,CompendiumStepRail,CompendiumSummary}.tsx`, `lib/hooks/compendium-import/useCompendiumWizardView.ts` (+ barrel); Modify: `CompendiumImport.tsx`, `CompendiumCategories.tsx` → `steps/CategoriesStep.tsx`, `CompendiumMaterials.tsx`, `CompendiumAdvanced.tsx`, `CompendiumSteps.tsx` (лишає `compendiumStep`), `components/common/shell/StepIndicator.tsx` **не змінюється** (рейка на lg обгортає його; клік — через власні кнопки, якщо `StepIndicator` не має `onSelect` і додати його не можна в межах 7 пропсів — тоді компонент рейки рендерить власний горизонтальний ряд).
```ts
export type CompendiumStepId = 1 | 2 | 3 | 4 | 5;
export function useCompendiumWizardView(maxStep: CompendiumStepId): { step: CompendiumStepId; setStep: (s: CompendiumStepId) => void; maxStep: CompendiumStepId };
// step follows maxStep upward automatically; setStep ignores s > maxStep
```
**Рішення:** на екрані один крок; `@container`: ≥ 72rem — рейка 240 | крок | підсумок 340; 48–72rem — горизонтальні кроки + підсумок 300; < 48rem і діалог — кроки вгорі, підсумок — липкий низ. Підсумок — **одна основна кнопка кроку** (Перевірити / Далі / Імпортувати / Новий імпорт). Пресети категорій — `HudSegmented` (без підсвічення, якщо вибір не збігається). Notice «Зміна вибору скине перевірку», коли повернулися на крок 2 з наявним preview. «Почати заново» — `HudFormMenu`/`ActionsMenu` у шапці з confirm, якщо є preview/result. Зміна кроку — `motion-rise` з напрямом `useTabDirection`.
**Test cases:** `maxStep` 2→3 переводить `step` на 3; `setStep(4)` при `maxStep=3` ігнорується; повернення на 2 показує notice; кнопка підсумку змінюється за кроком.
- [ ] Тести → реалізація → lint → commit `feat(compendium): step-by-step wizard layout`.

### Task T1.19: Перевірка, підтвердження, результат, вбудований режим, i18n (B6)

**Files:** Create: `components/content-import/compendium/report/{CompendiumVerdict,CompendiumReportTabs}.tsx`, `steps/{CheckStep,ConfirmStep,ResultStep}.tsx`; Modify: `report/CompendiumReport.tsx` (розібрати), `CompendiumDependencies.tsx` (без зовнішнього `Disclosure`), `components/content-import/ContentImportWizard.tsx`, `app/campaigns/[id]/dm/compendium/page.tsx`, `messages/{uk,en}/compendium.json` (+≈14 за D-B §3b; −`import.close`, `import.previewTtl`, `runs.report`); оновити `CompendiumImport.test.tsx`, `CompendiumSteps.test.tsx`.
**Рішення:** вердикт-банер (готово — accent; блокери — crimson); підвкладки `HudChipTabs` «Записи / Залежності (N) / Джерела й покриття / Зображення (K)»; блокери або непов'язані залежності → за замовчуванням «Залежності»; `DEPENDENCIES_ANCHOR` перемикає вкладку. Підтвердження: «Що зміниться» з `report`, чекбокс прав (золото), відлік `useExpiry` («ще 12 хв»), прострочено → банер і кнопка «Перевірити знову» (`runPreview`). Результат: «Імпорт завершено», `CompendiumMediaReport` з паузою/повтором, ті ж підвкладки read-only. Вбудований режим (`initialFile`): без шапки, історії й підказки; підсумок → `footer` діалогу. Перенос scope **не потрібен** (R5).
**Test cases:** прострочена перевірка → «Перевірити знову»; «Імпортувати» disabled без прав; блокери → вкладка «Залежності»; вбудований режим без історії; `scope-size`/`route-scopes` зелені.
- [ ] Тести → реалізація → lint → commit `feat(compendium): check, confirm and result steps`.

### Живий прогін W1 (агент Sonnet, браузер, `feedback-browser-live-check`)

Стенд 3100 / `ch8_live`, prod-збірка. Розміри 1280, 1600 (+1920 для форм), phone 390, 540 (iframe same-origin); tavern і parchment. Сценарії: юніт (ред.), закляття (нове) з переглядом, клас (вкладка «Таблиця» ховає бічну), артефакт (6 пунктів рейки), «Основне» героя (ред. + нове: живий стяг, портрет, світогляд, «⋯»), довідник (xl, phone sheet + «назад», `?e=`), імпорт SRD JSON (усі 5 кроків на 1600 і 390 + вбудований діалог), правила (xl, phone зміст→розділ, демо). Перевірити: одна «Зберегти», sticky на 390/1600, hover, консоль без помилок, 0 відповідей 5xx, без `MISSING_MESSAGE`/сирих ключів. Таблиця прогресу PASS/FAIL у звіті; FAIL → фікс-агент до старту W2.

---

## 8. Хвиля 2 — D-A: список і створення битв

| Агент | Задачі | Файли |
|---|---|---|
| A1 | T2.1–T2.3 | `lib/server/battles/list-cards.ts` (R7), `lib/utils/battle/store/scene-list-select.ts`, `types/battle.ts`, `lib/hooks/battles/useBattleListSections.ts`, `components/battle/list/**`, `app/campaigns/[id]/dm/battles/{page,page-client,loading}.tsx`, `battleSetup.list.*` |
| A2 | T2.4–T2.5 | `components/battle/setup/participants/**`, `components/battle/setup/balance/BalanceMeter.tsx`, `battleSetup.{participants,balance}.*` |
| A3 | T2.6–T2.8 | `components/maps/{MapEditorScreen.tsx,editor/**}`, `components/battle/setup/map/**`, `lib/server/battle-maps/library-service.ts` (R7), `types/battle-map.ts`, `battleSetup.map.*` |
| A4 | T2.9–T2.11 | `components/battle/setup/form/**`, `lib/hooks/battles/setup/{useBattleSetupView.ts,useBattleForm.ts}`, `app/campaigns/[id]/dm/battles/{new,[battleId]}/**`, `battleSetup.form.*` |

Спільний файл: `messages/{uk,en}/battleSetup.json` — лише свої підоб'єкти (R17). `lib/hooks/battles/index.ts` — лише A1; `lib/hooks/battles/setup` — лише A4 (A2 бере наявні хуки).

### Task T2.1: `loadBattleListCards` + фільтр статусу (A1)

**Files:** Create: `lib/server/battles/list-cards.ts`, `lib/server/battles/__tests__/list-cards.test.ts`; Modify: `types/battle.ts`, `lib/hooks/battles/useBattleListSections.ts` (+ тест).
```ts
export interface BattleFace { id: string; name: string; avatar: string | null }
export interface BattleSideSummary { count: number; faces: BattleFace[] } // faces ≤ 5, count honours quantity
export interface BattleListCardData {
    id: string; name: string; description: string | null; status: BattleStatus; currentRound: number;
    createdAt: string; startedAt: string | null; completedAt: string | null;
    map: { background: string | null; cols: number; rows: number; gridType: 'square' | 'hex'; maze: boolean } | null;
    sides: { ally: BattleSideSummary; enemy: BattleSideSummary };
    result: 'victory' | 'defeat' | null;
}
export async function loadBattleListCards(campaignId: string): Promise<BattleListCardData[]>;
// useBattleListSections → { search, filter: { value: 'all' | 'prepared' | 'completed'; set; counts }, active, prepared, completed } — active ignores search/filter
```
**Рішення (неочевидне — запит):** один `$queryRaw` для полів мапи й фону бібліотеки, один — для результату:
```sql
SELECT b.id, b.map->>'background' AS bg, (b.map->>'cols')::int AS cols, (b.map->>'rows')::int AS rows,
       b.map->>'gridType' AS grid, (b.map ? 'maze') AS maze, m.header->>'background' AS lib_bg
FROM battle_scenes b LEFT JOIN battle_maps m ON m.id = b.map_id
WHERE b.campaign_id = $1 AND b.owner_user_id IS NULL;

SELECT DISTINCT ON (battle_id) battle_id, details->>'battleResult' AS result
FROM battle_events WHERE battle_id = ANY($1) AND details ? 'battleResult'
ORDER BY battle_id, seq DESC;
```
Імена колонок/ключів JSON (`gridType`, `maze`, `header`) — звірити з `types/battle-grid.ts` і `prisma/schema`; фон: `bg ?? lib_bg`, потім `isPreviewSafeBackground`, інакше `null`. Обличчя: два `findMany` (`character`, `unit`, `select { id, name, avatar }`, `where { campaignId, id: { in } }`); відсутні сутності пропускаються в `faces`, але враховуються в `count`. Демо-гість — той самий набір (сторінка DM-only/демо).
**Test cases** (мок Prisma, як у `lib/server/profile/__tests__/summary.test.ts`): поля мапи з JSON; fallback на `battle_maps.header`; unsafe фон → `null`; `count` з `quantity`; faces ≤ 5; видалений персонаж — пропущено; `result` з останньої події; хук — фільтр + пошук, активні не фільтруються.
- [ ] Тести → реалізація → lint → commit `feat(battles): list cards data`.

### Task T2.2: `BattleMapThumb`, `SidesStrip`, `BattleCard`, `BattleRow`, `ActiveBattleBanner` (A1)

**Files:** Create: `components/battle/list/{BattleMapThumb,SidesStrip,BattleCard,BattleRow,ActiveBattleBanner}.tsx` + тести.
**Interfaces — Produces** (споживає A3 у T2.8):
```ts
export function BattleMapThumb(p: { map: BattleListCardData['map'] | { background: string | null; cols: number; rows: number; gridType: 'square' | 'hex'; maze?: boolean }; size: 'card' | 'row' | 'banner' | 'tile' }): JSX.Element;
export function SidesStrip(p: { sides: BattleListCardData['sides']; compact?: boolean }): JSX.Element;
```
**Рішення:** прев'ю — `OptimizedImage` (`next/image`, `sizes` під колонку) + сітка CSS (`linear-gradient` для квадрата, SVG-патерн для гексів); без фону — `ds-inset` + `Grid3x3`; без мапи — `Swords` + «Без мапи». Картка — посилання поверх (`Link` з `after:absolute after:inset-0`), кнопки `relative z-10`; hover підйом 2 px; «Почати» (`data-tour="battle.open"`), «Редагувати», «⋯» → «Видалити» (`useDeleteBattleCard`). Рядок завершеної: мініпрев'ю, «N раундів · дата · переможець» (переможець: `victory` → «Перемога союзників», `defeat` → «Поразка»; `null` → нічого), «Переглянути»/«Переграти»/«⋯». Банер: прев'ю з віньєткою, «Раунд N · час», `SidesStrip`, «Продовжити бій» + «Зупинити» (`useResetBattleCard`; на phone — у «⋯»). Демо — лише «Відкрити».
**Test cases:** «Видалити» лише в «⋯» з confirm; демо без дій; `map=null` → плейсхолдер; переможець у рядку; `data-tour` на місцях.
- [ ] Тести → реалізація → lint → commit `feat(battles): battle cards, rows and active banner`.

### Task T2.3: `BattleList`, `BattleListActions`, сторінка, `loading.tsx`, i18n (A1)

**Files:** Create: `components/battle/list/{BattleList,BattleListActions}.tsx`, `app/campaigns/[id]/dm/battles/loading.tsx`; Modify: `app/campaigns/[id]/dm/battles/{page,page-client}.tsx` (`DeleteAllBattlesButton` → пункт меню), `messages/{uk,en}/battleSetup.json` (`list.*` ≈ +16; `list.card.round/participants` замінюються); Delete: `BattleSections.tsx`, `BattleListCard.tsx` (тести перенести).
**Рішення:** шапка — «Нова битва» (phone — іконка з `aria-label`) + «⋯ Видалити всі битви…»; банери активних; `SearchInput` + `HudChipTabs` «Усі · Підготовлені N · Завершені N»; підготовлені — `grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]`; завершені — `Disclosure`, згорнутий (розгорнутий, коли фільтр = «Завершені»); стани за D-A §2.5; `OnboardingHint dm.battles` над порожнім станом. Сторінка: `loadBattleListCards` замість прямого `prisma.battleScene.findMany`.
**Test cases:** банер лише для active; чипи рахують і фільтрують; завершені згорнуті; порожній стан; фільтр без результатів — тиха панель.
- [ ] Тести → реалізація → lint → commit `feat(battles): redesigned battle list page`.

### Task T2.4: Каталог учасників (A2)

**Files:** Create: `components/battle/setup/participants/{ParticipantCatalog,CatalogRow,SideToggle,DprBreakdownTip}.tsx` + тести.
```ts
export function SideToggle(p: { side: ParticipantSide; onChange: (s: ParticipantSide) => void; label: string; size?: 'sm' | 'md' }): JSX.Element; // HudSegmented, ally=Shield/accent, enemy=Swords/muted crimson
export function CatalogRow(p: { entity: SetupEntity; kind: 'hero' | 'unit'; stats: EntityStats | null; state: { side: ParticipantSide; quantity?: number } | null; actions: CatalogActions }): JSX.Element;
export interface CatalogActions { add: (side: ParticipantSide) => void; setSide: (side: ParticipantSide) => void; setQuantity: (n: number) => void; remove: () => void }
export function ParticipantCatalog(p: { data: SetupData; entityStats: SetupEntityStats; selection: BattlePreparationParticipant[]; actions: ParticipantActions }): JSX.Element;
```
(типи `SetupEntity`/`SetupData`/`EntityStats` — звірити з `useBattleSetup`/`useNewBattleData`; `setSide` = `addToSide` для наявного, R11.)
**Рішення:** сегмент «Герої N | Істоти N» (`HudSegmented`), спільний пошук, чіпи рас (`useSetupUnitsFilter`), групи рас — `Disclosure`, згортання в `sessionStorage` через `createSessionFlag` (try/catch уже всередині). Рядок 52 px, аватар 36, `DPR · HP · KPI` `tabular-nums`; не обрано — `[+ Союзник] [+ Ворог]` (текст на ≥ xl, інакше іконки з `aria-label` «Додати Скелет до ворогів»); обрано — `SideToggle`, степер (`BoundedNumberInput` + кнопки) для істот, ✕; смуга 3 px кольору сторони + `bg-hud-panel-2`. Клік по рядку: герой → союзники / прибрати, істота → вороги / прибрати (рішення власника 3). `cycleUnit` у UI не використовується.
**Test cases:** «+С»/«+В» → `addToSide` з правильною стороною; сегмент → зміна сторони; степер → `setQuantity`; клік по рядку героя → ally, істоти → enemy; повторний клік → `remove`; `sessionStorage` кидає → групи розгорнуті, без винятку; aria-label.
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): participant catalog`.

### Task T2.5: `RosterBoard`, `BalanceMeter`, phone-смуга (A2)

**Files:** Create: `components/battle/setup/participants/{RosterBoard,RosterPhoneBar}.tsx`, `components/battle/setup/balance/BalanceMeter.tsx`; Modify: `SetupParticipantRow.tsx` (щільність, аватар 32), `messages/{uk,en}/battleSetup.json` (`participants.*` ≈ +12, −4; `balance.*` ≈ +4).
```ts
export function RosterBoard(p: { participants: BattlePreparationParticipant[]; data: SetupData; actions: ParticipantActions; balance: BalanceView; autopick?: ReactNode }): JSX.Element;
export function BalanceMeter(p: { kind: 'fair' | 'xp'; fair: FairBalance | null; xp: XpBalance | null; units: SetupUnit[] }): JSX.Element;
```
**Рішення:** дві колонки «Союзники/Вороги» (< 1600 одна під одною), порожня — пунктирна зона; терези сили (DPR×HP) + вердикт + множники, `[?]` → `Popover` з `BalanceSummary`/`XpBalanceSummary`; вердикт: рівно — `--hud-good` приглушений, слабко/надмір — бурштин (не малиновий); автопідбір — згорнутий `Disclosure` з `AutopickCard` (лише створення). Phone: липка смуга «⚖ Рівно · 4 VS 7 · [Склад ▴]» → `SideSheet` знизу з `RosterBoard` + автопідбором.
**Test cases:** ⇄ і ✕ у рядку; резерв; порожня колонка; автопідбір лише при `autopick`; `[?]` відкриває деталі; xp-режим показує бюджет.
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): roster board and balance meter`.

### Task T2.6: `MapWorkbench` + `ActiveToolChip` (A3)

**Files:** Create: `components/maps/editor/{MapWorkbench,ActiveToolChip}.tsx`; Modify: `components/maps/MapEditorScreen.tsx`, `components/maps/editor/EditorSidebar.tsx` (активна вкладка — `border-hud-accent` + `bg-hud-panel-2`); Test: `components/maps/editor/__tests__/MapWorkbench.test.tsx`, наявні тести редактора бібліотеки.
```ts
export function MapWorkbench(p: { canvas: ReactNode; sidebar: ReactNode; toolbar?: ReactNode; fullscreen: { value: boolean; set: (v: boolean) => void; label: string }; onEscape?: () => boolean }): JSX.Element;
export function ActiveToolChip(p: { tool: { label: string; detail?: string } | null; onClear: () => void }): JSX.Element | null;
```
**Рішення:** полотно на всю висоту `calc(100dvh - var(--app-header-h) - var(--workbench-offset, 0px))` — одна константа; бічна 22rem праворуч; плашка інструмента ліворуч угорі полотна; тост `editor.notice` унизу полотна (`role="status"`); `Esc` на полотні: знімає інструмент (`onEscape` повертає `true`), інакше виходить із повного екрана; повний екран — `FullscreenOverlay` з тією ж бічною панеллю й «Готово». Редактор бібліотеки (`/dm/maps/[mapId]`) переходить на `MapWorkbench` без зміни поведінки.
**Test cases:** рендер у редакторі бібліотеки (наявні тести зелені); повний екран вмикається/вимикається; `Esc` з інструментом → знято, без інструмента → вихід із повного екрана.
- [ ] Тести → реалізація → lint → commit `refactor(maps): shared map workbench`.

### Task T2.7: `BattleMapSidebar`, `MapQuickStart`, `thumb`, «Зберегти в бібліотеку» (A3)

**Files:** Create: `components/battle/setup/map/{BattleMapSidebar,MapQuickStart,SaveToLibraryButton}.tsx`; Modify: `types/battle-map.ts` (`BattleMapBrief.thumb: string | null`), `lib/server/battle-maps/library-service.ts` (select `header.background` → `thumb` через `isPreviewSafeBackground`; R7), `messages/{uk,en}/battleSetup.json` (`map.*`).
```ts
export type BattleMapPanel = 'size' | 'background' | 'cells' | 'edges' | 'mode' | 'motion';
export function BattleMapSidebar(p: { editor: BattleMapEditor; panel: BattleMapPanel; onPanel: (p: BattleMapPanel) => void; uvtt: ReactNode }): JSX.Element;
export function battleMapToLibraryInput(map: BattleMapEditorState, name: string): BattleMapInput; // pure; reuse the converter MapEditorScreen/library already has if present
```
**Рішення:** панелі за D-A §3.3.3 (вміст — наявні секції); видимість: `cells`/`edges` disabled з поясненням (`hexEdgesOff`, `edgesDesktopOnly`, `edgesDisabledMode`), `mode` схована без режимів, `motion` — без `editor.motionTool`; зміна панелі знімає інструмент чужої панелі (клітинки ↔ краї). «Як почати» поверх полотна для стандартної 20×15 без фону: «Завантажити зображення», «Імпорт UVTT», «Порожня сітка» — зникає після першої дії, не показується при редагуванні наявної мапи. «Зберегти в бібліотеку» (рішення власника 2): діалог назви → `useBattleMapMutations(campaignId).create.mutateAsync(battleMapToLibraryInput(...))` → `useNotify` з посиланням; бій лишається зі своєю мапою (не прив'язується). Помилка схеми (`libraryTerrainRuntime` тощо) — текст помилки в діалозі. Конвертер: спершу знайти наявний у `lib/utils/battle/grid/**` або `lib/hooks/battle-maps/**`; новий — у `lib/utils/battle/grid/` (не `pipeline/turn`).
**Test cases:** hex → «Стіни» приглушені з поясненням; дотик → `edgesDesktopOnly`; `hidesTerrain` → `cells`/`edges` disabled; без режимів — немає «Режим»; зміна панелі знімає чужий інструмент; «Зберегти в бібліотеку» викликає `create` з назвою; конвертер — чиста функція (walls/bars/doors переносяться).
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): map sidebar, quick start, save to library`.

### Task T2.8: `MapSourceChoice`, `LibraryMapGrid`, `BattleMapStep` (A3; після T2.2)

**Files:** Create: `components/battle/setup/map/{MapSourceChoice,LibraryMapGrid,BattleMapStep}.tsx`; Delete (після переносу тестів): `BattleMapLibraryPicker.tsx`.
**Interfaces — Consumes:** `BattleMapThumb` (T2.2, `size='tile'`), `MapWorkbench` (T2.6), `BattleMapSidebar` (T2.7).
```ts
export function BattleMapStep(p: { campaignId: string; editor: BattleMapEditor; library: BattleLibraryMap }): JSX.Element;
export function MapSourceChoice(p: { value: 'none' | 'own' | 'library'; onChange: (v: 'none' | 'own' | 'library') => void; libraryVisible: boolean }): JSX.Element; // HudSegmented
export function LibraryMapGrid(p: { library: BattleLibraryMap; campaignId: string; onClear: () => void }): JSX.Element;
```
**Рішення:** сегмент джерела замість карток і `ToggleRow` («Своя» = `setEnabled(true)`, решта — `false`, як `chooseMap`); «З бібліотеки» лише при `library.visible`. Без мапи — тиха панель + 2 кнопки. Бібліотека: `SearchInput`, сітка `auto-fill minmax(11rem,1fr)`, обрана — `ring-2 ring-hud-accent` + ✓, завелика — `aria-disabled` + tooltip `tooLarge`, бій не prepared — уся сітка disabled з `locked`; рядок статусу `battleSetup.library.*`; ≥ 1280 — велике read-only прев'ю обраної (`BattleMap`); «Відкрити в редакторі ↗» на `/dm/maps/[mapId]`.
**Test cases:** сегмент → `setEnabled`/`library.select`; без бібліотеки — два пункти; завелика — disabled; locked; тест `BattleMapLibraryPicker` перенесено.
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): map step with source choice and library grid`.

### Task T2.9: `SetupHeader`, `SetupSummary`, `useBattleSetupView` (A4; після A2, A3)

**Files:** Create: `components/battle/setup/form/{SetupHeader,SetupSummary}.tsx`, `lib/hooks/battles/setup/useBattleSetupView.ts`; Test: поруч.
```ts
export function useBattleSetupView(): {
    catalog: { tab: 'heroes' | 'units'; set: (t: 'heroes' | 'units') => void };
    mapPanel: { value: BattleMapPanel; set: (p: BattleMapPanel) => void };
    fullscreen: { value: boolean; set: (v: boolean) => void };
    roster: { open: boolean; set: (v: boolean) => void };
};
export function SetupHeader(p: { details: SetupDetails; campaignId: string; isEdit: boolean }): JSX.Element; // name input (required) + «Деталі» Popover/ResponsiveDialog with BattleFormBasicInfo + «← До битв»
export function SetupSummary(p: { participants: BattlePreparationParticipant[]; balance: BalanceView; map: { enabled: boolean; cols: number; rows: number } }): JSX.Element;
```
**Рішення:** назва — `hud-sc` 22 px без рамки, підкреслення `--hud-rule`, фокус — золото; помилка під інпутом; «Деталі» з крапкою-індикатором, коли опис заповнено або таймер увімкнено (desktop — `Popover`, phone — `ResponsiveDialog`). Підсумок: лічильники сторін, вердикт-пігулка (бурштин для «Немає ворогів»), мапа.
**Test cases:** required-назва → `aria-invalid` + фокус; індикатор «Деталі»; підсумок «Немає ворогів».
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): setup header and summary`.

### Task T2.10: `BattleSetupForm` на 2 вкладки (A4)

**Files:** Modify: `components/battle/setup/form/{BattleSetupForm,battle-form-tabs}.ts(x)`, `messages/{uk,en}/battleSetup.json` (`form.*` ≈ +12; −`tabs.{basic,heroes,units,roster}`, −`mapChoice.*.description`, −`enabled`); Delete: `CharactersListCard`, `UnitsListCard`, `SidePanelCard`, `SetupEntityCard`, `BattleFormMap`, `ToggleRow` (+ перенос тестів `battle-setup-form.test`, `BattleFormMap*.test`, `setup-participant-row.test`, `setup-intl.test`).
**Рішення:** `HudFormPage width="page"` (R2); `SetupHeader` → `HudTabs` «Учасники 4 VS 7» / «Мапа ✓ 20×15» (`keepMounted`, анімація `useTabDirection`) → липкий `ActionBar`: ліворуч `SetupSummary`, праворуч «⋯» (Видалити — лише редагування), «Скасувати», «Створити битву»/«Зберегти» + «Створити й почати» (T2.11). «Учасники»: `grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]`, обидві колонки з власною прокруткою; phone — каталог + `RosterPhoneBar`. Бій не prepared → банер «Бій уже почався…» (новий ключ) і read-only каталог/мапа. Стани за D-A §3.5; `SetupLoading` — скелет тієї ж геометрії. `OnboardingHint dm.battle-setup` зберегти. Ресайз полотна при показі прихованої вкладки — перевірити (ризик 7).
**Test cases:** 2 вкладки з лейблами стану; невалідна назва → фокус у шапці без перемикання вкладки; locked-банер; «Видалити» лише в «⋯»; наявні сценарії збереження/редиректу зелені.
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): two-tab setup form`.

### Task T2.11: «Створити й почати» (A4)

**Files:** Modify: `lib/hooks/battles/setup/useBattleForm.ts` (+ тест), `BattleSetupForm.tsx`.
```ts
// useBattleForm(...).actions.submit(e, opts?: { start?: boolean })
// start: create → startBattle(campaignId, battle.id, {}) → router.push(`${listHref}/${battle.id}`); start failure → notify + still navigate
```
**Рішення:** лише при створенні; кнопка поруч із основною (outline), `data-tour` не переносимо. Виклик `startBattle` — через `lib/api/battles` у хуку (як `useScenarioPlay`), компонент `fetch`/`lib/api` не імпортує.
**Test cases:** `start: true` → `startBattle` викликано один раз, потім `push`; помилка старту → `notify`, `push` все одно; без `start` — поведінка як раніше.
- [ ] Тести → реалізація → lint → commit `feat(battle-setup): create and start`.

### Живий прогін W2

Стенд 3100 / `ch8_live` (кампанія d20/HOMM5 — R15). 1280, 1600, 1920 і 390, 540; tavern і parchment. DM створює бій з нуля: 2 героя + 2 види істот (кнопки й клік по рядку), автопідбір, своя мапа (фон, стіни, двері, повний екран, `Esc`), «Зберегти в бібліотеку», «Створити й почати»; редагування prepared і locked; список: банер «Продовжити», фільтри, завершені з переможцем, «Видалити» в «⋯», «Видалити всі»; `/dm/maps/[mapId]` без регресії. Консоль, 5xx, сирі ключі.

---

## 9. Хвиля 3 — D-C: «Показ» і «Сценарій»

| Агент | Задачі | Файли |
|---|---|---|
| C1 | T3.1–T3.3 | `app/campaigns/[id]/dm/show/**`, `components/show/editor/**` (підтеки `deck/`, `slides/`), `lib/utils/show/deck-groups.ts`, `package.json`, `pnpm-lock.yaml`, `show.{decksPage,deckEditor,addSlides}.*` |
| C2 | T3.4–T3.5 | `components/show/stage/**` (підтека `rail/`), `app/campaigns/[id]/show/**`, `lib/hooks/show/useShowHostMode.ts` (+ barrel), `show.{rail,mode}.*` |
| C3 | T3.6–T3.8 (після T3.5) | `components/scenario/book/**`, `components/scenario/play/ScenarioShowDock.tsx`, `app/campaigns/[id]/dm/scenario/**`, `lib/hooks/scenario/useShowDockExpanded.ts` (+ barrel), `lib/utils/scenario/index-groups.ts`, `messages/*/scenario.json` |
| C4 | T3.9 | `components/scenario/graph/{ScenarioGraph,GraphInspector,GraphListPanel}.tsx`, `app/campaigns/[id]/dm/graph/page-client.tsx` |

Спільний файл: `messages/{uk,en}/show.json` (C1 і C2 — різні підоб'єкти, R17). `lib/hooks/show/index.ts` — лише C2.

### Task T3.1: `groupDecksByScene`, `DeckCard`, список колод (C1)

**Files:** Create: `lib/utils/show/deck-groups.ts` (+ тест); Modify: `components/show/editor/deck/DeckCard.tsx` (переїзд у підтеку), `app/campaigns/[id]/dm/show/page-client.tsx`; Test: `components/show/editor/deck/__tests__/DeckCard.test.tsx`.
```ts
export interface DeckGroup<D> { sceneId: string | null; title: string | null; decks: D[] }
export function groupDecksByScene<D extends { scenarioPageId: string | null }>(decks: D[], pages: { id: string; title: string }[]): DeckGroup<D>[]; // scene order, «no scene» last, missing scene → «no scene»
export function DeckCard(p: { deck: DeckBrief; href: string; live: boolean; actions?: { onPreview?: () => void; onDelete?: () => Promise<unknown> }; pending: boolean; canEdit: boolean; 'data-tour'?: string }): JSX.Element;
```
**Рішення:** обкладинка — посилання; hover/focus — затемнення + «▶ Почати показ» (на дотику видима завжди); `⋮` = `ActionsMenu` (Попередній перегляд, Видалити з `useConfirm`); «Наживо» — `useShowState(campaignId).deckId` → `HudPill` + `ring-hud-accent`; шапка — «Повернутись до показу», коли показ іде; сітка `auto-fill minmax(260px,1fr)`; пошук при `decks.length > 8`; заголовки груп — `HudSectionTitle`; демо — картка веде на preview, без «Почати».
**Test cases:** порядок сцен; «Без сцени» в кінці; колода зі зниклою сценою → «Без сцени»; «Наживо» при `live`; «Видалити» лише в меню через confirm; без `canEdit` — preview і без «Почати».
- [ ] Тести → реалізація → lint → commit `feat(show): grouped deck list with live badge`.

### Task T3.2: `SlideInspector` і робочий простір редактора (C1)

**Files:** Create: `components/show/editor/slides/SlideInspector.tsx` (виділено з `SlideDialog.tsx` → `SlideForm`); Modify: `SlideDialog.tsx` (обгортка < 1200), `SlideGrid.tsx` (→ `slides/`), `app/campaigns/[id]/dm/show/[deckId]/page-client.tsx` (`HudPage lg` замість `HudFormPage`); Test: `components/show/editor/slides/__tests__/SlideInspector.test.tsx`, редактор.
```ts
export function SlideInspector(p: { campaignId: string; slide: { slide: DeckSlide; index: number } | null; actions: { dispatch: DeckDispatch; close: () => void }; variant: 'panel' | 'dialog' }): JSX.Element;
```
**Рішення:** ≥ 1200 (`useMediaQuery`) — ліва колонка сітка мініатюр `minmax(160px)`, права — інспектор 400/440/520 (`ds-panel`, sticky, власний скрол), перший слайд обрано за замовчуванням; < 1200 — `SlideDialog` як зараз. Sticky-шапка: «← Колоди», назва, `DeckSceneSelect`, `HudPill` «● Не збережено»/«Збережено» (R12), «Зберегти» (outline), «▶ Почати показ» (default). `Ctrl/⌘+S` — `save()` лише при `dirty` (через `shortcut-guard` з `lib/hooks/common`, якщо підходить). Мініатюра: `ds-inset`, вибрана — `ring-2 ring-hud-accent`, бейджі як у `ShowDeckStrip`.
**Test cases:** ≥ 1200 вибір мініатюри показує інспектор, не діалог; < 1200 — діалог; `Ctrl+S` при `dirty` → `save`, без `dirty` — ні; порожня колода — підказка в інспекторі.
- [ ] Тести → реалізація → lint → commit `feat(show): deck editor workspace with slide inspector`.

### Task T3.3: Додавання, drop, перестановка `@dnd-kit` (C1)

**Files:** Create: `components/show/editor/slides/{AddSlidesMenu,SlideDropTile}.tsx`; Modify: `SlideGrid.tsx`, `package.json`, `pnpm-lock.yaml`, `messages/{uk,en}/show.json`; Delete: `AddSlidesBar.tsx` (тест перенести).
**Interfaces — Consumes:** `FileDropZone` (T0.6) для плитки, `useDeckEditor().upload`.
**Рішення:** `+ Додати ▾` (`DropdownMenu`): Зображення… / Пазл… / За посиланням… (поповер) / Згенерувати… (лише з провайдерами); плитка-дропзона в кінці сітки + drop на всю ліву колонку (`preventDefault` лише в колонці), ліміт `MAX_SLIDES_PER_DECK`, `SLIDE_FILE_ACCEPT`, нотифікація `addSlides.partial`, прогрес у плитці. Перестановка: `@dnd-kit/sortable` (миша/дотик, `KeyboardSensor`), кнопки ‹ › в інспекторі й на hover, `Alt+←/→` на мініатюрі, `Delete` — видалити (confirm лише для пазлів). Перестановка = наявна дія reducer-а (`move`), без нової логіки збереження.
**Test cases:** drop 3 файлів при 1 вільному → `addFiles` з 1 + `partial`; `Alt+→` переміщує на 1; `Delete` на пазлі → confirm; drag-завершення (`onDragEnd` мок) → `dispatch(move)`.
- [ ] `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` → тести → реалізація → lint → commit `feat(show): add menu, drop tile and sortable slides`.

### Task T3.4: Транспорт, стрічка, «Зараз на екрані», токени (C2)

**Files:** Modify: `components/show/stage/{ShowTransport,ShowDeckStrip,show-ui}.tsx`; Create: `components/show/stage/rail/ShowNowCard.tsx`; Test: поруч.
```ts
ShowTransport: + size?: 'sm' | 'lg'
ShowDeckStrip: + orientation?: 'row' | 'grid'
export function ShowNowCard(p: { show: ShowState; deck: DeckBrief | null }): JSX.Element; // caption, badges, «next» preview from show.nextImageUrl
```
**Рішення:** `lg`: «Далі» — `Button` default з підписом, «Назад» outline, «Шторка» toggle з `aria-pressed` (золото), «Завершити» — `destructive` з `ml-auto`; рядок `<kbd>` ← → B N H (прихований на дотику, `useCoarsePointer`); кнопки 40 px. `SHOW_TONE`/`ShowButton` → `ds-panel`, `text-hud-muted`, `ring-hud-accent`, але через змінні `--show-*`, щоб `ScenarioShowDock` у книзі лишився сумісним.
**Test cases:** «Далі» disabled на останньому; прев'ю «далі» з `nextImageUrl`; «Завершити» → confirm; `orientation='grid'` рендерить сітку.
- [ ] Тести → реалізація → lint → commit `feat(show): large transport, now card, tavern tokens`.

### Task T3.5: `ShowControlRail` + DM-розкладка `/show` + режим ведучого (C2)

**Files:** Create: `components/show/stage/rail/ShowControlRail.tsx`, `lib/hooks/show/useShowHostMode.ts`; Modify: `app/campaigns/[id]/show/page-client.tsx`, `ShowControlPanel.tsx` (тонка обгортка < 1200 або видалити), `lib/hooks/show/index.ts`, `messages/{uk,en}/show.json`; Test: `components/show/stage/rail/__tests__/ShowControlRail.test.tsx`, `app/campaigns/[id]/show/__tests__/*`.
```ts
export type ShowHostMode = 'host' | 'clean';
export function useShowHostMode(): { mode: ShowHostMode; set: (m: ShowHostMode) => void; toggle: () => void }; // createStorageValue('show-host-mode'), default 'host'
export function ShowControlRail(p: { campaignId: string; show: ShowState; control: ShowControl; layout: 'rail' | 'sheet'; extra?: ReactNode }): JSX.Element;
```
**Рішення:** `host` ≥ 1200 — сітка `1fr 380px` (wide 420, ultra 480), рейка `ds-panel` повної висоти: `ShowNowCard` + `ShowTransport lg` / колода + `ShowDeckStrip grid` / `Disclosure` «Мапа світу» (`ShowWorldControls`) і «Звуки» (`SoundboardPanel`); `host` < 1200 — липка нижня панель (‹ 3/14 › B ■ ☰ Пульт), «Пульт» → `SideSheet` з `layout='sheet'`; `clean` — лише сцена + малий перемикач у куті (DM, не у fullscreen). Перемикач «Режим ведучого / Чиста сцена» у шапці сцени, `H` перемикає (R13), вибір зберігається; fullscreen ховає рейку. `ShowBattleCall` — оверлей на сцені. `playerView.enabled` — ні рейки, ні панелі. Перехід колонок — `transition-[grid-template-columns]` 200 ms, reduced-motion — без анімації. `data-tour` `show.present`/`show.stage`/`show.nav` на нових місцях.
**Test cases:** DM ≥ 1200 + `host` — рейка; < 1200 — нижня панель і «Пульт»; `clean` — ні рейки, ні панелі; `H` перемикає й зберігає; `localStorage` кидає → `host` без винятку; `playerView` — нічого.
- [ ] Тести → реалізація → lint → commit `feat(show): host control rail and clean scene mode`.

### Task T3.6: Широка сітка книги сценарію (C3)

**Files:** Modify: `components/scenario/book/{scenario-book.css,ScenarioLayout.tsx,ScenarioToc.tsx,ScenarioBar.tsx}`, `app/campaigns/[id]/dm/scenario/[pageId]/**` (лише `tocInline`); Test: `app/campaigns/[id]/dm/scenario/__tests__/page*.test.tsx` (оновити) + новий кейс `tocInline`.
**Рішення:** `.sb-layout` → CSS grid з іменованими областями (`toc story notes rail`); змінні `--sb-max` (1460 / 1640 без рейки / 1880 з рейкою / 2280 ultra), `--sb-notes-w` (320/380/420/460), `gap` 48 на wide; брейкпоінти `@media (min-width: 1600px)` і `(min-width: 2200px)`; ultra кегль `clamp(19px, 0.25vw + 14px, 21px)` (рішення власника 5); `.sb-bar-in` `max-width: var(--sb-max)`; чипи прив'язок `max-width` 220 на ≥ 1600. Акцент (рішення власника 4): активний TOC, `:focus-visible`, hover-заголовки → `--gold`; світла книга — новий `--gold-ink` (контраст ≥ 4.5 на `--page`, перевірити числом); `--blood` лишається для «Читати вголос», буквиці, `event`, помилок. `tocInline = wide && (!ai.isOpen || useMediaQuery('(min-width: 1900px)'))`. Друк — без змін.
**Test cases:** `tocInline` при відкритому AI: 1900+ → true, 1300 → false; наявні тести сторінки зелені.
- [ ] Тести → реалізація → lint → commit `feat(scenario): wide book grid and gold accent`.

### Task T3.7: Рейка показу в сценарії (C3; після T3.5)

**Files:** Modify: `components/scenario/play/ScenarioShowDock.tsx` (+ `placement`), `lib/hooks/scenario/useShowDockExpanded.ts` (+ `useShowDockPlacement`), `lib/hooks/scenario/index.ts`, `messages/{uk,en}/scenario.json` (`play.toRail`, `play.toDock`); Test: `components/scenario/play/__tests__/ScenarioShowDock-rail.test.tsx`.
```ts
export function useShowDockPlacement(): ['rail' | 'dock', (p: 'rail' | 'dock') => void]; // createStorageValue, default 'rail' (owner decision 3)
ScenarioShowDock: + placement: 'dock' | 'rail'
```
**Interfaces — Consumes:** `ShowControlRail` (T3.5) з `layout='rail'`, обгорнутий змінними `--show-*` книги.
**Рішення:** рейка лише ≥ 1600 і `playEnabled`; < 1600 — док знизу як зараз; у `rail` `--sb-dock-h: 0` (інакше TOC обрізається); AI-панель відкрита на ≥ 1600 → рейка тимчасово стає доком (дві праві панелі одночасно не показуються), вибір користувача не перезаписується; «⇥» перемикає рейку/док і зберігає; демо (`readOnly`) — транспорт вимкнено.
**Test cases:** `placement='rail'` → `--sb-dock-h` = 0; перемикач у док зберігається; AI відкрита → док; `localStorage` кидає → `rail`.
- [ ] Тести → реалізація → lint → commit `feat(scenario): show rail beside the book`.

### Task T3.8: `nextSceneOf` + `ScenarioIndexAside` (C3)

**Files:** Modify: `lib/utils/scenario/index-groups.ts` (+ тест), `components/scenario/book/ScenarioIndex.tsx`; Create: `components/scenario/book/ScenarioIndexAside.tsx`; `messages/{uk,en}/scenario.json` (`indexAside.*`).
```ts
export function nextSceneOf(pages: ScenarioPageBrief[]): ScenarioPageBrief | null; // first scene in groupIndex(pages).arcs order with status !== 'played'; skips heroes/notes
export function ScenarioIndexAside(p: { campaignId: string; pages: ScenarioPageBrief[] }): JSX.Element;
```
**Рішення:** ≥ 1280 — список ≤ 880 + aside 320 (ultra 380) sticky: «Продовжити» (наступна сцена, «Відкрити →»), прогрес зіграні/усі, переходи на граф і колоди, легенда; ≥ 1600 — «Герої» і «Нотатки» дві колонки; phone — компактна «Продовжити» над пошуком; рядок — hover `var(--margin)` і позначка «зараз». Без нових запитів.
**Test cases:** усі зіграні → `null` і «Усе зіграно»; герої/нотатки пропускаються; порядок арок.
- [ ] Тести → реалізація → lint → commit `feat(scenario): index aside with next scene`.

### Task T3.9: Граф на широкому екрані + M10 (C4)

**Files:** Modify: `components/scenario/graph/{ScenarioGraph,GraphInspector,GraphListPanel}.tsx`, `app/campaigns/[id]/dm/graph/page-client.tsx`; Test: `components/scenario/graph/__tests__/*`.
**Рішення:** ≥ 1600 — `HudPage` без `max-w` (поля 24 px), сітка `288px 1fr 360px`, інспектор — колонка, не оверлей; `fitView` після появи інспектора; 1200–1599 і phone — як зараз. Токени: `border bg-card` → `ds-panel`, `text-muted-foreground` → `text-hud-muted`. `GRAPH_TYPE_STYLE` і `GraphScene` — без змін. M10 з `.superpowers/sdd/2026-11-25-design-system-migration/final-review.md` — виправити, якщо в цих файлах.
**Test cases:** ≥ 1600 (мок) інспектор не `absolute`; < 1600 — оверлей як був.
- [ ] Тести → реалізація → lint → commit `feat(graph): inspector column on wide screens`.

### Живий прогін W3

1280, 1600, 1920, 2560 і 390, 540 (2560/1920 — вимога D-C); tavern і parchment (книга: світла/нічна). `/dm/show` (групи, «Наживо», «⋮»), редактор колоди з 15+ слайдами (інспектор, drop, dnd, Alt+стрілки, Ctrl+S), `/show` DM у двох режимах + вікно гравця, сцена в режимі гри (рейка, AI-перемикання, TOC), індекс, граф; контраст `--gold-ink`. Консоль, 5xx, сирі ключі, тури `show.*`.

---

## 10. Завершення частини

### Task T4.1: Ворота (контролер)
- [ ] `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main` (не повний `pnpm lint`; перед — `ps` на важкі процеси).
- [ ] Один повний `pnpm test:run` (обов'язковий: нова залежність `@dnd-kit`, R16). Падіння → фікс-агент, повтор лише впалих файлів (`pnpm test:run <file>`), потім ще раз повний.

### Task T4.2: whats-new і довідка (агент Sonnet)
Files: `lib/onboarding/whats-new.ts`, `messages/{uk,en}/whatsNew.json`, `messages/{uk,en}/help.json` (статті про битви/імпорт/правила). Тест `whats-new` зелений. Commit `docs(onboarding): whats-new for ch8 redesign`.

### Task T4.3: `/simplify` (1 агент Sonnet) на дифі гілки проти main; лише якість, без нових фіч.

### Task T4.4: Фінальне Opus-рев'ю всієї гілки (код + відповідність трьом spec-ам і «Рішенням власника»); звіт `final-review.md` у `.superpowers/sdd/<run>/`; фікс-агент Sonnet для C/I і «fix-now» M; повторний живий прогін лише виправлених місць.

### Task T4.5: Документація (агент Sonnet)
- `docs/architecture/ui-layers.md` — каркас `HudFormPage width`, рейка `HudTabs`, `HudFormMenu`, `HudSegmented`, `FileDropZone`, `.ds-fields*`/`.ds-list-grid`/`.ds-setting-row`, `MapWorkbench`.
- `docs/architecture/battle.md` — список битв (`loadBattleListCards`), форма з 2 вкладками; `docs/architecture/show.md` — пульт, режим ведучого, рейка в сценарії; `.claude/rules/components.md` — рядки «що коли» для `HudSegmented`, `HudFormMenu`, `FileDropZone`.
- `docs/STATUS.md` — підсумок Ч8 хвиль, відкриті хвости.

### Злиття (лише на «так» власника)
У merge-коміті: `git mv docs/superpowers/specs/2026-11-26-{dm-battles-and-creation,sheet-library-compendium-rules,show-and-scenario-wide}-redesign.md docs/archive/superpowers/specs/` і `git mv docs/superpowers/plans/2026-11-26-game-style-ui-ch8-waves.md docs/archive/superpowers/plans/` (DS-spec лишається живим джерелом). Злиття в тимчасовому worktree (`feedback-shared-checkout`), push — окремо на запит.

---

## 11. Обсяг і ризики

**Обсяг:** 45 задач, 18 агентів-виконавців (Sonnet): W0 — 6 задач / 3 агенти (один — живий), W1 — 19 / 7, W2 — 11 / 4, W3 — 9 / 4. Плюс 3 живі прогони (W1–W3), фінальні: whats-new (1), `/simplify` (1), Opus-рев'ю (1), фікс (1–2), docs (1) → ≈ 27 запусків агентів. Орієнтовно 4 сесії контролера (по одній на хвилю + фінал); контролер — Sonnet (`/model sonnet`), Opus лише рев'ю. Перед стартом — нагадати власнику про `/usage` (стоп на 85 %).

| Ризик | Пом'якшення |
|---|---|
| Сітка `display: contents` + `:has` у `HudFormPage wide` ламає фокус/доступність таблиці вкладок | тести T0.2/T0.3 на ролі; живий прогін Tab-порядку W1 |
| Одна кнопка дій у двох позиціях (CSS `order` + sticky) | тест «рівно одна кнопка»; 390/1600 у прогоні |
| Перенос `reference.card.*` (R6) зачіпає `/info` і редактори одночасно | одна задача T1.10 + сторож `route-scopes` |
| Бюджети i18n (`CAMPAIGN_BASE` для світоглядів, маршрути) | вимір у задачі, підйом лише свого маршруту; база — питання R9 |
| `$queryRaw` у списку битв (перший raw у списку) і заборонена зона | R7; тест форми результату; без згоди — урізаний варіант |
| `MapWorkbench` спільний з редактором бібліотеки — регресія `/dm/maps/[mapId]` | наявні тести + прогін W2 |
| Полотно мапи в прихованій вкладці (`keepMounted`) не перераховує розмір | перевірка в T2.10 і прогоні |
| Дві теми рейки показу (tavern на `/show`, папір у книзі) | лише змінні `--show-*`, без жорстких `hud-*` у рейці |
| Нова залежність `@dnd-kit` | лише C1; повний `test:run`; lockfile `--frozen-lockfile` на Vercel |
| Паралельні агенти в одному worktree | worktree на смугу (R17), злиття в заданому порядку |
| Тури/онбординг (`data-tour`, демо-тур довідника) | перелік у §4; перевірка в прогонах |
| Ч8a ще не в main (R1) | вирішити до старту W0 |
