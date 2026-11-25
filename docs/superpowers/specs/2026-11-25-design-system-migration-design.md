# Ч8a: міграція платформи на DESIGN.md — токени, кодмод золота, форм-кіт, профіль, дашборди

Статус: затверджено в розмові 2026-11-25. Гілка `feat/game-ui-ch8` (../dnd-tracker-ch8).
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

**Не входить:** композиція решти сторінок (хвилі Ч8), друк `dm/print/*` (лишається світлим), іконки game-icons і спрайт (DS 3.7 — окрема задача; поки lucide), компоненти листа з DS 5.8–5.26 поза формою редагування (зроблено/робиться в Ч5), логіка автентифікації, контракт аватара, `components/fx/**`, `wizards/**`, `lib/server/**` (крім нового `lib/server/profile/summary.ts`), `lib/utils/battle/{pipeline,turn}`.

**Лендинг і auth** (`/`, `/uk`, `/sign-in`…) поза палітрами (`isPalettePath`): переводяться на локальні змінні в `.landing`/auth-корені з тими самими значеннями, що зараз, щоб не зламатися після видалення золотих токенів. Редизайн лендингу — окремо.

## Reuse

| Що | Звідки | Як |
|---|---|---|
| Шрифти Cormorant SC 700, Alegreya 400–900 + italic, Oswald 500 | `public/fonts`, `app/fonts.css`, класи `.hud-title/.hud-body/.hud-num` у `components/hud/hud.css` | стають основними; нових файлів немає |
| Механізм палітр | `lib/theme/palettes.ts`, `lib/theme/client.ts`, `lib/hooks/theme/usePaletteState.ts`, `lib/server/users/palette.ts`, `app/palettes.css` | скорочення списку + legacy-мапа в `paletteFor` |
| Тест контрасту | `lib/theme/__tests__/palette-contrast.test.ts` | переписується на пари DS 8.1 |
| Оболонка | `GameShell` (`components/layout/GameShell.tsx` → `HudGameShell`), `shouldUseGameShell` (`components/layout/game-shell-route.ts`) | акаунтний режим профілю замість `ProfileShell` |
| Меню профілю | `PROFILE_MENU` (`components/layout/profile-menu.ts`), `useProfileActions` | пункти під-табів + «Підписка» |
| Форм-кіт | `components/ui/*`, `components/hud/form/*`, `components/hud/page/*`, `ActionBar`, `ResponsiveDialog` | переписуються стилі, API не змінюється |
| Аватар | `components/profile/AvatarEditor.tsx` | без змін поведінки, нова рамка |
| Ratchet-шаблон | `ratchets/cyrillic-comments-exempt.json` + `lib/__tests__/cyrillic-comments.test.ts` | так само `ratchets/hud-gold.json` |
| Дашборд | `components/campaigns/dashboard/*`, `dashboard.css` | рестайл, дані й хуки ті самі |
| Ops | `components/ops/*`, `app/ops/ops-client.tsx` | рестайл, uPlot-кольори осей із CSS-змінних |

Нове: `lib/server/profile/summary.ts` (зведення), `scripts/codemods/gold-to-ds.ts`, `ratchets/hud-gold.json` + тест, сторінка `/settings/subscription`, компонент `PaletteCard` (у `components/profile/`), CSS-утиліти DS (`.ornate`, `.orn`, зерно) у `components/hud/hud.css`.

## Фаза 0. Токени й база

### Палітри
- `PALETTE_IDS = ['tavern', 'parchment']`; `LIGHT_PALETTES = ['parchment']`; `PALETTE_SWATCHES` — з DS (page, crimson, ink).
- `paletteFor(value)`: `midnight|forest|amethyst → tavern`, `frost → parchment`, інше невідоме → `DEFAULT_PALETTE`. `isPaletteId` приймає лише 2. Запис (API/схема) приймає лише 2; читання старого значення з БД ніколи не падає.
- `app/palettes.css`: блоки 4 палітр видаляються; правила `html[data-palette="frost"]` прибираються з селекторів.

### Імена токенів
Назви DS конфліктують із shadcn (`--muted` у shadcn — фон). Тому DS-токени живуть у наявних просторах імен (DS 11.1):

| DS | У коді | Tailwind-утиліта |
|---|---|---|
| `--page` `--panel` `--panel-2` `--inset` | `--palette-page` `--palette-panel` `--palette-panel-2` `--palette-inset` | `hud-page` `hud-panel` `hud-panel-2` `hud-inset` |
| `--ink` `--text` `--muted` `--faint` | `--hud-ink` `--hud-text` `--hud-muted` `--hud-faint` | `hud-ink` `hud-text` `hud-muted` `hud-faint` |
| `--line` `--line-strong` `--hi` | `--hud-rule` `--hud-line` `--hud-hi` | `hud-rule` `hud-line` |
| `--crimson` `--crimson-2` `--crimson-fg` `--crimson-ink` | `--hud-crimson` `--hud-crimson-2` `--hud-crimson-fg` `--hud-crimson-ink` | `hud-crimson` `hud-crimson-2` `hud-crimson-fg` `hud-crimson-ink` |
| `--hp` `--hp-2` | `--hud-hp` `--hud-hp-2` | `hud-hp` `hud-hp-2` |
| `--sh` `--sh-btn` | `--hud-sh` `--hud-sh-btn` | (через `shadow-[var(--hud-sh)]`) |
| `--grain-op` `--grain-mode` `--r` `--ease` `--focus` | ті самі | — |

Значення — DS розд. 13 для обох палітр. Зверніть увагу: `--hud-line` тепер = DS `--line-strong` (рамки контролів), `--hud-rule` = DS `--line` (розділювачі) — так вони вже використовуються в коді.

- `--hud-text`/`text-hud-text` зараз — `color-mix`; стає прямим токеном DS.
- `--hud-bone`, `--hud-field`, `--palette-card`, `--palette-secondary`, `--palette-background`, `--palette-foreground` лишаються як аліаси на DS-токени (`bone → text`, `field → inset`, `card → panel`, `secondary → panel-2`, `background → page`, `foreground → text`) — вони не є золотом і масово вживаються; прибирання — поза обсягом.
- `--hud-info`, `--hud-danger`, `--hud-bad`, `--hud-good*` лишаються як **функціональні** (бій, ops, валідація); `--hud-danger`/`--destructive` у формах = `--hud-crimson-fg`.
- shadcn: `--primary → --hud-crimson`, `--primary-foreground → --hud-crimson-ink`, `--ring → --hud-ink`, `--border`/`--input → --hud-line`, `--muted-foreground → --hud-muted`, `--accent → --palette-panel-2`. Це в `app/palettes.css` і `.hud-surface` у `hud.css` (дублікат прибрати — один набір у `palettes.css`).
- `--book-*` (книга заклинань) лишається: це окремий «предметний» матеріал; лише `--book-accent*` переходить на багряний відтінок DS.

### Типографіка
- `.hud-surface`, `.battle-hud`, `body` у палітрі: `font-family: var(--font-body)` (Alegreya), `font-variant-numeric: lining-nums tabular-nums`.
- `.hud-sc` → Cormorant SC 700 без `letter-spacing` (DS 3.2: розрядку не збільшуємо). Розміри в класах лишаються; мінімум 13 px — `text-[11px]`/`text-[12px]` у кодмоді-хвилях підіймаються до 13 (інтерактивний текст ≥ 15) у тих файлах, що й так правляться.
- `.font-hud` змінні: `--font-hud-sc → Cormorant SC`, `--font-hud-sans → Alegreya`. `--font-hud-book` (EB Garamond) лишається для книги заклинань.
- Alegreya SC / Alegreya Sans: лишаються лише якщо їх використовує лендинг; інакше `@font-face` і файли видаляються.

### Радіуси, глибина, фактура, фокус
- Тема Tailwind: `--radius-sm: 2px`, `--radius-md: 4px`, `--radius-lg: 4px`, `--radius-xl: 6px`, `--radius-2xl: 6px`; `--radius: 4px`. `rounded-full` не змінюється (жетони бою, аватари в списках лишаються круглими; круглі контроли поза боєм прибираються в хвилях).
- Утиліти в `hud.css`: `.ds-panel` (рівень 1: `panel` + `inset 0 1px 0 var(--hud-hi)` + `--hud-sh`), `.ds-inset` (рівень −1), `.ds-raised` (рівень 2), `.ornate` (кутові накладки DS 3.6), `.orn` (орнаментальний роздільник через `mask-image`). `HudPanel` (`components/hud/page`) використовує `.ds-panel`.
- `body::before` — зерно (SVG `feTurbulence`, `position: absolute` на всю висоту документа, `opacity: var(--grain-op)`, `mix-blend-mode: var(--grain-mode)`, `pointer-events: none`, `aria-hidden` через псевдоелемент); віньєтка/`--palette-overlay` прибирається з `body::after`. `--palette-overlay` лишається лише там, де ним затемнюють фонові картинки (`data-screen-bg`).
- `:focus-visible { outline: none; box-shadow: var(--focus) }` глобально; `html { scroll-padding-top: 72px }`; `@media (prefers-reduced-motion: reduce)` вимикає переходи (уже частково в `motion.css` — звести в одне місце).
- Видалити мертві глобальні ефекти з `globals.css`, що суперечать DS, якщо не використовуються: `.glass-card`, `.neon-border`, `@keyframes glow/pulse-glow` (перевірити `grep`; використовувані — переписати на DS-тіні).

### Бій (виняток)
Не змінюються: `--reach-stroke`, `--range-stroke`, `--path-label-*`, `--ally`, `--enemy`, кольори ресурсів, шкіл, металів (`.metal-*`), FX. Змінюються: шрифти, радіуси панелей (через тему), золото → DS-токени (кодмод), `--hud-gold-strong` у `@keyframes hud-turn`/`hud-roll-settle` → `--hud-crimson`.

### Контраст
`palette-contrast.test.ts` перевіряє для обох палітр пари DS 8.1: `ink/text/muted` на `page/panel/panel-2/inset` ≥ 4.5 (виняток: `muted` на `panel-2` у tavern ≥ 4.5 впритул), `crimson-fg` на `page/panel/panel-2` ≥ 4.5, `crimson-ink` на `crimson` ≥ 4.5, `line`-рамки контролів (`--hud-line` як непрозорий еквівалент на `panel`) ≥ 3 — rgba-токени в тест не йдуть (лише hex). `--hud-faint` у тесті явно позначений «лише декор» і не перевіряється на 4.5.

## Фаза 1. Кодмод золота

### Таблиця заміни (за роллю, не 1:1)

| Було | Роль | Стало |
|---|---|---|
| `text-hud-gold` | заголовок, мітка, назва секції, декоративна іконка | `text-hud-ink` (іконки біля підпису — `text-hud-muted`) |
| `text-hud-gold` | активний стан, іконка головної дії, володіння, бонус майстерності, акцентне число | `text-hud-crimson-fg` |
| `text-hud-gold-bright`, `text-hud-gold-strong` | підсвітка, hover-текст | `text-hud-ink` |
| `hover:text-hud-gold*` | hover посилання/кнопки | `hover:text-hud-ink` |
| `border-hud-gold/NN`, `border-hud-gold-strong/NN` | декоративна рамка картки | `border-hud-line` |
| `border-hud-gold`, `border-hud-gold-strong` | рамка активного/вибраного | `border-hud-crimson` |
| `hover:border-hud-gold*` | hover-рамка | `hover:border-hud-muted` |
| `bg-hud-gold`, `bg-hud-gold-strong` | заливка головної дії | `bg-hud-crimson text-hud-crimson-ink` |
| `bg-hud-gold/NN`, `bg-hud-gold-strong/NN`, `hover:bg-hud-gold/NN` | тонований фон, hover | `bg-hud-panel-2` / `hover:bg-hud-panel-2` (DS: без тонованих фонів) |
| `ring-hud-gold*`, `outline-hud-gold*`, `focus-visible:ring-hud-gold` | фокус | прибрати (глобальний `--focus`) |
| `accent-hud-gold` | нативний чекбокс/радіо/range | `accent-hud-crimson` |
| `from-/to-/via-hud-gold*` | градієнт | `hud-crimson`/`hud-crimson-2` лише на банері/стягу; інакше прибрати градієнт |
| `var(--hud-gold*)`, `var(--color-hud-gold*)` у CSS/TS | за контекстом | відповідний DS-токен за цією ж таблицею |

Активні вкладки й сегменти (`.profile-tab[data-state=active]` тощо) → DS 5.13: `panel-2` + риска 2 px `--hud-crimson` + текст `--hud-ink`, без золотої заливки.

### Виконання
- `scripts/codemods/gold-to-ds.ts` (tsx, dry-run за замовчуванням, `--write`): однозначні рядки таблиці (рамки з `/NN`, `bg-…/NN`, `hover:bg`, `ring`/`outline`, `accent`, `hover:text`, `text-hud-gold-bright/strong`). Звіт — файли з лишком неоднозначних `text-hud-gold`, `border-hud-gold`, `bg-hud-gold` без `/NN`.
- Неоднозначні випадки розбирають агенти по папках, за таблицею ролей, хвилями:
  1. `components/battle`, `components/hud`, `components/layout`, `components/common`, `components/ui`;
  2. `components/campaigns`, `components/world`, `components/quests`, `components/maps`, `components/show`, `components/scenario`, `components/music`, `components/audio`, `components/soundboard`;
  3. `components/character-profile`, `components/characters`, `components/abilities`, `systems/**`;
  4. решта (`content-import`, `onboarding`, `auth`, `app/**`, `lib/**`), лендинг → локальні змінні.
- Ratchet `ratchets/hud-gold.json` (`{ file: count }`, лише зменшується; скрипт `pnpm ratchet:hud-gold [--write]`; тест `lib/__tests__/hud-gold.test.ts`). Ціль фази — порожній файл; після цього `--hud-gold*` і `--color-hud-gold*` видаляються з `globals.css`/`palettes.css`/`hud.css`, а тест перетворюється на заборону (`hud-gold` у коді = помилка).
- Межа: лише класи й CSS-змінні; жодних змін логіки, пропсів, розмітки (крім злиття дубльованих класів). `components/fx/**` має власні hex — не чіпаємо.

## Фаза 2. Форм-кіт

API компонентів не змінюється (пропси, `data-slot`), змінюються класи. Стилі пишуться прямо в компонентах через DS-утиліти, а не через каскад `.hud-form [data-slot=…]` (ці правила в `hud.css`/`palettes.css` видаляються — один джерело).

| Компонент | DS |
|---|---|
| `Input`, `Textarea`, `SelectTrigger` (`select.tsx`, `select-field.tsx`, `HUD_SELECT_TRIGGER_CLASS`), `NumberInput`, `BoundedNumberInput`, `CommaListInput`, `SearchInput` | рівень −1: `bg-hud-inset`, `border-hud-line`, `shadow-[inset_0_1px_3px_rgba(0,0,0,.45)]`, `rounded-[4px]`, Alegreya 16 px (без зуму на iOS), висота 40 (`textarea` — min 88); placeholder `--hud-muted`; фокус: `border-hud-crimson` + `--focus`; `aria-invalid`: `border-hud-crimson`; disabled: opacity .35. Числові поля — `.hud-num`, `inputmode="numeric"` |
| `Label`, `LabeledInput`, `SelectField`, `SwitchField` | підпис Cormorant SC 17 px `--hud-text`, підказка/помилка 14 px (`--hud-muted` / `--hud-crimson-fg` з текстом, не лише колір), відступ мітка–поле 6 |
| `Button` | `default` = основна (DS 5.1): `bg-hud-crimson`, кант `--hud-crimson-2`, `inset 0 1px 0 rgba(255,255,255,.2), inset 0 -2px 0 rgba(0,0,0,.2)`, `text-hud-crimson-ink`, Cormorant SC; `outline`/`secondary` = звичайна: `bg-hud-panel-2`, `border-hud-line`, `--hud-sh-btn`, `inset 0 1px 0 var(--hud-hi)`, hover — рамка `--hud-muted`; `ghost`/`link` = посилання (`--hud-muted` → hover `--hud-ink`); `destructive` = звичайна з текстом `--hud-crimson-fg`. `:active` — `translateY(1px)`, без тіні. Розміри: `default` 44, `sm` 40, `lg` 52 (телефон 48), `icon` 40 / `icon-sm` 40 (зона натиску), `icon-lg` 44. Радіус 4 |
| `HudButton`, `HudToggleChip`, `OptionButton`, `HudIconButton` | ті самі рівні; toggle «увімкнено» = `panel-2` + риска `--hud-crimson`, не заливка |
| `Checkbox` | квадрат 20, `bg-hud-inset`, рамка `--hud-muted` (нетекстовий стан ≥ 3:1), checked — заливка `--hud-crimson` + галочка `--hud-crimson-ink`; невидима зона натиску 40 (`before:absolute before:-inset-[10px]`) |
| `Radio` | ромб 14 (DS «заповнений ромб = обрано»): порожній — обвідка `--hud-muted`, обраний — заливка `--hud-crimson`; зона натиску 40; лишається нативний `input[type=radio]` для доступності |
| `Switch` | трек `inset` 40×22, ручка `panel-2` з `--hud-sh-btn`; увімкнено — трек `--hud-crimson` |
| `Slider`, `.hud-range` | трек `inset` 6 px, заповнення `--hud-crimson`, ручка `panel-2` 20 з рамкою |
| `ImageUpload`, `IconUrlField`, `ColorField` | рамка-заглиблення, порожній стан — монограма/іконка `--hud-muted` + підпис дії |
| `HudFormPage` | центральна колонка `max-w-3xl`, `.ds-panel .ornate` на ≥ sm, на phone без рамки; заголовок `title-l` (Cormorant SC 28) + `.orn`; без radial-gradient |
| `HudSection` | заголовок `title-m` (24) `--hud-ink`, без золота; `panel` → `.ds-panel` |
| `HudTabs`, `SheetTabList`, `tabs.tsx` | DS 5.13: підписані вкладки, активна `panel-2` + блік + риска 2 px `--hud-crimson` + текст `--hud-ink` жирний; roving tabindex, ←/→/↑/↓/Home/End, `aria-controls`/`role=tabpanel`/`aria-labelledby`; на ≤ 1100 — горизонтальна прокрутка з маскою |
| `ActionBar` | вторинні ліворуч, основна праворуч; на phone на всю ширину, основна остання |
| `Dialog`, `ResponsiveDialog`, `ConfirmDialog`, `SideSheet`, `Popover`, `Tooltip`, `DropdownMenu` | рівень 3 (DS 3.5): `panel`/`panel-2` + `0 30px 80px -24px rgba(0,0,0,.9)`, радіус 4, заголовок `title-l` + «×» 40; backdrop `rgba(6,5,7,.72)` + blur 2 |
| `accordion.tsx`, `disclosure.tsx` | вигляд на лініях (`border-b border-hud-rule`, тригер Cormorant SC `--hud-ink`, шеврон `--hud-faint`); поведінку не змінюємо. У формах фази 3 акордеонів немає |
| `badge.tsx`, `card.tsx` | badge — текст + рамка `--hud-line`, без тонованих фонів; `card` → `.ds-panel` |

## Фаза 3. Екрани

### Оболонка профілю
- `ProfileShell` видаляється. `app/profile/layout.tsx`, `app/settings/layout.tsx`, `app/help/layout.tsx`, `app/library/sounds` (layout) рендерять `GameShell` в акаунтному режимі: `items` = «Профіль» (`/profile`) + записи `PROFILE_MENU` з `href` + «Підписка» (`/settings/subscription`); `activeId` за `pathname`. Дії `switchAccount`/`signOut` — на сторінці `/profile` і в наявному меню профілю шапки, не в табах.
- `shouldUseGameShell` повертає `true` для `/profile`, `/settings/*`, `/help`, `/help/*`, `/library/sounds`; тест `game-shell-route` розширюється (інакше подвійна шапка).
- `LocaleScope` профілю не розширюється без перевірки `lib/i18n/__tests__/scope-size.test.ts`; нові ключі — у вже підключених просторах (`common.profile`, `common.header`).
- Phone: смуга під-табів із горизонтальною прокруткою (як у `GameShell`), активна по центру, цілі ≥ 40.

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
- Зведення: `getProfileSummary(userId)` у `lib/server/profile/summary.ts` — `campaigns` (кількість членств, без архівних), `characters` (герої користувача), `lastActivity` (максимум `updatedAt` по його кампаніях або `null`). Три легкі запити в `Promise.all` у серверному `app/profile/page.tsx`, результат — проп у `ProfileClient`. Без нового API-роуту і клієнтського запиту. Нульові/відсутні значення не показуються. Відносна дата — `Intl.RelativeTimeFormat` з локалі.
- «Змінити акаунт» / «Вийти» — посилання-кнопки окремою зоною (`useProfileActions`). Вихід — без підтвердження (DS 6.8 — незворотне лише видалення).

### `/settings/subscription`
Заглушка: `HudFormPage` з заголовком «Підписка», один рядок «Скоро: …», без логіки. Пункт у `PROFILE_MENU` (`id: 'subscription'`, іконка `Crown` або аналог lucide).

### `/settings/preferences`
- Мова — наявний контрол у новому кіті.
- Палітра — 2 `PaletteCard` замість select: міні-прев'ю (`page` фон, `panel` смуга, `inset` поле, багряна кнопка, рядок тексту `ink`/`muted`), назва Cormorant SC, `aria-pressed`, `role="group"` + `aria-label`. Значення та збереження — наявний `usePaletteState`.

### `/settings/password`, `/settings/ai`, `/library/sounds`, `/help`
`HudFormPage` + кіт фази 2; композиція — центральна колонка, секції `HudSection`. AI-ключі: ключ провайдера не логується, не повертається, не з'являється в помилках (без змін логіки, `docs/architecture/ai.md`).

### Редагування листа (`ProfileEditor`)
- Каркас як у перегляді листа Ч5: `SheetIdentityPanel` (банер) + вкладки `ProfileTabs variant="sheet"` (DS `.rail`). Вміст вкладки — центральна колонка ≤ 860 px, секції `HudSection` без панелей-карток (лінії й простір, DS 2).
- `BasicEditTab`: секції «Особа» (ім'я, раса, клас, рівень, світогляд), «Походження» (передісторія, вік, …), «Зовнішність» (портрет `ImageUpload` 4:5 з монограмою, опис), «Історія» (`Textarea`). Сітка: 2 колонки ≥ 768, 1 на phone. Точний розподіл полів — за наявними полями `BasicEditTab`/`Ui.StatsFields`, без додавання чи видалення полів.
- Системні поля (`Ui.StatsFields`, `SystemFormFields`, `Ui.AdvancementEditor`, `systems/*/ui`) отримують новий вигляд через кіт; композицію систем не переписуємо.
- Помилка форми (`FormAlert`) — рядок `--hud-crimson-fg` з іконкою над вкладками; помилки полів — під полем; `useRevealInvalidTab` лишається.
- Акордеони в `path/*` і `skilltrees` — лише вигляд (фаза 2), поведінка без змін.

### Дашборд кампанії (`/campaigns/[id]`)
- `components/campaigns/dashboard/*` і `dashboard.css`: `.ds-panel` лише для груп даних (`DmPartyCard`, `CampaignSummaryPanel`, `DmPrepPanel`), решта на лініях; числа (рівні, HP, лічильники) — `.hud-num`; `HeroHp` — шкала DS 5.8 у мініатюрі (`inset` трек, `--hud-hp`/`--hud-hp-2`, `role="meter"` + `aria-valuetext`); дії — `Button` основна (одна на панель) / звичайна.
- Обидві ролі (ДМ, гравець — `PlayerHeroCard`).
- Сирі ключі `dashboard.*`/`gameTerms.*` (стара нотатка 2026-10-30): перевірити на стенді; якщо відтворюється — виправити підключення просторів імен (`lib/i18n/scopes.ts`), інакше закрити нотатку.

### `/ops`
- `app/ops/ops-client.tsx`, `components/ops/*`: панелі `.ds-panel`, заголовки Cormorant SC, числа Oswald, `OpsRangeTabs` → DS-вкладки (сегменти), `AlertList`/`DbTopTable` на лініях, `TestNotifyButton` — звичайна кнопка.
- Функціональний виняток: кольори станів (норма/попередження/критично) і серій лишаються; кожен стан має текстову мітку й іконку (не лише колір). `LimitGauge` — трек `inset`, заповнення кольором стану.
- uPlot: осі, сітка, підписи читають `--hud-muted`/`--hud-rule`/`--font-num` через `getComputedStyle` (перемальовування при зміні палітри).

## i18n і онбординг
- Нові ключі в `messages/{uk,en}` (`common.profile.summary.*`, `common.header.subscription`, `common.profile.subscription.*`, `common.preferences.palette.*` — точні простори за наявною структурою), кирилиця лише в JSON.
- Назви видалених палітр — прибрати ключі; ключі `tavern`/`parchment` лишаються.
- `lib/onboarding/whats-new.ts`: запис `2026-11-25-design-system` + `whatsNew.<id>` в обох мовах (нова мова інтерфейсу, 2 палітри, оновлений профіль).
- Hints/help: оновити тексти, що згадують 6 палітр або «золото».
- Бюджети `scope-size` у цій частині **не піднімаються**: нові ключі лише в акаунтних просторах (`common.profile`, `common.header`, `common.preferences`), які не входять у `CAMPAIGN_NAMESPACES`/`BATTLE_NAMESPACES`. Ключі видалених палітр і мертві ключі, які прибирає кодмод, звільняють місце.
- Перебудова розподілу перекладів (скоупи за маршрутом замість одного `CAMPAIGN_NAMESPACES` на всі сторінки кампанії) — окремий підпроєкт зі своєю спекою, див. «Суміжне».

## Тести
- `palette-contrast.test.ts` — пари DS 8.1 для 2 палітр.
- `lib/theme/__tests__` — `paletteFor` зі старими id; `isPaletteId` лише 2; API теми відхиляє запис старих id і не падає на читанні (`theme-api.test.ts`).
- `game-shell-route` — нові маршрути.
- `lib/__tests__/hud-gold.test.ts` — ratchet, потім заборона.
- `lib/server/profile/__tests__/summary.test.ts` — підрахунок, `null` без кампаній (мок Prisma).
- `HudTabs` — клавіатура (←/→/Home/End), `aria-controls`/`tabpanel`.
- `Checkbox`/`Radio`/`PaletteCard` — ролі й `aria-*` (happy-dom).
- Наявні снапшот-/класові тести, що перевіряють `hud-gold` або старі розміри, оновлюються разом із кодмодом.
- Агенти тести не запускають (крім `test:related`); один повний `pnpm test:run` наприкінці частини; lint по папках (`lint:dirs --changed`), `pnpm cycles`, `tsc`.

## Живий прогін (стенд 3100, БД `ch8_live`)
- Обидві палітри; ширини 1280×800, 1000×800, 390, 320 (iframe same-origin для phone).
- Профіль (аватар: завантаження/видалення), налаштування (перемикання палітри картками, мова, пароль-форма без сабміту, AI-ключі), підписка, допомога, бібліотека звуків — у `GameShell` без подвійної шапки.
- Редагування листа: усі вкладки, сабміт із помилкою валідації (перехід на вкладку з полем), збереження.
- Дашборд: ДМ і гравець; ключі перекладені.
- Ops: графіки, діапазони, зміна палітри перефарбовує осі.
- Клавіатура: Tab-порядок, фокус-кільце видно на багряній кнопці, вкладки стрілками.
- Бій-смоук: функціональні кольори руху/дальності на місці, жетони круглі, золота немає, HUD читається в parchment.
- Хвіст Кроку 0: кнопка «Далі» на 390 (`c0b6c40d7`).
- Консоль без помилок; 0 відповідей 5xx.

## Ризики
- **Обсяг кодмоду** (545 входжень): лише класи; ролі розбираються за таблицею; ratchet не дає регресувати; бій перевіряється смоуком.
- **Візуальні регресії від радіусів/шрифтів** на нечіпаних сторінках (ширина Cormorant SC/Alegreya інша, ніж Alegreya SC/Sans): живий прогін проходить головні списки; переповнення — фіксити точково або в хвилях Ч8.
- **Видалення 4 палітр**: користувачі з ними побачать tavern/parchment; дані не втрачаються (значення в БД лишається, читається через мапу).
- **i18n-бюджети** (`scope-size`): запас ~0.3 KB у бойових скоупах — нові ключі класти лише в профільні/загальні простори.
- **Каскад `.hud-form [data-slot]`** видаляється: форми поза `.hud-form` (якщо є) отримають той самий вигляд — це бажано, але перевірити діалоги бою.

## Суміжне: розподіл перекладів (окремий підпроєкт)

Запит власника 2026-11-25: зупинити постійне зростання бюджетів i18n і нормально розподілити переклади. Діагноз (заміри uk gzip):
- кожна сторінка під `app/campaigns/[id]` отримує весь `CAMPAIGN_NAMESPACES` (36 просторів, ~110 KB gzip), незалежно від того, чи це журнал, мапа чи редактор заклинань; бій додає ще 7 (`BATTLE_NAMESPACES`);
- найбільші внески в цей скоуп: `abilityRegistry` 13.4 KB, `battleLog` 8.0, `compendium` 7.4, `battle` 6.3, `world` 5.4, `rules` 5.2, `battleSetup` 4.9 — більшість потрібні 1–2 сторінкам;
- бюджет перевіряється на всю суму, тому будь-яка нова фіча будь-де піднімає ліміт усім.

Напрям (рішення — у його спеці): скоуп за маршрутом (базовий мінімальний набір кампанії + `ExtendLocaleScope` у layout/page конкретного розділу), бюджет на маршрут замість одного глобального, великі довідкові простори (`abilityRegistry`, `battleLog`, `compendium`) — серверний переклад або ліниве підвантаження, тест, що ловить простір, підключений у скоуп, але не використаний маршрутом. Підпроєкт не залежить від цієї частини й може йти паралельно в окремій гілці; ця частина лише не додає ключів у кампанійні скоупи.

## Порядок
Фаза 0 → фаза 1 (хвилі 1–4, ratchet до 0, видалення токенів) → фаза 2 → фаза 3 (профіль-оболонка → профіль/налаштування → `ProfileEditor` → дашборд → ops) → i18n/whats-new → повний тест → живий прогін → Opus-рев'ю → `/simplify` → docs (`docs/architecture/ui-layers.md`, `platform.md`, `docs/STATUS.md`).

Фазу 2 можна вести паралельно з хвилями 2–4 фази 1 (різні файли), якщо агенти не правлять ті самі файли.
