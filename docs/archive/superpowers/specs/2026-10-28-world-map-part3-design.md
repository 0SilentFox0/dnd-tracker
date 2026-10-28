# Карта світу, частина 3 — Показ + Сценарій (дельта до спеки)

Базова спека: `2026-10-27-world-map-design.md` (розділи «Екрани», «Синхронізація», «Сценарій», «Помилки», «Повторне використання»). Тут — лише нові рішення частини 3. Гілка `feat/world-map-3`, worktree `../dnd-tracker-world3` від `main` `fda9a93b`.

## Дані

- Колонка `campaign_shows.world Json?` уже є (міграція `20261027000000_world_map`). **Міграцій нема.** Зараз вона не читається й не пишеться (`SHOW_SELECT`/`toShowState`/`writeShowState` у `lib/server/show/show-store.ts` її не знають).
- `ShowState.world?: ShowWorld`, `ShowWorld = { mapId: string; focusMarkerId?: string }` (`types/show.ts`). Назви карт/маркерів у стан **не** кладемо: `show-state` летить у спільний канал, а гравець дочитує назви зі свого відфільтрованого `view`.
- Прив'язка сценарію — `marker?: ScenarioMarkerRef = { mapId: string; markerId: string }` у `ScenarioRow` і `ScenarioSection` (JSON у `content`, без міграції). **Відхилення від базової спеки** (`markerId?`): пара з `mapId` повторює `slide: { deckId, slideId }`, чіп і гра знаходять маркер через уже кешований `GET /world/maps/[mapId]` без нового ендпоінта й без N запитів. Маркер між картами не переїжджає (`UpdateWorldMarkerData` не має `mapId`), тож пара стабільна.

## Команди показу (`lib/utils/show/show-command.ts`)

| Команда | Результат |
|---|---|
| `{ action: "world", mapId, focusMarkerId? }` | `world` = ціль, знімає `curtain`, `seq+1`; слайдова позиція, `cover`, `battle`, `audio` лишаються. Ті самі `mapId`/`focusMarkerId` без `curtain` → `prev` без запису |
| `{ action: "worldOff" }` | прибирає `world` (`without(prev, "world")`); без `prev` → `SHOW_NOT_RUNNING` |
| `open` / `next` / `prev` | як зараз; **також прибирають `world`** (ДМ перемкнувся на слайди) |
| `end` | `EMPTY` + `cover` — `world` зникає |
| `curtain`, `audio`, `battle`, `setCover` | `world` не чіпають |

Сервер (`show-handler.ts`) для `world` перевіряє: карта належить кампанії, `focusMarkerId` — маркер цієї карти; інакше 404 `WORLD_MAP_NOT_FOUND` / `WORLD_MARKER_NOT_FOUND`. Оптимістичне блокування за `seq` — як зараз; `campaign_shows` не видаляється, `seq` лише росте.

**Видалення:** `deleteWorldMapHandler` і `deleteWorldMarkerHandler` після успіху викликають `clearShowWorld(campaignId, { mapIds, markerIds })` (за зразком `clearShowBattle`, 3 спроби, помилки лише в лог): показана карта в зниклому піддереві → `world` знімається; зник лише фокус-маркер → знімається `focusMarkerId`.

## Що бачить гравець на `/show`

Режим екрана — одна чиста функція `stageMode(show)` у `lib/utils/show/player-view.ts`, пріоритет зверху вниз:

1. `curtain` → **заглушка** (`cover` або `ShowWaiting paused`), навіть якщо `world` задано. Заглушка — «сховати все»; знімається будь-яким `world`/слайдом, як і зараз.
2. `world` → **карта**: `useWorldView(campaignId, { mapId: world.mapId })` — його власний туман, лише видимі маркери/герої/нотатки; `focusMarkerId` центрує карту (`WorldMapView.focus`) і підсвічує маркер (`selectedId`) **лише якщо маркер є у його `view.markers`** (інакше просто показуємо карту — існування схованого маркера не видаємо нічим, крім непрозорого id у стані).
3. `slide` → слайд (як зараз).
4. Інакше → `cover` або очікування (як зараз).

`battle` — накладка поверх будь-якого режиму (як зараз). Музика не залежить від режиму.

**Доступ до показаної карти:** `viewHandler` для гравця додає `show.world.mapId` у дозволені карти (одне читання `campaignShow.world`), бо ДМ може показати карту, де героїв гравця ще не було. Туман при цьому діє: без відкриттів гравець бачить лише `alwaysVisible`-маркери (або все, якщо `fogEnabled=false`). Ця поблажка діє лише для поточної показаної карти; після `worldOff` карта знову недоступна, якщо її немає в `knownMapIds`.

**Гравець без героїв** (або всі герої без позицій): та сама карта під суцільним туманом + `alwaysVisible`; без героїв-жетонів; без помилок. Видалена/недоступна карта (404) → `ShowWaiting` з текстом «Карта недоступна».

**ДМ на `/show` у режимі карти** бачить повну карту (`useWorldMap`, без туману, усі герої) з підписом «Гравці бачать карту зі своїм туманом».

## Анімація провалу

- Коли `world.mapId` змінюється на карту, чий `parentMarkerId` є серед маркерів **попереднього** `view` гравця, стейдж грає «провал»: шар старої карти `transform: scale(4)` з `transform-origin` у точці маркера + затемнення до чорного (600 мс), далі нова карта проявляється (300 мс fade-in). Нова карта підвантажується паралельно; якщо за 600 мс ще не готова — тримаємо чорний до готовності.
- Інакше (вихід, інша гілка дерева, маркер у тумані гравця) — лише crossfade 300 мс.
- `prefers-reduced-motion` (`useReducedMotion`) → миттєва заміна без анімації.
- Логіка походження — чиста `diveOrigin(prev: WorldView | null, next: WorldView): MapPoint | null` (`lib/utils/world/dive.ts`, нове); CSS — класи в `components/world/world-atlas.css`.

## Подія `world-changed`

- `WORLD_CHANGED_EVENT = "world-changed"` у `lib/pusher/channels.ts`, канал — `showChannelName(campaignId)`. Payload `WorldChangedEvent = { campaignId, mapId: string | null, seq: number }`, `seq = Date.now()` на сервері (лише для відкидання дубля доставки, не пов'язаний із `show.seq`). **Без** стану світу: туман персональний.
- Шле `publishWorldChanged(campaignId, mapId)` (`lib/server/world/world-events.ts`, нове) через `after(() => safePusherTrigger(...))` після успішних: travel/enter/exit, create/update/delete маркера, update/delete карти, create/update/delete **публічної** нотатки (приватна змінює лише вигляд автора — його кеш оновлює власна мутація).
- Клієнт: обробник у **`usePusherShowSync`** (одна підписка на канал — `usePusherChannel` робить `unsubscribe` по імені, друга підписка на той самий канал зірвала б першу). Обробник з тротлінгом 1 с (trailing) інвалідовує префікси `worldKeys.viewAll`, `mapAll`, `maps`, `log` — перезапитуються лише активні запити. `/world` гравця теж монтує `usePusherShowSync`.
- Fallback: `useWorldView` з Pusher — `staleTime 60 с`, `refetchOnWindowFocus` лишається; без `NEXT_PUBLIC_PUSHER_KEY` — `staleTime 15 с` + `refetchInterval 30 с` (як `useShowState`).

## Керування в доці «Показу»

- `ShowWorldControls` (нове, `components/world/show/`) у `ShowControlPanel` (`/show`) і в `ScenarioShowDock`: «Вивести карту гравцям» (за замовчуванням — карта, що вже в показі, інакше коренева), вибір карти деревом (`mapPath`), вибір фокус-маркера (маркери обраної карти), «До слайдів» (`worldOff`), «Подорож» → `WorldTravelDialog`.
- `WorldTravelDialog` (нове) — `ResponsiveDialog hud` з `WorldMapView` (повний вигляд ДМ, інструмент `move`) і самостійним `TravelPanel` (props як у ч.2: `campaignId, mapId, heroes: RosterHero[], onMapIds, target, selectedMarker, onPickTarget`) + новий необов'язковий `onMoved(destMapId)`.
- **Після «Зайти/Вийти» (хвіст 4):** у доці — якщо показ стоїть на карті-джерелі, шлемо `world { mapId: dest }` (гравці бачать провал); якщо показ у слайдах — не чіпаємо. У редакторі ДМ — переходимо на карту призначення (`openMap(dest)`), інструмент `move` і вибрані герої зберігаються: після переходу герої зникають з поточної карти, і ДМ майже завжди продовжує саме з ними. Звичайне «Перемістити» карту не змінює.
- `OnScreen` у доці: у режимі карти — «🗺 Карта» + назва з `useWorldMaps` (ДМ). `ScenarioShowDock` видно також, коли `show.world` задано.

## Сценарій

- Чіп 📍 + `MarkerPickerDialog` (дерево карт → маркери карти, пошук `useSearch`) у `RowBindings` і в `SectionHeaderEditor`. Відсутній маркер/карта → чіп «Місце недоступне» з кнопкою відв'язати (як «Слайд недоступний»).
- У грі: чіп рядка (`RowPlayControls`) і заголовка глави (`ScenarioPageView`) — «Показати на карті» → `world { mapId, focusMarkerId }`; стан «● На екрані», коли `show.world` збігається. Недоступний маркер → кнопка вимкнена.
- `hasPlayBindings` враховує `row.marker` і `section.marker`.
- `MENTION_TYPES` + `"marker"`, `MENTION_LABELS.marker = "Місце"`; пошук згадок шукає маркери кампанії за назвою; `mentionHref(cid, "marker", id)` → `/campaigns/<cid>/dm/world?marker=<id>`; `dm/world/page.tsx` резолвить маркер у його карту (лише цієї кампанії, інакше ігнор) і відкриває редактор з вибраним маркером.

## Інше

- **Rest (хвіст 5):** лишається лише записом у журналі. `restParty` — у `feat/constructor`, не змерджено; застосування — окрема мала задача після мерджу. Фіксуємо в `docs/architecture/world-map.md`.
- **Кнопка «Карта» гравця:** плитка `player-world` у `PLAYER_DASHBOARD_SECTIONS` (дашборд кампанії — єдине місце кнопок гравця), видима, коли в кампанії є коренева карта (`PlayerDashboardData.hasWorld`). Не «коли є позиція»: `alwaysVisible`-місця й показ дають сенс і до першої подорожі, а туман і так ховає решту. ДМ плитки не отримує (вхід з «Показу»/«Сценарію», як у базовій спеці).
- **Нотатки ДМ (хвіст 1):** `GET /world/maps/[mapId]` для ДМ віддає `notes` — лише **публічні** (приватні ДМ не бачить ніколи); панель маркера в редакторі монтує `WorldNotesPanel isDM`: список, видалення, форма лише публічна (API це вже дозволяє).
- **Герої в одній точці (хвіст 7):** кластеризація в пікселях екрана, бейдж «+N», розкриття списком; лише ті герої, що вже є в `heroes` (гравець/«очима героя» — видимі).
- **Тултіпи (хвіст 8):** виправлення кореневої причини в токенах/класі `TooltipContent` у HUD-контексті, не локальні класи.
