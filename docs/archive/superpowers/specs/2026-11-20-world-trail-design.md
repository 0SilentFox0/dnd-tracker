# Карта світу: сесії і слід героїв (підпроєкт 2 із 3)

Попередній підпроєкт: `2026-11-20-world-map-ux-design.md` (режими Будувати/Грати, дерево карт, картка маркера, snap зон). Підпроєкт 3 (шари) цією специфікацією не зачіпається.

## Мета

ДМ веде **іменовані сесії**; кожен рух загону лишає слід, який малюється на карті лінією кольору сесії. ДМ перетягує піни героїв замість роботи лише через панель і ставить **секретні піни ворогів**, яких гравці ніколи не бачать. Гравець бачить слід лише своїх героїв.

## Рішення (узгоджені з користувачем)

- Обсяг: сесії + лінії слідів + drag піна героя + DM-only піни ворогів.
- Сесії явні (ім'я, опис, колір, початок/кінець), не виводяться з пауз у журналі.
- Лінії будуються з наявного `world_travel_log`; нової таблиці точок маршруту немає.
- Видимість: ДМ бачить усе; гравець — слід своїх героїв.
- Drag піна = наявна подорож (туман уздовж шляху, запис у журнал, активна сесія) для всіх вибраних героїв.
- Вороги — вільні DM-only піни, без прив'язки до юнітів, без сліду.

## Що перевикористовується і чому потрібне нове

| Перевикористовуємо | Для чого |
|---|---|
| `planTravel`/`commitTravel`/`travelToPoint`, `travelHandler` | Drag піна викликає ту саму подорож; жодної нової мутації руху |
| `readTravelLog(campaignId, limit, heroIds?)` | Джерело ліній; фільтр по героях уже реалізує видимість гравця |
| `useWorldTravel` (`travel`), `useTravelPanel` | Мутація drag, вибір героїв |
| `WorldHeroes`/`HeroCluster`, `clusterHeroes` | Піни героїв; додаємо режим `draggable` |
| `useMarkerBubblePosition`, `bubble-button.ts` | Бульбашка сесії по кліку на лінію/вузол |
| `worldKeys`, `publishWorldChanged`, `usePusherShowSync` | Інвалідація й оновлення гравця; нових каналів немає |
| `withDM`, `parseBody`, `ownedMap`, `errorResponse`, `API_ERRORS` | Роути сесій і ворогів |
| `HudPanel`, `HudChipTabs`, `HudPill`, `ResponsiveDialog`, `EntityIcon`, `useCrudMutation` | UI панелі сесій, форми, мутації |
| `WORLD_MARKER_ICON_KEYS`, `marker-icon-options.ts`, `MarkerColorField` | Іконка й колір піна ворога |
| `ModeSwitch`, інструменти `WorldToolbar` | Інструмент «Ворог» у режимі Будувати |

**Нове і чому:**
- Сесій у системі немає (журнал плоский) → таблиця `world_sessions` і `sessionId` у журналі.
- Ліній на карті немає → чиста `buildTrails` і шар `WorldTrails` (відрізки й вузли відрізняються від піна/зони).
- Ворогів немає; новий `kind` у `world_markers` відкинуто: `buildWorldView`, показ і сценарні посилання читають усі маркери, і кожен новий фільтр — ризик витоку. Окрема таблиця `world_enemy_pins`, яку не читає жоден гравецький шлях, дає приватність за конструкцією.
- Drag піна — новий жест у `WorldHeroes`; сам рух — існуюча подорож.

## 1. Дані (міграція expand-only, RLS на нових таблицях)

- `world_sessions`: `id`, `campaignId` (FK cascade), `name`, `description?`, `color`, `startedAt`, `endedAt?`, `createdAt`. Індекс `[campaignId, startedAt]`. `ENABLE ROW LEVEL SECURITY`.
- Активна сесія — `endedAt IS NULL`. Не більше однієї на кампанію: старт нової в одній транзакції закриває активну. Захист від гонки — частковий унікальний індекс `(campaignId) WHERE endedAt IS NULL` (SQL у міграції; Prisma його не описує, тож у схемі коментар) і обробка P2002 як 409 `WORLD_SESSION_CONFLICT`.
- `world_travel_log.sessionId String?`, FK `world_sessions` `onDelete: SetNull`, індекс. `commitTravel` і `writeRestLog` ставлять активну сесію на момент запису (читається в тій самій транзакції). Старі записи лишаються з `null`, без бекфілу.
- `world_enemy_pins`: `id`, `mapId` (FK cascade), `name`, `icon?`, `color?`, `dmNote?`, `x`, `y`, `createdAt`, `updatedAt`. Індекс `[mapId]`. `ENABLE ROW LEVEL SECURITY`.
- Ліміти в `lib/constants/world.ts`: `WORLD_SESSION_NAME_MAX = WORLD_NAME_MAX`, `WORLD_SESSION_DESCRIPTION_MAX = 600`, `MAX_WORLD_SESSIONS = 200`, `MAX_WORLD_ENEMY_PINS = 200` на карту, `WORLD_SESSION_COLORS` (палітра 8 кольорів, що читаються на світлій і темній мапі, + сірий для «Без сесії»).

## 2. Сесії (DM)

Роути (`app/api/campaigns/[id]/world/sessions/`): `GET` (список із прапорцем `active`, кількістю записів), `POST` (старт: закриває активну, створює нову; `name` обов'язкове, `color` за замовчуванням наступний із палітри), `PATCH [sessionId]` (ім'я, опис, колір, `end: true`), `DELETE [sessionId]` (записи журналу лишаються, `sessionId` → `null`). `route.ts` тонкий, логіка в `lib/server/world/session-handlers.ts` і `session-store.ts`. Усе через `withDM`; сесія іншої кампанії → 404/403 через `loadOwned`.

Клієнт: `lib/api/world.ts` (`listSessions`, `startSession`, `updateSession`, `deleteSession`), хук `useWorldSessions` у `lib/hooks/world/`, ключі `worldKeys.sessions(campaignId)`, типи в `types/world.ts`. Компонент `SessionsPanel` у `components/world/travel/`: список, активна з бейджем, «Нова сесія» (діалог: ім'я, опис, колір), редагування, завершення, видалення. Панель живе в режимі «Грати» поряд із `TravelPanel`.

Коли активної сесії немає, `TravelPanel` показує непримусову підказку «Почніть сесію, щоб слід мав назву»; рух працює і без неї (запис із `null`).

## 3. Лінії слідів

- **Чиста логіка** `lib/utils/world/trail.ts`:
  `buildTrails(entries: TrailEntry[], mapId: string): Trail[]`, де `Trail = { sessionId: string | null; nodes: TrailNode[]; segments: TrailSegment[] }`. Відрізок `from→to` створюється, якщо `from.mapId === to.mapId === mapId` і `kind === 'travel'`. Записи `enter`/`exit`/`rest` на цій карті дають лише вузол (між картами відрізка немає). Порядок за `createdAt`. Однакові сусідні вузли зливаються (`dedupe` за відстанню в aspect-correct одиницях).
- **Ендпоінт** `GET /world/trail?mapId=`: повертає `{ sessions: WorldSession[], entries: TrailEntry[] }` лише для цієї карти. Для ДМ усе. Для гравця — через `readTravelLog` із `heroIds`: записи, де **всі** герої гравця, дають відрізок і вузол; змішані (є чужий герой) дають лише вузол `to`, `from` відсутній (чужу позицію не розкриваємо). Сесії гравцю віддаються лише ті, що мають видимі йому записи, без нотаток ДМ. Прихованого туманом гравець не отримує: маршрут його героїв уже відкрив туман уздовж шляху (`reveals` по персонажу).
- **Шар** `WorldTrails` у `components/world/map/` (SVG поверх карти, під піни героїв): лінія `stroke` кольору сесії, не залежить від зуму (`vector-effect: non-scaling-stroke`), вузли — малі кружки, останній вузол сесії — акцент. Клік по лінії чи вузлу відкриває бульбашку (`TrailBubble`: назва сесії, опис, дата, герої, тип кроку). Позиціонування — `useMarkerBubblePosition`.
- **Легенда й видимість** (`TrailLegend`): чипи сесій з кольором і перемикачем показу (локальний стан, не серверний). ДМ додатково бачить «Без сесії». Для гравця легенда містить лише його сесії.
- Інвалідація: `worldKeys.trail(campaignId, mapId)` входить у `worldKeysFor` (`useWorldTravel`) і в обробник `world-changed`.

## 4. Drag піна героя (DM, «Грати»)

- `WorldHeroes` отримує `draggable` і `onHeroDrop(ids: string[], to: MapPoint)`. Жест: `pointerdown` на піні → `pointermove` показує ціль-привид (`TargetMark`-стиль) і лінію до неї; `pointerup` → drop. Поріг руху (≈6 px) відрізняє drag від кліку (клік по піну/кластеру працює як раніше). Escape скасовує.
- Склад групи: герої з вибору панелі; якщо потягнутий не входить у вибір, рухається лише він. Кластер тягнеться разом.
- Drop викликає `useWorldTravel.travel` із `rest: 'none'` — те саме, що кнопка «Рухатись»: туман, журнал з активною сесією, `world-changed`.
- Вибір героїв виноситься з `useTravelPanel` у спільний контекст/хук, щоб панель і карта його ділили. Drop поза картою або на ту саму точку — нічого не робить.
- Доступність: пін фокусований; з клавіатури лишається панель (drag не єдиний шлях).

## 5. Піни ворогів (DM-only)

- Інструмент «Ворог» у `WorldToolbar` (режим «Будувати»): клік по карті → форма в картці (назва, іконка з `WORLD_MARKER_ICON_KEYS`, колір, нотатка ДМ).
- Роути `app/api/campaigns/[id]/world/maps/[mapId]/enemies/` (`GET` не потрібен: піни приходять у деталі карти для ДМ), `POST`, `PATCH [enemyId]` (поля й `x`/`y`), `DELETE [enemyId]`; `withDM`, `ownedMap`, ліміт на карту; логіка в `lib/server/world/enemy-handlers.ts`.
- У «Грати» піни тягнуться (PATCH x/y на drop, без журналу, без туману, оптимістично). Рендер лише в DM-режимі `WorldMapView` (`enemies?: WorldEnemyPin[]`): червоний пін із бейджем «лише ДМ».
- **Приватність:** `enemies` додається лише до `WorldMapDetail` для ДМ (DM-відповідь `GET map`). `WorldView`, `buildWorldView`, `readViewerScope`, `ShowState.world`, Pusher-сигнал їх не містять і не читають таблицю. Тест на це обов'язковий.
- Видалення карти каскадом знімає її піни; `clearShowWorld` не зачіпає.

## 6. Тести

- `lib/utils/world/__tests__/trail.test.ts`: відрізки/вузли, різні карти, `enter`/`exit`/`rest`, порядок, злиття вузлів, `null` сесія.
- `lib/server/world/__tests__/`: старт сесії закриває попередню; конфлікт → 409; `commitTravel` і `writeRestLog` ставлять активну сесію й `null` без неї; видалення сесії обнуляє `sessionId`, записи лишаються; trail для гравця — лише власні/мішані як вузол, без `from` чужих; чужа кампанія → 404/403; CRUD ворогів і ліміт.
- Приватність: ворогів немає у відповіді `view`/`trail`/show для гравця.
- UI (`happy-dom`): `SessionsPanel` (старт, редагування), `TrailLegend`, drag-жест `WorldHeroes` (поріг, група, Escape).

## 7. i18n, онбординг, доки

- Тексти в `messages/{uk,en}/world.json` (панель сесій, легенда, бульбашка, інструмент «Ворог», підказки), помилки — `lib/constants/api-errors.ts` + `messages/*/errors.json`; Cyrillic у коді заборонено.
- Запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в обох локалях; оновити підказки `dm.world` і `player.world`.
- Бюджет бандла повідомлень для `d20` (поточний ліміт 111 KB для world) — перевірити, за потреби підняти з обґрунтуванням у коміті.
- Оновити `docs/architecture/world-map.md` (сесії, сліди, вороги, приватність) і `docs/STATUS.md`.

## Поза обсягом

Шари й накладки (підпроєкт 3); слід ворогів; вороги, прив'язані до юнітів/NPC; бекфіл сесій для старих записів; ручна правка кроків журналу; експорт сліду.

## Ризики

- **Витік ворогів/чужих героїв гравцю.** Захист: окрема таблиця, окрема відповідь ДМ, тести приватності.
- **Гонка двох стартів сесії.** Захист: частковий унікальний індекс + транзакція.
- **Drag конфліктує з кліком і pan карти.** Захист: поріг руху, `stopPropagation` як у `HeroCluster`, ручне тестування на тачі в живому прогоні.
- **Тиск на egress.** Trail — один запит на карту, не частіше `world-changed` (з тротлінгом); записи обмежені `TRAVEL_LOG_LIMIT`.
- **Міграція:** унікальний індекс не виражається в Prisma-схемі; перевірити, що `prisma migrate dev` не пропонує його скинути (коментар у схемі, перевірка в ритуалі міграції).
