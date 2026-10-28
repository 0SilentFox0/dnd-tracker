# Campaign Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перебудувати `app/campaigns/[id]/page.tsx` у двоколонковий дашборд: «Що далі» (DM) / картка героя (гравець), згруповані розділи з пошуком, бічна колонка з налаштуваннями, учасниками й онбордингом.

**Architecture:** `page.tsx` лишається server component; дані — дві вузькі серверні функції в `lib/server/campaigns/dashboard.ts`. Єдиний клієнтський компонент — `DashboardGroups` (фільтр таблиці розділів через `useSearch`). Нових API немає.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, Tailwind, lucide-react, Vitest + Testing Library (happy-dom).

**Spec:** `docs/archive/superpowers/specs/2026-10-27-campaign-dashboard-design.md`

**Worktree:** `/Users/silentfox/Work/dnd-tracker-dashboard`, гілка `feat/campaign-dashboard`. Усі команди — звідти.

## Global Constraints

- Тексти UI українською; ідентифікатори англійською. Мінімум коментарів (лише неочевидне «чому»).
- Компоненти не імпортують `@/lib/api/*`; `fetch` не використовуємо.
- Вузькі `select`; JSON-колонки (`participants`, `map`, `snapshot`, `abilities`, `skills` тощо) не читаються. Без polling/Pusher.
- Імпорти через `@/`, порядок — `pnpm lint --fix`; порожні рядки навколо `const`/`if`/`return` (ESLint `padding-line-between-statements`).
- Тести — у сусідніх `__tests__/`; компонентні — `// @vitest-environment happy-dom`, `afterEach(cleanup)`.
- Під час роботи — `pnpm test:related <files>`; повний `pnpm test:run` — один раз наприкінці.
- Ширина 390px — без горизонтального скролу: довгі назви `truncate`/`min-w-0`.
- Відхилення від spec (рішення плану): `DashboardGroups` сам імпортує таблицю розділів і будує плитки з `{ campaignId, isDM, pendingDrafts }` — так іконки-компоненти не перетинають межу server/client, і `iconKey`-мапа не потрібна.

## Review Focus

1. Гравець має лише чернетку (`PENDING`) — `findFirst` повертає її; картка показує «На схваленні» / «Повернуто ДМ», а не «Створити персонажа». → тест у Task 4.
2. Учасник-герой в активному бою **іншої** кампанії або в завершеному бою — «До бою» не показується (фільтр `battle: { campaignId, status: active }`). → тест у Task 1.
3. Довгі назви кампанії/сторінок сценарію/боїв на 390px — обрізаються, не розпирають сітку. → `truncate` у Task 4, перевірка в браузері (Task 6).
4. Порожній або битий `avatar` — фолбек з ініціалом, а не порожній квадрат. → тест у Task 4.
5. Enter при запиті без збігів — нічого не відбувається (без `router.push(undefined)`); запит із пробілами й регістром («  ЗАКЛ ») — працює через `matchesQuery`. → тест у Task 3.

---

### Task 1: Серверні дані дашборда

**Files:**
- Create: `lib/server/campaigns/dashboard.ts`
- Modify: `types/campaigns.ts` (додати типи в кінець)
- Test: `lib/server/campaigns/__tests__/dashboard.test.ts`

**Interfaces — Produces:**

```ts
// types/campaigns.ts
export interface DmDashboardData {
  pendingDrafts: number;
  scenarioPages: { id: string; title: string }[];
  battles: { id: string; name: string; status: BattleStatus }[]; // BattleStatus з @/lib/constants/battle
}

export interface DashboardHero {
  id: string; name: string; level: number; race: string; class: string; avatar: string | null;
  armorClass: number; speed: number; status: string; reviewNote: string | null; seenLevel: number | null;
}

export interface HeroHpValue { current: number; max: number; temp: number }

export interface PlayerDashboardData {
  hero: DashboardHero | null;
  activeBattle: { battleId: string; hp: HeroHpValue } | null;
}

// lib/server/campaigns/dashboard.ts
export async function readDmDashboard(campaignId: string): Promise<DmDashboardData>;
export async function readPlayerDashboard(campaignId: string, userId: string): Promise<PlayerDashboardData>;
```

Запити (точно):
- `prisma.character.count({ where: { campaignId, status: CharacterStatus.PENDING } })`
- `prisma.scenarioPage.findMany({ where: { campaignId }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true } })`
- `prisma.battleScene.findMany({ where: { campaignId, status: { in: [PREPARED, ACTIVE] } }, orderBy: { createdAt: "desc" }, take: 6, select: { id, name, status } })` → у JS стабільно сортувати active-first, `slice(0, 3)` (take 6, щоб активний не загубився за трьома новішими prepared).
- `prisma.character.findFirst({ where: { campaignId, controlledBy: userId, type: CharacterType.PLAYER }, orderBy: { createdAt: "desc" }, select: { …поля DashboardHero } })`
- якщо hero: `prisma.battleParticipant.findFirst({ where: { sourceId: hero.id, battle: { campaignId, status: BattleStatus.ACTIVE } }, select: { battleId, currentHp, maxHp, tempHp } })`. Перевір назву relation у `BattleParticipant` (`prisma/schema.prisma`, модель ~рядок 411) — використай фактичну.
- Перші три — `Promise.all`.

- [ ] **Step 1: Тести** (мок `@/lib/db` через `vi.hoisted`, як у `lib/server/campaigns/__tests__/campaign-refs.test.ts`):
  - `readDmDashboard`: повертає count/pages/battles; `battleScene.findMany` викликано з `status.in` = `["prepared","active"]` і `select` рівно `{id,name,status}`; active-бій іде першим навіть якщо створений раніше; не більше 3 боїв.
  - `readPlayerDashboard`: немає героя → `{ hero: null, activeBattle: null }` і `battleParticipant.findFirst` не викликається; герой без бою → `activeBattle: null`; герой у бою → `hp` з `tempHp`; `where` учасника містить `battle: { campaignId: "c1", status: "active" }` (Review Focus 2).
  - Жоден `select` не містить ключів `participants`, `map`, `snapshot`, `skills`, `abilities`.
- [ ] **Step 2:** `pnpm test:run lib/server/campaigns/__tests__/dashboard.test.ts` → FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** Тест → PASS; `npx tsc --noEmit -p .` без помилок.
- [ ] **Step 5:** `git commit -m "feat(dashboard): server reads for DM and player dashboard"`.

### Task 2: Таблиця розділів + `HudTile compact`

**Files:**
- Create: `lib/constants/campaign-dashboard.ts`
- Modify: `components/hud/page/HudTile.tsx`
- Test: `lib/constants/__tests__/campaign-dashboard.test.ts`, `components/hud/page/__tests__/primitives.test.tsx` (додати кейс)

**Interfaces — Produces:**

```ts
import type { LucideIcon } from "lucide-react";

export type DashboardGroupKey = "game" | "heroes" | "libraries" | "player";

export interface DashboardSection {
  key: string;            // унікальний: "scenario", "characters", "info", "my-character", "player-show", …
  href: (campaignId: string) => string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  keywords: string[];
  group: DashboardGroupKey;
}

export const DASHBOARD_GROUP_TITLE: Record<DashboardGroupKey, string>; // Гра / Герої / Бібліотеки / Кампанія
export const DM_DASHBOARD_SECTIONS: DashboardSection[];
export const PLAYER_DASHBOARD_SECTIONS: DashboardSection[];
export const COMPACT_GROUPS: ReadonlySet<DashboardGroupKey>; // {"libraries"}
```

Вміст (іконки й тексти — з поточного `dmTiles` у `app/campaigns/[id]/page.tsx`; `href` DM-розділів = `/campaigns/${id}/dm/<path>`, «Довідник» = `/campaigns/${id}/info`):
- game: scenario (ScrollText, «Сценарій»), battles (Swords, «Бої»), show (Images, «Показ»), music (Music, «Музика»)
- heroes: characters (Users, «Персонажі»), info (BookOpen, «Довідник»)
- libraries: units (Skull, «Юніти»), spells (Sparkles, «Заклинання»), artifacts (Gem, «Артефакти»), skills (BookOpen, «Скіли»), skill-trees (GitBranch, «Дерева прокачки»), races (Shield, «Раси»)
- player: my-character (User, «Мій персонаж» → `/character`), player-show (Images, «Показ» → `/show`), info
- keywords (мінімум): units — «моби», «npc», «монстри», «вороги»; spells — «закл», «магія»; artifacts — «предмети», «речі», «сети»; skills — «навички», «здібності»; skill-trees — «прокачка», «рівні»; races — «народи»; battles — «бій», «битви», «сцени»; scenario — «сюжет», «нотатки», «рукопис»; show — «слайди»; music — «треки», «плеєр»; characters — «герої», «гравці», «схвалення»; info — «інформація», «правила».

`HudTile`: новий опційний проп `compact?: boolean` — іконка `size-8`, `p-2`, subtitle не рендериться.

- [ ] **Step 1: Тести:**
  - кожен DM-розділ з `href` вигляду `/campaigns/x/dm/<path>` має файл `app/campaigns/[id]/dm/<path>/page.tsx` (`fs.existsSync`); `/info`, `/character`, `/show` теж існують як `page.tsx`;
  - `key` унікальні в межах кожного списку;
  - `matchesQuery([s.title, ...s.keywords], q)` знаходить: «моби»→units, «закл»→spells, «  СХВАЛ »→characters;
  - `HudTile compact` з subtitle — subtitle не в DOM.
- [ ] **Step 2:** запуск → FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** `pnpm test:related lib/constants/campaign-dashboard.ts components/hud/page/HudTile.tsx` → PASS.
- [ ] **Step 5:** `git commit -m "feat(dashboard): sections table and compact HudTile"`.

### Task 3: `DashboardGroups` (client, пошук)

**Files:**
- Create: `components/campaigns/dashboard/DashboardGroups.tsx`
- Test: `components/campaigns/dashboard/__tests__/DashboardGroups.test.tsx`

**Interfaces:**
- Consumes: `DM_DASHBOARD_SECTIONS`, `PLAYER_DASHBOARD_SECTIONS`, `DASHBOARD_GROUP_TITLE`, `COMPACT_GROUPS` (Task 2); `useSearch` (`@/lib/hooks/common`), `SearchInput`, `SearchEmptyState` (`@/components/common/...`), `HudTile`.
- Produces: `export function DashboardGroups({ campaignId, isDM, pendingDrafts }: { campaignId: string; isDM: boolean; pendingDrafts: number })`.

Поведінка:
- `"use client"`. Секції = DM чи player список; для `characters` при `pendingDrafts > 0` subtitle = `Управління персонажами гравців · ${pendingDrafts} на схваленні`.
- `fieldsOf` для `useSearch` — стабільна функція поза компонентом (`(s) => [s.title, ...s.keywords]`).
- Без запиту: групи у порядку game → heroes → libraries (гравець — одна група без заголовка); заголовок групи — `<h2 className="hud-sc text-sm text-hud-muted">`; сітка `grid gap-2 sm:grid-cols-2 xl:grid-cols-3`, для compact-груп `grid grid-cols-2 gap-2 sm:grid-cols-3`.
- Із запитом: одна плоска сітка збігів (не compact), без заголовків; порожньо — `SearchEmptyState` з `onClear={() => query.set("")}`.
- `SearchInput` `label="Пошук розділу"`, `placeholder="Куди йдемо? (закл, моби, бої…)"`; обгорнути в `<form onSubmit>`: `preventDefault`, і якщо є перший збіг та запит активний — `router.push(first.href(campaignId))`.

- [ ] **Step 1: Тести** (мок `next/navigation` → `useRouter: () => ({ push })`; `useDeferredValue` у тестах повертає значення синхронно після `act`, за потреби `await screen.findBy…`):
  - DM без запиту: видно заголовки «Гра», «Герої», «Бібліотеки» і 12 посилань;
  - `pendingDrafts=2` → текст «2 на схваленні»;
  - гравець: «Мій персонаж», «Показ», «Довідник»; немає «Юніти»;
  - запит «моби» → лише посилання «Юніти», заголовків груп немає;
  - запит «zzz» → «Нічого не знайдено», клік «Очистити пошук» повертає 12 посилань;
  - Enter при «закл» → `push("/campaigns/c1/dm/spells")`; Enter при «zzz» → `push` не викликано (Review Focus 5).
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS.
- [ ] **Step 5:** `git commit -m "feat(dashboard): grouped sections with quick search"`.

### Task 4: `DmNextSteps`, `PlayerHeroCard`, `HeroHp`

**Files:**
- Create: `components/campaigns/dashboard/DmNextSteps.tsx`, `PlayerHeroCard.tsx`, `HeroHp.tsx`
- Test: `components/campaigns/dashboard/__tests__/DmNextSteps.test.tsx`, `PlayerHeroCard.test.tsx`

**Interfaces:**
- Consumes: типи з Task 1; `BATTLE_STATUS_LABEL`; `CharacterStatus`; `HudPanel`, `HudSection`; `OptimizedImage` (`src, alt, width, height, className, fallback`); `Button` з `@/components/ui/button` (з `asChild` + `Link`).
- Produces:
  - `DmNextSteps({ campaignId, data }: { campaignId: string; data: DmDashboardData })`
  - `PlayerHeroCard({ campaignId, data }: { campaignId: string; data: PlayerDashboardData })`
  - `HeroHp({ hp }: { hp: HeroHpValue })` — «HP 23/40» (+ « (+5)» якщо temp > 0) і тонка смуга; єдине місце рендеру HP (точка розширення під постійне HP після constructor).

`DmNextSteps` — `HudPanel` + `HudSection title="Що далі"`, акцентна рамка (gold `shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)]`):
- «Підготовка» (рендер лише якщо є хоч один пункт): «На схваленні: N» → `dm/characters`; сторінки сценарію → `dm/scenario/{id}` (іконка ScrollText); бої → `battles/{id}` з бейджем `BATTLE_STATUS_LABEL[status]`. Пункти — посилання-рядки `flex min-w-0` з `truncate`.
- «Сесія»: дві кнопки-посилання «Показ» → `dm/show`, «Музика» → `dm/music`.

`PlayerHeroCard` — `HudPanel`:
- `hero === null` → текст «У тебе ще немає героя» + кнопка «Створити персонажа» → `/character`.
- Інакше: портрет 72×72 (`OptimizedImage`, `fallback` = ініціал імені в колі; якщо `avatar` порожній — одразу фолбек), імʼя (`truncate`), «{race} · {class}», «Рівень N · КБ X · Швидкість Y».
- Бейджі: `status === PENDING && !reviewNote` → «На схваленні»; `status === PENDING && reviewNote` → «Повернуто ДМ» + `reviewNote` під ним; `seenLevel != null && seenLevel < level` → «Новий рівень».
- `activeBattle` → `HeroHp` + кнопка «До бою» → `battles/{battleId}`; завжди кнопка «Відкрити героя» → `/character`.

- [ ] **Step 1: Тести:**
  - DmNextSteps: усе порожнє → немає «Підготовка», є «Показ»/«Музика»; `pendingDrafts=0` → немає «На схваленні»; бій `active` має бейдж «йде» і href `/campaigns/c1/battles/b1`; сторінка сценарію → href `/campaigns/c1/dm/scenario/p1`.
  - PlayerHeroCard: `hero: null` → «Створити персонажа»; PENDING без note → «На схваленні»; PENDING з note «Додай біографію» → «Повернуто ДМ» і текст note (Review Focus 1); `seenLevel 2, level 3` → «Новий рівень»; `avatar: null` → видно ініціал (Review Focus 4); `activeBattle` з temp 5 → «23/40», «+5», «До бою» з правильним href; без бою — немає «До бою».
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS.
- [ ] **Step 5:** `git commit -m "feat(dashboard): next steps panel and player hero card"`.

### Task 5: Збірка сторінки, бічна колонка, документація

**Files:**
- Create: `components/campaigns/dashboard/CampaignSummaryPanel.tsx`
- Modify: `app/campaigns/[id]/page.tsx`, `lib/onboarding/whats-new.ts`, `docs/STATUS.md`

**Interfaces:**
- Consumes: усе з Tasks 1–4; наявні `CampaignSettingsButton`, `InviteCodeDisplay`, `CampaignMembersList`, `OnboardingChecklist`, `PrefetchedQuery`, `onboardingKeys`.
- Produces: `CampaignSummaryPanel({ campaignId, campaign, isDM })`, де `campaign` — `{ name, description, maxLevel, allowPlayerEdit, status, inviteCode }`.

`CampaignSummaryPanel` — перенесений блок «Налаштування кампанії» у вертикальний вигляд для вузької колонки: рядки «Макс. рівень», «Код запрошення» (`div id="invite" className="scroll-mt-20"` + `InviteCodeDisplay`), «Статус»; кнопка налаштувань (лише DM) в `HudSection action`.

`page.tsx`:
- `Promise.all([isDM ? readDmDashboard(id).catch(() => null) : null, !isDM ? readPlayerDashboard(id, user.id).catch(() => null) : null, readCampaignOnboarding(...).catch(() => null)])`; прибрати старий `character.count` і масив `dmTiles` та імпорти lucide, що стали зайві.
- Розкладка: `HudPageHeader` → `<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">` — основна колонка `min-w-0 space-y-4` (DmNextSteps якщо `dm`; PlayerHeroCard якщо `player`; `DashboardGroups` з `pendingDrafts={dm?.pendingDrafts ?? 0}`), бічна `space-y-4` (`CampaignSummaryPanel`, панель «Учасники» без змін, `PrefetchedQuery`+`OnboardingChecklist`).
- `whats-new.ts` — новий перший запис: `{ id: "2026-10-27-dashboard", date: "2026-10-27", audience: "all", title: "Новий дашборд кампанії", body: "Розділи згруповані, є пошук розділу. ДМ бачить «Що далі»: схвалення, останні сторінки сценарію й підготовлені бої. Гравець — картку свого героя й кнопку «До бою»." }`.
- `docs/STATUS.md` — рядок про `feat/campaign-dashboard` у поточній роботі (стиль файлу).

- [ ] **Step 1:** Реалізація (тести сторінки немає — server component; покриття — Tasks 1–4 + браузер).
- [ ] **Step 2:** `npx tsc --noEmit -p .`, `pnpm lint` (0 errors), `pnpm test:changed main` → PASS.
- [ ] **Step 3:** `git commit -m "feat(dashboard): two-column campaign dashboard"`.

### Task 6: Перевірка в браузері (субагент Sonnet)

Локальна БД (`pnpm db:local`, або копія `prodcopy`), `pnpm dev -p 3021` у worktree. Кампанія HOMM5:
- DM, десктоп 1440 і 390px (iframe 390px, якщо вікно не звужується): «Що далі» видно без прокрутки на десктопі; групи; пошук «моби» + Enter відкриває юнітів; немає горизонтального скролу (`document.documentElement.scrollWidth <= innerWidth`); `#invite` прокручує до коду.
- Гравець (тестовий акаунт-гравець кампанії): картка героя, кнопки, порядок колонок на 390px.
- Перевірки — JS/текст замість скріншотів, де можливо. Зупинити dev-сервер наприкінці. Знайдені баги — фікс + коміт `fix(dashboard): …`.

### Завершення (контролер)

`pnpm test:run` один раз; `/simplify` (1 агент); фінальне рев'ю Opus на весь диф; злиття в main — лише після «ок» користувача, spec/plan → `docs/archive/superpowers/` у merge-коміті.

**Батчі для виконавців (Sonnet):** A = Tasks 1+2, B = Tasks 3+4, C = Task 5, D = Task 6.
