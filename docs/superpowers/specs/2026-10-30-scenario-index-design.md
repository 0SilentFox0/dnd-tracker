# Індекс сценарію (етап 3a епіку «граф сценарію»)

Епік: [заготовка](2026-10-30-scenario-graph-epic.md). Тут лише 3a: детермінований індекс без LLM. 3b, 3c, 4, 5 поза обсягом, але форма відповіді придатна для digest у промпті (3c) і для графа (4).

## Мета й межі

ДМ-only похідний індекс: ребра «сцена → сутність» (`character|acquaintance|battle|marker|unit|artifact|spell`), порядок сцен, учасники сцени, пов'язані бої. Рахується з контенту, нічого не вводиться вручну. Гравцям маршруту немає; `||секрети||` лишаються в індексі з прапором `secret` (лише ДМ).

Не робимо: конспекти, digest-білдер/обрізання під бюджет (3c, через `fitContext`; 3a віддає `degree` і стабільний порядок), UI графа, експорт, запис індексу з будь-яких сценарних шляхів.

## Рішення

- **Кеш = таблиця** `scenario_page_index`, ліниво самолікується: ключ `(pageId, version)`. Записів зі шляхів збереження/apply/restore/patch/імпорту немає, тож розсинхрону через забутий шлях не буде.
- Перерахунок у JS через `readContent` + чиста `extractPageFacts` (не SQL): тестується одним pure-тестом; egress лише для застарілих сторінок, пачками по 20. Перша збірка кампанії читає контент один раз.
- Рівень facts — розділ, не рядок.
- Міграція expand-only, `ENABLE ROW LEVEL SECURITY`; FK `pageId → scenario_pages` з `ON DELETE CASCADE`.

## Дані

```prisma
model ScenarioPageIndex {
  pageId     String   @id
  campaignId String
  version    Int
  facts      Json
  updatedAt  DateTime @default(now())
  page       ScenarioPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  @@index([campaignId])
  @@map("scenario_page_index")
}
```

Типи (`types/scenario.ts`):

```ts
type IndexRef = { type: MentionType; id: string; label: string; count: number; secret: boolean };
type PageFacts = { sections: { id: string; title: string; played: boolean; refs: IndexRef[] }[] };
type IndexEntityNode = { kind: "entity"; type: MentionType; id: string; label: string; degree: number; sceneIds: string[]; missing: boolean };
type IndexSceneNode = { kind: "scene"; id: string; title: string; pageKind: ScenarioPageKind; status: ScenarioPageStatus; order: number; sections: { id: string; title: string; played: boolean }[] };
type IndexEdge = { sceneId: string; entityType: MentionType; entityId: string; count: number; sectionIds: string[]; secret: boolean };
type ScenarioIndex = { scenes: IndexSceneNode[]; entities: IndexEntityNode[]; edges: IndexEdge[]; counts: { scenes: number; entities: number; edges: number; byType: Partial<Record<MentionType, number>>; missing: number } };
```

`secret = true` лише якщо всі входження в розділі секретні (марка `secret` на вузлі чи предку). `battleId`/`marker` рядка й `marker` розділу → refs типів `battle`/`marker` (label порожній, підставляє резолв; `marker` id = `markerId`).

## Чисті функції — `lib/utils/scenario/index/`

- `extractPageFacts(content: ScenarioContent): PageFacts` — обхід `story`/`notes` усіх рядків; чіпи агрегуються по `(type,id)` у межах розділу; `count` = кількість входжень (+ рядкові `battleId`/`marker`).
- `buildScenarioIndex({ pages, facts, resolved }): ScenarioIndex` — `pages`: `ScenarioPageSummary[]`, `facts: Map<pageId, PageFacts>`, `resolved: Map<"type:id", { label: string } >` (відсутній ключ → `missing: true`, label з чіпа). Порядок: сцени за `sortOrder` (потім title), сутності за `degree desc` → `label` → `id`, ребра за порядком сцен. `degree` = кількість різних сцен.
- Зрізи «учасники сцени» / «бої сцени» — похідні від `edges` за `entityType` (окремих структур немає).

## Сервер — `lib/server/scenario/index-store.ts`

`loadScenarioIndex(campaignId): Promise<ScenarioIndex>`:
1. Summaries (`listPages`) + рядки `scenario_page_index` кампанії (`pageId, version, facts`).
2. Застарілі/відсутні (`version` різна) → пачками по 20 читає `content`, `extractPageFacts(readContent(json))`, upsert з `WHERE version < new` (конкурентні збірки ідемпотентні).
3. Резолв референсованих id одним `findMany` на тип (`id,name`; герої через `ACTIVE_CHARACTER`; marker — `map: { campaignId }`; battle = `battleScene`).
4. `buildScenarioIndex`.

## API й клієнт

`GET /api/campaigns/[id]/scenario/index` (`route.ts` + `index-handler.ts`, `requireDM`, `handleApiError`) → `lib/api/scenario.ts::getScenarioIndex` (`cache: "no-store"`) → `scenarioKeys.index(campaignId)` → `useScenarioIndex` у `lib/hooks/scenario` (`staleTime` 60 с; експорт з barrel).

## Reuse

`readContent`, `listPages`/`SUMMARY_SELECT` (`page-store.ts`), `requireDM`, `handleApiError`, `campaignGet`, `MENTION_TYPES`, `ACTIVE_CHARACTER`, `scenarioKeys`, тип `ScenarioContent`. `mentionHref` — для етапу 4 (не 3a). `searchText` не підходить (чіпів у ньому немає, лише label). Нового хука/утиліти-дубля немає.

## Тести

- Pure (`lib/utils/scenario/index/__tests__`): чіп у `story` і `notes`; вкладений (список/таблиця/callout); марка `secret` (повністю / частково → `secret=false`); `battleId` і `marker` рядка й розділу; дубль чіпа → `count`; порожній контент; сторінка без чіпів; `build`: `degree`, порядок, `missing`, `byType`, стабільність при перестановці вхідних.
- Integration (`vitest.integration.config.mts`, `lib/server/scenario/__tests__`): порожня кампанія; сторінка без чіпів; чіп на видалену сутність (`missing`); зміна `version` → перерахунок, без зміни → без читання `content`; видалення сторінки каскадом чистить індекс; чужа кампанія не потрапляє.
- Route: DM-guard (не-DM → 403).

## Ризики

Перша збірка великої кампанії читає весь контент (до ~10 МБ, один раз). Відомі межі `extractPageFacts`: лише чіпи й `battleId`/`marker`; згадки без чіпа (звичайний текст) в індекс не потрапляють (їх ловить `find_scenario_mentions`).
