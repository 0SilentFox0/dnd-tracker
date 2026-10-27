# Карта світу — дизайн

## Контекст

ДМ хоче глобальну карту континенту, по якій герої подорожують у межах кампанії: маркери (точки й зони-королівства) ведуть у детальніші вкладені карти з анімацією «провалу», туман війни відкривається там, де герої побували, гравці лишають нотатки до місць, а сценарій посилається на маркери. Карта не має окремого пункту в головному меню — відкривається з «Показу» і «Сценарію».

Гілка `feat/world-map`, worktree `../dnd-tracker-world`. Схвалено користувачем 2026-10-27.

## Рішення користувача

- Позиція — **у кожного героя своя**; рухає **тільки ДМ**.
- Туман — **свій у кожного гравця** (об'єднання героїв, якими він керує, `controlledBy`). Оцінено як дешевий; відкат до спільного = об'єднати всіх.
- Туман опціональний на карту, **за замовчуванням увімкнений**; ДМ задає радіус розвіювання; відрізок A→B відкривається автоматично.
- Гравець бачить карту **синхронно за ДМ у «Показі»** + **вільний перегляд** своїх відкритих зон.
- **Зони**: ДМ обводить полігон (королівство), заливає кольором; зона = повноцінний маркер (вкладена карта, нотатки).
- Rest: після переходу ДМ обирає «Без відпочинку / Short / Long» — **поки лише запис у журналі**; відновлення ресурсів підключається до `restParty` з `feat/constructor` після його мерджу (окрема мала задача).
- Окрема гілка від main, мерджиться незалежно від constructor.
- Прив'язка маркерів — **до глав і до рядків** сценарію + **згадка `marker`** у тексті.
- Приклад: Ашан (HOMM5 wiki), кожне королівство — окрема зона; детальні карти королівств — **промпти для генерації + тимчасовий збільшений фрагмент Ашана**.

## Поняття і дані

- **Карта** — картинка + налаштування. Одна коренева (континент) на кампанію; вкладені належать маркеру.
- **Маркер** — `point` або `zone` (полігон + колір); опційно веде у вкладену карту; `alwaysVisible` = «відома локація» (видно крізь туман).
- **Позиція героя** — одна: `(mapId, x, y)`. Якщо герой у вкладеній карті, на батьківській він показаний на її маркері.
- Координати нормалізовані 0..1 (заміна картинки з тими ж пропорціями не зсуває маркери).

Таблиці (кожна з `ENABLE ROW LEVEL SECURITY`, expand-only міграція):

| таблиця | поля |
|---|---|
| `world_maps` | id, campaignId, parentMarkerId? (unique), name, imageUrl, width, height, fogEnabled (default true), revealRadius (частка ширини), entryX/entryY |
| `world_markers` | id, mapId, kind point\|zone, x/y, polygon Json?, name, icon?, color?, dmNote?, alwaysVisible, sortOrder |
| `world_positions` | characterId PK, campaignId, mapId, x, y, updatedAt |
| `world_reveals` | id, mapId, characterId, shape Json `{t:"p",x,y}` \| `{t:"s",x1,y1,x2,y2}`, createdAt — append-only; радіус з карти (діє заднім числом) |
| `world_travel_log` | id, campaignId, mapId, characterIds[], from/to Json, toMarkerId?, rest none\|short\|long, byUserId, createdAt |
| `world_notes` | id, markerId, authorUserId, characterId?, visibility public\|private, text, createdAt/updatedAt |
| `campaign_shows.world` | Json? — `{mapId, focusMarkerId?}` коли показ у режимі карти |

**Перехід** (транзакція): обрані герої → нові позиції; кожному відрізок A→B (або точка, якщо героя ще не було на карті) у `world_reveals`; запис у журналі з rest. «Зайти» в маркер з вкладеною картою — позиції в точку входу вкладеної карти + точка-відкриття там. «Вийти» — на батьківську карту в координати маркера.

**Що бачить гравець** (фільтр на сервері, `lib/utils/world/player-view.ts`): геометрія відкриття лише його героїв; маркери в відкритій зоні або `alwaysVisible`; зони, що перетинаються з відкритим (рендер обрізаний туманом); вкладені карти, де бував його герой; позиції лише своїх героїв (+ інших, якщо вони у відкритій зоні); свої приватні + усі публічні нотатки; `dmNote` ніколи. Туман вимкнено → усе видно.

## Екрани

**Редактор ДМ** `/campaigns/[id]/dm/world[?map=]` — без пункту в Header; вхід кнопкою «Карта світу» з панелі «Показу» і тулбару «Сценарію». `HudPage`, хлібні крихти. Інструменти: завантажити/замінити картинку; точка; зона (клік по вершинах, подвійний клік закриває; колір — вільна піпетка з легенди сценарію); панель маркера (назва, іконка, колір, нотатка ДМ, «відома», «Створити вкладену карту», список прив'язаних глав/рядків з переходом); налаштування карти (туман, повзунок радіуса, точка входу); перемикач «очима героя X».

**Керування в грі** (док «Показу»): «Вивести карту гравцям»; чіпи героїв (усі/окремі) → клік ціль → «Перемістити» → вибір відпочинку; «Зайти» / «Вийти»; журнал подорожей.

**Гравець**: екран показу в режимі карти — та ж карта з його туманом; при «Зайти» — анімація провалу (CSS: масштаб до маркера + затемнення → вкладена карта проявляється). Кнопка «Карта» → `/campaigns/[id]/world` — вільний перегляд, позиції своїх героїв, панель маркера з нотатками «Спільні / Мої» (писати лише до видимого маркера; приватні не бачить навіть ДМ), журнал своїх героїв.

**Синхронізація**: який вид показано — `CampaignShow.world` через існуючий show-флоу (`seq`, `private-show-<campaignId>`). Зміни світу (перехід, маркер, нотатка) → сигнал `world-changed {mapId, seq}` у канал показу; клієнт інвалідовує свій запит і дочитує відфільтрований вид (повний стан у спільний канал не шлемо — туман персональний).

**Сценарій**: `markerId?` у `ScenarioSection` і `ScenarioRow` (JSON у `content`, без міграції); чіп 📍 + пікер по дереву карт у `RowBindings` і в заголовку глави; у грі чіп переводить «Показ» на карту маркера з підсвіткою. `MentionType` + `"marker"` (`mentionHref` → редактор на цьому маркері). `hasPlayBindings` враховує маркер.

## Повторне використання

- Upload: схема слайдів — `lib/supabase/scene-slide-storage.ts` (`createSlideUploadTicket`, `ensureBucket` з `lib/supabase/buckets.ts`), `lib/api/decks.ts#uploadSlideImage`, `resizeImageToBlob` (`lib/utils/common/image-resize.ts`), `YEAR_CACHE_SECONDS`. Новий bucket `world-maps`, max edge ~6000 px.
- Рендер картинки: `OptimizedImage` / `next/image` як `MapBackground.tsx`.
- Viewport: `lib/hooks/battle/useMapViewport.ts` → узагальнити в `lib/hooks/common/useViewport` (min/max zoom параметрами), бій переходить на нього.
- Show: `lib/utils/show/show-command.ts`, `lib/server/show/show-store.ts`, `usePusherShowSync`, `lib/utils/show/player-view.ts`, `safePusherTrigger`, `usePusherChannel`.
- API: `parseBody`, `requireDM`/`requireCampaignAccess`, `loadOwned`, `errorResponse`, тексти в `lib/constants/api-errors.ts`.
- UI: `HudPage`, `HudPanel`, `ResponsiveDialog`, `useConfirm`, `QueryState`, колірна піпетка з легенди сценарію.
- Scenario: `RowBindings.tsx`, `lib/utils/scenario/play.ts`, `mention-href.ts`, `types/scenario.ts`.

Нове, бо аналогів нема: геометрія туману/зон (туман лабіринту працює на клітинках бою), моделі світу, рендер карти без бою.

## Структура коду

- `types/world.ts`
- `lib/utils/world/` — `geometry` (pointInPolygon, distToSegment, isRevealed, zoneTouchesReveal), `player-view`, `travel`, `tree`; тести в `__tests__/`.
- `lib/server/world/` — обробники/стор; `app/api/campaigns/[id]/world/{maps,maps/[mapId],markers,markers/[markerId],travel,notes,upload-url,view}/route.ts` — тонкі.
- `lib/api/world.ts`; `lib/hooks/world/` (`keys.ts`, `useWorldView`, `useWorldEditor`, `useWorldTravel`, `useWorldNotes`, `usePusherWorldSync`, `index.ts`).
- `components/world/` — `WorldMapView` (шари: картинка → SVG-зони → маркери/герої → canvas-туман), `editor/`, `play/`, `notes/`.
- Pusher: подія `WORLD_CHANGED_EVENT` у `lib/pusher/channels.ts`.
- `scripts/seed-world-map.ts` (`pnpm seed-world-map <campaignId>`): Ашан (`MapAshan.jpg` 1600×1066), зони Holy Griffin Empire, Irollan, Grimheim, Silver Cities, Heresh, Ranaar, Ygg-Chall, Twilight Archipelago; точки Talonguard, Stonehelm, Karthal, Al Safir, Tor Myrdal, Syrris Thalla, Nar-Ankar; вкладена карта на кожне королівство = збільшений фрагмент Ашана з маркерами міст з вікі. Тільки локально; prod — за командою користувача.
- `docs/assets/world-map-prompts/` — промпт на кожне королівство (географія з вікі, міста, стиль карти HOMM5).

## Помилки

Усе через `errorResponse` з українськими текстами. Нотатка до невидимого маркера / чужа приватна нотатка → 403; чужа кампанія → 404 через `loadOwned`. Перехід — у транзакції. Видалення карти з вкладеними і заміна картинки — через `useConfirm`. Видалення маркера з вкладеною картою — каскад з попередженням.

## Частини (одна гілка, кожна: plan → SDD → фінальний review → live-прогін)

1. **Дані + редактор ДМ** — схема/міграція, bucket/upload, CRUD карт і маркерів, `useViewport`, `WorldMapView` (картинка, зони, маркери), сторінка редактора, вхідні кнопки з «Показу»/«Сценарію», seed Ашана + промпти.
2. **Герої, переходи, туман, нотатки** — позиції, reveals, журнал з rest, canvas-туман, `player-view` + `view` route, «очима героя», вільний перегляд гравця, нотатки.
3. **Показ + Сценарій** — `campaign_shows.world`, керування в доку, екран гравця, анімація провалу, `world-changed`, прив'язки глав і рядків, згадка `marker`, whats-new + help, `docs/architecture/world-map.md`, `docs/STATUS.md`.

Після мерджу constructor: Rest → `restParty`.

## Перевірка

- Unit: геометрія (капсула/точка/полігон, межі), `player-view` (чужий туман, маркери в тумані, приватні нотатки, `dmNote`), `travel` (перший візит, зайти/вийти).
- Route-тести прав: гравець vs ДМ, чужа кампанія.
- `pnpm test:changed` під час роботи; `pnpm test:run`, `pnpm lint`, `pnpm build` перед мерджем.
- Live: локальна БД + seed Ашана; ДМ створює зону/маркер, переміщує двох героїв у різні місця, гравець бачить лише свій туман, «Зайти» з анімацією, нотатки спільні/мої, чіп глави відкриває карту в «Показі»; desktop + 500 px (браузер через субагента Sonnet).
