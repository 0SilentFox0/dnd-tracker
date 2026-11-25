# Ч8a: міграція на DESIGN.md — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Кроки — чекбокси (`- [ ]`). Виконавці — Sonnet; кожен агент отримує свій **батч** (2–3 суміжні задачі), спеку й цей план.

**Goal:** перевести платформу на DS (2 палітри, DS-токени, без золота, форм-кіт, акаунтна оболонка, профіль, лист-редактор, дашборд, `/ops`).

**Architecture:** фаза 0 — токени й база в CSS + код палітр; фаза 1 — кодмод `hud-gold`/`var(--gold)` хвилями з ratchet, наприкінці видалення токенів; фаза 2 — стилі кіту без зміни API; фаза 3 — екрани. Логіка, дані й API не змінюються, крім legacy-мапи палітр і серверного зведення профілю.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (`@theme`), Radix, next-intl, Prisma 6, Vitest (happy-dom для UI).

**Spec:** [docs/superpowers/specs/2026-11-25-design-system-migration-design.md](../specs/2026-11-25-design-system-migration-design.md) (звірена з кодом, коміт `04db22104`). Візуальне джерело — [DESIGN.md](../specs/2026-11-25-design-system.md). Виконавець читає обидва; тут лише рішення, сигнатури, файли й тести.

**Вартість (грубо):** ~21 запуск Sonnet-агентів (14 батчів реалізації + гейт + живий прогін + /simplify + docs + 2–3 на фікси рев'ю) + 1 Opus-рев'ю. Найдорожчі — хвилі кодмоду (A4–A8) і живий прогін. Перед стартом нагадати власнику про `/usage`.

## Global Constraints

- Робоча тека `/Users/silentfox/Work/dnd-tracker-ch8`, гілка `feat/game-ui-ch8`. `/Users/silentfox/Work/dnd-tracker` не чіпати.
- Кирилиця в коді заборонена: тексти лише в `messages/{uk,en}/*.json`; коментарі — англійською, мінімальні (лише «чому»).
- Компонент ≤ 7 пропсів; компоненти й `app/**` не імпортують `@/lib/api/*` і не викликають `fetch`.
- Кожен новий контрол має видимий підпис або `aria-label`; цілі натискання ≥ 40 px на phone.
- Не чіпати: `lib/server/**` (крім нового `lib/server/profile/summary.ts`), `lib/utils/battle/{pipeline,turn}`, `components/fx/**`, логіку/розмітку `components/battle/wizards/**` (лише рядки класів кольору), `usePlayerTurn`, логіку автентифікації, контракт аватара.
- Бій: функціональні кольори (`--reach-stroke`, `--range-stroke`, `--path-label-*`, `--ally`, `--enemy`, `--fog-*`, ресурси, школи, `.metal-*`, `.circle-*`) і `rounded-full` жетонів лишаються.
- Бюджети `scope-size` не піднімаються; нові тексти профілю/налаштувань — у `auth`, у `common` — лише `common.header.subscription`.
- Тести: агенти пишуть тести, але **не запускають** нічого, крім `pnpm test:related <змінені файли>`; повний `pnpm test:run` — один раз у гейті (A17). Lint — лише `pnpm exec eslint --fix <файли>` або `pnpm lint:dirs --changed`; repo-wide `pnpm lint` не запускати. `pnpm cycles` — у гейті.
- Коміти: `git add <явні шляхи>` (паралельні агенти в одній теці), повідомлення англійською, трейлер `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Merge/push — лише після явного «так» власника.

## Review Focus

1. **Кеш старої палітри** (`localStorage.dnd-palette-active = {palette:'midnight'}`) до відповіді API → сторінка одразу в `tavern`, без мерехтіння дефолту. Тест у T1 (bootstrap).
2. **Фокус-кільце через `box-shadow`** обрізається в контейнерах з `overflow-hidden` і перекривається `shadow-*` компонентів → кнопки/поля в діалогах і картках мають видимий фокус. T3 ставить глобальне `:focus-visible` пізно в каскаді (без `!important`), T11 прибирає `focus-visible:ring-*` з кнопок; живий прогін (T24) перевіряє Tab у діалозі, картці дашборду й доку бою.
3. **Акаунт без кампаній / лише архівні / лише демо** → зведення не показує нулів і «null тому». Тест у T16.
4. **Лендинг і `/sign-in` після зміни fallback-ів `@theme`** → виглядають як до міграції (Alegreya SC, золото, старі кольори). T8 + живий прогін.
5. **Кнопка `default` 36→44 px у щільних панелях бою** (тулбари мапи, док дій) → нічого не переповнюється на 390/320. Живий прогін (бій-смоук) з точковими фіксами.

---

## Батчі й паралельність

| Агент | Задачі | Залежить від | Паралельно з |
|---|---|---|---|
| A1 | T1 палітри (код) | — | A2 |
| A2 | T2 токени CSS + T3 база | — | A1 |
| A3 | T4 кодмод + ratchet (прогін `--write`) | A1, A2 | — |
| A4 | T5 хвиля 1а: `components/battle` (+ класи `wizards`) | A3 | A5 |
| A5 | T6 хвиля 1б: `hud`, `layout`, `common`, `ui`, CSS бою/HUD | A3 | A4 |
| A6 | T7 хвиля 2 | A4, A5 | A7, A8, A9, A10, A11 |
| A7 | T8 хвиля 3 | A4, A5 | A6, A8, A9–A11 |
| A8 | T9 хвиля 4 + лендинг/auth | A4, A5 | A6, A7, A9–A11 |
| A9 | T10 поля + T11 кнопки/чипи | A5 | A6–A8 |
| A10 | T12 перемикачі/медіа-поля + T14 оверлеї | A5 | A6–A9, A11 |
| A11 | T13 форма/вкладки/секції/badge/card | A5 | A6–A10 |
| A12 | T15 видалення токенів золота, ratchet → заборона | A6–A11 | — |
| A13 | T16 акаунтна оболонка + T17 `/profile` | A12 | — |
| A14 | T18 налаштування й інші акаунтні сторінки | A13 | A15, A16 |
| A15 | T19 `ProfileEditor` + T20 дашборд | A13 | A14, A16 |
| A16 | T21 `/ops` + T22 i18n/whats-new/help | A13 | A14, A15 |
| A17 | T23 гейт (tsc, lint, cycles, повний тест) | A14–A16 | — |
| A18 | T24 живий прогін | A17 | — |
| Opus | T25 рев'ю | A18 | — |
| A19 | T26 `/simplify` (1 агент) | рев'ю виправлено | — |
| A20 | T27 docs | A19 | — |
| — | T28 merge після «так» | A20 | — |

Межі файлів паралельних смуг: A6/A7/A8 — різні теки `components/*`/`systems`/`app`; A9/A10/A11 — різні файли в `components/ui`, `components/hud`, `components/common/fields`, і жоден з A6–A8 їх не правлять (вони пройшли хвилю 1). `ratchets/hud-gold.json` під час паралельних хвиль **не правиться агентами** — контролер перегенеровує його (`pnpm ratchet:hud-gold --write`) після злиття смуги й комітить сам. CSS-файли `app/globals.css`, `app/palettes.css`, `components/hud/hud.css` у паралельних смугах правлять лише A9–A11 за таким розподілом: A9 — блоки `.hud-form/.hud-page [data-slot=input|textarea|select-trigger|button]`; A10 — нативні `input[type=checkbox|radio]` (`globals.css`), `.hud-range`; A11 — `.hud-form-page`, `.profile-tab`, `.hud-surface [data-slot=accordion-*|empty-state]`.

---

## Фаза 0

### T1: Код палітр (A1)

**Files:**
- Modify: `lib/theme/palettes.ts`, `lib/theme/client.ts`, `types/theme.ts`, `lib/hooks/theme/usePaletteState.ts` (лише якщо потрібен legacy у `onStorage`), `components/layout/PaletteSwitcher.tsx` (тимчасово: select лише з 2 id, щоб компілювалось; картки — T18)
- Test: `lib/theme/__tests__/palettes.test.ts` (новий), `lib/theme/__tests__/client.test.ts` (новий або наявний), `app/api/__tests__/theme-api.test.ts`, `lib/hooks/theme/__tests__/usePaletteState.test.tsx`

**Interfaces — Produces:**
```ts
export const PALETTE_IDS = ['tavern', 'parchment'] as const;
export type PaletteId = 'tavern' | 'parchment';            // types/theme.ts
export const LEGACY_PALETTES: Readonly<Record<string, PaletteId>> =
    { midnight: 'tavern', forest: 'tavern', amethyst: 'tavern', frost: 'parchment' };
export const LIGHT_PALETTES: readonly PaletteId[] = ['parchment'];
export interface PalettePreview { page: string; panel: string; inset: string; crimson: string; ink: string; muted: string }
export const PALETTE_PREVIEW: Record<PaletteId, PalettePreview>; // DS 13 hex
export function paletteFor(value: unknown): PaletteId;   // id → id, legacy → map, else DEFAULT
```
`PALETTE_SWATCHES` видаляється (єдиний споживач — `PaletteSwitcher`). `PALETTES_ENABLED` лишається.

- [ ] Тести: `paletteFor('midnight'|'forest'|'amethyst') === 'tavern'`, `paletteFor('frost') === 'parchment'`, `paletteFor('x'|null|42) === 'tavern'`; `isPaletteId('frost') === false`; `PALETTE_BOOTSTRAP` виконаний у happy-dom (`new Function(PALETTE_BOOTSTRAP)()`) з кешем `{userId:'u',palette:'frost'}` на шляху `/campaigns` ставить `data-palette="parchment"` і знімає `dark`; на `/` — нічого не ставить. API: `PUT {palette:'midnight'}` → 400; `GET` при `user.palette='amethyst'` у БД (мок `prisma.user.findUnique`) → `tavern`. Прибрати старі id з `usePaletteState.test.tsx`.
- [ ] Реалізація. Bootstrap: замість `PALETTE_IDS.includes(s.palette)` — `const m=${JSON.stringify(LEGACY_PALETTES)};const p=${JSON.stringify(PALETTE_IDS)}.includes(s.palette)?s.palette:m[s.palette];if(!p)return;` далі як було з `p`.
- [ ] `pnpm test:related lib/theme/palettes.ts lib/theme/client.ts`; eslint на змінених; коміт `feat(theme): two palettes with legacy mapping`.

### T2: DS-токени в CSS (A2)

**Files:** Modify `app/globals.css` (`@theme static`, `@theme inline` радіуси, `:root --radius`), `app/palettes.css`, `components/hud/hud.css`, `components/battle/hud/battle-hud.css`; Test `lib/theme/__tests__/palette-contrast.test.ts`, `components/hud/__tests__/hud-glass.test.ts`.

**Decisions (зі спеки, розд. «Імена токенів»):**
- `palettes.css`: лишити блоки `tavern` і `parchment`, у кожному — DS 13 під нашими іменами (`--palette-page/panel/panel-2/inset`, `--hud-ink/text/muted/faint`, `--hud-rule` = line, `--hud-line` = line-strong, `--hud-hi`, `--hud-crimson/-2/-fg/-ink`, `--hud-hp/-2`, `--hud-sh`, `--hud-sh-btn`, `--grain-op`, `--grain-mode`, `color-scheme`). Аліаси: `--hud-bone: var(--hud-text)`, `--hud-field: var(--palette-inset)`, `--palette-card: var(--palette-panel)`, `--palette-secondary: var(--palette-panel-2)`, `--palette-background: var(--palette-page)`, `--palette-foreground: var(--hud-text)`, `--palette-primary-foreground: var(--hud-crimson-ink)`. Функціональні `--hud-info/danger/bad/good/good-dim` — зберегти поточні значення tavern/parchment. `--hud-gold*` **поки лишити** (видаляє T15). `--book-*`: значення tavern/parchment, `--book-accent*` → багряний (`#7a2a1f`→ лишити для tavern, parchment `--book-accent: #a12b28`, `--book-accent-ink: #8f2522`). `--palette-header`: `color-mix(in srgb, var(--palette-page) 97%, transparent)`.
- Видалити блоки `midnight/forest/amethyst/frost` і всі селектори з `frost` (palettes.css, hud.css `.game-shell-mobile-actions`, battle-hud.css `.hud-glass`); `--palette-overlay` і `body::after` — видалити (рядки 31, 41, 62, 65, 77, 83–85, 90).
- shadcn: лишити один набір у `html[data-palette]` (`--primary: var(--hud-crimson)`, `--primary-foreground: var(--hud-crimson-ink)`, `--ring: var(--hud-ink)`, `--border/--input: var(--hud-line)`, `--muted-foreground: var(--hud-muted)`, `--accent: var(--palette-panel-2)`, `--destructive: var(--hud-crimson-fg)`, `--sidebar-primary/-ring` так само); видалити `html[data-palette] .hud-surface {…}` у palettes.css; `.hud-surface` у hud.css — ті самі присвоєння з DS-tavern fallback-ами.
- `.spellbook-dialog`: `--primary`/`--ring` → `var(--book-accent)`. `.scenario-book:not([data-theme])`: прибрати `--gold` і `--rust` з правила.
- `@theme static`: додати `--color-hud-panel-2`, `--color-hud-inset`, `--color-hud-faint`, `--color-hud-crimson`, `--color-hud-crimson-2`, `--color-hud-crimson-fg`, `--color-hud-crimson-ink`, `--color-hud-hp`, `--color-hud-hp-2` (формат `var(--x, <DS tavern hex>)`); `--color-hud-text: var(--hud-text, #c8beaf)`; оновити fallback-и решти на DS tavern; `--color-hud-surface: var(--palette-panel, …)`, `--color-hud-raised: var(--palette-panel-2, …)`, `--color-hud-edge: var(--hud-line, …)`, `--color-hud-edge-faint: var(--hud-rule, …)`. `--color-hud-gold*`, `--color-hud-glow` поки лишаються.
- Радіуси: `--radius-xs/sm: 2px; md/lg: 4px; xl/2xl/3xl/4xl: 6px` у `@theme inline`; `:root { --radius: 4px }`.
- `:root` (поза палітрами): `--r: 4px; --ease: 140ms ease; --focus: 0 0 0 2px var(--palette-page, #111013), 0 0 0 4px var(--hud-ink, #ece4d6);`.

- [ ] Тест контрасту (переписати на нові пари): для `tavern`, `parchment` — `--hud-ink/--hud-text/--hud-muted` на `--palette-page/panel/panel-2/inset` ≥ 4.5; `--hud-crimson-fg` на page/panel/panel-2 ≥ 4.5; `--hud-crimson-ink` на `--hud-crimson` ≥ 4.5; `--hud-muted` на page/panel/inset ≥ 3; `PALETTE_PREVIEW[id]` поля = відповідні hex з CSS; у CSS немає `data-palette="(midnight|forest|amethyst|frost)"`. `hud-glass.test` — лише `parchment`.
- [ ] Реалізація; коміт `feat(theme): DS tokens for tavern and parchment`.

### T3: Типографіка, тло, фокус, утиліти DS (A2)

**Files:** Modify `app/fonts.css`, `app/globals.css`, `app/motion.css`, `components/hud/hud.css`, `components/hud/fonts.ts`, `components/hud/page/HudPanel.tsx`, `components/layout/screen-background.tsx` (лише коментар); Delete `public/bg/vey-strait-2k.webp`, `public/bg/vey-strait-4k.webp`; Test `components/hud/__tests__/ds-utilities.test.ts` (новий: читає `hud.css`/`globals.css` як текст).

**Decisions:**
- `.font-hud`: `--font-hud-sc: "Cormorant SC", Georgia, serif; --font-hud-sans: "Alegreya", Georgia, serif`. `@font-face` Alegreya SC/Sans лишаються.
- `html[data-palette] body, .hud-surface, .battle-hud { font-family: var(--font-body), Georgia, serif; font-variant-numeric: lining-nums tabular-nums; }`; `.hud-sc { font-family: var(--font-hud-sc), serif; font-weight: 700; }` (без `letter-spacing`).
- `HUD_PRELOAD_FONTS = ['/fonts/CormorantSC-Bold-cyrillic.woff2', '/fonts/Alegreya-Variable.woff2', '/fonts/AlegreyaSC-Bold.woff2']`.
- Зерно (замість картини), у `@layer base`:
```css
body::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  opacity: var(--grain-op, .32); mix-blend-mode: var(--grain-mode, overlay);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```
  `body::after` — видалити. `landing.css` уже ховає `::before` на лендингу.
- `html { scroll-padding-top: 72px }`; глобально `:focus-visible { outline: none; box-shadow: var(--focus); }` (після `@layer base`, щоб перебивати `outline-ring/50`); `@media (prefers-reduced-motion: reduce)` — одне правило на верхньому рівні в `motion.css`, з `globals.css` прибрати вкладене в `max-width: 640px`.
- Скролбар: `rgb(230,194,90)` і parchment-правила → `var(--hud-muted, #8b8277)`.
- Видалити: `.glass-card`, `.neon-border(::after)`, `.dead-state(::after)`, `.animate-slide-in/out`, `@keyframes slide-in, slide-out, float, pulse-glow, shimmer, pulse-slow, glow`.
- Утиліти в `hud.css`:
```css
.ds-panel { background: var(--palette-panel); border: 1px solid var(--hud-rule); border-radius: var(--r); box-shadow: inset 0 1px 0 var(--hud-hi), var(--hud-sh); }
.ds-inset { background: var(--palette-inset); border-radius: var(--r); box-shadow: inset 0 1px 3px rgba(0,0,0,.45); }
.ds-raised { background: var(--palette-panel-2); border: 1px solid var(--hud-line); border-radius: var(--r); box-shadow: inset 0 1px 0 var(--hud-hi), var(--hud-sh-btn); }
.ornate { position: relative; }
.ornate::after { content: ""; position: absolute; inset: 6px; pointer-events: none; --c: color-mix(in srgb, var(--hud-muted) 70%, transparent);
  background: linear-gradient(var(--c),var(--c)) top left/16px 2px, linear-gradient(var(--c),var(--c)) top left/2px 16px,
    linear-gradient(var(--c),var(--c)) top right/16px 2px, linear-gradient(var(--c),var(--c)) top right/2px 16px,
    linear-gradient(var(--c),var(--c)) bottom left/16px 2px, linear-gradient(var(--c),var(--c)) bottom left/2px 16px,
    linear-gradient(var(--c),var(--c)) bottom right/16px 2px, linear-gradient(var(--c),var(--c)) bottom right/2px 16px;
  background-repeat: no-repeat; }
.orn { height: 10px; background: var(--hud-line);
  mask: linear-gradient(#000,#000) left center/calc(50% - 10px) 1px no-repeat,
        linear-gradient(#000,#000) right center/calc(50% - 10px) 1px no-repeat,
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath d='M5 0L10 5L5 10L0 5Z'/%3E%3C/svg%3E") center/10px 10px no-repeat; }
```
  (Лінія–ромб–лінія трьома шарами маски, колір — `background`, тож перефарбовується з палітрою; `-webkit-mask` — той самий список.)
- `HudPanel`: класи `ds-panel p-4 sm:px-5` замість поточних фонових/рамкових.
- [ ] Тест: `hud.css` містить `.ds-panel`, `.ds-inset`, `.ds-raised`, `.ornate::after`, `.orn`; `globals.css` не містить `vey-strait`, `glass-card`, `neon-border`, `pulse-glow`; містить `:focus-visible` з `var(--focus)` і `scroll-padding-top: 72px`; `fonts.ts` preload містить Cormorant.
- [ ] Коміт `feat(ui): DS typography, grain, focus ring, panel utilities`.

## Фаза 1

### T4: Кодмод і ratchet (A3)

**Files:** Create `scripts/codemods/gold-to-ds.ts`, `scripts/shared/hud-gold.ts`, `ratchets/hud-gold.json`, `lib/__tests__/hud-gold.test.ts`, `scripts/__tests__/gold-to-ds.test.ts`; Modify `package.json` (`"ratchet:hud-gold": "tsx scripts/shared/hud-gold.ts"`), далі — усі файли, змінені прогоном `--write`.

**Interfaces — Produces:**
```ts
// scripts/codemods/gold-to-ds.ts
export function rewriteGold(source: string): { text: string; ambiguous: number };
// scripts/shared/hud-gold.ts (шаблон — scripts/shared/cyrillic-comments.ts)
export function countHudGold(text: string): number;         // matches /hud-gold|var\(--gold\)|hud-glow/g
export function scanHudGold(): Record<string, number>;      // app, components, systems, lib; *.ts,*.tsx,*.css; skip components/scenario/book/**, components/fx/**
export function readHudGoldExempt(): Record<string, number>;
export function hudGoldProblems(actual: Record<string,number>, exempt: Record<string,number>): string[]; // 'new hud-gold: X has N' | 'lower the entry: X'
```
**Однозначні правила `rewriteGold`** (застосовуються до токенів класу з будь-якими префіксами варіантів `hover:`, `focus-visible:`, `group-hover:`, `aria-checked:`, `data-[…]:`, `after:`, `before:`, `open:`; той самий набір для `[var(--gold)]` і `[var(--color-hud-gold…)]`):
| Вхід | Вихід |
|---|---|
| `border-hud-gold(-strong|-bright)?/NN` | `border-hud-line` |
| `bg-hud-gold(-strong|-bright)?/NN` | `bg-hud-panel-2` |
| `text-hud-gold(-strong|-bright)?/NN` | `text-hud-muted` |
| `text-hud-gold-bright`, `text-hud-gold-strong` (без `/NN`) | `text-hud-ink` |
| `hover:text-hud-gold*` | `hover:text-hud-ink` |
| `hover:border-hud-gold*` | `hover:border-hud-muted` |
| `(ring|outline)-hud-gold*(/NN)?`, `focus-visible:(ring|outline)-…gold…` | видалити токен |
| `accent-hud-gold*`, `accent-[var(--gold)]` | `accent-hud-crimson` |
| `decoration-hud-gold*(/NN)?` | `decoration-hud-line` |
| `shadow-[…var(--color-hud-glow)…]`, `…_0_Npx_var(--color-hud-glow)` | видалити токен |
Рядки `text-hud-gold`, `border-hud-gold(-strong)?`, `bg-hud-gold(-strong)?` без `/NN` і їхні `[var(--gold)]`-форми — **не міняти**, рахувати в `ambiguous`. CSS/TS-рядки `var(--hud-gold…)` — не міняти (ручні хвилі). Після заміни — злити дублікати класів у тому самому рядку.

- [ ] Тести кодмоду: кожен рядок таблиці (вхід → вихід) + префікси варіантів + неоднозначний `text-hud-gold` лишається й дає `ambiguous: 1` + ідемпотентність (`rewriteGold(rewriteGold(x).text).text === …`). Тест ratchet за шаблоном `cyrillic-comments.test.ts` (`countHudGold` на прикладах, `hudGoldProblems` росту/застарілих записів, головний кейс `scan` vs `exempt`).
- [ ] Прогін: `pnpm exec tsx scripts/codemods/gold-to-ds.ts` (dry-run, звіт) → `--write` → `pnpm ratchet:hud-gold --write`. Зберегти звіт неоднозначних (файл → кількість) у тілі коміту.
- [ ] `pnpm exec eslint --fix` на змінених файлах (порциями по теках); коміти: `chore(ui): gold codemod tooling and ratchet`, `refactor(ui): mechanical gold-to-DS rewrite`.

### Ручні хвилі (T5–T9): спільний порядок для кожного агента

Для кожного файлу своєї теки, де `pnpm exec tsx scripts/shared/hud-gold.ts` показує залишок:
1. Розібрати кожне `text-/border-/bg-hud-gold*` і `[var(--gold)]`, `var(--hud-gold*)`, `var(--color-hud-gold*)` за **таблицею ролей спеки (фаза 1)**: заголовок/мітка/декор → `text-hud-ink` (іконка біля підпису → `text-hud-muted`); активне/володіння/майстерність/акцентне число/іконка головної дії → `text-hud-crimson-fg`; рамка активного → `border-hud-crimson`; заливка головної дії → `bg-hud-crimson text-hud-crimson-ink`; градієнт — лише на банері/стягу `hud-crimson`→`hud-crimson-2`, інакше прибрати.
2. Золоті hex зі списку спеки «Інвентар» у своїй теці — та сама таблиця.
3. `text-[11px]`/`text-[12px]` у вже змінених файлах → `text-[13px]` (інтерактивний текст — `text-[15px]`).
4. Оновити тести своєї теки, що перевіряють класи золота.
5. Не змінювати логіку, пропси, розмітку. Не правити `ratchets/hud-gold.json` (контролер).
6. `pnpm test:related <файли>`; eslint на файлах; коміт `refactor(ui): gold to DS in <тека>`.
Ціль хвилі — 0 входжень у своїх теках (перевірка: `grep -rnE "hud-gold|var\(--gold\)|hud-glow" <теки>` порожній).

### T5: Хвиля 1а — `components/battle` (A4)
Теки: `components/battle/**` (включно з рядками класів у `wizards/**` — лише класи), `components/battle/map/battle-map.css`, `components/battle/hud/battle-hud.css`. Тест: `components/battle/map/panels/__tests__/BattleMapPanel.test.tsx`. ~24 файли `hud-gold` + ~45 файлів `var(--gold)`. Фокус: чипи/кнопки доку й тулбарів — активний = `border-hud-crimson text-hud-ink bg-hud-panel-2`, не заливка.

### T6: Хвиля 1б — `hud`, `layout`, `common`, `ui`, CSS (A5)
Теки: `components/hud/**` (`HudButton`, `HudToggleChip`, `OptionButton`, `WaitingNotice`, `HudChipTabs`, `shell/GameShell.tsx`), `components/layout/**`, `components/common/**`, `components/ui/**` (`slider`, `side-sheet`), `components/dice`, `app/globals.css` (базові checkbox/radio: тимчасово `--color-hud-crimson`; повний рестайл — T12), `app/motion.css`, `components/hud/hud.css` (`hud-turn`, `hud-roll-settle`, `.hud-roll-field[data-rolling]`, `.hud-range`, `.profile-tab[data-state=active]` → DS 5.13: `background: var(--palette-panel-2); color: var(--hud-ink); box-shadow: inset 0 -2px 0 var(--hud-crimson)`), `app/palettes.css` (`.profile-tab`, скролбар parchment уже T3). У `.battle-hud`/`.hud-surface` `--gold` **ще не видаляти** (T15).

### T7: Хвиля 2 (A6)
Теки: `components/campaigns`, `components/world` (+ `world-atlas.css`, `WorldZones`, `WorldHeroes`), `components/quests`, `components/maps`, `components/show`, `components/scenario` (крім `book/scenario-book.css` — власний `--gold`), `components/music`, `components/audio`, `components/soundboard`, `app/campaigns/**`.

### T8: Хвиля 3 (A7)
Теки: `components/character-profile`, `components/characters`, `components/abilities`, `systems/**` (+ `systems/skilltrees/ui/**/*.css`). Тести: `components/abilities/__tests__/AbilityPanel-{collapse,flow}.test.tsx`, `components/character-profile/__tests__/sheet-banner.test.tsx`, `systems/artifactsets/__tests__/ui/set-list.test.tsx`, `systems/d20/__tests__/ui/StatsTab.test.tsx`.

### T9: Хвиля 4 + лендинг/auth (A8)
Теки: решта `components/*` (`content-import`, `onboarding`, `units`, `spells`, `skills`, `races`, `choices`, `acquaintances`, `profile`, `auth`), `app/**` поза `app/campaigns` (зокрема `app/help`), `lib/**`: `ARTIFACT_RARITY_COLOR[LEGENDARY]` → `'border-[#e6c25a]'`, `GRAPH_TYPE_STYLE.artifact.color` → `'#e6c25a'`; `lib/theme` уже T1.
Лендинг (`components/landing/**`, `landing.css`) і auth (`components/auth/AuthCard.tsx` корінь): у `landing.css` додати
```css
[data-landing], .auth-legacy {
  --hud-ink: #efe5d2; --hud-bone: #e6dccb; --hud-muted: #9b9080; --hud-line: #756b5f; --hud-rule: #746b63;
  --palette-page: #0b0908; --palette-panel: rgba(17,14,11,.82); --hud-text: #e3d8c6;
  --ld-gold: #c9b37a; --ld-gold-bright: #ffe08a; --ld-gold-strong: #e6c25a;
  --font-hud-sc: "Alegreya SC", Georgia, serif; --font-hud-sans: "Alegreya Sans", system-ui, sans-serif;
}
[data-landing] .hud-sc, .auth-legacy .hud-sc { letter-spacing: .04em; }
```
(клас `auth-legacy` — на корені `AuthCard`; `landing.css` імпортувати й в auth-корінь, якщо він його ще не тягне, — інакше перенести блок у `components/auth/auth.css`). Класи `*-hud-gold*` у лендингу/auth → `*-[var(--ld-gold…)]`; hex-золото лендингу лишається.

### T10–T14: див. фазу 2. T15 — після всіх хвиль і фази 2.

### T15: Видалення токенів золота (A12)
**Files:** `app/globals.css`, `app/palettes.css`, `components/hud/hud.css`, `ratchets/hud-gold.json` (видалити), `lib/__tests__/hud-gold.test.ts`, `scripts/shared/hud-gold.ts`, `package.json`.
- [ ] Перевірити `pnpm ratchet:hud-gold` → `{}`; добити залишки (будь-яка тека) за таблицею.
- [ ] Видалити `--hud-gold*` з палітр, `--color-hud-gold*` і `--color-hud-glow` з `@theme`, `--gold` з `.battle-hud`/`.hud-surface` (`hud.css`, `palettes.css`).
- [ ] Тест → заборона: `expect(scanHudGold()).toEqual({})` (без exempt-файлу); прибрати `--write`/exempt-логіку зі скрипта й скрипт `ratchet:hud-gold` з `package.json` (тест лишається).
- [ ] Коміт `refactor(theme): remove gold tokens`.

## Фаза 2 (після A5; паралельно з хвилями 2–4)

Загальне для T10–T14: API (пропси, `data-slot`, експорти) не змінюється; стилі — у класах компонента; каскадні правила `.hud-form/.hud-page [data-slot=…]` свого компонента видаляються з `hud.css` і `palettes.css`; DS-значення — таблиця фази 2 спеки. Тести — happy-dom, перевіряють ролі/ARIA/`data-*`, не класи Tailwind (крім явних DS-класів станів).

### T10: Поля й підписи (A9)
**Files:** `components/ui/{input,textarea,select,select-field,number-input,bounded-number-input,comma-list-input,label,labeled-input,switch-field}.tsx`, `components/hud/form/select-class.ts`, `components/common/fields/SearchInput.tsx`, CSS-блоки `[data-slot=input|textarea|select-trigger]`.
- Спільна константа в `components/ui/field-class.ts`: `export const FIELD_CLASS = 'h-10 w-full rounded-[4px] border border-hud-line bg-hud-inset px-3 text-base text-hud-ink shadow-[inset_0_1px_3px_rgba(0,0,0,.45)] placeholder:text-hud-muted focus-visible:border-hud-crimson aria-invalid:border-hud-crimson disabled:opacity-35';` (`textarea`: `min-h-[88px] h-auto py-2`). `HUD_SELECT_TRIGGER_CLASS` = `FIELD_CLASS` + шеврон.
- `NumberInput`/`BoundedNumberInput`: `hud-num`, `inputMode="numeric"` (якщо не передано інше).
- `Label`: `hud-sc text-[17px] text-hud-text`; підказка/помилка в `LabeledInput`/`SelectField`/`SwitchField` — `text-sm`, помилка `text-hud-crimson-fg` з `role="alert"`; відступ `gap-1.5`.
- [ ] Тест `components/ui/__tests__/fields-ds.test.tsx`: `NumberInput` має `inputmode="numeric"`; `LabeledInput` з `error` рендерить текст помилки з `role="alert"` і `aria-invalid` на полі; `Input` має `data-slot="input"`.
- [ ] Коміт `feat(ui): DS field styles`.

### T11: Кнопки й чипи (A9)
**Files:** `components/ui/button.tsx`, `components/hud/{HudButton,HudToggleChip,OptionButton}.tsx`, `components/hud/page/HudChipTabs.tsx`, CSS `[data-slot=button][data-variant=default]`.
- `buttonVariants`: база `hud-body rounded-[4px] text-[15px] transition-[transform,box-shadow] active:translate-y-px active:shadow-none`; `default`: `hud-sc text-[17px] bg-hud-crimson text-hud-crimson-ink border border-hud-crimson-2 shadow-[inset_0_1px_0_rgba(255,255,255,.2),inset_0_-2px_0_rgba(0,0,0,.2)]`; `outline`/`secondary`: `bg-hud-panel-2 border border-hud-line text-hud-ink shadow-[inset_0_1px_0_var(--hud-hi),var(--hud-sh-btn)] hover:border-hud-muted`; `ghost`/`link`: `text-hud-muted hover:text-hud-ink`; `destructive`: як `outline` + `text-hud-crimson-fg`. Розміри: `default h-11`, `sm h-10`, `lg h-12 sm:h-[52px]`, `icon size-10`, `icon-sm size-10`, `icon-lg size-11`. Прибрати `focus-visible:ring-*` (глобальний `--focus`).
- `HudToggleChip`/`OptionButton`/`HudChipTabs` активний: `bg-hud-panel-2 text-hud-ink shadow-[inset_0_-2px_0_var(--hud-crimson)]`; неактивний — `text-hud-muted border-hud-line`; `HudChipTabs size="lg"` ≥ 44 px, прокрутка `hud-scroll-x`, активний `scrollIntoView({inline:'center', block:'nearest'})` при монтуванні.
- [ ] Тест `components/ui/__tests__/button-ds.test.tsx`: `data-variant`/`data-size` зберігаються; `HudChipTabs` з `href` дає `aria-current="page"` лише активному.
- [ ] Коміт `feat(ui): DS buttons and chips`.

### T12: Перемикачі й медіа-поля (A10)
**Files:** `components/ui/{checkbox,radio,switch,slider}.tsx`, `app/globals.css` (база `input[type=checkbox|radio]`), `components/hud/hud.css` (`.hud-range`), `components/common/fields/{ImageUpload,IconUrlField,ColorField}.tsx`.
- `Checkbox`: `relative size-5 rounded-[2px] border border-hud-muted bg-hud-inset before:absolute before:-inset-[10px] data-[state=checked]:bg-hud-crimson data-[state=checked]:border-hud-crimson`, галочка `text-hud-crimson-ink`.
- `Radio`/база `input[type=radio]`: `appearance:none; width:14px; height:14px; transform: rotate(45deg); border:1px solid var(--hud-muted); border-radius:2px; background: var(--palette-inset)`; `:checked` — заливка `--hud-crimson`; зона натиску: обгортка `label`/`before` −13 px. База checkbox — як `Checkbox`.
- `Switch`: трек `h-[22px] w-10 bg-hud-inset`, ручка `bg-hud-panel-2 shadow-[var(--hud-sh-btn)]`, checked — трек `bg-hud-crimson`. `Slider`/`.hud-range`: трек 6 px `--palette-inset`, fill `var(--m2, var(--hud-crimson))`, thumb 20 px `--palette-panel-2` + рамка `--hud-line`, без золотого `focus` (глобальний `--focus`).
- `ImageUpload`/`IconUrlField`/`ColorField`: рамка `ds-inset border border-hud-line`; порожній стан — монограма (`fallbackText`) `hud-sc text-hud-muted` + підпис дії.
- [ ] Тест `components/ui/__tests__/toggles-ds.test.tsx`: `Checkbox` має `role="checkbox"` і `aria-checked` перемикається; `Radio` — `type="radio"`, `data-slot="radio"`; `Switch` — `role="switch"`.
- [ ] Коміт `feat(ui): DS checkbox, radio, switch, slider, media fields`.

### T13: Форма, вкладки, секції (A11)
**Files:** `components/hud/form/{HudFormPage,HudSection,HudTabs,SheetTabList}.tsx`, `components/ui/{tabs,accordion,disclosure,badge,card}.tsx`, `components/ui/action-bar.tsx`, CSS `.hud-form-page`, `.hud-surface [data-slot=accordion-*|empty-state]`.
- `HudFormPage`: `mx-auto w-full max-w-3xl`; на `sm:` `ds-panel ornate p-6`, на phone без рамки; заголовок `hud-sc text-[28px] text-hud-ink` + `<div className="orn" aria-hidden />`.
- `HudSection`: заголовок `hud-sc text-2xl text-hud-ink`; проп `panel` → `ds-panel p-4`.
- Вкладки (`TabsTrigger` у `tabs.tsx`, `SheetTabList`, `HudTabs`): активна `data-[state=active]:bg-hud-panel-2 data-[state=active]:text-hud-ink data-[state=active]:font-bold data-[state=active]:shadow-[inset_0_1px_0_var(--hud-hi),inset_0_-2px_0_var(--hud-crimson)] rounded-[3px]`; список ≤ 1100 — `overflow-x-auto` + `mask-image: linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 16px), transparent)`. Логіку Radix не чіпати.
- `ActionBar`: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` (основна — остання в DOM, на phone на всю ширину `[&>*]:w-full sm:[&>*]:w-auto`).
- `accordion`/`disclosure`: `border-b border-hud-rule`, тригер `hud-sc text-hud-ink`, шеврон `text-hud-faint`. `badge`: `border border-hud-line bg-transparent text-hud-text`; `card`: `ds-panel`.
- [ ] Тест `components/hud/form/__tests__/HudTabs.test.tsx` (доповнити): ArrowRight переводить фокус і вибір на наступну вкладку, End — на останню, Home — на першу; trigger має `aria-controls`, панель — `role="tabpanel"` з `aria-labelledby`.
- [ ] Коміт `feat(ui): DS form page, sections, tabs, action bar`.

### T14: Оверлеї (A10)
**Files:** `components/ui/{dialog,responsive-dialog,confirm-dialog,side-sheet,popover,tooltip,dropdown-menu}.tsx`.
- Контент: `bg-hud-panel border border-hud-line rounded-[4px] shadow-[0_30px_80px_-24px_rgba(0,0,0,.9)]`; заголовок `hud-sc text-[28px] text-hud-ink`; кнопка «×» `size-10` з `aria-label`; overlay `bg-[rgba(6,5,7,.72)] backdrop-blur-[2px]`. `Tooltip` — `bg-hud-panel-2 text-hud-ink text-sm`. vaul-шторка — та сама поверхня.
- [ ] Тест `components/ui/__tests__/overlays-ds.test.tsx`: відкритий `ResponsiveDialog` (desktop) має `role="dialog"` і кнопку закриття з `aria-label`.
- [ ] Коміт `feat(ui): DS overlays`.

## Фаза 3 (після A12)

### T16: Акаунтна оболонка (A13)
**Files:** Create `components/layout/AccountShell.tsx`, `app/settings/subscription/page.tsx`; Modify `components/layout/profile-menu.ts`, `components/layout/game-shell-route.ts`, `app/{profile,settings,help,library/sounds}/layout.tsx`, `messages/{uk,en}/common.json` (`header.subscription`; видалити `header.palette.names.{midnight,forest,amethyst,frost}`), `messages/{uk,en}/auth.json` (`settings.subscription.{title,soon}`); Delete `components/profile/ProfileShell.tsx`; Test `components/layout/__tests__/{game-shell-route,profile-menu,AccountShell}.test.ts(x)`.

**Interfaces:**
```ts
// profile-menu.ts: ProfileMenuId += 'subscription'; entry { id: 'subscription', icon: Crown, labelKey: 'subscription', href: '/settings/subscription' } after 'aiKeys'
export function AccountShell({ children }: { children: ReactNode }): JSX.Element; // 'use client'
export function accountNavItems(t: (k: string) => string): GameShellNavItem[]; // profile + PROFILE_MENU hrefs
export function accountActiveId(pathname: string): string; // longest href prefix match, default 'profile'
```
- `AccountShell`: `GameShellClient items={…} activeId={id} title={label}` + під шапкою `<div className="mx-auto max-w-[1400px] px-3 sm:px-4"><HudChipTabs size="lg" ariaLabel={t('profile')} items=… /></div>` + `<main className="hud-surface mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4">{children}</main>`.
- Layouts: `<LocaleScope namespaces={[...наявні, 'whatsNew']}><AccountShell>{children}</AccountShell></LocaleScope>`.
- `shouldUseGameShell`: `+ /^\/(profile|help|library\/sounds)(\/.*)?$/` і `/^\/settings\/[^/]+$/`.
- Сторінка підписки: серверна, `HudFormPage` з `auth.settings.subscription.title` і одним `<p className="text-hud-muted">` з `soon`.
- [ ] Тести: `shouldUseGameShell` true для `/profile`, `/settings/ai`, `/settings/subscription`, `/help`, `/help/x`, `/library/sounds`; false для `/library`, `/settings`. `accountActiveId('/settings/ai') === 'aiKeys'`, `('/help/combat') === 'help'`, `('/profile') === 'profile'`. `PROFILE_MENU` містить `subscription` з `href`. `AccountShell` (мок `usePathname`, `NextIntlClientProvider`) — посилання поточного розділу має `aria-current="page"`.
- [ ] Коміт `feat(profile): account shell with sub-tabs, subscription stub`.

### T17: `/profile` (A13)
**Files:** Create `lib/server/profile/summary.ts`, `lib/server/profile/__tests__/summary.test.ts`; Modify `app/profile/page.tsx`, `app/profile/page-client.tsx`, `components/profile/AvatarEditor.tsx` (лише класи), `messages/{uk,en}/auth.json` (`profileSummary.{campaigns,characters,lastActivity,switchAccount,signOut}` — ICU plural); Test `app/profile/__tests__/{page,page-client}.test.tsx`.
```ts
import 'server-only';
export interface ProfileSummary { campaigns: number; characters: number; lastActivity: string | null } // ISO
export async function getProfileSummary(userId: string): Promise<ProfileSummary>;
// campaignMember.count({ where: { userId, campaign: { status: CampaignStatus.ACTIVE, kind: CampaignKind.CAMPAIGN } } })
// character.count({ where: { controlledBy: userId, type: CharacterType.PLAYER, status: CharacterStatus.ACTIVE, campaign: { status: ACTIVE, kind: CAMPAIGN } } })
// campaign.aggregate({ where: { members: { some: { userId } }, status: ACTIVE, kind: CAMPAIGN }, _max: { updatedAt: true } })
```
- `ProfileClient({ profile }: { profile: { showOpsLink: boolean; summary: ProfileSummary } })`: макет зі спеки (аватар у `ds-panel ornate`, рамка `.frame` = `ds-inset p-1.5 border border-hud-line`, ім'я `hud-sc text-[28px]`, email `text-hud-muted`, `orn`, рядок зведення `hud-num` числа + `hud-sc` підписи, нулі/`null` пропускаються, дата `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })` у днях); нижче — посилання Ops і зона дій `Button variant="ghost"` × 2 з `useProfileActions`.
- [ ] Тести: summary — фільтри передаються в Prisma (перевірка `where` моку), `lastActivity: null`, коли `_max.updatedAt` null; page-client — при `{campaigns:0, characters:2, lastActivity:null}` немає тексту кампаній і дати, є «2»; кнопка виходу викликає `signOut` з моку `useProfileActions`.
- [ ] Коміт `feat(profile): avatar-first profile with account summary`.

### T18: Налаштування й інші акаунтні сторінки (A14)
**Files:** Create `components/layout/PaletteCard.tsx`, `components/layout/__tests__/PaletteCard.test.tsx`; Modify `components/layout/PaletteSwitcher.tsx`, `app/settings/{preferences,password,ai}/page-client.tsx`, `app/library/sounds/page-client.tsx`, `app/help/page.tsx`, `app/help/[slug]/page.tsx` (лише композиція: `HudFormPage`/`HudSection`, без змін логіки).
```ts
export function PaletteCard({ id, selected, disabled, onSelect }: { id: PaletteId; selected: boolean; disabled?: boolean; onSelect: (id: PaletteId) => void }): JSX.Element;
```
- `PaletteCard` — `Button variant="outline"` (не сирий `<button>`) з `aria-pressed={selected}`, прев'ю з `PALETTE_PREVIEW[id]` через inline `style` (5 смуг/блоків, `aria-hidden`), назва `t('names.'+id)`; вибрана — `border-hud-crimson`. `PaletteSwitcher`: `<div role="group" aria-label={t('label')} className="grid grid-cols-2 gap-3">` з двома картками; помилка — `<p role="status">` текстом.
- Preferences: мова, палітра, часовий пояс — `HudSection` з підписами (`Label` для поля пошуку зони замість `aria-label`-лише). AI-ключі: лише класи/композиція, логіку маскування не чіпати.
- [ ] Тест `PaletteCard`/`PaletteSwitcher`: 2 кнопки з `aria-pressed`, клік по невибраній викликає `setPalette('parchment')` (мок `useTheme`), група має `aria-label`.
- [ ] Коміт `feat(settings): palette cards and DS account pages`.

### T19: `ProfileEditor` (A15)
**Files:** `components/characters/basic/CharacterBasicInfo.tsx`, `components/character-profile/tabs/BasicEditTab.tsx`, `components/character-profile/ProfileEditor.tsx` (лише класи обгорток вкладок), `messages/{uk,en}/characterProfile.json` (≤ 2 ключі `basic.sections.{identity,portrait}`; «Походження» — перевикористати `characterProfile.…from.origin` через той самий `t`, якщо namespace збігається, інакше третій ключ не додавати — перенести наявний); Test `components/characters/basic/__tests__/CharacterBasicInfo.test.tsx`.
- `CharacterBasicInfo` групує наявні поля в три `HudSection` (`Особа`: name, type, controlledBy, level; `Походження`: race, subrace, classes|class+subclass, archetype, alignment; `Портрет`: avatar) з тими самими умовами показу; сітка всередині секції `grid-cols-1 md:grid-cols-2`; порожня секція не рендериться. Пропси не змінюються.
- `BasicEditTab` прибирає `HudSection panel`-обгортку (секції вже всередині), кнопка видалення — окремою зоною `border-t border-hud-rule`.
- Вміст вкладок — `mx-auto max-w-[860px]`, без панелей-карток.
- [ ] Тест: усі поля, що рендерились до зміни, рендеряться (знімок `getAllByRole('textbox'|'combobox')` за `id`); при `hide.class` немає поля класу; при `isPlayerView` немає секції «Портрет».
- [ ] Коміт `feat(characters): DS sections in basic editor`.

### T20: Дашборд кампанії (A15)
**Files:** `components/campaigns/dashboard/*.tsx`, `dashboard.css`; Test `components/campaigns/dashboard/__tests__/HeroHp.test.tsx`.
- `.ds-panel` лише `DmPartyCard`, `CampaignSummaryPanel`, `DmPrepPanel`; інші — `border-b border-hud-rule`. Числа — `hud-num`. `HeroHp`: трек `ds-inset h-2`, fill `linear-gradient(var(--hud-hp), var(--hud-hp-2))`, `role="meter" aria-valuemin=0 aria-valuemax={max} aria-valuenow={hp} aria-valuetext="{hp}/{max}"` (текст через наявний `t`, якщо є; інакше `${hp}/${max}` — не кирилиця). Одна основна `Button` на панель.
- [ ] Тест `HeroHp`: `role="meter"`, `aria-valuenow`, `aria-valuetext`.
- [ ] Коміт `feat(dashboard): DS panels and hp meter`.

### T21: `/ops` (A16)
**Files:** `app/ops/ops-client.tsx`, `components/ops/*.tsx`; Test `components/ops/__tests__/LimitGauge.test.tsx` (доповнити).
- Панелі `ds-panel`, заголовки `hud-sc`, числа `hud-num`; `OpsRangeTabs` — стиль сегментів як активний чип T11; `AlertList`/`DbTopTable` на лініях; стани — колір + іконка (`CircleCheck`/`TriangleAlert`/`OctagonAlert`) + текст.
- `UplotChart`: сітка `getComputedStyle(document.documentElement).getPropertyValue('--hud-rule')`, шрифт осей `500 12px ${--font-num}`; `MutationObserver` на `document.documentElement` (`attributeFilter: ['data-palette']`) → перестворити графік; відписка в cleanup.
- [ ] Тест: `LimitGauge` у стані «критично» має видимий текст стану, не лише колір.
- [ ] Коміт `feat(ops): DS styling, palette-aware charts`.

### T22: i18n, whats-new, довідка (A16)
**Files:** `lib/onboarding/whats-new.ts` (`{ id: '2026-11-25-design-system', date: '2026-11-25', audience: 'all' }`), `messages/{uk,en}/whatsNew.json`, `messages/{uk,en}/help.json` (тексти про палітри/золото), `messages/{uk,en}/common.json` (лише якщо лишились мертві ключі після T16).
- [ ] `pnpm test:related lib/onboarding/whats-new.ts`; коміт `docs(onboarding): whats-new for design system`.

## Завершення

### T23: Гейт (A17)
- [ ] `pnpm exec tsc --noEmit`; `pnpm lint:dirs --changed main`; `pnpm cycles`; `node scripts/shared/raw-controls-baseline.mjs`; `pnpm exec tsx scripts/shared/props-budget.ts`; **один** `pnpm test:run` (перед стартом `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; > 5 хв — повісився, перезапустити вужче). Зокрема зелені: `scope-size`, `palette-contrast`, `hud-gold`, `ui-layers`, `cyrillic-comments`, `i18n parity/untranslated`.
- [ ] Виправити червоне (класи/тести; бюджети не піднімати); коміт `fix: ch8a gate`.

### T24: Живий прогін (A18)
- [ ] БД `ch8_live` (копія локальної dev, як у попередніх частинах); `NODE_OPTIONS=--max-old-space-size=10240 pnpm exec next build`; `RATE_LIMIT_ALLOW_MEMORY=1 pnpm exec next start -p 3100` (у фоні). Браузер — розширення Chrome; phone — same-origin `iframe` 390/320 на сторінці стенду.
- [ ] Чекліст = розділ «Живий прогін» спеки (обидві палітри; користувач зі старою палітрою в БД і кеші; профіль/налаштування/підписка/довідка/звуки без подвійної шапки; лист-редактор усі вкладки + помилка валідації + збереження + створення персонажа; дашборд ДМ і гравець, сирі ключі; ops + зміна палітри; клавіатура/фокус; бій-смоук; лендинг і `/sign-in` як раніше; кнопка «Далі» на 390 (`c0b6c40d7`); консоль, 0×5xx) + пункти Review Focus 2 і 5.
- [ ] Звіт — таблиця «пункт → PASS/FAIL + доказ (текст/JS-перевірка, не лише скрін)»; дрібні фікси — окремим комітом; прибрати тестові дані з `ch8_live`.

### T25: Opus-рев'ю
- [ ] Субагент Opus: `git diff main...HEAD` (код, не висновки), спека, DESIGN.md. Фокус: legacy-палітри, токени/контраст, залишки золота (`var(--gold)`, hex), a11y кіту (ролі, фокус, цілі 40 px), межі шарів, `lib/server/profile/summary.ts`, i18n-бюджети. Фікси Critical/Important — Sonnet-агент (1–2 запуски).

### T26: `/simplify` (A19) — 1 агент на diff гілки; без зміни поведінки.

### T27: Docs (A20)
- [ ] `docs/architecture/ui-layers.md` (DS-утиліти, `AccountShell`, `PaletteCard`, кіт), `docs/architecture/platform.md` (2 палітри + legacy-мапа, шрифти/preload, зерно), `.claude/rules/components.md` (рядок про DS-кіт і заборону золота), `docs/STATUS.md` (стан Ч8a, відкрите).

### T28: Merge (лише після «так» власника)
- [ ] Тимчасовий worktree від `main`, `git merge --no-ff feat/game-ui-ch8`; у тому ж merge-коміті `git mv` спеки й плану в `docs/archive/superpowers/{specs,plans}/`; push — лише за окремим підтвердженням.
