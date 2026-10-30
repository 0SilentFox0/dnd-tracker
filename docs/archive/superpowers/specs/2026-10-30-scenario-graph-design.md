# Граф сценарію: DM-розділ «Граф» (етап 4 епіку)

Епік: [заготовка](2026-10-30-scenario-graph-epic.md). Індекс: [3a](2026-10-30-scenario-index-design.md) (форма `ScenarioIndex`). Тут лише візуалізація; 3b, 3c, 5 поза обсягом.

## Мета й межі

DM-only сторінка `/campaigns/[id]/dm/graph`: граф «сцена ↔ сутність» з готового `ScenarioIndex`. ДМ бачить, де хто з'являється, які сутності зв'язують сцени, і які посилання «зламані» (`missing`). Нових даних і API немає: лише `useScenarioIndex` (staleTime 60 с, без полінгу).

Не робимо: редагування зв'язків із графа, експорт, конспекти, digest, показ графа гравцям, збереження розкладки.

## Reuse (знайдено пошуком)

- Дані: `useScenarioIndex`, `scenarioKeys.index`, `getScenarioIndex`, типи `ScenarioIndex`/`IndexEntityNode`/`IndexSceneNode`/`IndexEdge`.
- Посилання: `mentionHref(campaignId, type, id)` для сутностей; сцена → `/campaigns/{id}/dm/scenario/{pageId}`.
- Каркас сторінки: `requireCampaignDM`, `HudPage`/`HudPageHeader`, `QueryState`/`EmptyState`, `OnboardingHint`, `next/dynamic` (як у `dm/scenario/[pageId]/page-client.tsx`), `useMediaQuery`/`DESKTOP_QUERY`.
- Навігація: `DM_DASHBOARD_SECTIONS`, `DM_SECTIONS`, `SEGMENT_KEYS` у `Breadcrumbs.tsx`.
- Онбординг: `HINTS`, `WHATS_NEW`, `lib/onboarding/help/dm.ts`.
- Константи: `MENTION_TYPES`, `PAGE_STATUSES`.
- Нове, бо немає аналога: розкладка графа і SVG-вигляд (у репо жодної graph-бібліотеки).

## Рішення

- **Бібліотека: `d3-force` (лише цей пакет) + власний SVG і pan/zoom.** Не React Flow: граф згадок не DAG, React Flow не має force-розкладки (потрібен dagre/elk), сотні DOM-вузлів повільні, бандл важчий. `d3-force` ~15 КБ, чиста функція з фіксованим seed тестується в `lib/utils`. Canvas не потрібен: SVG тримає ~500 вузлів, далі діє кап.
- **Продуктивність.** Усі сцени + топ-`N` сутностей за `degree` (`GRAPH_ENTITY_CAP = 150`); решта через перемикач «показати всі» (попередження вище 400 вузлів). Сутності з `degree = 1` без пошуку/фільтра не малюються окремо, а згортаються в лічильник на сцені (`+3`); перемикач «показати листки» розгортає. Розкладка: один раз у `useMemo` за моделлю, синхронно, фіксовано 300 тіків (без rAF-анімації, `simulation.stop()`), seed детермінований (стабільні позиції між візитами).
- **Сторінки.** `index.scenes` містить сторінки всіх видів (`pageKind`: scene/hero/note). Малюємо всі: `scene` — прямокутник з номером, `hero`/`note` — менший прямокутник з іншою рамкою, фільтр «види сторінок» не потрібен (YAGNI).
- **Хронологія.** Сторінки `pageKind = scene` мають слабку силу по X за `order` (`forceX`), тож лежать приблизно зліва направо; hero/note вільні; сутності притягуються до своїх сцен.
- **Без SSR.** `ScenarioGraphView` підвантажується через `dynamic(..., { ssr: false })` зі скелетоном.
- **Завантаження.** Клієнтський `useScenarioIndex`, без префетчу на сервері: першу збірку індексу не тягнемо в рендер сторінки. Гард `requireCampaignDM` у `page.tsx`.

## Модель і розкладка — `lib/utils/scenario/graph/`

```ts
type GraphNode = { id: string; kind: "scene" | "entity"; pageKind?: ScenarioPageKind; type?: MentionType; label: string; degree: number; missing: boolean; status?: ScenarioPageStatus; order?: number; hidden: number /* згорнуті листки */ };
type GraphEdge = { id: string /* `${sceneId}>${type}:${entityId}` */; source: string; target: string; count: number; secret: boolean };
type GraphFilters = { types: ReadonlySet<MentionType>; showAll: boolean; showLeaves: boolean; onlyMissing: boolean };
type GraphModel = { nodes: GraphNode[]; edges: GraphEdge[]; truncated: number };
type PositionedGraph = { nodes: (GraphNode & { x: number; y: number })[]; edges: GraphEdge[]; bounds: { w: number; h: number } };
```

- `buildGraphModel(index: ScenarioIndex, filters: GraphFilters): GraphModel`: id вузла `scene:{id}` / `{type}:{id}`; фільтр типів, кап за `degree`, згортання листків (`hidden`), `onlyMissing` лишає missing-сутності та їхні сцени; пошук не входить у фільтри: збіги дає окрема `searchMatches` (нижче). Ребро лише між видимими вузлами.
- `layoutGraph(model: GraphModel, seed?: number): PositionedGraph`: `d3-force` (link, many-body, center, collide, forceX за `order`), детерміновано.
- `neighbors(model, nodeId): { nodes: Set<string>; edges: Set<string> }` для підсвітки.
- `searchMatches(model, query): string[]` (`compareUk`-нечутливий, за `label`) для фокусу.

## Хук — `lib/hooks/scenario/useScenarioGraph.ts`

`useScenarioGraph(campaignId)` → `{ state: { isLoading, isError, isEmpty, graph, filters, selectedId, matches, truncated, counts }, set: { filters, selected, focusNext }, selection: { nodes, edges, detail } }`. Тримає фільтри/пошук/виділення, викликає `buildGraphModel` → `layoutGraph` у `useMemo`, `detail` = список зв'язків виділеного вузла для інспектора. Експорт з barrel `lib/hooks/scenario`. Гроуповані об'єкти на виході, як у решті репо.

## UI — `components/scenario/graph/`

- `ScenarioGraphView`: SVG, pan/zoom (pointer events + wheel, `viewBox`; touch pinch), кнопки «вписати» і «зум ±», клавіатура (Tab між вузлами, Enter виділяє, Esc знімає).
- `GraphNode`: сцена = прямокутник з номером, колір за статусом; сутність = кружок + іконка й колір за типом (палітра в константі типів); `missing` = пунктирна рамка, приглушений колір, позначка «зламано»; `hidden > 0` = бейдж `+N`.
- `GraphEdge`: товщина за `count`; `secret` = пунктир + іконка замка (лише ДМ-сторінка).
- `GraphToolbar`: чекбокси типів (з лічильниками з `counts.byType`), `missing`, «показати всі/листки», пошук (Enter → наступний збіг, вигляд центрується).
- `GraphInspector`: панель справа (на мобільному bottom sheet через `ResponsiveDialog`): назва, тип, зв'язки (посилання на сцени/сутності), кнопка «Відкрити» → `mentionHref`/сторінка сцени. Клік по вузлу виділяє й підсвічує сусідів, решта тьмяніє; подвійний клік = «Відкрити».
- Пусті стани: немає сторінок (`EmptyState` з посиланням на сценарій), немає чіпів (підказка вставляти згадки), усе відфільтровано.
- `app/campaigns/[id]/dm/graph/{page,page-client}.tsx`: server page (гард) → client із `HudPage`, `OnboardingHint id="dm.graph"`, `QueryState`.

## Навігація, i18n, онбординг

- Іконка `Network` (lucide). `DM_DASHBOARD_SECTIONS` += `{ key: "graph", href: dm("graph"), icon: Network, group: "game" }` (після `scenario`); `DM_SECTIONS` += `{ path: "graph", icon: Network, templateVisible: false, tile: "all" }` (як `scenario`); `SEGMENT_KEYS` += `graph`. Заголовок і опис плитки: `dashboard.sections.graph` у `messages/{uk,en}/dashboard.json` за зразком `scenario`; хлібна крихта — відповідний ключ у `Breadcrumbs`-повідомленнях.
- Тексти: нове простір імен `scenarioGraph` у `messages/{uk,en}/scenarioGraph.json` (підпис навігації/плитки — в існуючих ключах дашборду); без кирилиці в коді. Підписи типів сутностей беремо з наявних `scenario.mentionTypes`, не дублюємо.
- `lib/onboarding/whats-new.ts`: `2026-10-30-scenario-graph` (audience `dm`, `href` на сторінку/help) + `whatsNew.<id>` в обох `whatsNew.json`; хінт `dm.graph` (`helpSlug: "dm-scenario-show"`); новий розділ у статті `dm-scenario-show`: запис у `lib/onboarding/help/dm.ts` (`sections` += `{ blocks: [{ kind: "p" }, { kind: "list", count: 3 }] }`) і відповідні ключі в `messages/{uk,en}/help.json` (тести help звіряють структуру з текстами).

## Тести

- Pure (`lib/utils/scenario/graph/__tests__`): `buildGraphModel` (кап за `degree`, згортання листків і `hidden`, фільтр типів, `onlyMissing`, ребро лише між видимими, `truncated`); `layoutGraph` (детермінованість за seed, усі вузли мають скінченні координати, сцени впорядковані по X за `order`); `neighbors`; `searchMatches` (регістр, кирилиця).
- Хук (`happy-dom`): фільтри змінюють модель, виділення дає `detail`, `isEmpty`.
- Компоненти (`happy-dom`, d3 не мокаємо: розкладка pure): рендер вузлів і ребер, клік виділяє й тьмянить решту, `missing` має свій клас/позначку, секретне ребро з маркером, бейдж `+N`.
- Сторінка: не-DM → гард (як у сусідніх `dm/*` тестах); route/coverage-реєстр, якщо вимагається `coverage.ts`.
- i18n-тести ключів (uk/en паритет) і whats-new — існуючі.
- Живий прогін: Sonnet-субагент у браузері на великому графі (імпортований сценарій, 10 сторінок на prod-копії) — JS/текстові перевірки замість скріншотів, зменшені скріншоти.

## Ризики

- Вигляд для сотень вузлів: кап, листки й фільтри; поріг 150/400 уточнюємо на живому прогоні.
- Dev/lock: новий пакет `d3-force` (+ `@types/d3-force`) змінює `pnpm-lock.yaml`; `--frozen-lockfile` на Vercel вимагає закомічений lock.
- Читабельність підписів при щільності: підписи показуємо для виділених, сцен і вузлів зі `degree ≥ 3`, решта на hover (`<title>`).
