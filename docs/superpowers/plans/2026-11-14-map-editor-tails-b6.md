# Редактор мап — хвости 0/0b і B6 (двері): план

Гілка `feat/map-editor-w` (worktree `../dnd-tracker-map-editor-w`, включає main 6e41db35c). Епік — [план](2026-11-13-map-editor.md) (B6), етап 0 — [план](2026-11-14-map-editor-stage-0.md), архітектура — [map-modes.md](../../architecture/map-modes.md#зберігання-карти-етап-0), [battle.md](../../architecture/battle.md#карта-бою-ефективна-карта-стан-rollback-етап-0). Міграція етапу 0 ще не на prod — формат знімків і `battle_map_state` можна міняти без зворотної сумісності з prod-даними.

Виконання: 4 пакети, кожен — один Sonnet-виконавець, **послідовно** в одному worktree (P1 → P2 → P3 → P4; спільні файли: `useBattleMapScene`, `effective-map.ts`, `map-update`, `useBattleMapEditor`). Тести пишуться з кодом, під час роботи — `pnpm test:related <файли>` і `pnpm exec eslint --fix <файли>`; повний прогін, `tsc`, sweep, живий прогін — один раз наприкінці (гейти внизу).

## Reuse-перевірка (що беремо, чого нема)

- **Ребра/блок:** `grid/walls.ts` (`edgeKey`, `parseEdgeKey`, `wallSet`), `grid/edges.ts` (`wallsOf` — єдина точка, з якої `sight`/`adjacency`/`path`/`template`/`lineOfFire` беруть «чи є стіни» і блок-набір). Двері вбудовуються сюди, сигнатури споживачів не міняються.
- **Шари карти:** `map-storage/effective-map.ts` (`composeEffectiveMap`, `diffMapState`, `applyMapStateDelta` — **двері в дельті вже підтримані**, `pruneRemoved`), `persisted-map.ts` (`withoutEdges`, `clientMapOf`), `snapshot-state.ts` (`buildSnapshotState`, `isEmptyMapState`), `store/history.ts` (`loadSnapshotsFrom` вже вантажить усі знімки від seq).
- **Мутації:** шаблон `mutations/map-edge-remove`, `map-update` (`pruneOutOfBounds`, `runtimeFields`, перевірка колізій `cellsOf`+`isPlayable`), `dmEvent`/`textRef` (`store/event-mapping.ts`), `assertCanAct` (`utils/battle/turn`), реєстр `lib/server/battles/operations.ts`, `battleOps` (`lib/api/battle-ops.ts`), `REJECT` (`store/reject.ts`), `BATTLE_RATE_LIMITS` (`lib/utils/api/rate-limit.ts`).
- **UI:** `useMapTerrainTool` (ланцюг `edgeChain` + `MAP_EDGES_PER_OP`), `EdgeEditor`/`edge-geometry.ts`/`WallsLayer`/`MapLayers`, `MapTerrainToolbar`, `useBattleMapEditor` (фон, `applyCalibration`, hazard-пензель, ребра — **вже вміє все для P3**), `BattleFormMap` (UI фону/калібрування/hazard), `GridCalibration`, `ResponsiveDialog` (зум уже є в калібруванні), `ToolButtons`, `BattleMapLibraryPicker`/`useBattleLibraryMap`, `OnboardingHint`, `useCoarsePointer`.
- **Бібліотека:** `library-service.ts` (`saveMap` уже викликає `resolveMapBackgroundForPersistence` — заливка data-URL у bucket є, її блокує лише Zod), `getMap(mapId, version?)` (pinned-версії зберігаються, доки на них посилається бій).
- **Нове, бо аналогів нема:** `mergeLibraryHeader` (тристороннє злиття шапки), `closedDoorsOf`, `DoorsLayer`, мутація `map-door-toggle`, пензлі `edge-break`/`edge-restore`/`edge-door`.

---

## P1 — `map-edge-remove` у UI бою + лог у `battle_events` + знімки без повного `mapState`

### Рішення
1. **Інструменти в linked-бою.** Малювання стін/ґрат у linked-бою **не** вмикаємо назад (база — бібліотека, правка через «Карти» + «Оновити карту», `REJECT.mapEdgesLinked` лишається). Додаємо два станові пензлі — `edge-break` («Зруйнувати», ребро зникає, відкочується) і `edge-restore` («Відновити») — **в обох типах боїв** (inline теж: стан застосовний, і так DM має оборотне руйнування замість назавжди `edge-erase`). У linked тулбар показує лише `edge-break`/`edge-restore` + пояснення `edgesLinked`. Touch і активний режим (maze) — як зараз (сховано / `edgesDisabledMode`).
2. **Джерело для пензлів** — окреме від `EdgeSource` (`map-walls`): `StateEdgeSource { present: ReadonlySet<string> /* walls∪bars ефективної карти */; removed: ReadonlySet<string>; mutate(data: MapEdgeRemoveData) }`. `edge-break`: `existing = present`, `erase: true`, commit → `{ edges: remove }`; `edge-restore`: `existing = removed`, `erase: true`, commit → `{ edges, restore: true }`. Пачки по `MAP_EDGES_PER_OP` через той самий `edgeChain` (одна версія бою).
3. **Привид видалених ребер.** У режимі `edge-restore` `WallsLayer` малює `removed` пунктиром (`ghost?: ReadonlySet<string>`), інакше їх не видно й нема куди клікнути.
4. **Лог.** `map-edge-remove` повертає `events: [dmEvent(round, textRef('battleLog.dm.edgesRemoved' | 'battleLog.dm.edgesRestored', { count }))]`. Наявний механізм `saveBattle` (знімок пишеться лише коли є подія) дає знімок «до» цієї події → rollback цієї події відновлює `mapState`. Хвіст STATUS (7) закривається.
5. **Борг «повний `mapState` у кожному знімку» — робимо тут** (дешево, ~40 рядків + тести). Інваріант: `mapState` змінюють лише мутації, що пишуть подію (`map-edge-remove` з п.4, `map-door-toggle` з P4, `map-update` — додати `dmEvent('battleLog.dm.mapUpdated', { version })`), а також rollback/reset (історію скасовують/чистять). Тоді:
   - `buildSnapshotState` пише `scene.mapState` (+ прапорець `mapStateChanged: true`) **лише** якщо мутація змінила стан (`patch.mapState !== undefined`), інакше нічого. Порожній стан «до» пишеться явно як `{ removedEdges: [], doors: {} }`, щоб відрізнити від «не змінювався».
   - `rollback`: серед `snapshots` (усі від seq) бере **перший** з `mapStateChanged` — це стан перед першою зміною після точки відкату; нема такого → стан з тих пір не мінявся, не чіпаємо. `mapVersion` у знімку лишається (потрібен `rollbackAcrossMapUpdate`), пишеться завжди для linked (дрібне число).
   - Без посилань на попередні знімки й без нових запитів: `loadSnapshotsFrom` уже вантажить хвіст. Обрізання до 20 знімків після завершення не ламає логіку (відкат за межу і так `rollbackLimit`).
   - Альтернатива «diff від попереднього знімка» відкинута: потребує читання знімків до seq і ламається при обрізанні.

### Сигнатури
- `lib/hooks/battle/useMapTerrainTool.ts`: `Options.stateEdgeSource?: StateEdgeSource`; `TerrainBrush` += `'edge-break' | 'edge-restore'`; `edges` будує `EdgeEditing` і для них; `MapTerrainTool.ghostEdges: ReadonlySet<string> | null`.
- `lib/hooks/battle/useBattleMapScene.ts`: `stateEdgeSource` з `effectiveMap` + `mapState.removedEdges` + `actions.mapEdgeRemove.mutateAsync`; для inline і linked.
- `components/battle/map/MapTerrainToolbar.tsx`: набір пензлів за `edgesLinked` (linked → `STATE_BRUSHES`, inline → `EDGE_BRUSHES ∪ STATE_BRUSHES`).
- `components/battle/map/WallsLayer.tsx`: `ghost?: ReadonlySet<string>`.
- `lib/utils/battle/store/snapshot-state.ts`: `buildSnapshotState(..., mapLayer: { mapState?, mapRef?, mapStateChanged?: boolean })`; `SnapshotState.scene.mapStateChanged?: true`.
- `lib/server/battles/store/save-battle.ts`: передає `mapStateChanged: patch.mapState !== undefined`.
- `rollback-mutation.ts`: `const changed = snapshots.find((s) => s.state.scene.mapStateChanged)`.

### Тести
- `lib/server/battles/mutations/map-edge-remove/__tests__/` (є або створити): подія `edgesRemoved`/`edgesRestored` з `count`; лог-ключі є в обох `messages/*/battleLog.json`.
- `lib/utils/battle/store/__tests__/snapshot-state.test.ts`: без зміни стану — `mapState` відсутній; зі зміною — є, порожній «до» записаний явно; `mapVersion` для linked.
- `lib/server/battles/mutations/rollback/__tests__/`: (a) remove → attack → rollback attack: стан лишається видаленим; (b) rollback самої події remove: ребро повертається; (c) remove, remove, rollback першої: обидва повернуті; (d) жодної зміни після seq: `mapState` не в результаті; (e) через `map-update` — як і раніше відхилено.
- `lib/hooks/battle/__tests__/useMapTerrainTool-edges.test.tsx`: `edge-break` шле `mapEdgeRemove {edges}`, `edge-restore` — `{edges, restore: true}`, пачки > `MAP_EDGES_PER_OP` ланцюжком; без `stateEdgeSource` пензлі неактивні.
- `components/battle/map/__tests__/MapTerrainToolbar*.test.tsx` (happy-dom): linked → лише станові пензлі + пояснення; touch → жодних ребрових.
- `map-update` мутація: тепер одна подія `mapUpdated`.

### Файли
`lib/server/battles/mutations/map-edge-remove/map-edge-remove-mutation.ts`, `.../map-update/map-update-mutation.ts`, `.../rollback/rollback-mutation.ts`, `lib/utils/battle/store/snapshot-state.ts`, `lib/server/battles/store/save-battle.ts`, `lib/hooks/battle/{useMapTerrainTool,useBattleMapScene}.ts`, `components/battle/map/{MapTerrainToolbar,WallsLayer,MapLayers,BattleMapPanel}.tsx`, `messages/{uk,en}/{battle,battleLog,battleSetup}.json`, тести поряд у `__tests__/`.

### Живий прогін
Linked-бій DM: зруйнувати 3 ребра штрихом → гравець у другій вкладці бачить прохід (дельта), лог «ДМ зруйнував 3 ребра»; рух крізь пролом; «Відновити» на привиді; rollback події руйнування → ребра повернулись в обох вкладках. Inline-бій: `edge-break` і старий `edge-erase` поруч. Touch 375: ребрових пензлів нема, пояснення є.

### Ризики
- Лог-рядок на кожну пачку (≤ `MAP_EDGES_PER_OP`) — довгий штрих = кілька рядків. Прийнятно; за потреби — злиття в UI-клієнті пізніше.
- Подія від DM вимагає `round` — у `prepared` бою `map-edge-remove` недоступний (палітра лише в активному); перевірити `requireStatus` у реєстрі.
- Старі локальні знімки етапу 0 без `mapStateChanged` → rollback перестане відновлювати з них стан. Лише локальні/prodcopy дані; задокументувати.

---

## P2 — Вибір бібліотечної карти при редагуванні бою

### Рішення
1. **Лише `prepared`.** Прив'язка/перепривʼязка/відв'язка карти через `PATCH` дозволена тільки для `status = prepared` (після `reset` учасників на карті нема — `reset` дає `participants: []` і стирає `mapState`; тож колізій розставлених учасників тут не буває). Для активного бою — 409 `BATTLE_MAP_RELINK_STARTED` («скиньте бій або натисніть Оновити карту»). Це знімає питання про зони/жетони в бою: у активному бою змінити карту можна лише `map-update` (та сама карта, новіша версія, з перевіркою колізій).
2. **`patchBattleSchema` += `mapId: string | null`** (xor з `map`, як у create; `null` = відв'язати):
   - **інша карта** → шапка з бібліотеки (поточна версія), `map_id/map_version`, рядок `battle_map_state` видаляється; з попередньої карти переносимо лише налаштування бою `weather`/`motion`; `terrain`, `spellZones`, конфіги режимів **скидаються** (інша геометрія). UI-confirm про це.
   - **та сама карта, новіша версія** → перепін на поточну версію через `mergeLibraryHeader` (рішення 4) — та сама семантика, що `map-update`.
   - **`null` (на власну карту)** → ребра pinned-версії матеріалізуються в inline `walls/bars` (≤ `inlineMaxEdges`, інакше 422 `BATTLE_MAP_TOO_MANY_EDGES`), `map_id/map_version = null`, стан видаляється. Сьогодні цього шляху нема (linked + `map` лише зберігає шапку).
   - Ліміти як у create: чужа кампанія → 404, бік > `battleMaxSide` → 422.
3. **Спільна логіка з create** — `linkedMapFor` (є) + новий чистий `relinkScene(current, library, previousLibrary?)` поряд із `map-update`, щоб PATCH і `map-update` не розходились.
4. **`mergeLibraryHeader(oldLib, newLib, battle): BattleMapConfig`** (`lib/utils/battle/map-storage/merge-header.ts`) — тристороннє злиття для «тієї ж карти, новішої версії» (і `map-update`, і PATCH-перепін). Для кожного поля шапки та **кожної клітинки `terrain`** (і, після P4, кожних `doors`): якщо `newLib[k]` == `oldLib[k]` → лишаємо `battle[k]` (правка DM у бою/формі не губиться), інакше беремо `newLib[k]`; клітинки з `zoneId`/`untilRound` (рантайм-зони) завжди лишаються бойові; `RUNTIME_KEYS` (`spellZones`, `weather`, `motion`) і `MODE_MAP_KEYS` — завжди бойові. `oldLib` = `getMap(mapId, mapRef.version)` (pinned-версії не прунуться, поки на них посилається бій). Потім `pruneOutOfBounds` і перевірка колізій як зараз. Замінює `{ ...library.map, ...runtimeFields(map) }` у `map-update` (який зараз ігнорує зміни місцевості/фону бібліотеки — це стає видимим після P3).
5. **Клієнт.** `useBattleLibraryMap(campaignId, linked, isEdit, status)`: у редагуванні пікер видимий, коли `enabled || linked` і `status === prepared`; для активного — лише назва карти + підказка «Оновити карту в бою». Варіант «Власна карта» → `mapId: null`. Вибір іншої карти → confirm, потім форма перебудовує `useBattleMapEditor` з шапки бібліотеки (прев'ю). `useBattleSetup.submit` шле рівно одне з `mapId`/`map` (або нічого, якщо карта не мінялась).

### Сигнатури
- `lib/server/battles/record-service.ts`: `patchBattleSchema.mapId: z.string().min(1).nullable().optional()` + refine xor; гілка `patch` → `relinkFor(tx, row, mapId)` під `lockMapRow(tx, mapId, 'share')`.
- `lib/utils/battle/map-storage/merge-header.ts`: `mergeLibraryHeader(oldLib: BattleMapConfig, newLib: BattleMapConfig, battle: BattleMapConfig): BattleMapConfig`.
- `lib/server/battles/mutations/map-update/map-update-mutation.ts`: використовує `mergeLibraryHeader` (+ `getMap(mapId, mapRef.version)`).
- `lib/hooks/battles/setup/{useBattleLibraryMap,useBattleSetup}.ts`, `components/battle/setup/{BattleMapLibraryPicker,BattleSetupForm}.tsx`.

### Тести
- `lib/utils/battle/map-storage/__tests__/merge-header.test.ts`: клітинка змінена лише в бою → лишається; змінена в бібліотеці → нова; змінена в обох → бібліотека; зона заклинання лишається завжди; фон змінений у бою `map-background` і не змінений у бібліотеці → бойовий; `weather/motion/maze` бойові.
- `lib/server/battles/__tests__/record-service*.test.ts`: PATCH active + `mapId` → 409; prepared + інша карта → нова шапка, `map_version`, стан видалено, terrain скинуто, weather збережено; `null` → inline ребра матеріалізовані; > `inlineMaxEdges` → 422; `map`+`mapId` → 400; чужа кампанія → 404.
- `map-update` тести: зміна terrain у бібліотеці доходить у бій; DM-правка в бою не перетирається.
- `lib/hooks/battles/setup/__tests__/useBattleLibraryMap.test.tsx`: видимість у edit (prepared/active, flag on/off, linked).

### Файли
`lib/server/battles/record-service.ts`, `lib/schemas/battles.ts` (якщо refine там), `lib/utils/battle/map-storage/merge-header.ts`, `lib/server/battles/mutations/map-update/map-update-mutation.ts`, `lib/constants/api-errors.ts`, `lib/hooks/battles/setup/*`, `components/battle/setup/{BattleMapLibraryPicker,BattleSetupForm}.tsx`, `messages/{uk,en}/{battleSetup,apiErrors}.json` (фактичні неймспейси перевірити), тести.

### Живий прогін
Prepared-бій inline → вибрати бібліотечну карту → зберегти → старт, ребра з бібліотеки. Prepared linked → інша карта (confirm) → погода збережена, місцевість нова. Linked → «Власна карта» → стіни лишились, у бібліотеці правка більше не впливає. Активний бій → пікер неактивний з поясненням. Бібліотека: змінити місцевість → «Оновити карту» в бою → DM-правка в бою не зникла.

### Ризики
- `reset` скидає статус, але не `map_version` — перепін «тієї ж карти» у prepared має йти через `mergeLibraryHeader`, а не повне перезаписування (інакше губиться DM-місцевість з форми).
- Матеріалізація ребер > 7200 для великих бібліотечних карт — відмова, не обрізання.
- Конкурентне збереження бібліотеки під час PATCH — `lockMapRow('share')` як у create.

---

## P3 — Редактор бібліотеки: фон, калібрування, hazard

### Рішення
1. **Схема/збереження майже готові.** `headerSchema = battleMapObject − {walls,bars}` уже містить `background`, `backgroundCols/Rows`, `gridOffset`, `opacity`, `blocked`, `terrain`; `saveMap` уже викликає `resolveMapBackgroundForPersistence`. Змінюємо лише: `background` у бібліотечній схемі приймає те саме, що `mapBackgroundSchema` бою (data-URL до ліміту) — сервіс заливає в bucket `battle-maps` і пише URL. Фото-ліміт `photoMaxSide` уже перевіряється.
2. **Обмеження terrain у бібліотеці** (superRefine): лише статичні клітинки — без `zoneId`, `untilRound`, `damage.spellId/casterId/concentrationOf`; hazard дозволено з `dice`/`type`. Інакше 400 `battleSetup.validation.libraryTerrainRuntime`. `spellZones` у шапці — заборонено (`omit`).
3. **Версії/ETag.** Фон/калібрування/terrain — частина шапки → зміна дає нову `map_version` (порівняння payload у `saveMap` уже є: ідентичний payload не бампить). ETag (`weakEtag(id, version)`) змін не потребує. Розмір шапки росте (terrain ≤ 3600 клітинок) — шапка копіюється в `battle_scenes.map` linked-боїв, у дельті їде лише при `map-update`. Прийнятно.
4. **Повторне використання UI з форми бою.** Винести з `BattleFormMap` секції у компоненти без залежності від форми: `MapBackgroundSection` (`ImageUpload` + `GridCalibration` + `RangeRow` розміру клітинки/зсуву/прозорості) і `MapCellToolsSection` (пензлі `wall/barrier/difficult/hazard` + налаштування hazard). `BattleFormMap` і `MapEditorScreen` рендерять їх з тим самим `BattleMapEditor`. Калібрування — як є (`GridCalibration` у `ResponsiveDialog` з зумом).
5. **Розкладка редактора (desktop).** Права панель ~320px зі вкладками «Фон» / «Клітинки» / «Ребра» (`ToolButtons`), карта на решті. `useMapEditorDraft` уже бере `editor.state.map` у `snapshot` — `isDirty` покриває фон/terrain автоматично. Режими (maze/motion) у бібліотеці **не** показуємо (бойові налаштування).
6. **Злиття при `map-update`** — `mergeLibraryHeader` з P2 (без нього нові фон/місцевість бібліотеки не дійшли б у бій).

### Сигнатури
- `lib/schemas/battle-maps.ts`: `headerSchema.background = mapBackgroundSchema` (+ refine: data-URL або URL сховища), `terrain` refine `staticTerrainOnly`.
- `components/battle/setup/{MapBackgroundSection,MapCellToolsSection}.tsx` (нові, винесені з `BattleFormMap`).
- `components/maps/MapEditorScreen.tsx`: бічна панель із секціями.
- `lib/hooks/battle-maps/useMapEditorDraft.ts`: після успішного збереження data-URL замінюється URL з відповіді (`brief` → перечитати `detail`, або відповідь `saveMap` віддає `map.background`), щоб наступний save не заливав файл удруге.

### Тести
- `lib/schemas/__tests__/battle-maps.test.ts`: data-URL ок; рантайм-клітинка → помилка; `spellZones` відхилено; фото > 60 з фоном → помилка (є).
- `lib/server/battle-maps/__tests__/library-service.test.ts`: data-URL → `resolveMapBackgroundForPersistence` викликано, у БД URL; повторний save з тим самим URL не бампить версію.
- `lib/hooks/battle-maps/__tests__/useMapEditorDraft.test.tsx`: зміна фону/terrain робить `isDirty`; після save фон = URL.
- `components/maps/__tests__/MapEditorScreen*.test.tsx` (happy-dom): секції рендеряться; `BattleFormMap` тести не зламані (рефактор).

### Файли
`lib/schemas/battle-maps.ts`, `lib/server/battle-maps/library-service.ts`, `lib/hooks/battle-maps/useMapEditorDraft.ts`, `components/battle/setup/{BattleFormMap,MapBackgroundSection,MapCellToolsSection}.tsx`, `components/maps/MapEditorScreen.tsx`, `messages/{uk,en}/{maps,battleSetup}.json`, тести.

### Живий прогін
Нова карта → завантажити фото (necro_quest1_2) → калібрування в діалозі з зумом → hazard 2d6 fire + стіни → зберегти → перезавантажити сторінку (фон з bucket, калібрування на місці) → створити бій з карти → hazard б'є при вході. Змінити калібрування в бібліотеці → «Оновити карту» в бою → нова сітка. Клон карти з фоном.

### Ризики
- Розмір тіла PUT з data-URL (ліміт Vercel ~4.5 МБ) — той самий, що при створенні бою; перевірити, що клієнт стискає (`ImageUpload`) так само.
- Рефактор `BattleFormMap` — регресія форми бою; секції виносити без зміни поведінки, тести форми мають пройти без правок.
- Фото-карта > 60 після калібрування `backgroundCols` — валідація `photoMaxSide` на `cols/rows`, не на фоні.

---

## P4 — B6: двері

### Рішення
1. **Модель.** `BattleMapConfig.doors?: Record<EdgeKey, DoorState>` — **початковий** стан дверей у базі (inline-карта / шапка бібліотеки, ≤ `MAP_LIMITS.doorsMax` = 500). Бойовий стан — `battle_map_state.doors` (вже є) поверх бази. Чанковий код 3 **не** використовуємо: дверей мало, і потрібні `open/locked` (2 біти не вистачає); лишається зарезервованим. Двері не можуть збігатися з `walls`/`bars` (Zod superRefine, як bars∩walls).
2. **Ефективні двері.** `composeEffectiveMap` зливає `base.doors ⊕ state.doors` у `map.doors` (стабільно за ідентичністю; прибрати ранній вихід, коли є лише двері) і викидає двері, що потрапили в `removedEdges` (виламані = прохід). `persistedMap`/`clientMapOf` пишуть базові `doors`, не ефективні (як ребра).
3. **Блок.** `wallsOf(map)` = власні стіни ∪ `modeWalls` ∪ **`closedDoorsOf(map)`** (двері з `open !== true`; memo `WeakMap` за ідентичністю `map.doors`). Так зачинені двері блокують рух/зір/вогонь/AoE/ближній бій/суміжність через уже наявні шляхи (`path`, `sight`, `adjacency`, `template`, `lineOfFire`), без змін споживачів. Відчинені — нічого не блокують. `passesWalls` проходить і крізь зачинені (як крізь стіну).
4. **Мутація `map-door-toggle`** (`access: MEMBER`, `blockedByMode: true`, `rateLimitScope: 'mapDoor'`, активний бій). Тіло `{ edge, open?: boolean, locked?: boolean, actorId?: string }`.
   - Двері мусять бути в ефективній `map.doors` → інакше `REJECT.doorNotFound`.
   - **DM:** будь-які двері, `open` і/або `locked`; замкнути можна лише зачинені (`locked && open` → `REJECT.doorOpenLock`).
   - **Гравець:** лише `open`, без `locked` (400 Zod-рівня: `locked` від гравця → `REJECT.doorDmOnly`); двері замкнені → `REJECT.doorLocked`; `actorId` — свій учасник, `assertCanAct(ctx, actorId)` (його хід, контроль), і одна з двох клітинок ребра входить у footprint учасника (`cellsOf`) → інакше `REJECT.doorNotAdjacent`. Дії/руху не витрачає (вільна взаємодія з предметом; ліміт «одна на хід» не моделюємо).
   - Результат: `scene.mapState` з оновленими `doors[edge]` (лише різниця від бази; якщо дорівнює базі — ключ прибирається), подія: гравець — подія актора (`battleLog.door.opened/closed`, `{ name }`), DM — `dmEvent` (`opened/closed/locked/unlocked`). Знімок/rollback — механіка P1. Дельта — `scene.mapState.doors` (вже є).
5. **`map-edge-remove` і двері:** двері можна виламати (`present` включає ключі `doors`); `restore` повертає їх у базовий стан.
6. **`map-update`/`mergeLibraryHeader`:** `doors` — поле шапки (покомпонентне злиття з P2); `pruneState` у `map-update` лишає `state.doors` лише для дверей, що існують у новій версії (зараз перевіряє проти walls/bars — виправити).
7. **UI бою.** `DoorsLayer` (у `MapLayers`, над `WallsLayer`): гліф дверей по центру ребра (зачинені — стулка, відчинені — відхилена), кнопка-хітбокс ≥ 30px (правило Map HUD) — працює і на touch, не конфліктує з кліком по клітинці. Гравець: клік → `mapDoorToggle({ edge, open: !open, actorId: активний свій учасник })`; недоступні двері (не поруч / замкнені) — тост із `REJECT`. DM: клік → поповер «Відчинити/Зачинити», «Замкнути/Відімкнути». Замок-іконку бачить лише DM (гравцю — тост при спробі). Гліф не рендериться для виламаних.
8. **Редактор (setup + бібліотека).** Пензель `edge-door` у `useBattleMapEditor`/`paintEdges`: клік по ребру ставить двері (зачинені), повторний — прибирає; модифікатор/перемикач «замкнені» у панелі; `edge-erase` прибирає й двері. Рахується в `MAP_LIMITS.doorsMax`. `useMapEditorDraft.save` шле `doors` у шапці. У бою inline — ставити нові двері **не** даємо (лише перемикання), щоб не розширювати `map-walls`.
9. **i18n/онбординг.** Ключі uk+en: `battle.map.doors.*`, `battleSetup.map.edgeDoor*`, `battleLog.door.*`, `battleLog.reject.door*`, `battleSetup.validation.doorOnWall`/`tooManyDoors`. Whats-new `2026-11-map-doors` (audience `all` — гравці відчиняють) + `whatsNew.2026-11-map-doors` в обох `messages/*/whatsNew.json`; hint `battle.map-doors` (audience `all`, `helpSlug: 'dm-battle'`) у `lib/onboarding/hints.ts`, `OnboardingHint` біля першого `DoorsLayer`-гліфа / пензля `edge-door`; абзац у довідці бою.
10. **Асистент:** `'map-door-toggle'` у `BATTLE_COMMANDS` (`lib/server/assistant/actions/battle-actions.ts`) + запис `planned` у `lib/server/assistant/__tests__/helpers/coverage.ts` (гоча з пам'яті: інакше падає coverage-тест).

### Сигнатури
- `types/battle.ts`: `BattleMapConfig.doors?: Record<string, DoorState>`; `types/api.ts`: `MapDoorToggleData`.
- `lib/schemas/battles.ts`: `battleMapObject.doors` (`z.record(edgeKeySchema, doorStateSchema)`, ≤ `doorsMax`, refine перетин з walls/bars) + `mapDoorToggleSchema`; бібліотечна схема успадковує через `headerSchema`.
- `lib/utils/battle/grid/edges.ts`: `closedDoorsOf(map): readonly string[]`, `wallsOf` з дверима.
- `lib/utils/battle/map-storage/effective-map.ts`: злиття дверей; `persisted-map.ts`: базові `doors`.
- `lib/server/battles/mutations/map-door-toggle/map-door-toggle-mutation.ts`, route `app/api/campaigns/[id]/battles/[battleId]/map-door-toggle/route.ts`, запис у `operations.ts`, `BATTLE_RATE_LIMITS.mapDoor`, `battleOps.mapDoorToggle`, `actions.mapDoorToggle` у `useBattleActions`.
- `components/battle/map/DoorsLayer.tsx`, `lib/hooks/battle/useMapDoors.ts` (стан поповера DM, вибір `actorId`, тости), `useBattleMapEditor`/`grid/map-editor.ts` (`paintEdges` для `edge-door`).

### Тести
- `lib/utils/battle/grid/__tests__/edges-doors.test.ts`: зачинені блокують `move/sight/fire`, відчинені — ні; діагональ через кут із зачиненими; `passesWalls` проходить; memo стабільний (`wallsOf(m) === wallsOf(m)`).
- `map-storage/__tests__/effective-map.test.ts`: `state.doors` перекриває базу; виламані двері зникають; стабільність ідентичності.
- `lib/server/battles/mutations/map-door-toggle/__tests__/`: гравець відчиняє свої незамкнені поруч у свій хід; замкнені → `doorLocked`; не поруч → `doorNotAdjacent`; не його хід → `assertCanAct`; `locked` від гравця → відмова; DM замикає/відмикає; замкнути відчинені → `doorOpenLock`; неіснуючі → `doorNotFound`; подія і `mapState`-патч; повернення до бази прибирає ключ.
- Інтеграційні: `attack-reach`/`lineOfFire` крізь зачинені — `targetBehindWall`, крізь відчинені — ок; `templateCells` зупиняється на зачинених; `isAdjacentOnMap` через зачинені — false (ближній бій і opportunity).
- `client-delta`/`apply-delta`: дельта лише `mapState.doors`.
- `rollback`: toggle → rollback → двері в попередньому стані (через P1).
- `map-update`: `state.doors` для дверей, яких нема в новій версії, прибираються.
- Схеми: двері на стіні → помилка, > 500 → помилка.
- UI (happy-dom): `DoorsLayer` — DM бачить замок, гравець ні; клік гравця шле `{edge, open, actorId}`.
- `lib/onboarding/__tests__` (ключі whats-new/hint в обох локалях), assistant coverage.

### Sweep
`scripts/sim/battle-sweep.ts`: `mapDoorsCheck()` поряд із `mapStateCheck` — inline-бій із зачиненими дверима між двома загонами: шлях обходить/не існує; гравець відчиняє → рух і постріл проходять; DM замикає → гравець отримує `doorLocked`; rollback toggle → двері зачинені; linked-варіант з дверима в шапці бібліотеки.

### Файли
`types/{battle,api}.ts`, `lib/constants/map-limits.ts` (лише якщо треба), `lib/schemas/{battles,battle-maps}.ts`, `lib/utils/battle/grid/{edges,map-editor}.ts`, `lib/utils/battle/map-storage/{effective-map,persisted-map,merge-header}.ts`, `lib/server/battles/mutations/{map-door-toggle/*,map-edge-remove/*,map-update/*}`, `lib/server/battles/operations.ts`, `app/api/campaigns/[id]/battles/[battleId]/map-door-toggle/route.ts`, `lib/utils/api/rate-limit.ts`, `lib/utils/battle/store/reject.ts`, `lib/api/battle-ops.ts`, `lib/hooks/battle/{useBattleActions,useMapDoors,useBattleMapScene}.ts`, `lib/hooks/battles/setup/useBattleMapEditor.ts`, `components/battle/map/{DoorsLayer,MapLayers}.tsx`, `components/battle/setup/{BattleFormMap,MapToolButtons}.tsx`, `components/maps/MapEditorScreen.tsx`, `lib/onboarding/{whats-new,hints}.ts`, `messages/{uk,en}/{battle,battleLog,battleSetup,whatsNew,onboarding,help}.json`, `lib/server/assistant/actions/battle-actions.ts`, `lib/server/assistant/__tests__/helpers/coverage.ts`, `scripts/sim/battle-sweep.ts`, тести.

### Живий прогін
Бібліотека: двері (2 звичайні, 1 замкнені) → бій. Гравець (друга вкладка, mobile 375): не поруч → тост; підійти, відчинити у свій хід → прохід і постріл крізь проріз; замкнені → тост. DM: замкнути/відімкнути з поповера; rollback toggle; виламати двері `edge-break`; «Оновити карту» після видалення дверей у бібліотеці. Шаблон заклинання крізь зачинені/відчинені. Режим maze — двері недоступні (`blockedByMode`).

### Ризики
- `wallsOf` — гаряча точка (memo за ідентичністю): нове поле `doors` мусить мати стабільне посилання з `composeEffectiveMap`, інакше просідання шляхошукача. Тест на `===`.
- `adjacency` з `sight`-блоком: зачинені двері скасовують сусідство — ближній бій через зачинені неможливий (правильно), але opportunity-атаки при зачиненні дверей не тригеряться (свідомо).
- Гравець відчиняє двері поза ходом — заборонено `assertCanAct`; якщо власник захоче «будь-коли» — одна зміна.
- `locked` у сцені видно в мережі всім (лише UI ховає) — прийнятний витік.
- Обсяг пакета найбільший — якщо виконавець не вкладається, розрізати: P4a (модель+блок+мутація+тести+sweep), P4b (UI бою, редактор, i18n/онбординг).

---

## Гейти (наприкінці всіх пакетів)
ps-перевірка (нема інших eslint/vitest) → `tsc --noEmit` → повний `pnpm test:run` → `pnpm battle-sweep` на prodcopy (`mapWallsCheck`, `mapStateCheck`, `mapDoorsCheck`) → живий прогін Sonnet-субагентом (desktop 1280 + mobile 375; сценарії вище) → `/simplify` (1 агент) → одне Opus-рев'ю diff + одна fix-хвиля → `docs/architecture/{map-modes,battle}.md` (двері, `mapStateChanged`, `mergeLibraryHeader`, PATCH `mapId`), `docs/STATUS.md` (закрити хвости 0b (1)–(3), (5), (7) і B6), пам'ять.
