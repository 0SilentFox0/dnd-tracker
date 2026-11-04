# Граф сценарію, шар 1: зв'язки між сутностями

Конспект сторінки (`scenario_page_summaries.summary`, jsonb) отримує необов'язкове `relations`; граф малює з них ребра сутність–сутність. Міграцій немає.

## Знахідка щодо отримання даних
Граф бере дані лише з `useScenarioIndex` (`/scenario/index`); `useScenarioSummaries` (`/scenario/summaries`: повні конспекти з overview/events/secrets, `no-store`) граф не викликає. Тягнути його в граф даремно: егрес і секрети в payload графа. Тому relations віддає сервер у складі індексу (маленький масив), клієнт нічого нового не запитує.

## Reuse
`entityKey` (`lib/utils/scenario/index/build.ts`), `SUMMARY_LIMITS`/`clampSummary`/`filterSummaryEntities`, патерн читання в `summary-store.ts`, `GraphEdgeLine` і `GraphInspector` (розширюємо), `scenarioKeys.index`. Нове: схема relation, `loadSummaryRelations`, масив `relations` у моделі.

## Зміни
1. `lib/schemas/scenario-summary.ts`: `SUMMARY_LIMITS.relations = 12`, relation = `{ a, b, label ≤120 }`. `pageSummarySchema.relations` — `.optional()` (старі конспекти валідні); `lenientSummarySchema.relations` — обов'язковий масив (для генерації). `clampSummary`: slice 12, clip label, відкинути `a === b`. `filterSummaryEntities`: лишити relations, де `a` і `b` в `allowed`; дедуп за невпорядкованою парою + label.
   `summary-handler.ts` instruction: relations — зв'язки між двома сутностями зі списку allowed (лише ключі, не вигадувати), label — короткий опис, без секретів.
2. Індекс: `ScenarioIndex.relations: IndexRelation[]` (`{ sceneId, a, b, label }`, `types/scenario.ts`). `index-store.ts`: `loadSummaryRelations(campaignId)` читає summary, safeParse лише `relations` (невалідне/відсутнє → нічого), лишає сторінки, що є в `present`. `buildScenarioIndex` приймає `relations` (дефолт `[]`). `useGenerateScenarioSummary.onSuccess` додатково інвалідує `scenarioKeys.index`.
3. `buildGraphModel`: окремий масив `GraphModel.relations: GraphEdge[]` (як `sequence`): id `rel:<a>~<b>` (пара відсортована), `label` = унікальні підписи пари з усіх сцен через `; `, лише коли обидва кінці в `keptIds`. Не додаються в `edges`, `degree`, `neighbors`, layout. `GraphEdge.label?: string`. `egoModel` фільтрує `relations` як `sequence`.
4. UI: `GraphEdgeLine` проп `relation` — тонка лінія, ширша прозора зона наведення з `<title>{label}</title>`, підсвічена коли вибраний вузол — її кінець. `GraphDetail.relations: { node, label }[]`; `GraphInspector` — секція зв'язків (клік вибирає вузол). Ключі i18n в `messages/{uk,en}/scenarioGraph.json`.

## Тести
Схема (старий конспект без relations, clamp, filter); `buildGraphModel` (злиття пар між сценами, відсутні кінці, degree/edges не змінені, ego); `loadSummaryRelations`/`buildScenarioIndex`; `GraphEdgeLine` (title з label); `GraphInspector` (список зв'язків).

## Поза обсягом
Шар 2 (запасні ребра співпадіння). Допис relations у 4 конспекти на проді — окремим кроком після деплою, запис підтверджує користувач.
