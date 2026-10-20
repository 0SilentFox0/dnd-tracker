# Режими бойової карти як модулі — специфікація

Дата: 2026-10-20. Гілка `fix/open-tails`. Блок «Інтерактив» епіку «Бойова карта».

## Мета
Лабіринт — перший режим бойової карти; нових форматів поки немає, але код має бути готовий до швидкої інтеграції наступного. Кожен режим — окремий модуль, що користується загальною логікою й механіками бою; ядро не знає про конкретний режим.

Успіх: новий режим = папка `modes/<key>/` (логіка, хуки, UI) + рядок у серверному й клієнтському реєстрах; поза папками режиму слова «maze» немає; поведінка лабіринту не змінюється.

## Рішення користувача (не переглядати без нього)
- Один режим на бій. Погода й місцевість — загальні шари карти поза режимами; режим може приховати місцевість (`hidesTerrain`), як лабіринт зараз.
- Підхід: реєстр режимів зі слотами на рівнях сервера, рушія, клієнта й UI (не фасад без UI, не шина подій).
- Спільне виносимо лише те, що вже не залежить від лабіринту. Стіни, зір і туман зав'язані на `MazeConfig` і `facing` — лишаються в лабіринті, доки другий режим їх не попросить (YAGNI).
- Формат даних і дельти не змінюється: без міграцій, `map.maze`, `scene.maze`, `actionDetails.mazeEvent` лишаються.

## Поточний стан (2026-10-20, main 10e2fef3)
Режим вмикається наявністю `BattleMapConfig.maze` у JSON `battle_scenes.map`. Ядро перевіряє лабіринт ~8 способами в ~60 файлах поза папками лабіринту: `map?.maze`, `mazeGridOf(map)`, `isMazeDark(map)`, `mazeAimHidden`/`mazeTargetHidden`, `withMazeAwareness`, `enterMazeAsleep`, предикати прапорців учасника, `MazeView | null` / `MazeTools | null` на клієнті. Точки: старт (сон, погляд, перший хід), кожна мутація (`blockedInDark`, пробудження), хід (пропуск), переміщення, розстановка, додавання/відкриття учасника, скидання, відкат (частина знімка), перемога (усі вибралися), цілі й видимість у рушії здібностей, маскування сцени й журналу на клієнті, UI-слоти (шари карти, оверлей темряви, тулбар, палітра, контроли ходу, панель ДМ, перемикач у формі), дельта (`scene.maze`), API/схеми/хуки.

## Архітектура

```
lib/utils/battle/modes/
  types.ts          MapModeDefinition<K>, MapModeKey
  registry.ts       MAP_MODE_REGISTRY = { maze: mazeMode }; activeMapMode(map) → визначення або NORMAL_MODE
  normal.ts         NORMAL_MODE — усі хуки нейтральні (поведінка звичайного бою)
  maze/             теперішній lib/utils/battle/maze/* + view/maze-view.ts + mode.ts (визначення режиму)
lib/hooks/battle/modes/
  maze/             теперішні useMaze*.ts + index.ts (barrel)
components/battle/modes/
  registry.ts       MAP_MODE_UI = { maze: mazeUi }; useActiveModeUi()
  maze/             теперішні components/battle/map/maze/* + scene/MazeViewProvider.tsx
```

Серверний реєстр не імпортує React; клієнтський реєстр імпортує серверне визначення лише за типом/ключем.

`activeMapMode(map)` — перший ключ реєстру, для якого `configOf(map)` не порожній; інакше `NORMAL_MODE`. Тип `MapModeKey = keyof typeof MAP_MODE_REGISTRY`.

### Контракт `MapModeDefinition<K>`
Кожна група й кожен хук — необов'язкові; відсутній хук = поведінка звичайного бою. Хуки чисті (крім роутів), отримують стан бою й повертають новий — як решта рушія.

- `key: K`, `configOf(map) → config | null` — яке поле JSON карти належить режиму (лабіринт: `map.maze`).
- `server`:
  - `onStart(order, map)` — підготовка учасників (лабіринт: вороги сплять, погляд всередину);
  - `afterMutation(result)` — після кожної мутації в `runBattleMutation` (лабіринт: пробудження ворогів, події «помітили»);
  - `blocksAction(map, routeOption)` — чи відхилити дію (лабіринт: темрява; заміщує `isMazeDark` у pipeline, опція роуту `blockedInDark` стає загальною `blockedByMode`);
  - `autoSkipTurn(map)` — хід пропускається автоматично з подією журналу (лабіринт: темрява; `next-turn-mutation`);
  - `move(ctx)` — заміщує звичайне переміщення (лабіринт: `mazeMove`);
  - `placement(map, ps)` / `placementError(map, p, cell)` — розстановка й перевірка клітинки;
  - `onAddParticipant(map, p)` — додавання й відкриття резерву (лабіринт: розстановка + сон);
  - `onReset(map)` — скидання бою (лабіринт: мітки, темрява, переміщені);
  - `snapshotSlice` — що з конфігу режиму пише знімок для відкату і як відновлює (`snapshot-state.ts`, `rollback-mutation`);
  - `patchableFields` — поля `battleData` режиму для `PATCHABLE_PARTICIPANT_FIELDS` (лабіринт: `facing`; `dormant`/`escaped`/`mazeWakeRound` — спільні, лишаються в ядрі).
- `engine` (рушій здібностей, цілі, досяжність):
  - `canSee(map, owner, target)` — ворожа ціль має бути видима (`targets.ts`, `spell-targeting.ts`);
  - `aimHidden(map, owner, cell)` / `targetHidden(map, owner, target)` — сервер (`ability-aim.ts`) і клієнт (`spell-flow.ts`, `map-scene.ts`);
  - `meleeBlocked(map, from, to)` і `sightedTargets` — досяжність і лінія зору (`attack-reach.ts`);
  - `moveZone(map, p, budget)` — підсвітка досяжних клітинок (`map-scene.ts`).
- `client`:
  - `deriveView(scene, viewer)` → вид режиму або null; `maskScene(scene, view)`; `fxVisible(view, fx)`; `logVisible(view, event)` (читає своє поле `actionDetails` — `mazeEvent`);
  - `deltaOf(prevMap, nextMap)` / `mergeDelta(cachedMap, patch)` — патч під ключем режиму в `scene` (`client-delta.ts`, `apply-delta.ts`); відсутній кеш режиму → повний GET, як зараз.

Тип патча сцени складається з ключів реєстру: `{ [K in MapModeKey]?: ModeDelta<K> | null }`; формат на дроті для лабіринту той самий (`scene.maze`).

Роути режиму (`maze/`, `maze-mark/`) лишаються окремими папками в `app/api/campaigns/[id]/battles/[battleId]/` (Next вимагає статичні роути); їхні `*-mutation.ts` беруть логіку з `modes/maze`. API-обгортки в `lib/api/battles.ts`, мутації в `lib/hooks/battles/useBattles.ts`, схеми в `lib/schemas/battles.ts`, бакети rate-limit — на місці (це шари проєкту, не ядро бою).

### Спільні механіки (не режим)
Предикати прапорців учасника не читають карту й лишаються в `lib/utils/abilities/engine/core/participants.ts` (ядро викликає їх напряму, без реєстру):
- `isDormant`, `isEscaped`; `inMazePlay` → `inPlay` (живий, не спить, не вибув);
- із `maze/status.ts` переїжджають і перейменовуються: `mazeSkipsTurn` → `sitsOutTurn` (спить, вибув або ще не прокинувся — `mazeWakeRound` > раунд), `takesTurn`, `idleTurnIndex`.
- Перемога «усі живі союзники вибралися → рішення ДМ» уже загальна (`victory.ts` дивиться на `escaped`); лишається як є, коментар узагальнюється.
- `escaped` не займає клітинку (`occupancy.ts`), сплячі не в черзі (`view/queue.ts`) — загальні правила за прапорцями.

Поля `battleData.dormant` / `escaped` / `mazeWakeRound` зберігають імена (без міграції знімків); `facing` належить лабіринту.

### UI-слоти (`MapModeUi`)
- `MapLayers` (під і над жетонами) і `MapOverlay` — `BattleMap.tsx` (лабіринт: об'єкти, туман, бачення загону, стіни, редактор ребер; екран темряви); `tokenVisible`/`tokenBadge` — фільтр жетонів і значок сну;
- `Toolbar`, `EditPalette` — `BattleMapPanel.tsx`;
- `TurnControls` — `MyTurnControls.tsx` (вибір мітки);
- `useDmPlace` — `DmPanel.tsx` (розстановка з панелі ДМ);
- `SetupToggle` + `hidesTerrain` — `BattleFormMap.tsx` і `BattleMapPanel.tsx`;
- `SceneProvider` — `BattleSceneProvider.tsx` (маскована сцена, `MazeViewProvider`);
- `useAutoSkip` — `BattleScreen.tsx` (`useMazeDarkAutoSkip`);
- `useModeTools` — `useBattleMapScene.ts` (інструменти ДМ, маршрутизація кліку по клітинці, взаємне виключення з інструментом місцевості).

Компоненти ядра рендерять слот активного режиму (`useActiveModeUi()`), нічого не знаючи про лабіринт. Хуки `useMaze*` → `lib/hooks/battle/modes/maze/` (шари CLAUDE.md: запити лише в `lib/api`, компонент викликає хук).

Відкритий хвіст лабіринту закривається тут: палітра режиму й палітри місцевості/погоди відкриваються в одному місці — відкриття однієї закриває інші.

### Межа модуля
ESLint `no-restricted-imports`: поза `lib/utils/battle/modes/**`, `lib/hooks/battle/modes/**`, `components/battle/modes/**`, роутами `maze*/` і `scripts/**` імпорт `@/lib/utils/battle/modes/maze*`, `@/lib/hooks/battle/modes/maze*`, `@/components/battle/modes/maze*` заборонено — ядро бере режим лише через реєстр. Типи `MazeConfig`/`MazeMark` лишаються в `types/battle.ts` (доменні типи проєкту).

## Порядок робіт
Задача A (бонус +N у `damageDice`, баланс) — окремий блок, виконується першим і незалежно.
1. Контракт, реєстри (сервер і клієнт), `NORMAL_MODE`, `activeMapMode`; тести реєстру.
2. Спільні предикати (`inPlay`, `sitsOutTurn`, `takesTurn`, `idleTurnIndex`) — перейменування в ядрі.
3. Перенесення `lib/utils/battle/maze` → `modes/maze`, `maze-view` → `modes/maze`; визначення `mazeMode`.
4. Серверні хуки: старт, pipeline (`blockedByMode`, `afterMutation`), next-turn, move, розстановка, add/reveal, reset, rollback/snapshot, patchable.
5. Хуки рушія: цілі, видимість, прицілювання, досяжність, зона руху.
6. Клієнт: `deriveView`/`maskScene`/`fxVisible`/`logVisible`, дельта (`deltaOf`/`mergeDelta`), тип патча.
7. UI-слоти й перенесення компонентів і хуків; палітри без перекриття.
8. Чистка «maze» з ядра, правило ESLint.
9. Тест-заглушка режиму, sweep, браузер.

## Перевірка
- Наявні тести проходять без зміни очікувань (лише імпорти й перейменування).
- Нові тести: `NORMAL_MODE` нічого не змінює (старт, мутація, хід, цілі, маскування); фіктивний режим, зареєстрований у тесті, викликається ядром у кожній точці (старт, після мутації, блок дії, автопропуск, move, розстановка, add, reset, знімок, `canSee`, `deriveView`, дельта).
- `grep -ri maze` поза дозволеними папками (крім типів, роутів `maze*/`, `lib/api`/`lib/hooks/battles`/схем/rate-limit, текстів і констант режиму) — порожньо; ESLint-правило зелене.
- `pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`, `battle-sweep --mode maze` і `--mode all` (exit 0) на локальній `prodcopy`.
- Браузер (localhost, ДМ): лабіринт + погода + музика разом на desktop і телефоні (iframe 390 px), «1 тунель», темрява, перетасовка, «Очима гравця» (у гравця один акаунт — справжня друга вкладка недоступна); палітри не накладаються.

## Поза межами
- Нові режими, комбінування режимів, стіни/зір як спільна механіка.
- Зміна формату даних, дельти чи `battle_events`.
