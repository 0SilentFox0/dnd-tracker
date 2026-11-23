# Карта світу

Режим «Карта світу»: ієрархія карт (континент → місто → підземелля), маркери й зони, позиції героїв, туман у кожного гравця, нотатки до місць, показ карти гравцям через «Показ» і прив'язки в сценарії. Специфікація — `docs/archive/superpowers/specs/2026-10-27-world-map-design.md` + дельта частини 3.

## Дані

- Таблиці: `world_maps` (вкладена карта прив'язана до маркера-батька через `parentMarkerId`), `world_markers` (`kind`, `polygon`, `dmNote`, `alwaysVisible`), `world_positions` (одна позиція на героя), `world_reveals` (відкриті фігури туману на героя), `world_travel_log`, `world_notes` (`visibility`: публічна/приватна).
- Координати нормалізовані 0..1; `width`/`height` карти дають aspect (`fitBox` у `lib/utils/world/geometry.ts`), тому заміна картинки з тими самими пропорціями не зсуває маркери.
- Прив'язки сценарію живуть у JSON `content` як `{ mapId, markerId }` — без міграцій.

## Єдиний фільтр видимості

`buildWorldView` (`lib/utils/world/player-view.ts`) — єдине місце, що вирішує, що бачить глядач: маркери й зони з урахуванням туману, `alwaysVisible`, `dmNote` лише ДМ, публічні й власні нотатки, позиції. Гравець без героїв чи позицій бачить туман і `alwaysVisible`; при `fogEnabled=false` — усе. `asHeroId` («очима героя») дозволений лише ДМ (гравцю 403). Нові ендпоінти читають світ тільки через нього.

## Переходи й журнал

- `travel-handlers.ts`: переміщення героїв (відрізок відкриває туман уздовж шляху), `enter` (на вкладену карту в точку входу) і `exit`; кожен крок пишеться в `world_travel_log` з `kind` (`travel` | `enter` | `rest` | `exit`, за замовчуванням `travel`); журнал показує бейджі «Подорож/Зайшли/Відпочинок/Вийшли».
- **Відпочинок:** `POST /world/rest` (`restWorldSchema`: `mapId`, `characterIds`, `kind: short|long`) викликає `applyWorldRest` — відновлення ресурсів героїв за правилами кампанії; при вимкненому `outOfCombat.persistResources` відновлення немає (`applied: false`), а панель подорожі блокує кнопку «Відпочити». Запис у журналі має `kind: "rest"` (бейдж «Відпочинок»); відпочинок разом із подорожжю (`rest` у travel/enter/exit) теж відновлює ресурси.
- Редактор і діалог подорожі після «Зайти/Вийти» слідують за загоном (`TravelMoved`, `onMoved`).

## Показ

- `ShowState.world` (`{ mapId, focusMarkerId? }`) — у спільному каналі лише id; кожен клієнт дочитує свій відфільтрований `view` (`buildWorldView`). Команди `world`/`worldOff` — у `applyShowCommand` (`lib/utils/show/show-command.ts`); `world` знімає `curtain`, не чіпає музику.
- `stageMode` (`lib/utils/show/player-view.ts`): `cover` → `world` → `slide` → `waiting`; `ShowWorldStage`/`useShowWorld` рендерять той самий `WorldMapView`.
- **Доступ до показаної карти:** гравець може відкрити карту, якої не знав, лише поки вона в показі (`campaign_shows.world`); після `worldOff` — знову 404. Фокус на прихованому маркері не центрує й не підсвічує.
- Видалення карти чи маркера знімає їх із показу (`clearShowWorld`, цілі — піддерево карт і маркерів). Рядок `campaign_shows` не видаляється, `seq` лише росте.
- Дві команди паралельно → друга 409 `SHOW_CONFLICT`, клієнт перечитує стан.

## Подія `world-changed`

Сигнал `{ campaignId, mapId, seq }` у канал показу (`publishWorldChanged`, `safePusherTrigger` в `after()`) — без назв, координат, нотаток. Обробник — в `usePusherShowSync` (одна підписка на канал): тротлінг (trailing, 1 с від першої події) та інвалідація `worldKeys`; `onSubscribed` інвалідує і show, і world. Публікується при переміщеннях, змінах маркерів/карт і публічних нотаток.

## Прив'язки й згадки в сценарії

Рядок або розділ має `{ mapId, markerId }` (чіп 📍, `MarkerPickerDialog`: дерево карт → маркери). Кнопка гри «Показати на карті» (`showMarker` поруч із `showSlide`) надсилає команду `world` з фокусом. Згадка `@Місце` — тип `marker` (`MENTION_TYPES`), `mentionHref` веде в редактор із `?marker=`. Видалений маркер → чіп «Місце недоступне» й вимкнена кнопка, без 500.

## Провал і reduced-motion

`diveOrigin` (`lib/utils/world/dive.ts`) бере точку маркера, з якого йде вхід; `useWorldDive` запускає провал (CSS, `WORLD_DIVE_MS`/`WORLD_REVEAL_MS`), коли нова карта вже завантажена. Без origin (вихід, маркер у тумані, інша гілка) — лише fade. За `prefers-reduced-motion` — без провалу й fade. Origin наближений, якщо карта вписана з полями.

## Кластери героїв і пінів

`clusterHeroes` (`lib/utils/world/hero-clusters.ts`) групує героїв, що стоять ближче за `HERO_CLUSTER_PX` (24 px) у піксельному просторі; `HeroCluster` показує бейдж «+N» і поповер зі списком. При зумі кластери розходяться.

Піни маркерів кластеризує `clusterByPixel` (`lib/utils/world/cluster.ts`, жадібно в порядку входу): поріг `PIN_CLUSTER_PX` 28 px, у компактному режимі `PIN_CLUSTER_PX_COMPACT` 36 px (`lib/constants/world.ts`). Вхід сортується `byPinRank` (`pin-tier.ts`: castle < city < portal < dungeon < landmark < battle < без іконки < village < camp), тож першим і представником кластера стає найважливіший пін. Винятки, що ніколи не кластеризуються: вибраний, потягнутий, а також усе, коли `screen.cluster === false` (ДМ в інструменті `point`) або немає `screen.box` (режим `entry`/без виміру). `PinCluster` (`components/world/map/PinCluster.tsx`) малює печатку представника з бейджем «+N»: якщо `clusterZoom` повертає зум, що розводить найближчу пару (мінімум ×1.5, запас 1.15), клік наближає до `clusterCenter` через `onClusterZoom`; на `WORLD_MAX_ZOOM` чи при дублікатах (`null`) клік відкриває поповер зі списком, рядок якого вибирає пін (`onMarkerClick`).

## Нотатки

Публічні («Спільні») бачать усі, хто знає маркер; приватні («Мої») — лише автор. ДМ у панелі маркера бачить тільки публічні (`GET /world/maps/[id]` віддає `notes` лише публічні) і видаляє їх з підтвердженням. Нотатка гравця до невидимого маркера → 403.

## UX редактора й гравця (2026-11-20)

- **Режими** (`WorldMode`, `MODE_TOOLS` у `useMapDrawing`): «Будувати» (select/point/zone/entry) і «Грати» (лише герої). Інструмент закріплюється Shift-кліком/подвійним кліком (`pinned`); без закріплення точка/вхід/зона після завершення повертають `select`.
- **Драбина Esc:** спершу закривається «Докладніше» (нотатки/деталі), потім знімається вибір маркера, потім (у режимі будови) скасовується малювання й інструмент повертається на домашній для режиму. Esc у полі вводу чи діалозі не обробляється; обробник у capture-фазі з `preventDefault`, тож `useMapDrawing` пропускає вже спожите натискання. У картці маркера Esc закриває картку.
- **Дерево карт:** `MapTree` (спільний для DM і гравця) і `treeOrder`/`treeDepth` у `lib/utils/world/tree.ts`; гравець бачить лише відомі карти. Заміна старих `MapStrip`/`MarkerStrip`/`WorldInspectorBar`.
- **Перенесення карти:** `editor.map.move` → `updateWorldMapHandler` з `checkMove`, що виконується в транзакції після `pg_advisory_xact_lock(hashtext(campaignId))` (дві паралельні переноски не створять цикл). Правила: корінь не рухається (`worldRootImmovable`), цикл заборонено (`worldMoveCycle`), цільовий маркер має бути вільним, без вкладеної карти й на іншій карті. Вибір цілі (`MoveMapMenu`, `useMoveTarget`) ховає піддерево самої карти.
- **Картка маркера:** `MarkerBubble` (DM: `DmMarkerBubble`, гравець: `PlayerMarkerBubble`) позиціонується `useMarkerBubblePosition` у screen-space слоті `card` у `WorldMapView`. На телефоні (нижче `DESKTOP_QUERY`) гравець бачить ту саму картку `embedded` у нижньому листі, а нотатки відкриваються листом (`WorldNotesPanel`). ДМ бачить картку з редагуванням (назва, опис, колір, видалення), гравець — лише читання й дії «Докладніше»/«Зайти»/нотатки. Нотатки/деталі відкриваються лише через «Докладніше». Подвійний клік по маркеру з вкладеною картою відкриває її. Пошук місць — `PlaceSearchBar` (`pickPlace` фокусує маркер). Стилі кнопок картки — `components/world/nav/bubble-button.ts`.
- **Прилипання зон:** `snapPoint`/`sharedEdges` (`lib/utils/world/zone-snap.ts`). Радіус у пікселях екрана — `WORLD_SNAP_PX = 8` (`lib/constants/world.ts`), тому на зумі прилипання не «розповзається»; Alt вимикає. Прилипання йде до вершин і ребер сусідніх зон, а коли вершина (малювання, перетягування, перемальовування) лягає всередину ребра сусіда, `insertSharedPoints` вставляє цю точку і в сусідній полігон (`shareEdgePoints` у `useWorldEditorPage`; окремий PATCH на кожного змінюваного сусіда, без зайвих запитів, коли вставка не потрібна). Зони малюються м'якими розмитими кольоровими полями (`WorldZones`: `feGaussianBlur`, `FEATHER = 0.008`, без ліній — сусідні кольори перетікають), а лінії меж (підкладка, `<path data-shared-edge>` для спільних ребер) показуються лише в інструменті `zone` (`showEdges`); вибрана зона має золотий контур; вершини редагуються `ZoneVertexHandles` (`changeVertices`); з клавіатури: фокус на вершині, стрілки зсувають (`nudgeStep`, Shift — більший крок), Enter/втрата фокуса зберігає, Escape скасовує. Підпис зони: розмір від площі та зуму (`zoneLabelSize`), відомі/безтуманні зони підписані завжди, hover показує прихований підпис (`lib/utils/world/zone-labels.ts`). Підказка інструмента ходить за курсором (`CursorHint` у `WorldMapView`, `hintPosition`, ховається на тачі).
- **`description`:** публічне поле `world_markers.description` (nullable): його бачать усі, хто знає маркер (на відміну від `dmNote`); показується в картці й панелі нотаток. Колір точки (`color`) тонує печатку.
- **Демо-тур:** кроки `world.bubble` (клік по маркеру) → `world.notes` (клік «Докладніше», `world.more`); `world.places` = дерево карт.

## Сесії й слід героїв (2026-11-20, підпроєкт 2)

- **Сесії:** `world_sessions` (`name`, `description`, `color`, `startedAt`, `endedAt`). Активна — `endedAt IS NULL`, одна на кампанію: старт нової в транзакції закриває активну; гонку двох стартів ловить частковий унікальний індекс `(campaignId) WHERE endedAt IS NULL` (лише в SQL міграції, Prisma його не описує — коментар у схемі) і P2002 → 409 `WORLD_SESSION_CONFLICT`. Видалення сесії обнуляє `world_travel_log.sessionId` (`SetNull`), записи лишаються. Логіка — `lib/server/world/session-{handlers,store}.ts`, роути `world/sessions/`, усе через `withDM`.
- **Штамп сесії:** `commitTravel` і `writeRestLog` (`travel-store.ts`) ставлять `sessionId` активної сесії на момент запису; без неї — `null` (бекфілу старих записів нема). Сесію могли видалити між читанням і вставкою → FK-помилка `P2003`: `withSessionRetry` повторює запис з `sessionId = null`, а не падає.
- **Слід:** `GET /world/trail?mapId=` → `{ sessions, entries }` лише для цієї карти (`trail-handlers.ts`, джерело — `readTravelLog`). ДМ бачить усе. Гравець — лише записи **своїх** героїв: якщо в записі беруть участь тільки його герої — вузол і відрізок; змішані (є чужий герой) дають лише вузол `to` без `from` (чужу позицію не розкриваємо). Гравцю віддаються тільки сесії з видимими йому записами, без нотаток ДМ.
- **Чиста логіка й шар:** `lib/utils/world/trail.ts` (`buildTrails`: відрізок лише для `travel` на одній карті, `enter`/`exit`/`rest` дають вузол, злиття сусідніх вузлів). `WorldTrails` (SVG під піном героя, `non-scaling-stroke`, `interactive` лише в `select`/`move`, інакше не перехоплює кліки), `TrailBubble` (бульбашка по кліку, `useMarkerBubblePosition`), `TrailLegend` (чипи сесій з локальним перемикачем показу; ДМ додатково «Без сесії»). Хуки `useWorldTrail`, `useTrailView`, `useWorldSessions`; `worldKeys.trail` інвалідується в `worldKeysFor` і в обробнику `world-changed`.
- **Drag героя (ДМ, «Грати»):** `useHeroDrag` + `lib/utils/world/hero-drag.ts`. Поріг `HERO_DRAG_THRESHOLD_PX` (6 px) відрізняє drag від кліку; Escape (capture-фаза) скасовує; група — `dragGroup`: потягнутий у вибрані (`useHeroSelection`, спільний із `useTravelPanel`) рухається з усіма вибраними, інакше сам (кластер — цілком). Drop викликає наявну подорож `travel` з `rest: 'none'` (туман, журнал із сесією, `world-changed`) — нової мутації руху нема; drop на ту саму точку (`dropIsNoop`) чи поки подорож у польоті — нічого.
- **Піни ворогів (лише ДМ):** окрема таблиця `world_enemy_pins` (`mapId` cascade, `name`, `icon`, `color`, `dmNote`, `x`, `y`), а не новий `kind` у `world_markers`: `buildWorldView`, показ і посилання сценарію читають усі маркери, і кожен новий фільтр — ризик витоку; таблицю, яку не читає жоден гравецький шлях, приховано за конструкцією. `enemies` є лише у відповіді `GET map` для ДМ (`WorldMapDetail`); `WorldView`, `buildWorldView`, `readViewerScope`, `ShowState.world`, Pusher-сигнал їх не містять (тест `enemy-privacy.test.ts`). CRUD — `world/maps/[mapId]/enemies/`, `enemy-handlers.ts`, ліміт `MAX_WORLD_ENEMY_PINS`; пін тягнеться (PATCH `x`/`y`, без журналу й туману), слід ворогів не ведеться.

## Шари (2026-11-20, підпроєкт 3)

- **Дані:** `world_layers` (`mapId` cascade, `name`, `color`, `visibility` `dm|all|heroes` з default `dm`, `sortOrder`, `imageUrl`, `imgX/imgY/imgW/imgH`, `opacity`), `world_layer_heroes` (PK `(layerId, characterId)`, сенс лише при `heroes`), `world_markers.layerId` (nullable, FK `NoAction`: SetNull тихо відкрив би приховані маркери всім, тож шар видаляє хендлер, який перед цим явно роз'єднує чи видаляє маркери). Міграція `20261222000000_world_layers`, RLS на нових таблицях.
- **Видимість (єдине місце):** `visibility()` у `lib/utils/world/player-view.ts` отримує `layerOk(marker)` і застосовує його разом із туманом; далі це автоматично діє на `visibleMarkerIds`, нотатки, пошук місць і фокус показу. `buildWorldView` віддає `layers: WorldViewLayer[]` лише видимі, без `visibility` і списку героїв. Жоден гравецький шлях не читає `world_layers*` повз `buildWorldView`; `GET map` для ДМ віддає повні шари з `heroIds`.
- **API (усе `withDM`):** `world/maps/[mapId]/layers` (GET/POST), `world/layers/[layerId]` (PATCH, DELETE з `{ markers: 'ungroup' | 'delete' }`, 409 `WORLD_LAYER_HAS_MARKERS` без вибору), `PUT heroes`; `layerId` приймають POST/PATCH маркера (шар має бути тієї ж карти). Картинка шару — той самий `upload-url`/`discard-upload`, що й у карти. Ліміт — `MAX_WORLD_LAYERS`.
- **Клієнт:** `WorldLayerImages` лежить між базовою картинкою й зонами, під `WorldFog` (туман обрізає картинку); `LayerImageRect` редагує прямокутник (drag + кути, коміт з debounce, `lib/utils/world/layer-rect.ts`). Escape під час drag піна скасовує жест (`usePinGesture`). `useLayerVisibility` — локальний перемикач показу (`hidden` ховає картинку й маркери шару), спільний для редактора ДМ, гравця (`useWorldPlay.layers`) і режиму «Очима героя» (`useHeroEyes.layers`); `LayerLegend` показується, лише якщо шари є. Панель ДМ — `components/world/editor/layers/` (`LayersPanel`), активний шар → `layerId` нових маркерів, вибір шару в картці маркера.
- **Граблі:** шар без картинки теж віддається гравцеві (для чипа легенди); вхід у вкладену карту з маркера прихованого шару не розкриває координату (тест у `view-handlers`); `entryCount` сесій віддається лише ДМ-відповіді `GET sessions` (гравцеві `WorldTrailSession` без `description`/`active`/`entryCount`); `pickCard` (`lib/utils/world/pick-card.ts`) обирає картку слід > маркер лише на десктопі.

## Вьюпорт (2026-11-20, якість A)

- **Підкладка:** `WorldMapView` малює розмиту `atlas-backdrop` з тим самим URL, що й карта (без другого запиту `/_next/image`), тож порожніх смуг над/під вписаною картинкою немає.
- **Повний екран:** `useMapFullscreen` (`lib/hooks/world/`) тримає `full` і ставить `overflow: hidden` на `<html>`; хост (обгортка карти в `WorldPlayClient` і `dm/world/page-client.tsx`) просто змінює клас на `fixed inset-0 z-50 h-dvh` без ремонту, кнопка лежить у блоці зуму (`slots.fullscreen`; у «Показі» її немає). При зміні `box` `WorldMapView` викликає `rescale(box.width / prev)`, і переглянута ділянка зберігається (бічна панель, повний екран).
- **Esc:** `escapeStep` (`lib/utils/world/escape-step.ts`) — по кроку на натискання: `details` → `drawing` → `fullscreen` → `selection`. Слухач у capture-фазі в `useWorldEditorPage`/`useWorldPlay` робить `preventDefault`; крок `drawing` лишається за `useMapDrawing`.
- **Компактна мітка + панель:** бульбашка маркера показує назву й іконки без опису; «Докладніше» (`openDetails`) відкриває праву колонку, на десктопі виходить з повного екрана й центрує маркер (`focusPoint(anchor, 1)`). «Перемістити карту»/«Видалити карту» ДМ перенесено в панель.

**Граблі вьюпорту:**
- Не ставити `role=dialog` на обгортку повного екрана (хост має `role=region`): слухачі Esc і `useMapDrawing` ігнорують події всередині `[role=dialog]`, драбина зламається.
- Не перемонтовувати карту при вході/виході з повного екрана (змінювати лише клас обгортки), інакше губляться зум, офсет і вибір.
- `sizes` підкладки має дорівнювати `sizes` карти, інакше Next запитає інший варіант і з'явиться другий запит.

## Ігровий HUD мапи (Ч4)

- За `NEXT_PUBLIC_GAME_UI_SHELL=true` обидва маршрути світу використовують спільне меню кампанії й крихти «Кампанія › Мапа світу». Сцена займає всю доступну ширину й залишок `100dvh` після шапки та інструментів. Панелі редактора, журнал і деталі мають власне прокручування.
- `WorldJourneyHud` показує маркери поточної карти з урахуванням локальних перемикачів шарів. Для гравця й режиму «Очима героя» джерело — відфільтрований `WorldView`. Натискання на місце фокусує маркер. Окрема кнопка переходу відкриває вкладену карту, якщо вона є в дозволеному дереві. Пошук використовує ті самі доступні місця, дерево працює й у порожньому стані. На телефоні нижня панель тримає дії в одному ряду без прокручування. «Куди далі» відкриває список місць у шторці.
- `WorldFilterLegend` показує перемикачі шарів і слідів поверх мапи на десктопі. На телефоні одна кнопка 44×44 px відкриває ті самі перемикачі в шторці. Назви переносяться в межах шторки, а склад фільтрів визначають доступні шари й сліди поточного подання.
- Ромб загону відображається для кластерів актуальних позицій, які вже повертають API ДМ або `buildWorldView`. У гравецькому поданні мітка загону прив'язана до власних героїв. Легенда додає «Не досліджено», якщо подання малює туман.
- Початковий масштаб заповнює сцену без зміни пропорцій зображення. Панорамування дістається обрізаних країв, зменшення масштабу показує всю карту. Координати шарів, туману й маркерів лишаються в одній системі. Полотно туману виділяє пам'ять лише для видимої частини сцени.
- `WorldFog` у Ч4 малює хмарні шари на кожному кадрі браузера. WebGL2 змінює форму й щільність хмар, а Canvas 2D забезпечує запасний рендер. Відкриті ділянки утворюють нерухому маску з широким градієнтом по контуру, яку оновлюють після руху камери або зміни `reveals`. Зменшена роздільність хмар обмежує вартість композиції на великих сценах. За `prefers-reduced-motion` хмари статичні.
- Іконка та текст вирівняні по центру дії. Бічні панелі й картки маркерів відкриваються з коротким зсувом і зміною непрозорості. Десктопні діалоги мають узгоджені анімації входу та виходу. У мобільній шторці анімується вміст, рух шторки веде Vaul. Усі додані переходи враховують `prefers-reduced-motion`.
- У редакторі ДМ кнопки «Карти», «Шари», «Побудова» і «Гра» мають однакову ширину в групі. Перемикач подання має одну рамку й може переноситися без перекриття. Менеджер шарів відділяє вибір шару для редагування від активного шару для нових маркерів. Для вибраного шару є три вкладки. Картка місця в мобільній шторці показує опис за наявності та кнопку «Докладніше» від 44 px.
- Локальна карта для перевірки — `World Map QA / Rivento Bay` у `prodcopy`. Вона використовує `/example-demo/maps/world.jpg` з прототипу та окремі тестові дані: шари для всіх, для одного героя й для ДМ, зони, ворог, сесія, слід, відкритий коридор у тумані та вкладений двір. Дані HOMM5 залишилися без змін.

## Розкладка

`components/world/`: `map/` (`WorldMapView`, піни, зони, туман, герої, `ZoneVertexHandles`), `nav/` (`MapTree`, `MarkerBubble`, `PlaceSearchBar`, `MarkerPickerDialog`, `bubble-button.ts`), `editor/` (панелі, `ModeSwitch`, `DmMarkerBubble`, `MoveMapMenu`), `play/` (клієнт гравця), `notes/`, `travel/`. Хуки в `lib/hooks/world/` (`useWorldEditorPage`, `useWorldPlay`, `useMapDrawing`, `useMarkerBubblePosition`, `useMoveTarget`, …), чиста логіка в `lib/utils/world/`, сервер у `lib/server/world/` (`lock.ts` — блокування по карті).

Підпроєкт 2 додає: `map/` (`WorldTrails`, `WorldEnemies`), `nav/` (`TrailBubble`, `TrailLegend`), `editor/EnemyCard`, `travel/` (`SessionsPanel`, `SessionFormDialog`); хуки `useHeroDrag`, `useHeroSelection`, `useSessionForm`, `useTrailView`, `useWorldEnemies`, `useWorldSessions`, `useWorldTrail`; сервер `session-*`, `trail-handlers`, `enemy-*`.

**Граблі підпроєкту 2:**
- `PointerEvent` не має `x`/`y` у `exceedsDragThreshold` — передавати `{ x: e.clientX, y: e.clientY }`, інакше відстань NaN і drag ніколи не активується.
- Нативний `dragstart` на піні (картинка/посилання) перебиває pointer-жест: `HeroCluster` ставить `onDragStart: noNativeDrag` (`preventDefault`) і `touch-action: none`; нові перетягувані піни роблять так само.
- Шар сліду має лежати під пінами (інакше перехоплює клік по героях/маркерах) і бути `interactive` лише в `select`/`move`.
- `P2003` на вставці запису журналу = сесію видалено між читанням і записом; повторювати з `null`, не 500.
- Моки Prisma в API-тестах світу потребують `worldEnemyPin` (деталі карти читають ворогів) і `worldSession.findFirst` (штамп сесії).
- Частковий унікальний індекс сесій Prisma не знає: після `migrate dev` перевірити, що він не потрапив у drop.

## Стиль шарів (2026-11-20, якість B)

- **Спадкування:** маркер → шар → системне значення за замовчуванням (колір, іконка, прозорість зони, режим підпису). `applyLayerStyle` (`lib/utils/world/marker-style.ts`) виконується один раз у `WorldMapView`; `WorldPins`/`WorldZones` читають ті самі поля маркера й нічого не знають про шари. Поза мапою (бульбашка маркера, пошук місць, шапка панелі) шарова іконка підставляється на місці виклику (`useWorldPlay.styledMarkers`, `DmMarkerBubble`, `WorldMarkerPanel`).
- **Кольори зон:** нові зони більше не пишуть `DEFAULT_ZONE_COLOR` (зберігається `null`); ефективний колір = `applyLayerStyle` + запасний колір у `WorldZones`. Наявні зони зберігають `#d3b060` і не успадковують колір шару, доки ДМ не натисне «Успадкувати від шару». Необов'язковий backfill (не застосовано): `UPDATE world_markers SET color=NULL WHERE kind='zone' AND lower(color)='#d3b060'`.
- **`labelMode`:** `auto` (за замовчуванням, `null`), `always` (завжди, ігнорує зіткнення), `hidden` (ніколи, навіть при hover). Шар із `zoneLabels: 'hidden'` ховає підписи зон без власного режиму. Для маркера без шару опцій «Успадкувати» немає; кнопка «Успадкувати іконку» з'являється лише коли в шару є іконка.
- **Псевдорядок «Без шару»:** `NO_LAYER_KEY` у `useLayerVisibility` живе лише коли існує хоч один шар (інакше легенди немає, і фільтр не можна було б зняти); текст — `world.layers.noLayer`.
- **Приватність:** `WorldViewLayer` віддає гравцеві лише видимі шари без `visibility`/героїв; нові поля стилю (`color`, `icon`, `zoneOpacity`, `zoneLabels`) безпечні для гравця.
- **Граблі:**
  - `sr-only` інпут (абсолютний) без позиціонованого предка прив'язується до viewport і скролить сторінку; причина — `FileButton`, тепер обгортка `relative`. Нові приховані інпути теж потребують позиціонованого предка.
  - Бюджети розміру scope підняті (wfrp battle 114 → 114.5, d20 battle 111.5 → 112), бо простір імен `world` входить у core-namespaces. Пропозиція: винести DM-only `worldEditor`.
  - Політика тестів: написані, але не запускались повним прогоном (один прогін на хвилю).
  - Міграція `20261223000000_world_style` застосована лише до `prodcopy_layers`; на prod піде з деплоєм.
  - Жива перевірка — `prodcopy_layers`/`meauvil-test` через `next start :3010`, не розгорнутий stage.
