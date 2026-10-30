# Граф сценарію (етап 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Реалізатори — Sonnet; без рев'ю по кожній задачі, один фінальний Opus-рев'ю на гілку.

**Goal:** DM-сторінка `/campaigns/[id]/dm/graph` з force-графом «сторінка сценарію ↔ сутність» з готового `ScenarioIndex`.

**Architecture:** Чисті функції `lib/utils/scenario/graph/` (модель, розкладка `d3-force`, сусіди, пошук) → хук `useScenarioGraph` над `useScenarioIndex` → SVG-компоненти `components/scenario/graph/` (динамічний імпорт, без SSR) → server page із гардом DM. Нового API немає.

**Tech Stack:** Next.js 16, React 19, TanStack Query, next-intl, `d3-force` (+ `@types/d3-force`), vitest (`happy-dom` для UI).

**Spec:** `docs/superpowers/specs/2026-10-30-scenario-graph-design.md` (читати разом із планом; форма `ScenarioIndex` — `types/scenario.ts`).

## Global Constraints

- Шари: компоненти й `app/**` не імпортують `@/lib/api/*` і не роблять `fetch`; дані й логіка — у хуках (`lib/hooks/scenario`, імпорт з barrel). Alias лише `@/…`, `import/no-cycle` увімкнено.
- Тексти: `messages/{uk,en}/scenarioGraph.json`, без кирилиці в коді (ESLint); namespace додати в `NAMESPACES` (`lib/i18n/config.ts`) за зразком `scenario`. Підписи типів сутностей — з `scenario.mentionTypes`.
- Egress: `useScenarioIndex` (staleTime 60 с), без полінгу, без префетчу на сервері.
- Секрети: сторінка лише для ДМ (`requireCampaignDM` у `page.tsx`).
- Коментарі мінімальні, лише неочевидне «чому».
- Жодного repo-wide `pnpm lint`/`pnpm test:run` під час задач: лише `pnpm test:run <file>`/`pnpm test:related` і `pnpm exec eslint --fix <змінені файли>`. Не пушити й не мерджити без слова користувача.
- Worktree `../dnd-tracker-graph` (гілка `feat/scenario-graph`); перед першою командою `pnpm install --frozen-lockfile`.
- Коміти завершувати рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Порожній індекс / сторінки без жодної згадки: `EmptyState`, без падіння `layoutGraph` на 0 вузлів.
- Усі сутності `missing`: вузли намальовані, `onlyMissing` не лишає порожній екран без пояснення.
- Сотні вузлів: кап 150, `truncated` показано, розкладка не блокує довше за 300 тіків.
- Кирилиця й регістр у пошуку (`Лорд` ↔ `лорд`), порожній запит = немає збігів, а не «усе».
- Видалена сутність між завантаженням і кліком: посилання не ламає сторінку (missing-вузол не відкривається).

---

### Task 1: Залежність, константи, чиста модель графа

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (окремий коміт `chore(deps): add d3-force`)
- Create: `lib/constants/scenario-graph.ts`, `lib/utils/scenario/graph/model.ts`, `lib/utils/scenario/graph/types.ts`, `lib/utils/scenario/graph/__tests__/model.test.ts`

**Interfaces:**
- Produces (`types.ts`, експорт з `model.ts` не потрібен):
  ```ts
  GraphNode = { id: string; kind: "scene" | "entity"; pageKind?: ScenarioPageKind; type?: MentionType; label: string; degree: number; missing: boolean; status?: ScenarioPageStatus; order?: number; refId: string; hidden: number }
  GraphEdge = { id: string; source: string; target: string; count: number; secret: boolean }
  GraphFilters = { types: ReadonlySet<MentionType>; showAll: boolean; showLeaves: boolean; onlyMissing: boolean }
  GraphModel = { nodes: GraphNode[]; edges: GraphEdge[]; truncated: number }
  ```
  `refId` — id сутності/сторінки без префікса (для `mentionHref`).
- Produces (`model.ts`): `sceneNodeId(id)`, `entityNodeId(type, id)`, `defaultFilters(): GraphFilters` (усі `MENTION_TYPES`, `showAll=false`, `showLeaves=false`, `onlyMissing=false`), `buildGraphModel(index: ScenarioIndex, filters: GraphFilters): GraphModel`, `neighbors(model, nodeId): { nodes: Set<string>; edges: Set<string> }`, `searchMatches(model, query: string): string[]`.
- Constants: `GRAPH_ENTITY_CAP = 150`, `GRAPH_WARN_NODES = 400`, `GRAPH_LABEL_MIN_DEGREE = 3`, `GRAPH_TICKS = 300`, `GRAPH_TYPE_STYLE: Record<MentionType, { icon: LucideIcon; color: string }>` (колір — CSS-змінні/Tailwind-токени з теми, не хардкод hex; сусідні файли constants показують стиль).

Правила `buildGraphModel`:
- Сторінки (`index.scenes`) усі в моделі; `degree` сторінки = кількість видимих ребер.
- Сутності: фільтр `types`; `onlyMissing` лишає missing-сутності та сторінки, пов'язані з ними; кап (`showAll=false`): топ `GRAPH_ENTITY_CAP` за `degree desc → label → id` (порядок уже в індексі), решта в `truncated`.
- Листки (`entity.degree === 1`) без `showLeaves`, окрім missing-сутностей і виділених пошуком (пошук їх не знає, тому лише missing): не вузол, а `hidden += 1` на її сцені; `truncated` їх не рахує.
- Ребро `edge.id = \`${sceneId}>${type}:${id}\``, `source = sceneNodeId`, `target = entityNodeId`; лише між видимими вузлами.
- `searchMatches`: `label` нечутливий до регістру (`toLocaleLowerCase("uk")`), підрядок; порожній/пробільний запит → `[]`; порядок як у `nodes`.

- [ ] **Step 1:** `pnpm install --frozen-lockfile`, потім `pnpm add d3-force && pnpm add -D @types/d3-force`; коміт `package.json` + lock.
- [ ] **Step 2:** Написати падаючі тести `model.test.ts` на фікстурі `ScenarioIndex` (2 сцени, 1 hero-сторінка, 6 сутностей різних типів, 1 missing): кап (виставити `GRAPH_ENTITY_CAP` через параметр `buildGraphModel(index, filters, cap = GRAPH_ENTITY_CAP)` для тесту) і `truncated`; згортання листків → `hidden`; `showLeaves` розгортає; фільтр типів прибирає вузли й їхні ребра; `onlyMissing`; ребра лише між видимими; `neighbors` (вузол, його сусіди, ребра); `searchMatches` (регістр кирилиці, порожній запит, збігається лише label). Запустити — FAIL.
- [ ] **Step 3:** Реалізувати `types.ts`, `scenario-graph.ts`, `model.ts`. Тест — PASS.
- [ ] **Step 4:** `pnpm exec eslint --fix` по новим файлам; коміт `feat(scenario-graph): graph model`.

### Task 2: Розкладка d3-force

**Files:**
- Create: `lib/utils/scenario/graph/layout.ts`, `lib/utils/scenario/graph/__tests__/layout.test.ts`

**Interfaces:**
- Consumes: `GraphModel`, `GraphNode`, `GRAPH_TICKS`.
- Produces: `PositionedNode = GraphNode & { x: number; y: number }`, `PositionedGraph = { nodes: PositionedNode[]; edges: GraphEdge[]; bounds: { minX: number; minY: number; w: number; h: number } }`, `layoutGraph(model: GraphModel, seed = 1): PositionedGraph`.

Рішення: симуляція `d3-force` (`forceLink` за `id`, `forceManyBody`, `forceCollide`, `forceCenter`, `forceX` лише для `pageKind === "scene"`, ціль X = `order × крок`), початкові позиції детерміновані (коло/спіраль за індексом і `seed`, без `Math.random`), `simulation.stop()` + рівно `GRAPH_TICKS` викликів `tick()`. 0 вузлів → `bounds` нульові, без помилки.

- [ ] **Step 1:** Тести: те саме `model`+`seed` → ідентичні координати; усі `x,y` скінченні; 0 вузлів не падає; сцени з більшим `order` лівіше/правіше (x монотонно зростає за `order` для сцен); різний `seed` → інші координати; `bounds` охоплює всі вузли. FAIL.
- [ ] **Step 2:** Реалізувати. PASS.
- [ ] **Step 3:** eslint по файлах; коміт `feat(scenario-graph): d3-force layout`.

### Task 3: Хук `useScenarioGraph`

**Files:**
- Create: `lib/hooks/scenario/useScenarioGraph.ts`, `lib/hooks/scenario/__tests__/useScenarioGraph.test.tsx` (`happy-dom`)
- Modify: `lib/hooks/scenario/index.ts` (експорт)

**Interfaces:**
- Consumes: `useScenarioIndex(campaignId)`, `buildGraphModel`, `defaultFilters`, `layoutGraph`, `neighbors`, `searchMatches`.
- Produces:
  ```ts
  useScenarioGraph(campaignId: string): {
    state: { isLoading: boolean; isError: boolean; isEmpty: boolean; graph: PositionedGraph | null; filters: GraphFilters; query: string; selectedId: string | null; matches: string[]; matchIndex: number; truncated: number; overLimit: boolean; counts: ScenarioIndex["counts"] | null };
    set: { filters: (patch: Partial<GraphFilters>) => void; query: (q: string) => void; selected: (id: string | null) => void; nextMatch: () => void };
    selection: { nodes: Set<string>; edges: Set<string>; detail: GraphDetail | null };
  }
  GraphDetail = { node: PositionedNode; links: { node: GraphNode; count: number; secret: boolean }[] }
  ```
  `isEmpty` = індекс без сторінок. `overLimit` = вузлів > `GRAPH_WARN_NODES`. `nextMatch` циклічно змінює `matchIndex` і виставляє `selectedId`. `GraphDetail` оголосити в `lib/utils/scenario/graph/types.ts`.

- [ ] **Step 1:** Тести (мок `@/lib/api/scenario.getScenarioIndex`, `QueryClientProvider` як у сусідніх hook-тестах): завантаження → `graph`; `isEmpty` для порожнього індексу; зміна `filters.types` міняє `graph.nodes`; `selected(id)` дає `selection.detail.links` і `neighbors`; `query` → `matches`, `nextMatch` циклічно; помилка → `isError`. FAIL.
- [ ] **Step 2:** Реалізувати (`useMemo` для моделі й розкладки; розкладку не перераховувати при зміні виділення/запиту). PASS.
- [ ] **Step 3:** eslint; коміт `feat(scenario-graph): useScenarioGraph hook`.

### Task 4: SVG-компоненти й тексти

**Files:**
- Create: `components/scenario/graph/{ScenarioGraphView,GraphNodeShape,GraphEdgeLine,GraphToolbar,GraphInspector}.tsx`, `components/scenario/graph/index.ts`, `components/scenario/graph/__tests__/graph.test.tsx` (`happy-dom`), `messages/uk/scenarioGraph.json`, `messages/en/scenarioGraph.json`
- Modify: `lib/i18n/config.ts` (`NAMESPACES` += `scenarioGraph`)

**Interfaces:**
- Consumes: результат `useScenarioGraph`, `mentionHref`, `GRAPH_TYPE_STYLE`, `scenario.mentionTypes`, `ResponsiveDialog`, `useMediaQuery`/`DESKTOP_QUERY`.
- Produces: `ScenarioGraph({ campaignId }: { campaignId: string })` — повний екран графа (тулбар, SVG, інспектор, пусті стани), експорт з `components/scenario/graph/index.ts`.

Рішення:
- `ScenarioGraphView`: `<svg>` + `viewBox` у стані (pan: pointer drag; zoom: wheel і кнопки ±; «вписати» = `bounds`; pinch на touch). Підпис вузла видно, якщо вибраний, збіг пошуку, сторінка, `degree ≥ GRAPH_LABEL_MIN_DEGREE` чи hover (`<title>` завжди). Решта тьмяніє (`opacity`), коли є виділення. Вузли фокусовні (`tabIndex=0`, Enter виділяє, Esc знімає).
- `GraphNodeShape`: `scene` — rect з номером/статусом (кольори статусів з `PAGE_STATUSES`), `hero`/`note` — менший rect з іншою рамкою; сутність — circle + іконка типу; `missing` — клас `graph-node-missing` (пунктирна рамка, приглушений) + `data-missing`; `hidden > 0` — бейдж `+N`.
- `GraphEdgeLine`: товщина за `count` (clamp), `secret` — `strokeDasharray` + іконка замка в середині.
- Клік виділяє; подвійний клік або кнопка «Відкрити» в інспекторі → `router.push(mentionHref(...))` для сутності, `/campaigns/{id}/dm/scenario/{pageId}` для сторінки; missing-сутність не відкривається (кнопка disabled, пояснення «сутність видалена»).
- Пусті стани: немає сторінок → `EmptyState` з посиланням на `/dm/scenario`; сторінки без згадок → підказка вставляти `@`-згадки; все відфільтровано → кнопка «скинути фільтри». Банер `truncated` («показано N із M сутностей» + «показати всі»), попередження при `overLimit`.
- Тулбар: чекбокси типів з лічильниками (`counts.byType`), `onlyMissing`, `showAll`, `showLeaves`, пошук (Enter → `nextMatch`, вигляд центрується на збігу).
- Усі рядки через `useTranslations("scenarioGraph")` (uk і en паритет ключів; без кирилиці в `.tsx`).

- [ ] **Step 1:** Тести компонента (мок хука або реальний хук з мок-API): рендер N вузлів і M ребер; клік по вузлу додає клас виділення і тьмянить решту; `missing` має `data-missing`; секретне ребро має маркер замка; бейдж `+N`; Enter на сфокусованому вузлі виділяє; кнопка «Відкрити» для missing вимкнена; пусті стани трьох видів. FAIL.
- [ ] **Step 2:** Створити `messages/{uk,en}/scenarioGraph.json`, додати namespace, реалізувати компоненти. PASS.
- [ ] **Step 3:** `pnpm test:run lib/i18n` (паритет ключів і namespace) + eslint по новим файлах; коміт `feat(scenario-graph): graph components and texts`.

### Task 5: Сторінка, навігація, онбординг

**Files:**
- Create: `app/campaigns/[id]/dm/graph/page.tsx`, `app/campaigns/[id]/dm/graph/page-client.tsx`, `app/campaigns/[id]/dm/graph/__tests__/page.test.tsx`
- Modify: `lib/constants/campaign-dashboard.ts`, `lib/constants/campaigns.ts`, `components/layout/Breadcrumbs.tsx` (`SEGMENT_KEYS` += `graph`), `messages/{uk,en}/dashboard.json` (`sections.graph`: title/subtitle/keywords), `messages/{uk,en}/common.json` (`breadcrumbs.segments.graph`), `lib/onboarding/whats-new.ts`, `lib/onboarding/hints.ts`, `lib/onboarding/help/dm.ts`, `messages/{uk,en}/{whatsNew,onboarding,help}.json`

Рішення:
- `page.tsx`: `requireCampaignDM(id)`, повертає `<GraphPageClient campaignId campaignName />` (без `PrefetchedQuery`). `page-client.tsx` (`"use client"`): `HudPage`/`HudPageHeader`, `OnboardingHint id="dm.graph"`, `ScenarioGraph` через `dynamic(() => import("@/components/scenario/graph").then(m => m.ScenarioGraph), { ssr: false, loading: <скелетон> })`.
- Навігація: іконка `Network` (lucide); `DM_DASHBOARD_SECTIONS` += `{ key: "graph", href: dm("graph"), icon: Network, group: "game" }` одразу після `scenario`; `DM_SECTIONS` += `{ path: "graph", icon: Network, templateVisible: false, tile: "all" }` після `scenario`.
- Онбординг: `WHATS_NEW` += `{ id: "2026-10-30-scenario-graph", date: "2026-10-30", audience: "dm", href: "/help/dm-scenario-show" }` (перевірити формат `href` сусідніх записів) + `whatsNew["2026-10-30-scenario-graph"]` {title, body} в обох мовах; `HINTS` += `{ id: "dm.graph", audience: "dm", helpSlug: "dm-scenario-show" }` + `onboarding.hints.graph` {title, body}; у `help/dm.ts` секція статті `dm-scenario-show` += `{ blocks: [{ kind: "p" }, { kind: "list", count: 3 }] }` + `s3` у `help.json` обох мов.
- Перед кінцем задачі прогнати тести навколо: `pnpm test:related` на змінені constants/onboarding/messages файли (реєстри перевіряють структуру й паритет).

- [ ] **Step 1:** `page.test.tsx` за зразком `dm/scenario/__tests__/page.test.tsx` (мок `requireCampaignDM`, мок `../page-client`): сторінка викликає `requireCampaignDM(id)` і віддає клієнт із `campaignId`/`campaignName`; не-DM → помилка гарда прокидається. FAIL.
- [ ] **Step 2:** Реалізувати сторінку, навігацію, онбординг-записи й тексти. PASS.
- [ ] **Step 3:** `pnpm test:related` по змінених файлах (constants, onboarding, breadcrumbs, messages) + eslint по змінених; коміт `feat(scenario-graph): DM graph page, navigation, onboarding`.

### Task 6: Живий прогін, документація, фініш (контролер, не реалізатор)

- [ ] **Step 1:** Спитати користувача про запуск dev-сервера/БД (як у попередніх сесіях), тоді Sonnet-субагент у браузері: DM-сторінка `/dm/graph` на кампанії з імпортованим сценарієм (10 сторінок) і на штучно великому графі; перевірки через JS/текст (кількість вузлів/ребер, `data-missing`, клік виділяє, пошук центрує, перехід за посиланням), зменшені скріншоти; результат — короткий звіт.
- [ ] **Step 2:** Виправити знахідки (дрібне — одним прогоном Sonnet).
- [ ] **Step 3:** `/simplify` (1 агент) по diff гілки; потім оновити `docs/architecture/ai.md` (розділ про індекс сценарію: граф як споживач) і `docs/STATUS.md`; перенесення спеки/плану в `docs/archive/superpowers/` робить merge-коміт.
- [ ] **Step 4:** Перед мерджем один раз: перевірити `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` (інші сесії; чекати), тоді повний `pnpm lint`, `pnpm test:run`, `pnpm exec tsc --noEmit`; фінальне Opus-рев'ю гілки; merge у `main` лише з дозволу користувача (у тимчасовому worktree, якщо основну папку переключила інша сесія), не пушити без слова.

---

## Self-Review

- Покриття спеки: бібліотека/кап/листки/хронологія (T1–T2); хук і стан (T3); вигляд, фільтри, пошук, інспектор, пусті стани, `missing`, секретні ребра (T4); сторінка, гард, динамічний імпорт, навігація, i18n, whats-new, хінт, help (T4–T5); тести — у кожній задачі; живий прогін, `/simplify`, docs, повний lint/тест — T6.
- Типи: `GraphNode.refId`, `GraphDetail`, `PositionedGraph` визначені в T1–T3 і лише споживаються далі; імена збігаються.
- Лишається уточнити виконавцю (не плейсхолдер, а звірка з кодом): формат `href` у `WHATS_NEW`, точні Tailwind-токени кольорів у `GRAPH_TYPE_STYLE`.
