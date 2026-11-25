# Ч8a: міграція платформи на DESIGN.md — токени, кодмод золота, форм-кіт, профіль, дашборди

Статус: затверджено в розмові 2026-11-25; звірено з кодом 2026-11-25 (рев'ю Ч8a, виправлення фактів). Гілка `feat/game-ui-ch8` (../dnd-tracker-ch8).
Візуальне джерело правди — [DESIGN.md](2026-11-25-design-system.md) (далі DS). Композиція й поведінка Game-UI — [approved design](2026-11-21-game-style-ui-approved-design.md), план епіка — [game-style-ui](../plans/2026-11-21-game-style-ui.md) (розділи Ч7/Ч8a).

## Мета

Уся платформа говорить мовою DS: вугілля/кістка + один багряний, Cormorant SC / Alegreya / Oswald, радіус 4 px, зерно, подвійне фокус-кільце, контраст WCAG AA. У цій частині: токени й база, повне прибирання золота з коду, форм-кіт, профіль користувача з налаштуваннями, редагування листа персонажа, дашборд кампанії, `/ops`. Решта сторінок отримує токени й кіт автоматично, а композицію — у хвилях Ч8.

## Рішення власника (2026-11-25)

| Питання | Рішення |
|---|---|
| Палітри | лишаються **2**: `tavern`, `parchment`; збережені `midnight`/`forest`/`amethyst` читаються як `tavern`, `frost` — як `parchment` (без міграції БД) |
| Золото (`hud-gold*`, 545 входжень, ~225 файлів) | **кодмод усіх файлів** на семантичні токени; наприкінці токени золота видаляються |
| Бій/мапа | функціональні кольори (рух, дальність, сторони, ресурси, школи) і круглі жетони лишаються; шрифти, радіуси панелей, золото → багряний змінюються |
| `/ops` | функціональний виняток: статусні й серійні кольори лишаються, стан дублюється текстом/іконкою; решта за DS |
| Зведення гравця в профілі | так, з наявних даних (серверні `count`, без нового API) |
| «Підписка» | заглушка «Скоро» |
| Шрифти | self-host (уже в `public/fonts`, `app/fonts.css`), без Google Fonts |

## Обсяг

**Входить:** фаза 0 (токени й база), фаза 1 (кодмод золота), фаза 2 (форм-кіт), фаза 3 (екрани: профіль і `/settings/*`, `/help`, `/library/sounds`, `ProfileEditor`, дашборд кампанії `/campaigns/[id]`, `/ops`).

**Не входить:** композиція решти сторінок (хвилі Ч8), друк `dm/print/*` (лишається світлим), іконки game-icons і спрайт (DS 3.7 — окрема задача; поки lucide), компоненти листа з DS 5.8–5.26 поза формою редагування (зроблено/робиться в Ч5), логіка автентифікації, контракт аватара, `components/fx/**` (власні hex; `hud-gold` там 0), логіка й розмітка `components/battle/wizards/**` (див. виняток нижче), `lib/server/**` (крім нового `lib/server/profile/summary.ts`), `lib/utils/battle/{pipeline,turn}`, `usePlayerTurn`.

**Виняток для `wizards/**`:** рішення власника «кодмод усіх файлів» діє й тут — у 5 файлах `components/battle/wizards` (6 входжень `hud-gold`) і 4 файлах із `var(--gold)` (`AuraZonePicker`, `BonusActionPicker`, `TargetButton`, `attack/WeaponStep`) міняються лише рядки класів кольору за таблицею фази 1; логіка, пропси, розмітка — без змін.

**Лендинг і auth** (`/`, `/uk`, `/sign-in`…) поза палітрами (`isPalettePath`, на `<html>` немає `data-palette`): зараз беруть `--hud-*` із fallback-значень `@theme` і шрифт `.hud-sc` (Alegreya SC). Після фази 0 ці fallback-и стануть значеннями DS tavern, тому корені лендингу (`[data-landing]`) і auth (`AuthCard`) отримують локальні змінні з **поточними** значеннями: старі `--hud-ink/bone/muted/line/rule/page/panel`, власне золото `--ld-gold`/`--ld-gold-bright`/`--ld-gold-strong` (класи лендингу переписуються на `text-[var(--ld-gold)]` тощо в хвилі 4), `--font-hud-sc: "Alegreya SC"`, `--font-hud-sans: "Alegreya Sans"` і `letter-spacing: .04em` для `.hud-sc`. Редизайн лендингу — окремо.

## Reuse

| Що | Звідки | Як |
|---|---|---|
| Шрифти Cormorant SC 700, Alegreya 400–900 + italic, Oswald 500 | `public/fonts`, `app/fonts.css` (змінні `--font-title/--font-body/--font-num` у `.font-hud`, `body` має клас `font-hud`), класи `.hud-title/.hud-body/.hud-num` у `components/hud/hud.css` | стають основними; нових файлів немає |
| Механізм палітр | `lib/theme/palettes.ts`, `lib/theme/client.ts` (`PALETTE_BOOTSTRAP`, `applyPalette`, кеш `localStorage`), `types/theme.ts` (`PaletteId`), `lib/schemas/theme.ts` (`z.enum(PALETTE_IDS)`), `lib/hooks/theme/usePaletteState.ts`, `lib/server/users/palette.ts` (уже читає через `paletteFor` — не змінюється), `app/api/theme/route.ts`, `app/palettes.css` | скорочення списку + legacy-мапа в `paletteFor` і в bootstrap |
| Вибір палітри | `components/layout/PaletteSwitcher.tsx` (єдиний споживач — `/settings/preferences`), `ThemeProvider`/`useTheme` | `PaletteSwitcher` рендерить картки замість select |
| Тест контрасту | `lib/theme/__tests__/palette-contrast.test.ts` (парсить hex-токени з `app/palettes.css`) | переписується на пари DS 8.1 |
| Оболонка | `GameShellClient` (`components/layout/GameShellClient.tsx` → `HudGameShell`); `GameShell` — серверна обгортка з `ExtendLocaleScope(['whatsNew'])`; `shouldUseGameShell` (`components/layout/game-shell-route.ts`) + `HeaderGate`. Оболонка вже працює без кампанії (`/campaigns`: `items` з одного пункту) | акаунтний режим профілю замість `ProfileShell` |
| Смуга під-табів | `HudChipTabs` (`components/hud/page`: посилання з `aria-current`, горизонтальна прокрутка `hud-scroll-x`, `size="lg"` = 44 px) | у `HudGameShell` смуги табів **немає** (пункти лише у випадному меню), тому під-таби акаунта — `HudChipTabs` під шапкою |
| Меню профілю | `PROFILE_MENU` (`components/layout/profile-menu.ts`, підписи `common.header.*`), `useProfileActions` (`lib/hooks/auth`) | пункти під-табів + «Підписка» |
| Форм-кіт | `components/ui/*`, `components/hud/form/*`, `components/hud/page/*`, `components/common/fields/*`, `ActionBar`, `ResponsiveDialog` | переписуються стилі, API не змінюється |
| Аватар | `components/profile/AvatarEditor.tsx` | без змін поведінки, нова рамка |
| Ratchet-шаблон | `scripts/shared/cyrillic-comments.ts` + `ratchets/cyrillic-comments-exempt.json` + `lib/__tests__/cyrillic-comments.test.ts` + скрипт `ratchet:cyrillic-comments` у `package.json` | так само `scripts/shared/hud-gold.ts` + `ratchets/hud-gold.json` + тест |
| Підрахунки з БД | константи `CampaignStatus`, `CampaignKind`, `CharacterType`, `CharacterStatus` (`lib/constants`), фільтр кампаній як у `app/campaigns/page.tsx` | зведення профілю |
| Дашборд | `components/campaigns/dashboard/*`, `dashboard.css` | рестайл, дані й хуки ті самі |
| Ops | `components/ops/*`, `app/ops/ops-client.tsx`; `UplotChart` уже бере колір осей із `getComputedStyle(el).color` | рестайл, сітка/шрифт осей із CSS-змінних |

Нове: `lib/server/profile/summary.ts` (зведення), `scripts/codemods/gold-to-ds.ts`, `scripts/shared/hud-gold.ts` + `ratchets/hud-gold.json` + тест + скрипт `ratchet:hud-gold`, сторінка `/settings/subscription`, `components/layout/AccountShell.tsx` (клієнтська композиція акаунтної оболонки), `components/layout/PaletteCard.tsx` (поряд із `PaletteSwitcher`/`ThemeProvider` — власник даних палітри), CSS-утиліти DS (`.ds-panel`, `.ds-inset`, `.ds-raised`, `.ornate`, `.orn`) у `components/hud/hud.css`.

## Фаза 0. Токени й база

### Палітри
- `PALETTE_IDS = ['tavern', 'parchment']`; `PaletteId` у `types/theme.ts` — лише ці 2; `LIGHT_PALETTES = ['parchment']`. `PALETTE_SWATCHES` (3 кольори, лише для старого select) замінюється на `PALETTE_PREVIEW: Record<PaletteId, { page, panel, inset, crimson, ink, muted }>` зі значеннями DS 13 — для міні-прев'ю `PaletteCard` (прев'ю чужої палітри не можна взяти з CSS-змінних: селектори висять на `html[data-palette]`).
- `LEGACY_PALETTES = { midnight: 'tavern', forest: 'tavern', amethyst: 'tavern', frost: 'parchment' }`. `paletteFor(value)`: id → id, legacy → мапа, інше → `DEFAULT_PALETTE`. `isPaletteId` приймає лише 2. Запис (API/zod через `PALETTE_IDS`) приймає лише 2; читання старого значення з БД (`getUserPalette`) ніколи не падає.
- `PALETTE_BOOTSTRAP` зараз пропускає незнайомий id з кешу (`dnd-palette-active`) — у користувача зі старою палітрою було б мерехтіння до відповіді API. Bootstrap вбудовує `JSON.stringify(LEGACY_PALETTES)` і застосовує змаповане значення.
- `app/palettes.css`: блоки `midnight/forest/amethyst/frost` видаляються; правила з `html[data-palette="frost"]` прибираються з селекторів у `app/palettes.css`, `components/hud/hud.css` (`.game-shell-mobile-actions`), `components/battle/hud/battle-hud.css` (`.hud-glass`) і тесті `components/hud/__tests__/hud-glass.test.ts`.

### Імена токенів
Назви DS конфліктують із shadcn (`--muted` у shadcn — фон). Тому DS-токени живуть у наявних просторах імен (DS 11.1). Перевірено: жодне з нових імен (`--hud-crimson*`, `--hud-hp*`, `--hud-hi`, `--hud-sh*`, `--hud-faint`, `--palette-inset`, `--palette-panel-2`, `--grain-*`, `--r`, `--ease`, `--focus`) у коді ще не вживається.

| DS | У коді | Tailwind-утиліта |
|---|---|---|
| `--page` `--panel` `--panel-2` `--inset` | `--palette-page` `--palette-panel` `--palette-panel-2` `--palette-inset` | `hud-page` `hud-panel` (обидві вже є) · нові `hud-panel-2` `hud-inset` |
| `--ink` `--text` `--muted` `--faint` | `--hud-ink` `--hud-text` (нова змінна) `--hud-muted` `--hud-faint` | `hud-ink` `hud-text` `hud-muted` (є) · нова `hud-faint` |
| `--line` `--line-strong` `--hi` | `--hud-rule` `--hud-line` `--hud-hi` | `hud-rule` `hud-line` |
| `--crimson` `--crimson-2` `--crimson-fg` `--crimson-ink` | `--hud-crimson` `--hud-crimson-2` `--hud-crimson-fg` `--hud-crimson-ink` | нові `hud-crimson` `hud-crimson-2` `hud-crimson-fg` `hud-crimson-ink` |
| `--hp` `--hp-2` | `--hud-hp` `--hud-hp-2` | нові `hud-hp` `hud-hp-2` |
| `--sh` `--sh-btn` | `--hud-sh` `--hud-sh-btn` | (через `shadow-[var(--hud-sh)]`) |
| `--grain-op` `--grain-mode` `--r` `--ease` `--focus` | ті самі | — |

Значення — DS розд. 13 для обох палітр у блоках `html[data-palette="tavern"|"parchment"]`; нові `--color-hud-*` у `@theme static` (`app/globals.css`) мають fallback = значення DS tavern (так сторінки поза палітрами отримують DS за замовчуванням; лендинг і auth перекривають локально, див. «Обсяг»).

`--hud-line` тепер = DS `--line-strong` (рамки контролів), `--hud-rule` = DS `--line` (розділювачі) — так їх у основному й вживають: shadcn `--border`/`--input` = `--hud-line`, тому кожен «голий» `border` і всі поля беруть `--hud-line`; `border-hud-rule` (142 входження) — переважно розділювачі й тонкі рамки. Зараз обидва — непрозорі hex майже однакового кольору (tavern `#756b5f`/`#746b63`); після міграції — rgba DS, помітно тонші.

- `--hud-text` як змінної зараз немає: є лише `--color-hud-text` у `@theme` (`color-mix` bone/muted). Стає прямим токеном DS (`--color-hud-text: var(--hud-text, …)`).
- Лишаються як аліаси на DS-токени (не золото, масово вживаються; прибирання — поза обсягом): `--hud-bone → text`, `--hud-field → inset`, `--palette-card → panel`, `--palette-secondary → panel-2`, `--palette-background → page`, `--palette-foreground → text`, `--palette-primary-foreground → crimson-ink`, утиліти `hud-surface → panel`, `hud-raised → panel-2`, `hud-soft` (mix muted/text), `hud-edge → --hud-line`, `hud-edge-faint → --hud-rule` (зараз обидві — `color-mix` золота).
- `hud-glow` (`color-mix` золота, 7 файлів; світіння) — DS світінь не має: входження прибирає кодмод, токен видаляється разом із золотом.
- `--palette-overlay` (лише `body::after`) і віньєтка видаляються.
- `--hud-info`, `--hud-danger`, `--hud-bad`, `--hud-good*` лишаються як **функціональні** (бій, ops, валідація); `--hud-danger`/`--destructive` у формах = `--hud-crimson-fg`.
- shadcn: `--primary → --hud-crimson`, `--primary-foreground → --hud-crimson-ink`, `--ring → --hud-ink`, `--border`/`--input → --hud-line`, `--muted-foreground → --hud-muted`, `--accent → --palette-panel-2`, `--sidebar-primary`/`--sidebar-ring` — так само. Зараз той самий набір продубльовано в трьох місцях (`html[data-palette]` і `html[data-palette] .hud-surface` у `palettes.css`, `.hud-surface` у `hud.css`) — лишається один набір у `palettes.css` (`html[data-palette]`); `.hud-surface` у `hud.css` лише з fallback-значеннями для сторінок без палітри.
- `--book-*` (книга заклинань) лишається: окремий «предметний» матеріал; лише `--book-accent*` переходить на багряний відтінок DS. `.spellbook-dialog` у `palettes.css` перевизначає `--primary`/`--ring` через `--hud-gold` → `--book-accent`.
- Книга сценарію (`components/scenario/book/scenario-book.css`) — так само власний матеріал зі своїми `--gold`/`--rust`/`--blood`; правило `html[data-palette] body .scenario-book:not([data-theme])` у `palettes.css` перестає виводити `--gold`/`--rust` з `--hud-gold` (бере значення `scenario-book.css` для темної/світлої теми).

### Типографіка
- Зараз `body` має `font-geist` (Geist через `--font-sans`) і `.hud-surface`/`.battle-hud` — `var(--font-hud-sans)` (Alegreya Sans). Стає: `html[data-palette] body`, `.hud-surface`, `.battle-hud` — `font-family: var(--font-body)` (Alegreya), `font-variant-numeric: lining-nums tabular-nums`. Geist лишається поза палітрами.
- `.hud-sc` → Cormorant SC 700 без `letter-spacing` (DS 3.2). Розміри в класах лишаються; мінімум 13 px — `text-[11px]`/`text-[12px]` у кодмоді-хвилях підіймаються до 13 (інтерактивний текст ≥ 15) у тих файлах, що й так правляться.
- `.font-hud`: `--font-hud-sc → Cormorant SC`, `--font-hud-sans → Alegreya`. `--font-hud-book` (EB Garamond) лишається для книги заклинань.
- Alegreya SC / Alegreya Sans **лишаються** (`@font-face` і файли): лендинг використовує `.hud-sc` (через локальну `--font-hud-sc`), книга сценарію — `.font-scenario` (`--font-scenario-sans: "Alegreya Sans"`).
- `HUD_PRELOAD_FONTS` (`components/hud/fonts.ts`, зараз Alegreya SC/Sans): `CormorantSC-Bold-cyrillic`, `Alegreya-Variable`, `AlegreyaSC-Bold` (LCP лендингу).

### Радіуси, глибина, фактура, фокус
- Тема Tailwind v4: зараз `--radius-*` у `@theme inline` рахуються від `:root { --radius: 0.65rem }` (sm ≈ 6.4, md ≈ 8.4, lg ≈ 10.4, xl ≈ 14.4, 2xl ≈ 18.4, 3xl/4xl ≈ 22/26 px). Стає: `--radius-xs: 2px`, `--radius-sm: 2px`, `--radius-md: 4px`, `--radius-lg: 4px`, `--radius-xl: 6px`, `--radius-2xl: 6px`, `--radius-3xl: 6px`, `--radius-4xl: 6px`; `:root { --radius: 4px }`. Голий `rounded` у Tailwind v4 і так 0.25rem (4 px). `rounded-full` не змінюється (жетони бою, аватари в списках лишаються круглими; круглі контроли поза боєм прибираються в хвилях).
- Утиліти в `hud.css`: `.ds-panel` (рівень 1: `panel` + `inset 0 1px 0 var(--hud-hi)` + `--hud-sh`), `.ds-inset` (рівень −1), `.ds-raised` (рівень 2), `.ornate` (кутові накладки DS 3.6), `.orn` (орнаментальний роздільник через `mask-image`). `HudPanel` (`components/hud/page`) використовує `.ds-panel`.
- Тло: зараз `body::before` — фонова картинка `/bg/vey-strait-{2k,4k}.webp` (у parchment вимкнена), `body::after` — затемнення `--palette-overlay`; лендинг ховає обидва (`landing.css`). Стає: `body::before` — зерно (SVG `feTurbulence`, `position: absolute` на всю висоту `body`, `opacity: var(--grain-op)`, `mix-blend-mode: var(--grain-mode)`, `pointer-events: none`); `body::after` прибирається; файли `public/bg/vey-strait-*.webp` більше ніде не вживаються — видаляються. Маркер `data-screen-bg` лишається (нічого не стилізує; застарілий коментар у `screen-background.tsx` виправити).
- `:focus-visible { outline: none; box-shadow: var(--focus) }` глобально; `html { scroll-padding-top: 72px }`. `prefers-reduced-motion`: зараз глобальне правило в `globals.css` помилково вкладене в `@media (max-width: 640px)` — переноситься на верхній рівень і зводиться в одне місце з `motion.css`.
- Скролбар: thumb зараз золотий hex `rgb(230,194,90)` у `globals.css` і `--hud-gold-strong` у `palettes.css` → `--hud-muted`.
- Нативні `input[type=checkbox|radio]` мають глобальні базові стилі в `globals.css` (`@layer base`, золото) — переписуються у фазі 2 разом із `Checkbox`/`Radio`.
- Видаляються мертві глобальні ефекти `globals.css` (перевірено `grep`, споживачів немає): `.glass-card`, `.neon-border`, `.dead-state`, `.animate-slide-in/out` + `@keyframes slide-in/slide-out`, `@keyframes float/pulse-glow/shimmer/pulse-slow/glow`. Лишаються вживані: `.page-transition`, `.touch-manipulation`, `.below-header`, `.scene-full`.

### Бій (виняток)
Не змінюються: `--reach-stroke`, `--range-stroke`, `--path-label-*`, `--ally`, `--enemy`, `--fog-*`, кольори ресурсів, шкіл, металів (`.metal-*`, `.circle-*`), FX. Змінюються: шрифти, радіуси панелей (через тему), золото → DS-токени (кодмод), `--gold` у `.battle-hud`/`.hud-surface` (видаляється після кодмоду `var(--gold)`), золоті hex у `@keyframes hud-turn`/`hud-roll-settle`, `.hud-roll-field[data-rolling]`, `.hud-range` (thumb/fill/focus) → `--hud-crimson`.

### Контраст
`palette-contrast.test.ts` перевіряє для обох палітр пари DS 8.1: `ink/text/muted` на `page/panel/panel-2/inset` ≥ 4.5 (tavern `muted` на `panel-2` = 4.51 — проходить впритул), `crimson-fg` на `page/panel/panel-2` ≥ 4.5, `crimson-ink` на `crimson` ≥ 4.5; нетекстові стани (обвідка чекбокса, радіо-ромба, порожнього ромба) — `muted` на `page/panel/inset` ≥ 3. rgba-токени (`--hud-line`, `--hud-rule`, `--hud-hi`) у тест не йдуть: DS їх не міряє, а `line-strong` на `panel` ≈ 1.5:1 — рамка поля не єдиний носій (поле впізнається заглибленням і підписом). `--hud-faint` явно позначений «лише декор» і не перевіряється. Окремий кейс: `PALETTE_PREVIEW` збігається з hex-токенами `palettes.css`.

## Фаза 1. Кодмод золота

### Інвентар (2026-11-25)
- `hud-gold*`: 545 входжень у 225 файлах (`components`, `app`, `systems`, `lib`), з них 6 тестових файлів. Найбільші: `components/campaigns` 61/23, `character-profile` 42/22, `world` 38/13, `battle` 31/24, `landing` 31/14, `hud` 31/11, `content-import` 22/10, `app/palettes.css` 20, `systems/wfrp` 18/13. `components/fx` — 0; `components/battle/wizards` — 6 у 5 файлах.
- `var(--gold)` (локальна змінна `= var(--hud-gold)` з `.battle-hud`/`.hud-surface`): **110 входжень у 56 файлах** (переважно `components/battle/**`, також `world`, `audio`, `hud`, `ui/slider`, `ui/side-sheet`) — `text-/border-/bg-/accent-/ring-[var(--gold)]` з hover/focus. Без кодмоду лишилися б золотими через fallback `#c9b37a`.
- Похідні від золота: `hud-edge`, `hud-edge-faint` (аліаси, фаза 0), `hud-glow` (7 файлів, кодмод).
- Золоті hex поза металами/FX/лендингом: `globals.css` (скролбар), `hud.css` (`hud-turn`, `hud-roll-settle`, `.hud-range`), `systems/skilltrees/ui/{progression,content}/*.css`, `components/world/world-atlas.css`, `WorldZones`, `WorldHeroes`, `ToastHost`, `grid-style.ts`, `DoorsLayer`, `BattlePreparationView`, `UnitGroupAccordion` — правляться вручну в хвилях за тією ж таблицею ролей (ratchet їх не рахує).
- Функціональні серії, де золото — значення категорії: `ARTIFACT_RARITY_COLOR[LEGENDARY]` (`lib/constants/artifacts.ts`, сусіди — hex) і `GRAPH_TYPE_STYLE.artifact` (`lib/constants/scenario-graph.ts`) → hex-літерал, як сусідні значення (не `hud-gold`).

### Таблиця заміни (за роллю, не 1:1)

| Було | Роль | Стало |
|---|---|---|
| `text-hud-gold`, `text-[var(--gold)]` | заголовок, мітка, назва секції, декоративна іконка | `text-hud-ink` (іконки біля підпису — `text-hud-muted`) |
| `text-hud-gold`, `text-[var(--gold)]` | активний стан, іконка головної дії, володіння, бонус майстерності, акцентне число | `text-hud-crimson-fg` |
| `text-hud-gold-bright`, `text-hud-gold-strong` | підсвітка, hover-текст | `text-hud-ink` |
| `hover:text-hud-gold*`, `hover:text-[var(--gold)]` | hover посилання/кнопки | `hover:text-hud-ink` |
| `border-hud-gold/NN`, `border-hud-gold-strong/NN`, `border-[var(--gold)]/NN` | декоративна рамка картки | `border-hud-line` |
| `border-hud-gold`, `border-hud-gold-strong`, `border-[var(--gold)]` | рамка активного/вибраного | `border-hud-crimson` |
| `hover:border-hud-gold*` | hover-рамка | `hover:border-hud-muted` |
| `bg-hud-gold`, `bg-hud-gold-strong`, `bg-[var(--gold)]` | заливка головної дії | `bg-hud-crimson text-hud-crimson-ink` |
| `bg-hud-gold/NN`, `bg-hud-gold-strong/NN`, `hover:bg-hud-gold/NN` | тонований фон, hover | `bg-hud-panel-2` / `hover:bg-hud-panel-2` (DS: без тонованих фонів) |
| `ring-hud-gold*`, `outline-hud-gold*`, `focus-visible:ring-hud-gold`, `ring-[var(--gold)]` | фокус | прибрати (глобальний `--focus`) |
| `accent-hud-gold`, `accent-[var(--gold)]` | нативний чекбокс/радіо/range | `accent-hud-crimson` |
| `from-/to-/via-hud-gold*` | градієнт | `hud-crimson`/`hud-crimson-2` лише на банері/стягу; інакше прибрати градієнт |
| `shadow-[…var(--color-hud-glow)…]` | світіння | прибрати |
| `decoration-hud-gold*` | підкреслення | `decoration-hud-line` |
| `var(--hud-gold*)`, `var(--color-hud-gold*)`, `var(--gold)` у CSS/TS | за контекстом | відповідний DS-токен за цією ж таблицею |

Активні вкладки й сегменти (`.profile-tab[data-state=active]` — є і в `hud.css`, і в `palettes.css`; активний `HudChipTabs`) → DS 5.13: `panel-2` + риска 2 px `--hud-crimson` + текст `--hud-ink`, без золотої заливки.

### Виконання
- `scripts/codemods/gold-to-ds.ts` (tsx, dry-run за замовчуванням, `--write`): однозначні рядки таблиці (рамки з `/NN`, `bg-…/NN`, `hover:bg`, `ring`/`outline`, `accent`, `hover:text`, `text-hud-gold-bright/strong`, `hud-glow`-тіні, ті самі форми з `[var(--gold)]`). Звіт — файли з лишком неоднозначних `text-hud-gold`, `border-hud-gold`, `bg-hud-gold` (і `[var(--gold)]`) без `/NN`.
- Неоднозначні випадки розбирають агенти по папках, за таблицею ролей, хвилями:
  1. `components/battle` (включно з класами `wizards/**`), `components/hud`, `components/layout`, `components/common`, `components/ui`, CSS бою й HUD;
  2. `components/campaigns`, `components/world`, `components/quests`, `components/maps`, `components/show`, `components/scenario`, `components/music`, `components/audio`, `components/soundboard`;
  3. `components/character-profile`, `components/characters`, `components/abilities`, `systems/**`;
  4. решта (`content-import`, `onboarding`, `auth`, решта `components/*`, `app/**`, `lib/**`), лендинг → локальні змінні `--ld-gold*`.
- Ratchet `ratchets/hud-gold.json` (`{ file: count }`, лише зменшується; рахує `hud-gold` і `var(--gold)` поза `components/scenario/book/**`; скрипт `scripts/shared/hud-gold.ts`, `pnpm ratchet:hud-gold [--write]`; тест `lib/__tests__/hud-gold.test.ts`). Ціль фази — порожній файл; після цього `--hud-gold*`, `--color-hud-gold*`, `--color-hud-glow` і `--gold` у `.battle-hud`/`.hud-surface` видаляються з `globals.css`/`palettes.css`/`hud.css`, а тест перетворюється на заборону (`hud-gold` у коді = помилка; `scripts/` і `docs/` не скануються).
- Межа: лише класи й CSS-змінні; жодних змін логіки, пропсів, розмітки (крім злиття дубльованих класів). `components/fx/**` має власні hex — не чіпаємо.
- Тести, що перевіряють класи золота (`AbilityPanel-collapse`, `AbilityPanel-flow`, `sheet-banner`, `artifactsets/set-list`, `d20/StatsTab`, `BattleMapPanel`), оновлюються в тій самій хвилі, що й їхній компонент.

## Фаза 2. Форм-кіт

API компонентів не змінюється (пропси, `data-slot`), змінюються класи. Стилі пишуться прямо в компонентах через DS-утиліти, а не через каскад `.hud-form/.hud-page [data-slot=…]` (ці правила в `hud.css` і `palettes.css` видаляються — одне джерело).

| Компонент | DS |
|---|---|
| `Input`, `Textarea`, `SelectTrigger` (`select.tsx`, `select-field.tsx`, `HUD_SELECT_TRIGGER_CLASS` у `components/hud/form/select-class.ts`), `NumberInput`, `BoundedNumberInput`, `CommaListInput`, `SearchInput` (`components/common/fields`) | рівень −1: `bg-hud-inset`, `border-hud-line`, `shadow-[inset_0_1px_3px_rgba(0,0,0,.45)]`, `rounded-[4px]`, Alegreya 16 px (без зуму на iOS), висота 40 (`textarea` — min 88); placeholder `--hud-muted`; фокус: `border-hud-crimson` + `--focus`; `aria-invalid`: `border-hud-crimson`; disabled: opacity .35. Числові поля — `.hud-num`, `inputmode="numeric"` |
| `Label`, `LabeledInput`, `SelectField`, `SwitchField` | підпис Cormorant SC 17 px `--hud-text`, підказка/помилка 14 px (`--hud-muted` / `--hud-crimson-fg` з текстом, не лише колір), відступ мітка–поле 6 |
| `Button` | `default` = основна (DS 5.1): `bg-hud-crimson`, кант `--hud-crimson-2`, `inset 0 1px 0 rgba(255,255,255,.2), inset 0 -2px 0 rgba(0,0,0,.2)`, `text-hud-crimson-ink`, Cormorant SC; `outline`/`secondary` = звичайна: `bg-hud-panel-2`, `border-hud-line`, `--hud-sh-btn`, `inset 0 1px 0 var(--hud-hi)`, hover — рамка `--hud-muted`; `ghost`/`link` = посилання (`--hud-muted` → hover `--hud-ink`); `destructive` = звичайна з текстом `--hud-crimson-fg`. `:active` — `translateY(1px)`, без тіні. Розміри (зараз 36/32/40/36/32/40): `default` 44, `sm` 40, `lg` 52 (телефон 48), `icon` 40 / `icon-sm` 40 (зона натиску), `icon-lg` 44. Радіус 4 |
| `HudButton`, `HudIconButton` (`components/hud/HudButton.tsx`), `HudToggleChip`, `OptionButton`, `HudChipTabs` | ті самі рівні; toggle/чип «увімкнено» = `panel-2` + риска `--hud-crimson`, не заливка й не світіння |
| `Checkbox` (Radix `@radix-ui/react-checkbox`) і базовий стиль нативного `input[type=checkbox]` у `globals.css` | квадрат 20, `bg-hud-inset`, рамка `--hud-muted` (нетекстовий стан ≥ 3:1), checked — заливка `--hud-crimson` + галочка `--hud-crimson-ink`; невидима зона натиску 40 (`before:absolute before:-inset-[10px]`) |
| `Radio` (нативний `input type=radio`, `components/ui/radio.tsx`) і базовий стиль `input[type=radio]` у `globals.css` | ромб 14 (DS «заповнений ромб = обрано»): порожній — обвідка `--hud-muted`, обраний — заливка `--hud-crimson`; зона натиску 40; лишається нативний input |
| `Switch` | трек `inset` 40×22, ручка `panel-2` з `--hud-sh-btn`; увімкнено — трек `--hud-crimson` |
| `Slider`, `.hud-range` | трек `inset` 6 px, заповнення `--hud-crimson` (метал `--m2` лишається там, де його задано), ручка `panel-2` 20 з рамкою |
| `ImageUpload`, `IconUrlField`, `ColorField` (`components/common/fields`) | рамка-заглиблення, порожній стан — монограма/іконка `--hud-muted` + підпис дії |
| `HudFormPage` | центральна колонка `max-w-3xl`, `.ds-panel .ornate` на ≥ sm, на phone без рамки; заголовок `title-l` (Cormorant SC 28) + `.orn`; без radial-gradient (`.hud-form-page` у `hud.css` і `palettes.css`) |
| `HudSection` | заголовок `title-m` (24) `--hud-ink`, без золота; `panel` → `.ds-panel` |
| `HudTabs`, `SheetTabList`, `tabs.tsx` | DS 5.13: підписані вкладки, активна `panel-2` + блік + риска 2 px `--hud-crimson` + текст `--hud-ink` жирний; на ≤ 1100 — горизонтальна прокрутка з маскою. Клавіатура й ARIA (roving tabindex, ←/→/Home/End, `aria-controls`/`role=tabpanel`) уже дає Radix Tabs — не переписувати, лише покрити тестом |
| `ActionBar` | вторинні ліворуч, основна праворуч; на phone на всю ширину, основна остання |
| `Dialog`, `ResponsiveDialog`, `ConfirmDialog`, `SideSheet`, `Popover`, `Tooltip`, `DropdownMenu` | рівень 3 (DS 3.5): `panel`/`panel-2` + `0 30px 80px -24px rgba(0,0,0,.9)`, радіус 4, заголовок `title-l` + «×» 40; backdrop `rgba(6,5,7,.72)` + blur 2 |
| `accordion.tsx`, `disclosure.tsx` | вигляд на лініях (`border-b border-hud-rule`, тригер Cormorant SC `--hud-ink`, шеврон `--hud-faint`); правила `.hud-surface [data-slot=accordion-*]` у `hud.css`/`palettes.css` переносяться в компонент; поведінку не змінюємо. У формах фази 3 акордеонів немає |
| `badge.tsx`, `card.tsx` | badge — текст + рамка `--hud-line`, без тонованих фонів; `card` → `.ds-panel` |

## Фаза 3. Екрани

### Оболонка профілю
- `ProfileShell` видаляється. Новий `AccountShell` (`components/layout/AccountShell.tsx`, `'use client'`): `activeId` з `usePathname`, `items` = «Профіль» (`/profile`) + записи `PROFILE_MENU` з `href` + «Підписка» (`/settings/subscription`), підписи з `common.header`; рендерить `GameShellClient` (title/breadcrumb з активного пункту; корінь breadcrumb лишається «Кампанії» → `/campaigns`) і під шапкою смугу під-табів `HudChipTabs size="lg"` (посилання, `aria-current`). Серверну обгортку `GameShell` тут не використати (`activeId` потрібен із `pathname`), тому layouts додають `'whatsNew'` у свій `LocaleScope` (як робить `GameShell` через `ExtendLocaleScope`).
- `app/profile/layout.tsx`, `app/settings/layout.tsx`, `app/help/layout.tsx`, `app/library/sounds/layout.tsx` рендерять `AccountShell` замість `ProfileShell`; наявні `namespaces` кожного layout не змінюються (крім `+ whatsNew`).
- Дії `switchAccount`/`signOut` — лише на сторінці `/profile` (окрема зона; у шапці `GameShell` є тільки аватар-посилання на `/profile`, окремого меню профілю немає).
- `shouldUseGameShell` повертає `true` для `/profile`, `/settings/*`, `/help`, `/help/*`, `/library/sounds`; тест `game-shell-route` розширюється (інакше `HeaderGate` дасть подвійну шапку).
- Phone: смуга під-табів із горизонтальною прокруткою, активний пункт прокручується в поле зору, цілі ≥ 40.

### `/profile`
```
┌ .ds-panel .ornate ───────────────────────────────────────┐
│ ┌──────┐  Ім'я (title-l)                                  │
│ │аватар│  email (muted)                                   │
│ │ 128  │  ─────────────────────────────────────────────   │
│ └──────┘  12 кампаній · 7 героїв · 3 дні тому (Oswald+SC) │
│           [Змінити фото]                                  │
└──────────────────────────────────────────────────────────┘
  Ops (лише ops-адміни)                    Змінити акаунт · Вийти
```
- Аватар у квадратній рамці (DS `.frame`: кант 1 px, внутрішній відступ 6, `.ornate`); `AvatarEditor` — без змін поведінки (ticket → upload → commit), лише подання; без фото — ініціали Cormorant SC.
- Зведення: `getProfileSummary(userId)` у `lib/server/profile/summary.ts` (`server-only`, `prisma` з `lib/db`) — три запити в `Promise.all`:
  - `campaigns` — `campaignMember.count({ userId, campaign: { status: ACTIVE, kind: CAMPAIGN } })` (без архівних, демо й шаблонів — як список `/campaigns`);
  - `characters` — `character.count({ controlledBy: userId, type: PLAYER, status: ACTIVE, campaign: { status: ACTIVE, kind: CAMPAIGN } })`;
  - `lastActivity` — `campaign.aggregate({ _max: { updatedAt } })` по тих самих кампаніях або `null` (`Campaign.updatedAt` змінюється лише з рядком кампанії — це наближення «останньої активності», прийнятне для зведення).
  Викликається в серверному `app/profile/page.tsx` (`user.id` з `getAuthUserOptional`), результат — проп у `ProfileClient` (разом із `showOpsLink` — один об'єкт). Без нового API-роуту і клієнтського запиту. Нульові/відсутні значення не показуються. Відносна дата — `Intl.RelativeTimeFormat` з локалі.
- «Змінити акаунт» / «Вийти» — кнопки-посилання окремою зоною (`useProfileActions`). Вихід — без підтвердження (DS 6.8 — незворотне лише видалення).

### `/settings/subscription`
Заглушка: `HudFormPage` з заголовком «Підписка», один рядок «Скоро: …», без логіки. Пункт у `PROFILE_MENU` (`id: 'subscription'`, `href`, іконка `Crown` з lucide); тип `ProfileMenuId` і тест `profile-menu.test.ts` розширюються.

### `/settings/preferences`
- Мова (`LocaleSwitcher`) і часовий пояс (пошук + `SelectField`) — наявні контроли в новому кіті, без змін логіки.
- Палітра — `PaletteSwitcher` рендерить 2 `PaletteCard` замість select: міні-прев'ю з `PALETTE_PREVIEW` (`page` фон, `panel` смуга, `inset` поле, багряна кнопка, рядок тексту `ink`/`muted`), назва Cormorant SC (`common.header.palette.names.*`), `aria-pressed`, обгортка `role="group"` + `aria-label`; помилка завантаження/збереження — текстом (наявні `errors.*`). Значення та збереження — наявний `usePaletteState` через `useTheme`.

### `/settings/password`, `/settings/ai`, `/library/sounds`, `/help`
`HudFormPage` + кіт фази 2; композиція — центральна колонка, секції `HudSection`. AI-ключі: ключ провайдера не логується, не повертається, не з'являється в помилках (без змін логіки, `docs/architecture/ai.md`).

### Редагування листа (`ProfileEditor`)
- Каркас уже як у перегляді листа Ч5: `SheetIdentityPanel` (банер) + `ProfileTabs variant="sheet"`, вкладки «Основне · Бій · (Навички) · (Розвиток) · (Вибори) · (Магія) · (Предмети) · Історія», `FormAlert` над вкладками, `ActionBar` знизу. Змінюється лише вміст вкладок: центральна колонка ≤ 860 px, секції `HudSection` без панелей-карток (лінії й простір, DS 2).
- Вкладка «Основне» (`BasicEditTab` → `CharacterBasicInfo` з `components/characters/basic`, спільний із `NewCharacterForm` — нове групування діє в обох місцях): секції «Особа» (ім'я, тип, хто керує, рівень), «Походження» (раса, підраса, класи або клас/підклас, архетип, світогляд), «Портрет» (`ImageUpload`, 4:5, монограма). Сітка: 2 колонки ≥ 768, 1 на phone. Поля приховуються тими самими умовами (`hide`, `isPlayerView`), без додавання чи видалення полів. Далі — `CharacterHpPreview` і кнопка «Видалити персонажа» (`destructive`, окремою зоною).
- Вкладка «Історія» вже містить `GoalList` + `BiographyEditor` — лише вигляд кіту. Віку, опису зовнішності тощо в моделі немає — не додаються.
- Системні поля (`Ui.StatsFields`, `SystemFormFields`, `Ui.AdvancementEditor`, `systems/*/ui`) отримують новий вигляд через кіт; композицію систем не переписуємо.
- Помилка форми (`FormAlert`) — рядок `--hud-crimson-fg` з іконкою над вкладками; помилки полів — під полем; `useRevealInvalidTab` лишається.
- Акордеони в `path/*` і `skilltrees` — лише вигляд (фаза 2), поведінка без змін.

### Дашборд кампанії (`/campaigns/[id]`)
- `components/campaigns/dashboard/*` і `dashboard.css`: `.ds-panel` лише для груп даних (`DmPartyCard`, `CampaignSummaryPanel`, `DmPrepPanel`), решта на лініях; числа (рівні, HP, лічильники) — `.hud-num`; `HeroHp` — шкала DS 5.8 у мініатюрі (`inset` трек, `--hud-hp`/`--hud-hp-2`, `role="meter"` + `aria-valuetext`); дії — `Button` основна (одна на панель) / звичайна.
- Обидві ролі (ДМ, гравець — `PlayerHeroCard`).
- Сирі ключі `dashboard.*`/`gameTerms.*` (стара нотатка 2026-10-30): перевірити на стенді; якщо відтворюється — виправити підключення просторів імен (`lib/i18n/scopes.ts`), інакше закрити нотатку.

### `/ops`
- `app/ops/ops-client.tsx`, `components/ops/*`: панелі `.ds-panel`, заголовки Cormorant SC, числа Oswald, `OpsRangeTabs` → DS-вкладки (сегменти), `AlertList`/`DbTopTable` на лініях, `TestNotifyButton` — звичайна кнопка.
- Функціональний виняток: кольори станів (норма/попередження/критично) і серій (`PALETTE`, `LIMIT_COLOR` в `UplotChart`) лишаються; кожен стан має текстову мітку й іконку (не лише колір). `LimitGauge` — трек `inset`, заповнення кольором стану.
- uPlot: колір осей уже з `getComputedStyle(el).color`; сітка й шрифт підписів — з `--hud-rule`/`--font-num`; перемальовування при зміні `html[data-palette]` (`MutationObserver` на атрибуті).

## i18n і онбординг
- Нові тексти лише в `messages/{uk,en}`, кирилиця лише в JSON.
- **Розміщення ключів.** `common` входить і в `ROOT_NAMESPACES` (бюджет 20 KB), і в `CAMPAIGN_NAMESPACES` (бюджет 112.9 KB, запас ~0.3 KB) — тому нові тексти профілю й налаштувань ідуть у простір `auth` (`SITE_NAMESPACES`, підключений у layouts `/profile` і `/settings`): `auth.profileSummary.*` (зведення, дії), `auth.settings.subscription.*` (сторінка-заглушка), `auth.settings.preferences.palette*` (підпис групи карток, якщо потрібен понад наявні `common.header.palette.*`). У `common` додається лише `common.header.subscription` (підпис пункту під-табів, потрібен на всіх акаунтних сторінках, зокрема `/help` і `/library/sounds`, де `auth` не підключено).
- Назви видалених палітр (`common.header.palette.names.{midnight,forest,amethyst,frost}`) видаляються — це з запасом компенсує `header.subscription`; ключі `tavern`/`parchment` лишаються.
- Заголовки секцій «Основне» (`CharacterBasicInfo`) — у `characterProfile` (кампанійний скоуп): наявний «Походження» (`characterProfile.…from.origin`) перевикористати або перенести, нових ключів — не більше двох коротких («Особа», «Портрет»); якщо `scope-size` червоний — замість нових ключів узяти наявні.
- `lib/onboarding/whats-new.ts`: запис `2026-11-25-design-system` + `whatsNew.<id>` в обох мовах (нова мова інтерфейсу, 2 палітри, оновлений профіль). `whatsNew` входить у `ROOT_NAMESPACES` — перевіряється бюджетом root.
- Hints/help: оновити тексти, що згадують палітри або «золото» (`help.json`, `whatsNew.json` — старі записи історії не переписуються, лише довідка).
- Бюджети `scope-size` у цій частині **не піднімаються**.
- Перебудова розподілу перекладів (скоупи за маршрутом замість одного `CAMPAIGN_NAMESPACES` на всі сторінки кампанії) — окремий підпроєкт зі своєю спекою, див. «Суміжне».

## Тести
- `palette-contrast.test.ts` — пари DS 8.1 для 2 палітр + `PALETTE_PREVIEW` = CSS.
- `lib/theme/__tests__` — `paletteFor` зі старими id; `isPaletteId` лише 2; `PALETTE_BOOTSTRAP` мапить legacy-кеш; `lib/hooks/theme/__tests__/usePaletteState.test.tsx` — без старих id; API теми відхиляє запис старих id (400) і не падає на читанні (`app/api/__tests__/theme-api.test.ts`).
- `components/hud/__tests__/hud-glass.test.ts` — без `frost`.
- `game-shell-route` — нові маршрути; `profile-menu.test.ts` — пункт `subscription`; `AccountShell` — активний пункт за `pathname`, `aria-current`.
- `lib/__tests__/hud-gold.test.ts` — ratchet, потім заборона.
- `lib/server/profile/__tests__/summary.test.ts` — підрахунок, фільтри (архів/демо/шаблон не рахуються), `null` без кампаній (мок Prisma).
- `HudTabs` — клавіатура (←/→/Home/End), `aria-controls`/`tabpanel` (поведінка Radix).
- `Checkbox`/`Radio`/`PaletteCard` — ролі й `aria-*` (happy-dom).
- Наявні снапшот-/класові тести, що перевіряють `hud-gold` або старі розміри, оновлюються разом із кодмодом.
- Агенти тести не запускають (крім `test:related`); один повний `pnpm test:run` наприкінці частини; lint по папках (`lint:dirs --changed`), `pnpm cycles`, `tsc`.

## Живий прогін (стенд 3100, БД `ch8_live`)
- Обидві палітри + користувач зі збереженою старою палітрою (`midnight`/`frost` у БД і в кеші `localStorage`) — без мерехтіння, показує `tavern`/`parchment`; ширини 1280×800, 1000×800, 390, 320 (iframe same-origin для phone).
- Профіль (зведення, аватар: завантаження/видалення, вихід), налаштування (перемикання палітри картками, мова, часовий пояс, пароль-форма без сабміту, AI-ключі), підписка, допомога, бібліотека звуків — у `GameShell` без подвійної шапки, під-таби на phone.
- Редагування листа: усі вкладки, сабміт із помилкою валідації (перехід на вкладку з полем), збереження; створення персонажа (спільний `CharacterBasicInfo`).
- Дашборд: ДМ і гравець; ключі перекладені.
- Ops: графіки, діапазони, зміна палітри перефарбовує осі.
- Клавіатура: Tab-порядок, фокус-кільце видно на багряній кнопці, вкладки стрілками.
- Бій-смоук: функціональні кольори руху/дальності на місці, жетони круглі, золота немає (включно з `var(--gold)`), HUD читається в parchment.
- Лендинг і `/sign-in` — вигляд як до міграції.
- Хвіст Кроку 0: кнопка «Далі» на 390 (`c0b6c40d7`).
- Консоль без помилок; 0 відповідей 5xx.

## Ризики
- **Обсяг кодмоду** (545 `hud-gold` + 110 `var(--gold)`): лише класи; ролі розбираються за таблицею; ratchet не дає регресувати; бій перевіряється смоуком.
- **Візуальні регресії від радіусів/шрифтів/розмірів кнопок** на нечіпаних сторінках (ширина Cormorant SC/Alegreya інша, ніж Alegreya SC/Sans; `Button` default 36 → 44 px, зокрема в щільних панелях бою): живий прогін проходить головні списки й бій; переповнення — фіксити точково або в хвилях Ч8.
- **Видалення 4 палітр**: користувачі з ними побачать tavern/parchment; дані не втрачаються (значення в БД лишається, читається через мапу).
- **i18n-бюджети** (`scope-size`): запас ~0.3 KB у кампанійних скоупах — нові ключі лише в `auth`, у `common` — один ключ проти чотирьох видалених.
- **Каскад `.hud-form/.hud-page [data-slot]`** видаляється: форми поза `.hud-form` отримають той самий вигляд — це бажано, але перевірити діалоги бою.
- **Тло**: прибирання картини `vey-strait` змінює вигляд усіх темних сторінок одразу після фази 0 (за DS — пласка сторінка + зерно).

## Суміжне: розподіл перекладів (окремий підпроєкт)

Запит власника 2026-11-25: зупинити постійне зростання бюджетів i18n і нормально розподілити переклади. Діагноз (заміри uk gzip):
- кожна сторінка під `app/campaigns/[id]` отримує весь `CAMPAIGN_NAMESPACES` (37 просторів, ~110 KB gzip), незалежно від того, чи це журнал, мапа чи редактор заклинань; бій додає ще 7 (`BATTLE_NAMESPACES`);
- найбільші внески в цей скоуп: `abilityRegistry` 13.4 KB, `battleLog` 8.0, `compendium` 7.4, `battle` 6.3, `world` 5.4, `rules` 5.2, `battleSetup` 4.9 — більшість потрібні 1–2 сторінкам;
- бюджет перевіряється на всю суму, тому будь-яка нова фіча будь-де піднімає ліміт усім.

Напрям (рішення — у його спеці): скоуп за маршрутом (базовий мінімальний набір кампанії + `ExtendLocaleScope` у layout/page конкретного розділу), бюджет на маршрут замість одного глобального, великі довідкові простори (`abilityRegistry`, `battleLog`, `compendium`) — серверний переклад або ліниве підвантаження, тест, що ловить простір, підключений у скоуп, але не використаний маршрутом. Підпроєкт не залежить від цієї частини й може йти паралельно в окремій гілці; ця частина лише не додає ключів у кампанійні скоупи (крім щонайбільше двох заголовків секцій, див. i18n).

## Порядок
Фаза 0 → фаза 1 (хвилі 1–4, ratchet до 0, видалення токенів) → фаза 2 → фаза 3 (профіль-оболонка → профіль/налаштування → `ProfileEditor` → дашборд → ops) → i18n/whats-new → повний тест → живий прогін → Opus-рев'ю → `/simplify` → docs (`docs/architecture/ui-layers.md`, `platform.md`, `docs/STATUS.md`).

Фазу 2 можна вести паралельно з хвилями 2–4 фази 1 (різні файли), якщо агенти не правлять ті самі файли: компоненти фази 2 (`components/ui`, `components/hud`, `components/common/fields`, CSS-база) входять у хвилю 1, тому фаза 2 стартує після хвилі 1.
