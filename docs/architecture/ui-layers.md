# Шари UI

Імпорт іде лише вниз. Межі перевіряє ESLint `ui-layers/zone` (таблиця зон — `scripts/shared/ui-layers.mjs`) і `lib/__tests__/ui-layers.test.ts`; тести (`__tests__`, `*.test.*`) і `lib/i18n/test/**` з перевірки виключено.

## Карта шарів

| Шар | Теки | Приклади |
|---|---|---|
| L0 `ui` | `components/ui` | `Button`, `ResponsiveDialog`, `FullscreenOverlay`, `action-bar`, `portal-class` |
| L1 `hud` | `components/hud` | `HudPage`, `HudForm`, `shell/GameShell`, `fonts`, `metal` |
| L2 `common` | `components/common` | `ImageUpload`, `states/*`, `SearchInput`, `IconUrlField` |
| L2.5 `fx` | `components/fx` | `BattleFxLayer`, `animations/*`, `auras/*` (без імпорту `battle`/`spells`; слот модуля приходить пропсом `fx`) |
| L3 домени | `components/<домен>`, `components/systems` (шов: `registry`, `types`, `compose`) | `battle`, `characters`, `units`, `dice`, `show/world`, `scenario/page`, `ai/settings` |
| L4 системні | `systems/<id>/ui`, `systems/<id>/hooks` | `systems/d20/ui/stats`, `systems/wfrp/ui/creation` |
| L5 сторінки | `app/**` | `page.tsx` (сервер, `PrefetchedQuery`), `*-client.tsx` (композиція) |

`lib/**` не імпортує `components/**`.

## Що дозволено

| Шар | Може брати | Не може |
|---|---|---|
| `ui` | `ui`, `@/components/hud/fonts`, `@/components/hud/surface`, `hud/hud.css`, `@/lib/utils` (корінь, `cn`), `lib/utils/common`, `lib/hooks/common` | інші `hud`/`common`/домени, `@/types/*`, `lib/api`, `lib/server`, `systems` |
| `hud` | `ui`, `hud`, ті самі `lib` | `common`, домени, `@/types/*`, `lib/api`, `lib/server`, `systems` |
| `common` | `ui`, `hud`, `common`, `@/types/theme`, `lib/utils/{common,text}`, `lib/hooks/common`, `lib/constants` | доменні компоненти й типи, `lib/api`, `lib/server`, `systems` |
| `fx` | `ui`, `hud`, `common`, `dice`, `fx`, `components/systems/types` | `battle`, `spells` та інші домени, `lib/api`, `lib/server` |
| системний UI | `ui`, `hud`, `common`, `components/systems/types` і кіт (нижче) | будь-який інший core-компонент |
| `lib` | усе, крім `components` | `@/components/*` |

## Кіт core-UI для систем

Явний список `SYSTEM_UI_KIT` у `scripts/shared/ui-layers.mjs` (barrel-файлів немає). Імпорт дозволений лише дослівно за цим шляхом:

- `character-profile/ProfileContext` (дані листа), `character-profile/CombatRow`, `character-profile/RollableCell` (кнопка кидка або статична клітинка), `character-profile/RollResultView` (результат кидка в діалозі)
- `rules/RulesSection`, `rules/NumberField`, `rules/RulesPaths`
- `battle/hud/DiceInput`, `battle/wizards/attack/shared`, `battle/participants/Section`
- `abilities`, `abilities/AbilityFlow`, `artifacts/ArtifactCard`, `skills/list/SkillCard`, `ContentTransferButtons`, `ChoiceListEditor`, `OnboardingHint`, `spells/book/SpellBookPages`, `characters/rest/CharacterPickList`, `content-import/shared/SourceNotes` (нотатки джерела в боковій колонці форми), `campaigns/info/detail/ClassReferenceDetail` (перегляд «Як бачать гравці» у формі класу)

Новий пункт кіта = правка списку (видно в ревʼю) + рядок тут.

## Де що лежить

- Компонент — у теці свого домену; віджет двох доменів — у теці власника даних. `common` без доменних типів і компонентів.
- `components/hud/shell` містить презентаційну оболонку й навігаційне меню; маршрут, доступ і перекладені пункти передає композиція в `components/layout` або сторінка. Shell повторно використовує `DropdownMenu` із шару `ui` і не визначає доступ до доменних розділів.
- Огляд кампанії лишається серверною композицією `app/campaigns/[id]/page.tsx`; дані й рольові віджети — `components/campaigns/dashboard`. Hero з обкладинкою (`Campaign.coverImage`, редагується в налаштуваннях, локальний дефолт) містить назву, метадані, код запрошення, налаштування в куті й основні переходи. Сітка ДМ: загін (+ посилання на персонажів) і «Підготовка»/«Остання сесія»; мапа світу, швидкі дії (`DM_QUICK_SECTION_KEYS`, 2 в ряд) і учасники; бібліотеки. `DM_HOSTED_SECTION_KEYS` — розділи, що вже мають місце в hero/швидких діях/загоні, тому `DashboardGroups` (`hostsDmBlocks`) їх не дублює; без хостингу (гравець, демо, шаблон) показує одну панель плиток. Пошуку розділів немає. Панель активних квестів використовує серверне зведення з [журналу](quests.md). «Остання зіграна сцена» читає сценарій.
- Журнал і віджети квестів живуть у `components/quests`. Маршрут використовує `HudPage hud-wide`, спільне меню дашборду й локальний пакет повідомлень `quests`. Список та деталі на телефоні розміщені послідовно.
- Обидві сторінки мапи світу за прапором ігрового UI використовують серверну композицію `GameWorldShell` та спільні з дашбордом пункти меню. Панель «Куди далі», легенда й повноекранна розкладка належать домену `components/world`; дозволені мапи, шари та позиції надходять із чинного доменного подання.
- Хук даних/мутацій — `lib/hooks/<domain>`. Презентаційний хук (i18n, Canvas, реєстр) може жити поряд із компонентом, якщо його читачі в тій самій теці (`useBackgroundFacts`, `use-badge-labels`, `use-system-battle-ui`).
- `page.tsx` — сервер і `PrefetchedQuery`; `*-client.tsx` — композиція без внутрішніх компонентів (орієнтир ≤ ~150 рядків; виняток — `dm/world/page-client.tsx`, одна композиція хука).
- Системний d20-UI живе в `systems/d20/ui`, а не в core; нейтральні імена в контрактах слотів (`monsterStats`, `armorStats`).
- Кубики — `components/dice`; `ActionBar` — `components/ui/action-bar`; `ImageUpload` — `components/common`; `ThemeProvider` і `PaletteSwitcher` — `components/layout`.

## Сирі контроли

ESLint `raw-controls/no-raw-control` (`eslint/raw-controls.mjs`) забороняє `<button|input|select|img>` у `components/**`, `app/**`, `systems/**` поза `components/ui` і `components/hud`. Наявні порушення — `ratchets/raw-controls-exempt.json` (файл + кількість; лише скорочується). Перегенерація/перевірка росту: `node scripts/shared/raw-controls-baseline.mjs [--write]`. Таблиця «що коли» для kit — `.claude/rules/components.md`.

## Дизайн-система (DS)

Токени — `app/palettes.css`, утиліти — `components/hud/hud.css`, ключові класи й перехід — `app/globals.css`, `app/motion.css`. Рішення власника — в «Поправці 2026-11-25» у `docs/archive/superpowers/2026-11-25-design-system-migration-design.md`.

- **Поверхні:** `ds-panel` (панель), `ds-inset` (вдавлене поле), `ds-raised` (піднята картка); `HudPanel`, контент оверлеїв і `card` на них же. М'яка тінь `--hud-sh` замість 1px-рамки панелі; контроли (інпути, кнопки) рамку зберігають.
- **Акцент:** активне/вибране/майстерність/акцентні числа — `text-hud-accent-fg`, `border-hud-accent`, `bg-hud-accent` (текст на ньому — `text-hud-accent-ink`); токени `--hud-accent`, `--hud-accent-fg`, `--hud-accent-ink`. Малинове (`--hud-crimson*`, `--hud-hp*`) — лише HP, шкода, небезпека, деструктивні дії, помилки (`aria-invalid:`), попередження. Основна `Button` — золота (accent), не малинова. Жорстко прошитий crimson для акценту заборонений.
- **Палітри:** `tavern` — теплий коричневий + золото, картина `vey-strait` під віньєткою (`body::after`), зерно поверх; `parchment` — без картини, акцент темне золото `#7a5a0e`; лендінг і авторизація лишають власні `--ld-gold`. Решта ID палітр мапиться на ці дві (`paletteFor`).
- **Кути:** контроли `rounded-lg` (8), панелі й оверлеї `rounded-xl` (12), таби/чіпи `rounded-lg`, бейджі/чекбокс `rounded-sm` (4); сирі `rounded-[Npx]`, `rounded-md/2xl/3xl` і голий `rounded` рахує ratchet `ui-scale` (`pnpm ratchet:ui-scale`, тільки спадає).
- **Hover:** кожен інтерактивний елемент має відгук через `ds-interactive` (вбудований у kit); власний клікабельний елемент додає цей клас. Правила `.hud-surface a[href]` — у `@layer base`, щоб утиліти їх перебивали.
- **Переходи:** `PageTransition` (`components/layout`) на зміну сторінки, фейд вкладок; `prefers-reduced-motion` вимикає все в `app/motion.css`.
- **Акаунтна оболонка:** `AccountShell` + `AccountSidebar` (`components/layout`; ≥ md бічне меню, на телефоні смуга чіпів) для `/profile`, `/settings/*`, `/library/sounds`, `/help`; пункти — реєстр `PROFILE_MENU`. Дані сесії — через `AccountSeedProvider` ([platform.md](platform.md#account-pages-session-in-the-first-html)).
- Нативні checkbox/radio «checked» теж accent; контраст accent-ink на accent і accent-fg на panel-2 перевіряє `lib/theme/__tests__/palette-contrast.test.ts` (парсить реальний `app/palettes.css`).

## Широка форма-«верстак» (`HudFormPage width="wide"`)

CSS у `components/hud/hud.css` (`.hud-form-wide`), сітка `head / rail / notice / main / side / actions`; `HudForm` і `HudTabs` самі колонок не задають.

- **Колонки:** на телефоні одна; lg (≥ 1024) — main + side 320px; xl (≥ 1280) — rail 208px / main / side 360px, від 1600 side 400px. Rail — це `HudTabs` у режимі `rail`; `data-rail-from="lg"` на списку табів піднімає rail (200px) уже з lg. Без `side` main займає колонки 2–3.
- **Широка вкладка:** `data-wide-tab="true"` ховає side і розтягує панель на main + side.
- **Дії (`actions`):** з lg — рядок у шапці (колонка 3 / 2), якщо немає side або відкрита широка вкладка; зі side — sticky у колонці дій (`top: var(--shell-header-h)`); нижче lg — липка нижня смуга на всю ширину (рядок сітки 72px, safe-area).
- **Phone-поля:** 16px бокові поля належать `.hud-form-wide` (`max-sm:padding-inline`); внутрішні `HudForm`/`HudTabs` на телефоні свого `px` не додають (`[.hud-form-wide_&]:max-sm:px-0`).
- **Меню та вибір:** `HudFormMenu` — меню «⋯» (`header.menu`), пункт `tone: 'danger'` з `confirm` іде через `useConfirm`; `HudSegmented` — radiogroup із чіпів (roving-tabindex, `useRovingIndex`) для коротких enum-полів.

## Утиліти `.ds-*`

У `hud.css`: поверхні `ds-panel`/`ds-inset`/`ds-raised`, `ds-interactive` (transition), а також контейнерні сітки форм: `ds-fields` (авто-колонки від 15rem; `ds-fields--num` — від 7rem для числових), `ds-span` (на всю ширину сітки), `ds-list-grid` (1 колонка, 2 від ширини контейнера 52rem), `ds-setting-rows` (рядки налаштувань з роздільниками, перемикач/поле справа). Працюють від контейнера (`container-type` на main), а не від вʼюпорта. Тест — `components/hud/__tests__/ds-utilities.test.ts`.

## Шапка оболонки

`HudShellHeader` (`components/hud/shell`) — єдина рамка шапки (кнопка меню, breadcrumb, дії) для ігрової оболонки `GameShell` і класичного `components/layout/Header`. `--shell-header-h` (дефолт 57px) оголошено в `:root` у `hud.css`; sticky-елементи під шапкою (rail, side, дії, `ReferenceLayout`) рахують `top` від нього. `SheetLayout` перевизначає його на хості аркуша реальною висотою `header.sticky` (ResizeObserver) і знімає при демонтажі; `--sheet-actions-h` (48px, 0 без дій) — висота липкої панелі дій аркуша, від якої відраховують липкі таби.

## Допущене й відкладене

- Цикли на рівні тек: `characters` ↔ `character-profile` (один домен «персонаж»), (цикл `spells` ↔ `battle/fx` зник: FX у `components/fx`). Файлові цикли — лише з `ratchets/import-cycles-baseline.json` (`pnpm cycles`).
- Ч23: сторінки видів контенту модулів (`classes`, `backgrounds`, `skills`, `skill-trees`, `main-skills`, `artifact-sets`) живуть у `systems/<id>/ui/content` і підключені слотом `SystemUi.dmPages` (`view`: list/new/edit, `data` з серверного prefetch); `app/**/page.tsx` рендерять `SystemDmPage`, 404 дає `dmSectionLayout`. Мораль-FX — `SystemUi.fx.dice` (джерела кубиків, конкатенація модулів) і `SystemUi.fx.badges` (підписи бейджів, `TextRef`), типи в `lib/utils/battle/fx/system-dice.ts`, `systems/morale/ui/fx`. `lib/__tests__/props-budget.test.ts` + `ratchets/props-budget-exempt.json`: > 7 пропсів лише спадає (регенерація `pnpm exec tsx scripts/shared/props-budget.ts --write`).
- Відкладено: бейдж «raincloud −N мораль» лишився в `badge-labels.ts` (спільний набір `FxBadgeKey`); `main-skills` не в `SystemMeta.dmSections` (гейт через layout `skill-trees`).
- Ч6: екран бою — `components/battle/scene/{layout,drawers,banners}`, `turn/dock`, `map/bubble`, `participants/hero`; усе в зоні L3 `battle`, іконки дії — `components/hud/icons/battle`; детальна модель сцени — [battle.md](battle.md#сцена-бою-ч6).
