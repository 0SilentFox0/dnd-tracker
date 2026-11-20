# Карта світу, підпроєкт 3: шари

Фінальна частина епіку World map UX (1 — редактор і вигляд гравця, 2 — сесії й слід, 3 — шари). Хвости підпроєкту 2: [world-layers-open-items](2026-11-20-world-layers-open-items.md).

## Мета

ДМ групує маркери й зони карти в **шари**, кожен із необов'язковою накладеною картинкою-прямокутником і видимістю «ДМ / усі / окремі герої». Гравець бачить вміст шару лише через `buildWorldView`.

Успіх: ДМ ховає секретний шар від усіх, відкриває іншому героєві окремий шар; гравець без доступу не отримує в жодній відповіді ані маркерів, ані картинки, ані назви шару.

## Рішення власника (2026-11-20)

- Накладка — прямокутник (`x, y, w, h` у 0..1) + прозорість.
- **Туман діє поверх шару:** видимий шар не обходить туман. Картинка обрізається туманом так само, як базова карта; маркери шару видно лише у відкритих зонах або з `alwaysVisible`.
- Маркер належить 0..1 шару; без шару працює як раніше.

## Дані (expand-only, RLS на нових таблицях)

- `world_layers`: `id`, `mapId` (FK cascade), `name`, `color?`, `visibility` (`dm` | `all` | `heroes`, default `dm`), `sortOrder`, `imageUrl?`, `imgX`, `imgY`, `imgW`, `imgH` (Float, default 0/0/1/1), `opacity` (Float, default 1), `createdAt`, `updatedAt`. Індекс `(mapId, sortOrder)`.
- `world_layer_heroes`: `layerId` (cascade), `characterId` (cascade), PK `(layerId, characterId)`. Має сенс лише при `visibility = heroes`.
- `world_markers.layerId` (nullable, FK `onDelete: NoAction`): видалення шару через хендлер, який перед цим явно «роз'єднує» чи видаляє маркери (SetNull тихо відкрив би приховані маркери всім).
- Нова міграція `20261222000000_world_layers` (після `20261221000000`).
- Новий шар за замовчуванням `dm`: створення нічого не розкриває.

## Видимість (єдине місце)

`visibility()` у `lib/utils/world/player-view.ts` отримує `layerOk(marker)`:

- `layerId == null` → ok;
- шар `all` → ok; `heroes` → ok, якщо один із `viewer.heroIds` у `heroIds` шару; `dm` → ні.

Фільтр застосовується разом із туманом (обидва мають пройти). Далі автоматично: `visibleMarkerIds`, нотатки (403 на маркер прихованого шару), пошук місць, фокус показу. «Очима героя» (`asHero`) вже дає `heroIds = [герой]`.

`buildWorldView` додає `layers: WorldViewLayer[]` — лише видимі шари: `{ id, name, color, imageUrl, rect, opacity }`, **без** `visibility` і списку героїв. Шар без картинки віддається теж (для чипа). Дані шарів у `WorldViewInput` передаються окремим полем `layers` (з `readViewerScope`/`view-handlers`).

Ризик, який перевіряємо тестом: вхід у вкладену карту з маркера прихованого шару. `pointOnMap` бере координату входу з усіх маркерів (поведінка з частин 1–3, лише для героїв, яких гравець уже бачить); тест фіксує, що координата прихованого маркера не потрапляє в `markers`/`layers` і що інші герої, чиї позиції відображаються через прихований вхід, не розкривають його (hero видно лише якщо `visible(at)`).

Приватність ворогів: `world_enemy_pins` шарами не читаються; `enemy-privacy.test.ts` розширюється на `layers`/`layerId`.

## API (усе через `withDM`, окрім `view`)

- `world/maps/[mapId]/layers` — `GET` (ДМ: повні шари + `heroIds`) / `POST`; `world/layers/[layerId]` — `PATCH` / `DELETE` (`{ markers: 'ungroup' | 'delete' }`, обов'язкове, якщо в шарі є маркери; інакше 409 `WORLD_LAYER_HAS_MARKERS`) / `PUT heroes`. Те саме через factory-незалежні hand-written хендлери (`layer-handlers.ts`, `layer-store.ts`) у стилі `session-*`.
- Маркер: `PATCH`/`POST` приймають `layerId` (перевірка, що шар тієї ж карти: `loadOwned`-стиль; інакше 404/403).
- Картинка шару: той самий `upload-url`/`discard-upload`, що й у карти.
- Ліміти: `MAX_WORLD_LAYERS` на карту, `MAX_LAYER_HEROES` не потрібен (≤ героїв кампанії).
- Відповідь `GET map` для ДМ містить `layers`; відповідь гравцеві — тільки через `buildWorldView`.
- Подія `world-changed` після змін шарів/маркерів (вже публікується в маркерних хендлерах; додати для шарів).

## UI

ДМ, режим «Будувати», панель «Шари» (`components/world/editor/layers/`):
- список шарів із оком (перемикач показу в редакторі), перейменування, колір, видимість (`SelectField` + мультивибір героїв), вибір «активного шару» (нові точки/зони потрапляють у нього);
- картинка: завантаження (`useWorldMapUpload`-патерн), прямокутник із drag і resize на карті (`LayerImageRect` у `components/world/map/`), прозорість (`Slider`);
- картка маркера: вибір шару; видалення шару — `useConfirm` з вибором «роз'єднати/видалити маркери».

Карта (`WorldMapView`): `WorldLayerImages` між базовою картинкою й зонами, під `WorldFog` (туман обрізає). Гравець: чипи видимих шарів із **локальним** перемикачем показу (`LayerLegend`, за зразком `TrailLegend`); приховування картинки й маркерів шару — на клієнті, не впливає на інших.

## Reuse (перевірено в `lib/utils/world`, `lib/hooks/world`, `components/common|ui|hud`)

| Потреба | Беремо | Нове й чому |
|---|---|---|
| Завантаження картинки | `useWorldMapUpload`, `upload-url`/`discard-upload` | — |
| Чипи шарів із локальним показом | патерн `TrailLegend` + `HudToggleChip` | `LayerLegend`: інші дані |
| Drag прямокутника | спільний `usePointerDrag` (виноситься з `WorldPins` і `WorldEnemies`) | хук — бо це закриває дубль drag із хвостів |
| Debounce-коміт кольору/прозорості | `useDebouncedCommit` (виноситься з `useMarkerFields` і `EnemyCard`) | закриває дубль |
| Селекти/слайдер/діалоги | `SelectField`, `Slider`, `ResponsiveDialog`, `useConfirm` | — |
| Список/вибір героїв | `useHeroSelection`/`activePlayerHeroes` | — |
| CRUD-обробники | стиль `session-handlers`/`session-store`, `withDM`, `parseBody` | не `ContentKind` — світ ручний |
| Видимість | `buildWorldView` / `visibility()` | `layerOk` |

## Хвости підпроєкту 2

Закриваємо: лічильник записів у `GET sessions`/`SessionsPanel`; B2 (`HeroEyesSelect` робить сторінку 501 px на 390 px); дубль drag → `usePointerDrag`; дубль debounce → `useDebouncedCommit`; `pickBubble` замість вкладеного тернарного в `page-client.tsx`/`WorldPlayClient.tsx`; гравцеві не віддаємо `active` і `description` сесії (приватність).
Закриваємо без змін: вузол сліду під піном героя (перевіряємо вживу, виправляємо лише якщо клік реально втрачається); Escape під справжньою мишею (перевірити вживу).
Старт: `/code-review` по `lib/server/world`, `components/world`, `lib/hooks/world`; серйозне виправляємо, дрібне — у список у `docs/STATUS.md`.

## i18n і онбординг

Тексти — `messages/{uk,en}/world.json`; помилки — `lib/constants/api-errors.ts`; запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в обох локалях; підказка `dm.world`/`player.world` про шари. Бюджет i18n (`wfrp member`) — перевірити тест після додавання ключів.

## Тести

Чиста логіка (`layerOk`, `buildWorldView` із шарами: `dm`/`all`/`heroes`, туман+шар, asHero, відсутність `visibility`/`heroIds` у виході); хендлери (CRUD, 409 при маркерах, шар чужої карти, heroes join); приватність (гравцевий GET не містить прихованого шару/картинки/маркера; нотатка до маркера прихованого шару → 403; `enemy-privacy`); хуки/компоненти (`LayerLegend`, drag). Агенти тести пишуть, не запускають; один повний `test:run` в кінці.

## Поза обсягом

Шари між картами, порядок накладання кількох картинок понад `sortOrder`, анімація/розтягнення полігоном, окремий туман шару, видимість шару за сесією.

## Деплой

Міграція `20261222000000_world_layers` (expand-only, RLS на обох таблицях) піде з деплоєм main; стара міграція `20261221000000` також ще не на проді. Не мерджити й не пушити без «так».
