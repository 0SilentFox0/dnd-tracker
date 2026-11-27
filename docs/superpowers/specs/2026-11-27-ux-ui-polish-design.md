# UX/UI polish: еволюція дизайн-системи (П7 + 6.6)

Дата: 2026-11-27. Гілка `feat/ux-ui-polish` (worktree `../dnd-tracker-ui`). Хвиля 4 плану `docs/superpowers/plans/2026-11-27-ux-audit-fixes.md`.
Вхід: аудит `docs/superpowers/research/2026-11-27-ux-audit/ux-visual-design.md` (виміри), інвентар `.../ui-polish-inventory.md` (file:line). Спек містить рішення й значення, без коду.

## 0. Мета, межі, принципи

**Мета:** прибрати «розкид» (11–17 розмірів шрифту, 5–8 висот кнопок, 5–10 радіусів на сторінку), провали контрасту в muted/disabled, слабку тему Пергамент і найслабші сторінки (`/dm/rules`, `/info`, 404, порожні стани), не змінюючи стилю «книга майстра при свічках».

**Принципи:**
- **Еволюція DS Ч8a, а не друга DS.** Токени лишаються в `app/palettes.css` + `@theme` у `app/globals.css`, утиліти в `components/hud/hud.css`, kit у `components/hud/page/*`, `components/ui/*`.
- **Спершу примітиви, потім сторінки.** Зміна в `Button`/`HudPill`/`HudPage`/`LoadingState`/`EmptyState` має виправити більшість сторінок без правок у них; сторінкові правки — лише прибирання локальних override-ів.
- **Шкали зашиті в Tailwind-тему,** щоб існуючі утиліти (`text-sm`, `rounded-lg`) автоматично стали «на шкалі»; поза шкалою — лише через ratchet `ui-scale`, який тільки спадає.

**Рішення власника (вже прийняті, не переглядаються):** display-шрифт усього сайту включно з лендингом/авторизацією — Cormorant SC; текст < 14px ніколи не Cormorant SC → Alegreya 600; `faint` піднімається для тексту + окремий декоративний токен зі старими значеннями; три родини Alegreya / Cormorant SC / Oswald; EB Garamond і Alegreya Sans прибрати.

**Перевикористання (див. інвентар):** `palettes.css`, `@theme static`, `palette-contrast.test.ts`, `buttonVariants`, `HudIconButton`, `HUD_CHIP_CLASS`, `HudPill`, `HudPage`, `LoadingState`, `EmptyState`, `useClassMode().byId`, шаблон ratchet `props-budget` / `hud-gold`. Нове: `HudSplit` (одна сітка замість `ReferenceLayout` + `RulesSide`), ілюстрації `components/common/illustrations/`, ratchet `ui-scale`, утиліти `.hud-label`, `.ds-skeleton`.

## 1. Кольори й контраст (7.1, 7.7, 7.9)

### 1.1 Токени (`app/palettes.css`)

| Токен | Таверна було → стане | Пергамент було → стане | Примітка |
|---|---|---|---|
| `--hud-faint` (текст) | `#6b6156` → `#8c8272` (4.82 panel / 5.22 page) | `#a29482` → **`#6b5f52`** (5.23 panel / 4.77 page) | див. 1.2 |
| `--hud-faint-deco` (новий) | `#6b6156` | `#a29482` | рамки, роздільники, декоративні іконки; не текст |
| `--hud-accent-2` | `#8f7a3f` → `#a38d4c` (5.62 panel / 4.83 panel-2) | `#5a420a` без змін (7.97 / 8.63) | |
| `--hud-hp` | `#c8382f` → **`#b8352c`** (`crimson-ink` на ньому 5.20) | `#b0332a` без змін (5.80) | `--hud-hp-2` без змін |
| `--skeleton` / `--skeleton-hi` (нові) | `#2a2218` / `#3a3024` | `#dbd0bc` / `#f1ebdf` | для 4.4 |

Виміри — WCAG за тим самим методом, що в `palette-contrast.test.ts`.

### 1.2 Рішення по `faint`
**Рішення (рекомендоване, підтвердити):** значення з аудиту для Пергаменту `#7d705f` реально дає 4.06:1 на `panel` і 3.71 на `page` (аудит помилився), тож береться `#6b5f52`. Таверна `#8c8272` проходить на `panel`/`page`/`inset`, але дає 4.14 на `panel-2` → правило: текст `faint` не ставиться на `panel-2`/`ds-raised` (там `muted`). Плейсхолдери в обох темах — `--hud-muted` (на `inset` Пергаменту 4.53), не `faint`.

**Міграція:** утиліти `border-*/divide-*/bg-*/stroke-*/fill-*/outline-*`-`hud-faint` → `hud-faint-deco` (механічний codemod); `text-hud-faint` лишається (нове значення). Шеврони `ui/disclosure.tsx:71`, `ui/accordion.tsx:45` лишаються на `faint` (несуть сенс, ≥3:1).

### 1.3 Disabled — одне правило
- **Рішення:** `disabled` = `opacity: .5` від повного кольору елемента + `cursor: not-allowed`; без зміни кольору, без `pointer-events-none` (інакше курсор не видно). Для `asChild`-посилань — `aria-disabled:` ті самі класи + `aria-disabled:pointer-events-none`.
- Джерело — константа `DISABLED_CLASS` у `components/ui/disabled.ts`; використовують `Button`, `Input`, `Select` trigger, `Textarea`, `ui/field-class.ts` (35 → 50), `ui/tabs`, `Checkbox`/radio (`globals.css:241-242`), `HudButton`, `HudIconButton`, `HudToggleChip`, `OptionButton` (40 → 50), `HeaderPillLink` (70 → 50).
- Заблоковане поле (наприклад «Система правил» у `/dm/rules`) — плюс іконка замка в полі й підказка `muted`.
- Інші `disabled:opacity-N` (N ≠ 50) рахує ratchet (розд. 6).

### 1.4 HP (7.7)
`--sheet-hp: var(--hud-hp)`, заливка смуги — градієнт `--hud-hp → --hud-hp-2` (як `HeroHp.tsx:37`), текст `--hud-crimson-ink`; `--sheet-hp-ghost/track/temp` (`app/motion.css:10-14`) рахуються від `--hud-hp` тими ж `color-mix`. `--hud-danger` для HP більше не використовується. Однакова побудова в обох темах (значення з палітри).

### 1.5 Пергамент (7.9)
- Фон: та сама картина `vey-strait` (жодного нового ассету, egress), `body::after` для обох палітр. Пергамент: `filter: sepia(.7) saturate(.6) brightness(1.15)`, `mix-blend-mode: multiply`, `opacity: .16`; зерно `--grain-op: .5` лишається.
- disabled/placeholder — через 1.2/1.3 (вирівнюються автоматично).

### 1.6 Тест контрасту (`lib/theme/__tests__/palette-contrast.test.ts`)
Нові пари, обидві палітри: `faint` на `panel`, `page` ≥ 4.5; `accent-2` на `panel`, `panel-2` ≥ 4.5; `crimson-ink` на `hp` і `hp-2` ≥ 5.0; `danger` на `panel` ≥ 4.5; `info`, `good` на `panel` ≥ 4.5; `muted` на `inset` ≥ 4.5 (плейсхолдер); `faint-deco` на `panel` ≥ 1.5 (видимий роздільник). Поточні значення `danger`/`info`/`good` уже проходять (4.59–10.8).

## 2. Типографіка (7.2, 7.3, 7.14)

### 2.1 Шкала
**Рішення (рекомендоване, підтвердити):** окремих `--fs-*` не вводимо — шкала = перевизначені Tailwind `--text-*` у `@theme static` (`app/globals.css`), щоб 1 700+ існуючих `text-xs/sm/base/lg` уже були на шкалі. CSS-файли посилаються на `var(--text-sm)` тощо.

| Утиліта | px | line-height | Призначення |
|---|---|---|---|
| `text-xs` | 12 | 16 | мінімум: мітки, чипи, метадані |
| `text-sm` | 14 | 20 | описи, довідка, поля форм, кнопки sm |
| `text-base` | 16 | 24 | основний текст, кнопки md/lg |
| `text-lg` | 18 | 26 | підзаголовки секцій, gold-кнопка md |
| `text-xl` | 22 (було 20) | 28 | заголовки карток/панелей |
| `text-2xl` | 28 (було 24) | 34 | заголовок сторінки на телефоні, проміжний рівень дашборду |
| `text-3xl` | 40 (було 30) | 46 | h1 сторінки (desktop) |
| `text-4xl+` | дефолт TW | — | лише лендинг/hero-банери (display) |

**Мапа довільних розмірів:** `9/10/11px` → `text-xs` (або `.hud-label`, якщо uppercase-мітка); `12.5/13/13.5px` → `text-sm` для тексту, `text-xs` для чипів/пілюль (`HudPill`, `HUD_CHIP_CLASS`, `HudSectionTitle`, `HudSheetHeading`); `15px` → `text-base` (`HudTabs`, `HudTile`, база `Button`); `17px` → `text-lg`; `19/20` → `text-xl`; `26/27/30` → `text-2xl`; `34–46` → `text-3xl`; `52/56` і `clamp()` — лише лендинг/hero.

**Правила:** мінімум 12px скрізь (включно з Oswald-цифрами в бою й на `/battles/new`); описи заклинань, довідка, `/info` — `text-sm` (14), не 12; у шапці/дашборді kicker і метадані ≥ 12, між 12 і h1 40 — рівень `text-2xl`/`text-base` для підзаголовка.

### 2.2 HUD-мітки (колишні 11px uppercase)
Нова утиліта `.hud-label` у `hud.css`: 12px, Alegreya 600, `text-transform: uppercase`, `letter-spacing: .06em`, колір `muted`. Сюди йдуть мітки ініціативи («ДІЯ/БОНУС/РЕАКЦІЯ»), `HudStatChip` label (10px), kickers. На карті бою мітки отримують підкладку `ds-inset` з непрозорістю ≥ .85.

### 2.3 Шрифти (`app/fonts.css`, `components/hud/fonts.ts`)
| Роль | Родина | Змінні |
|---|---|---|
| текст | Alegreya (var + italic) | `--font-body`, `--font-hud-sans`, `--font-hud-book`, `--font-sans` |
| display/заголовки ≥ 14px | Cormorant SC 700 | `--font-title`, `--font-hud-sc` |
| числа | Oswald 500 | `--font-num` |
| код/IP/kbd | системний `ui-monospace, SFMono-Regular, Menlo, monospace` | `--font-mono` |

- Прибрати `@font-face` і файли: EB Garamond, Alegreya Sans, **Alegreya SC**, **Geist** (`font-sans` → Alegreya). **Рішення (рекомендоване, підтвердити):** Alegreya SC і Geist теж ідуть, бо інакше родин 4–5.
- EB Garamond (`.hud-book`, 7 файлів) → `--font-hud-book: var(--font-body)` (Alegreya, `font-variant-numeric: oldstyle-nums`); файли не правимо, лише змінна.
- `scenario-book.css` (Alegreya Sans ×16) → Alegreya; дрібні службові підписи книги — `.hud-label`.
- Лендинг і `.auth-legacy`: прибрати remap `--font-hud-sc`/`--font-hud-sans` (`landing.css:163`); `world-atlas.css:91` → Cormorant SC (≥ 14) або `.hud-label`.
- Mono: лише коди/IP/kbd (admin, ops, invite code, `WorldToolbar` kbd); `SpellCard.tsx:187` (mono 10px) → `text-xs` Alegreya.
- Preload `HUD_PRELOAD_FONTS`: CormorantSC-Bold-cyrillic + Alegreya-Variable (AlegreyaSC-Bold прибрати).
- **Cormorant < 14 — страховка в CSS:** `.hud-sc.text-xs, .hud-title.text-xs { font-family: var(--font-body); font-weight: 600; }`; ratchet ловить довільні розміри (розд. 6).

## 3. Кнопки, радіуси, чипи, таби (7.4, 7.12)

### 3.1 Драбина розмірів (`components/ui/button.tsx`)
| size | висота | текст (outline/ghost) | текст (default, gold Cormorant) | padding |
|---|---|---|---|---|
| `sm` | 32 (`h-8`) | `text-sm` | `text-sm` | `px-3` |
| `default` (= md) | 40 (`h-10`, було 44) | `text-base` | `text-lg` | `px-4` |
| `lg` | 48 (`h-12`, без `sm:h-[52px]`) | `text-base` | `text-lg` | `px-6` |
| `icon-sm` / `icon` / `icon-lg` | 32 / 40 / 48 квадрат | — | — | — |

- **Touch 44 — одне правило в базі cva:** `pointer-coarse:min-h-11` (+ `pointer-coarse:min-w-11` для icon-розмірів). **Рішення (рекомендоване, підтвердити):** за типом вказівника, а не за шириною вʼюпорта — планшет із пальцем теж отримує 44, desktop у вузькому вікні — ні.
- Ім'я `default` лишається (753 використання без `size`), `md` не вводимо.
- Усі `min-h-11 sm:min-h-9`, `h-9`, `size-8`, `h-[52px]` на `<Button>` прибрати (розмір — тільки prop `size`); ratchet рахує залишок.
- `outline` ≡ `secondary`: ключ `secondary` видаляється, використання → `outline` (codemod).
- `HudIconButton`: sm 32 / md 40 / + `lg` 48, те саме coarse-правило. `HudButton` (bare, 321 використання) розміру не отримує; його висоти поза 32/40/48 рахує ratchet.
- `HudToggleChip`, `HudChipTabs`, `HudSegmented` — висота 32 (див. 3.4).
- `HeaderPillLink` → класи з `buttonVariants({ variant: 'default', size: 'sm' })`, підпис видно завжди; `max-[359px]:sr-only` як запобіжник (7.14). **Рішення:** підпис замість тултіпа — «До бою»/«Показ» короткі й це головний заклик, коли бій/показ активні.

### 3.2 Радіуси
| Роль | Утиліта | Значення | CSS-аліас |
|---|---|---|---|
| бейджі, чекбокс, дрібні вставки | `rounded-sm` | 4 (було 6) | `--r-sm` |
| контроли, кнопки, чипи-таби, картки списку | `rounded-lg` | 8 | `--r-md` |
| панелі, оверлеї, діалоги | `rounded-xl` | 12 | `--r-lg` |
| пілюлі, аватари | `rounded-full` | 9999 | `--r-pill` |

- `--r-sm/md/lg/pill` у `:root` (`globals.css`) = `var(--radius-sm/lg/xl)`, `9999px`; для CSS-файлів.
- Codemod: `rounded-md` → `rounded-lg`, `rounded-2xl`/`3xl`/`4xl` → `rounded-xl`, `rounded-xs` і голий `rounded` → `rounded-sm`, `rounded-[4px]` → `rounded-sm`, `rounded-[var(--r)]` → `rounded-xl`; `--r: 10px` видаляється. Значення `--radius-md/2xl/3xl/4xl/xs` у темі лишаються (сумісність сторонніх shadcn-класів), але утиліти рахує ratchet.
- Дозволені довільні: `rounded-[inherit]`, `rounded-[var(--r-*)]`.

### 3.3 Бейджі (`HudPill` — єдиний)
- Геометрія: `h-6` (24), `rounded-sm` (4), `px-2`, `text-xs` Alegreya 600, `leading-none`, gap 4.
- Тони за змістом: `role` (золото `.metal-gold`) — **лише** роль користувача (ДМ / Гравець: картки кампаній, список учасників); `meta` (outline: `inset 0 0 0 1px hud-line`, текст `hud-soft`) — метадані, модулі, теги, «джерело»; `npc` (сірий: фон `muted/15`, текст `muted`) — NPC; `accent` (outline accent, текст `accent-fg`) — «Нове», акцентні статуси; `danger` (outline crimson, текст `crimson-fg`) — попередження.
- Мапа старих тонів: `gold` → `role` лише там, де роль, інакше `accent`; `silver` → `npc`; `bone/muted/fact` → `meta`. `NewPill` → `accent`. `DmCharacterCard`: NPC → `npc`, персонаж гравця → `meta` (золото більше не означає «гравець»).
- `ui/badge.tsx` (47 використань) видаляється; виклики → `HudPill` (ui не може імпортувати hud, тому без обгортки).

### 3.4 Одна мова табів/чипів
| Компонент | Лишається | Роль | Вигляд |
|---|---|---|---|
| `HudChipTabs` | так | фільтри й перемикачі сторінок | `HUD_CHIP_CLASS` |
| `HudToggleChip`, `HudSegmented` | так | toggle / radiogroup | `HUD_CHIP_CLASS` |
| `hud/form/HudTabs` | так | вкладки форм (rail/scroll) | rail-пункт h-10 `rounded-lg`, scroll h-10 `text-base` |
| `ui/tabs` (Radix) | так, як примітив | вкладки всередині діалогів/панелей | перестилізувати під `HUD_CHIP_CLASS` |

`HUD_CHIP_CLASS` (єдине джерело, `HudChipTabs.tsx`): `h-8 px-3 rounded-lg text-sm` Alegreya 600, неактивний `ds-inset` + `border-hud-line` + `text-hud-muted`, активний `bg-hud-accent/15 border-hud-accent text-hud-accent-fg`, `pointer-coarse:min-h-10`. Варіант `lg` (h-11) прибирається.

## 4. Сторінки: контейнер, фон, стани (7.5, 7.10, 7.11)

### 4.1 Контейнер (`HudPage`)
- `width`: `page` (дефолт, `max-w-[75rem]` = 1200) | `narrow` (`max-w-3xl`, 768: 404, акаунт, вузькі форми) | `wide` (без max-width; лише бій і мапи). Старі `lg` → `page`, `md` → `narrow`.
- Поля: `px-4 sm:px-6` (16/24), `py-6`.
- `--container-page: 75rem` фіксовано; блок `@media (min-width: 96rem)` з `min(90vw,160rem)` видаляється (див. питання 4).
- `HudFormPage width="wide"` (1680) → 1200, крім редакторів-«верстаків», що вже на `wide`-маршрутах мап.

### 4.2 Фон
- Один фон для всіх сторінок застосунку: картина + затемнення (Таверна `rgba(0,0,0,.72)` як зараз; Пергамент — 1.5).
- Сценарій: `.scenario-book` більше не заливає всю сторінку (`scenario-book.css:5,17`); `--book-page` лише на «аркуші книги», навколо видно фон.
- Авторизація (`.auth-legacy`, без `data-palette`, бо root layout статичний): власний фон тим самим зображенням + `rgba(0,0,0,.72)`, Cormorant SC; синій autofill прибрати (`-webkit-box-shadow` inset кольором `inset`).
- Лендинг лишає власний фон.

### 4.3 Порожні стани й 404 (7.10)
- **Рішення:** inline-SVG React-компоненти, малюємо самі (без ассетів, без egress), `components/common/illustrations/` (layer `common`, без доменних типів). Стиль `book-*`: лінійна гравюра, `stroke: currentColor` (`muted`), штрих 1.5, акцентні вставки `--hud-accent`, viewBox 160×120, `aria-hidden`.
- Мотиви (4): `BrokenD20` (тріснутий d20 з «1»; 404 і `ErrorState`), `BlankTome` (розгорнута порожня книга; порожні списки), `LanternSearch` (ліхтар над картою; `SearchEmptyState`), `SheathedSwords` (немає боїв/героїв).
- `EmptyState` отримує prop `illustration?: ReactNode` (над заголовком, 120px висоти, на телефоні 96); `icon` лишається для компактних станів.
- `app/not-found.tsx`: `HudPage narrow` + `BrokenD20` + заголовок `text-2xl` Cormorant + текст `text-base` + дві дії («Назад», «До кампаній»).

### 4.4 Скелетони (7.11)
- `LoadingState({ variant = 'rows', count, label, className })`; prop `rows` перейменовується на `count` без аліасу (правимо 6 `loading.tsx` і `SectionLoading`).
- Варіанти: `rows` (h-14), `cards` (сітка `ds-list-grid`: смуга заголовка 60%, два рядки тексту, пілюля), `list` (коло 40 + два рядки), `detail` (заголовок + 4 абзаци), `form` (rail 200 + 6 полів).
- `.ds-skeleton` у `hud.css`: градієнт `--skeleton → --skeleton-hi → --skeleton`, `background-size: 200%`, 1.4s; під `prefers-reduced-motion` — статичний `--skeleton`. 8 ad-hoc `animate-pulse` → `.ds-skeleton`.
- Без layout shift: `loading.tsx` рендерить скелетон у тому самому контейнері, що й сторінка (`HudPage` + `HudSplit` для rules/info).

## 5. Окремі екрани

### 5.1 `HudSplit` — одна сітка з правою панеллю (6.6/7.6)
Новий `components/hud/page/HudSplit.tsx` замінює сітку `ReferenceLayout` і бічну колонку `RulesBook`.

```
HudSplit({ rail?, aside, children })
aside: { content, width?: 'sm' | 'md', title, mobile: 'stack' | { open, onClose } }
```
- Колонки: телефон — одна (rail зверху смугою, aside або під main — `stack`, або `ResponsiveDialog hud` — об'єкт); lg — main + aside; xl — rail 200 / main / aside.
- Ширини — токени `--rail-w: 200px`, `--aside-w: 280px` (`sm`) / `360px` (`md`); `.hud-form-wide` переходить на ті самі змінні (без іншої зміни).
- Aside: `sticky`, `top: calc(var(--shell-header-h) + 16px)`, `max-height` до низу вʼюпорта, власний скрол, `ds-panel p-4`.

### 5.2 `/dm/rules`
- `RulesBook` → `HudPage` + `HudPageHeader` + `HudSplit` (rail = `HudTabs` rail, aside `sm` 280). `HudForm` лишається для полів. Ризик: `HudForm` зав'язаний на сітку `.hud-form-wide` — перевірити на початку групи G6.
- Шапка: система + модулі — чипи `HudPill meta`, видно перші 4, далі пілюля-кнопка «+N ще» (розкриває решту в рядку).
- Aside: секція «Зміни» — чипи змінених розділів, кожен із кнопкою скидання «×» (`aria-label`), > 6 — «+N ще»; під ними `Скасувати`/`Зберегти` (`Button` md, `Зберегти` disabled без змін). Лічильник змін у діях прибирається (лишаються крапки на табах).
- Заблоковане поле системи — замок + підказка (1.3).

### 5.3 `/info`
- `ReferenceLayout` → `HudSplit` (aside `md` 360, на телефоні діалог). `InfoReferenceClient` без змін логіки.
- «Скинути фільтри»: `Button variant="ghost" size="sm"` у rail, видно коли є активний фільтр/пошук; та сама дія — у `SearchEmptyState`.
- Права панель секціями `HudSectionTitle`: «Коротко» (назва, вид, пілюлі `meta`), «Опис» (`text-sm`), «Механіка» (рядки параметрів), «Джерело». Порожня панель — підказка «Оберіть запис».

### 5.4 Дашборд: плитка «Правила» (6.6)
`HudTile` у сітці дашборду ДМ → `/dm/rules`: назва системи + кількість активних модулів (`HudPill meta`). Іконка з `components/hud/icons`.

### 5.5 Картки без портрета (7.8)
`DmCharacterCard` / `HeroPortrait` у режимі «немає зображення»: висота області 128px (`h-32`, не квадрат), фон — градієнт від кольору класу (`color-mix(class.color 35%, panel-2)` → `panel`), по центру іконка класу 48px; без класу — монограма 32px Cormorant. Дані — `useClassMode(campaignId).byId` (вже в картці); мультиклас — клас з найбільшим рівнем. Аркуш героя не змінюється (там монограма доречна).

### 5.6 Лендинг (7.13)
`.ld-ink` (mask sweep) → `.ld-reveal` на весь блок секції: `opacity 0→1`, `translateY(24px)→0`, `animation-timeline: view()`, `animation-range: entry 0% entry 40%`. Лише всередині `prefers-reduced-motion: no-preference` + `@supports (animation-timeline: view())`; інакше блок просто видимий.

### 5.7 Шапка/дашборд (7.14)
Усі `text-[10|11px]` у шапці й дашборді → `text-xs`/`.hud-label`; підписи `HeaderPillLink` — 3.1.

## 6. Ratchet `ui-scale` (крок 4)

За шаблоном `props-budget`: `scripts/shared/ui-scale.ts [--write]` → `ratchets/ui-scale-exempt.json` (`{ "<file>": count }`), тест `lib/__tests__/ui-scale.test.ts` («no file grows / no new file», «entries are exact — shrink or remove»), помічник у `lib/__tests__/helpers/ui-scale.ts`, `it.each` кейси на кожен лічильник (як `hud-gold.test.ts`).

Скан: `components/**`, `app/**`, `systems/**/ui/**` (`.tsx/.ts/.css`), без `__tests__`. Count на файл = сума збігів:

| Лічильник | Що ловить (TS/TSX) |
|---|---|
| `font-arbitrary` | `text-[Npx|Nrem|Nem]`, крім 12/14/16/18/22/28/40px; `text-[length:var(...)]` і `text-[clamp(...)]` у `components/landing/**` дозволені |
| `radius-arbitrary` | `rounded(-[trblse]{1,2})?-\[...\]`, крім `[inherit]` і `[var(--r-*)]`; а також `rounded(-…)?-(md|xs|2xl|3xl|4xl)` і голий `rounded` |
| `button-height` | у відкриваючому тегу `<Button`/`<HudIconButton` — будь-який `(min-)?h-*`/`size-*` у `className` (розмір лише з `size`); у `<HudButton` — `(min-)?h-*`/`size-*` зі значенням поза `8|10|12` або довільне `[...]` |
| `disabled-opacity` | `disabled:opacity-N`, N ≠ 50 |
| `css-small-font` | у CSS `font-size:` < 12px або < .75rem |

Регенерація: `pnpm exec tsx scripts/shared/ui-scale.ts --write` (лише після зменшення). Ratchet пишеться **після** codemod-ів G1–G3, щоб базова лінія була малою. `dm/print/print.css` — у списку винятків (друк), не в окремому allowlist.

## 7. Виміри «до/після»

Метод як в аудиті: JS-сніпет у браузері (`scripts/ux/measure-ui.js`, запускається через claude-in-chrome, не node): видимі текстові вузли до 3 екранів; рахує різні `font-size`, різні `border-radius` (елементи з фоном/рамкою), різні висоти `button, [role=button], a[data-slot=button]`, провали контрасту (< 4.5, < 3 для ≥ 24px/18.66 bold; ефективний фон з alpha; градієнти/зображення — виключити), частку символів < 12px і рівно 12px.

Сторінки (×Таверна/Пергамент ×1440/390 = 32 знімки): лендинг, дашборд кампанії, аркуш героя, бій, `/dm/spells`, `/dm/rules`, `/info`, 404. «До» — на `main` перед G1, «після» — після G8; таблиця в `docs/superpowers/research/2026-11-27-ux-audit/ui-polish-measure.md`.

| Метрика (на сторінку) | Ціль |
|---|---|
| різних розмірів шрифту | ≤ 7 (лендинг ≤ 9 через display/clamp) |
| різних радіусів | ≤ 5 (4/8/12/pill/50%) |
| різних висот кнопок | ≤ 3 desktop (32/40/48), на 390 + 44 |
| символів < 12px | 0% |
| символів рівно 12px на `/info`, `/dm/spells` | ≤ 25% (було 69% / 50%) |
| провалів контрасту (вкл. disabled ≥ 3:1) | 0 |
| ratchet `ui-scale` | сума менша за базову лінію G4 |

## 8. Порядок виконання (групи для Sonnet-імплементерів)

Тести агенти пишуть, але не запускають; один повний прогін на кінець хвилі (фідбек власника). Лінт — по теках.

| Група | Пункти | Файли (основні) | Тест-кейси (назви) | Ризик |
|---|---|---|---|---|
| G1 Кольори | 1.1–1.4, 1.6 | `app/palettes.css`, `app/globals.css` (@theme `hud-faint-deco`), `app/motion.css` (sheet-hp), `components/ui/{disabled.ts,button,input,select,textarea,field-class,tabs}.tsx`, `HudButton`, `HudIconButton`, `HudToggleChip`, `OptionButton`, `HeaderPillLink`; codemod faint→deco | `faint passes 4.5 on panel and page`, `accent-2 passes on panel-2`, `crimson-ink on hp ≥ 5`, `danger/info/good on panel`, `muted on inset (placeholder)`, `DISABLED_CLASS has opacity-50 and cursor-not-allowed`, `Button disabled has no pointer-events-none` | низький; рамки на `faint` стануть «декоративними» — перевірити сітки/роздільники |
| G2 Типографіка | 2.1–2.3, 5.7 | `globals.css` (@theme `--text-*`), `hud.css` (`.hud-label`, sc-страховка), `app/fonts.css`, `components/hud/fonts.ts`, `app/layout.tsx`, `landing.css`, `scenario-book.css`, `world-atlas.css`, kit-хардкоди (`HudPill`, `HudSectionTitle`, `HudSheetHeading`, `HudTabs`, `HudTile`, `HudStatChip`), codemod `text-[9–17px]` | `theme text scale equals 12/14/16/18/22/28/40`, `fonts.css declares only Alegreya, Cormorant SC, Oswald`, `no removed font file is referenced`, `preload list has no AlegreyaSC`, `hud-sc with text-xs falls back to body font` (CSS-парс) | середній: `text-xl/2xl/3xl` змінюють розмір у ~70 місцях — перевірити заголовки в G8 |
| G3 Кнопки, радіуси, чипи | 3.1–3.4 | `button.tsx`, `HudIconButton`, `HeaderPillLink`, `globals.css` (`--radius-sm`, `--r-*`), `HudChipTabs`/`HUD_CHIP_CLASS`, `HudToggleChip`, `HudSegmented`, `ui/tabs`, `HudPill`, видалення `ui/badge.tsx`, `NewPill`, `DmCharacterCard`, `CampaignMembersList`, `ProfileCampaigns`; codemods radius/secondary/Button-height | `Button sizes are 32/40/48`, `icon sizes are square 32/40/48`, `coarse pointer adds min-h-11`, `secondary variant removed`, `HudPill is 24px tall with 4px radius`, `role tone only on role badges` (snapshot `CampaignMembersList`), `HeaderPillLink label visible below sm`, `chip class height 32` | середній: 753 `<Button>` — зменшення default 44→40 на desktop; `ui/badge` видалення торкає 47 місць |
| G4 Ratchet | 6 | `scripts/shared/ui-scale.ts`, `ratchets/ui-scale-exempt.json`, `lib/__tests__/ui-scale.test.ts`, `lib/__tests__/helpers/ui-scale.ts` | `no file exceeds its exempt count`, `exempt entries are exact`, `counts font-arbitrary`, `allows on-scale arbitrary`, `counts radius-arbitrary and rounded-md`, `allows rounded-[var(--r-md)]`, `counts Button height override`, `allows HudButton h-10`, `counts disabled:opacity-40`, `counts css font-size 11px` | низький |
| G5 Оболонка | 4.1, 4.2, 1.5, 4.4 | `HudPage`, `globals.css` (контейнер, фон body::after обох палітр), `scenario-book.css`, `AuthCard`/`.auth-legacy`, `LoadingState`, `SectionLoading`, `hud.css` (`.ds-skeleton`), 6 `loading.tsx`, 8 ad-hoc pulse | `HudPage widths page/narrow/wide`, `LoadingState renders variant cards/list/detail/form`, `LoadingState has role=status`, `ds-skeleton static under reduced motion` (CSS-парс), `parchment body::after has sepia filter` | середній: зникнення росту контейнера на ≥ 96rem; фон сценарію |
| G6 Правила + довідник | 5.1–5.4 | `HudSplit.tsx` (+ index), `RulesBook`, `RulesSide`, `components/rules/*` header-чипи, `ReferenceLayout` (видалити), `InfoReferenceClient`, `.hud-form-wide` змінні, тайл дашборду | `HudSplit renders rail/main/aside on desktop`, `HudSplit aside goes to dialog on mobile object mode`, `HudSplit stack mode`, `module chips collapse to +N more`, `changed chip reset calls reset(key)`, `save disabled without changes`, `reset filters visible only with active filter`, `rules tile links to /dm/rules` | високий: `HudForm` у новій сітці; `/info` — регрес мобільного діалогу |
| G7 Картки, стани, лендинг | 5.5, 4.3, 5.6 | `DmCharacterCard`, `HeroPortrait`, `components/common/illustrations/*`, `EmptyState`, `ErrorState`, `SearchEmptyState`, `app/not-found.tsx`, `landing-motion.css`, 4 секції лендингу | `portrait-less card uses class icon and 128px area`, `falls back to monogram without class`, `EmptyState renders illustration slot`, `not-found shows BrokenD20 and two actions`, `illustrations are aria-hidden`, `ld-reveal only inside reduced-motion no-preference` (CSS-парс) | низький |
| G8 Перевірка й доки | 7 | `scripts/ux/measure-ui.js`, `ui-polish-measure.md`, `docs/architecture/ui-layers.md` (розділ DS), `.claude/rules/components.md` (радіуси, бейджі, кнопки), `docs/STATUS.md` | — (живий прогін 32 знімків, повний `pnpm test:run` раз) | — |

Порядок: G1 → G2 → G3 → G4 послідовно (одні файли примітивів); G5–G7 паралельно після G4; G8 в кінці. Живий прогін — `next start` на гілці, обидві теми, 1440 і 390.

## 9. Поза межами

- Інші пункти П6 (6.1–6.5, 6.7, 6.8), увесь П8, П9 (демо).
- Нові ассети-зображення (ілюстрації лише SVG-кодом), заміна картини фону.
- Редизайн бою, аркуша, мап поза зміною токенів/шкал; `HudFormPage` поза змінними ширин.
- Перехід `text-muted-foreground` → `text-hud-muted` (той самий колір, лише гігієна; окремий прохід).
- Хлібні крихти «Деталі» на 404 (П1).
