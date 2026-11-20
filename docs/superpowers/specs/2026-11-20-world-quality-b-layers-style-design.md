# Карта світу: якість редактора, частина B — стиль шарів, зон і підписів

Епік «World-Anvil-рівень»: A (вьюпорт, готово на `feat/world-quality`, tip `7a88f348f`), **B (цей документ)**, C (туман, слід, дрібне). B спирається на компактну мітку й бокову панель з A.

Тестова база: `prodcopy_layers`, кампанія `meauvil-test` (Nouerland: 14 зон, 124 міста).

## Цілі

1. Шар — це група маркерів зі своїм виглядом: дефолтні іконка й колір пінів, дефолтна заливка зон, режим підписів зон. Один рядок у списку шарів міняє вигляд усієї групи.
2. Маркер перевизначає дефолт шару лише там, де це потрібно; «наслідувати від шару» повертає дефолт.
3. DM може сховати підпис зони (чи всіх зон шару), коли він дублює текст на самій картинці, і може примусово показати важливий підпис.
4. У списку шарів є швидкий перемикач «показати/сховати» для DM і гравця, включно з маркерами без шару.

Не входить: нова сутність «група», кольорові теми зон, межі зон як окремий стиль, шрифт підпису, масові дії над маркерами, підпис пінів.

## Що перевикористовується

| Є | Для чого |
|---|---|
| `WorldLayer` / `world_layers`, `layer-handlers.ts`, `layer-store.ts`, `lib/schemas/world.ts` | розширюємо, не створюємо нового |
| `buildWorldView` + `layerOk` (`lib/utils/world/player-view.ts`) | єдине місце видимості; віддає `WorldViewLayer` |
| `useLayerVisibility`, `LayerLegend` | локальний перемикач показу; додаємо псевдорядок «Без шару» |
| `components/world/editor/layers/LayerRow.tsx`, `MarkerLayerField`, `MarkerColorField`, `marker-icon-options.ts`, `MARKER_ICON` | поля стилю в рядку шару й картці маркера |
| `zoneLabelVisible` / `zoneLabelSize` (`zone-labels.ts`) | розширюється параметром `labelMode`, правила `auto` не змінюються |
| `WorldZones` (`FEATHER`, `fillOpacity` 0.6/0.74), `WorldPins` (`sealStyle`) | читають стиль через `resolveMarkerStyle` |
| `lib/server/assistant/actions/world-service/*` | ті самі Zod-схеми; нові поля додаються й сюди, інакше асистент їх не побачить |

Нового мінімум: `resolveMarkerStyle`, шість колонок, поля в двох формах, псевдорядок легенди.

## Дані (expand-only міграція `20261223000000_world_style`)

`world_layers`, усі nullable:
- `icon text` — ключ з `MARKER_ICON`;
- `zoneOpacity double precision` — 0.1–1;
- `zoneLabels text` — `auto | hidden` (`null` = `auto`).

(`color` у шарі вже є й тепер діє як дефолт кольору пінів і зон.)

`world_markers`, nullable:
- `labelMode text` — `auto | hidden | always` (`null` = наслідувати шар);
- `fillOpacity double precision` — лише для зон, 0.1–1.

RLS уже ввімкнено на обох таблицях, нових таблиць нема. Існуючі `icon`/`color` на маркері стають перевизначенням: `null` = наслідувати. Існуючі дані не змінюються, тож вигляд наявних карт той самий, поки шар не отримає дефолтів.

Валідація: Zod у `lib/schemas/world.ts` (діапазони, enum); ключ іконки перевіряється на сервері проти списку `MARKER_ICON`-ключів (спільна константа, не копія).

## Чиста логіка

`resolveMarkerStyle(marker, layer | null): { icon, color, fillOpacity, labelMode }` у `lib/utils/world/marker-style.ts`.
Порядок: значення маркера → дефолт шару → системний дефолт (`DEFAULT_ZONE_COLOR`, іконка `MapPin`, `0.6`, `auto`). Для `labelMode` шар дає `hidden`, якщо `zoneLabels = 'hidden'`, інакше `auto`.

`zoneLabelVisible({..., labelMode})`:
- `hidden` → завжди `false` (hover теж не показує);
- `always` → завжди `true`, ігнорує зум, колізії та перекриття, але не туман (прихована зона не підписується);
- `auto` → як зараз.

Підпис, який `always` виводить на колізію, не відсікається; зсув не потрібен (це рішення DM).

## Видимість і приватність

Нові поля — чистий стиль і публічні. `WorldViewLayer` отримує `icon`, `zoneOpacity`, `zoneLabels`; `visibility` і `heroIds` туди, як і раніше, не потрапляють. Маркер у відповіді вже несе `labelMode`/`fillOpacity`. Гравець бачить лише стиль видимих шарів і маркерів, шлях видимості (`layerOk` + туман) не змінюється. Тест: `buildWorldView` не віддає `visibility`/`heroIds` і не розкриває стиль прихованого шару.

## API

Нових роутів нема. Розширюються Zod-схеми й хендлери:
- `POST/PATCH world/maps/[mapId]/layers`, `world/layers/[layerId]`: `icon`, `color`, `zoneOpacity`, `zoneLabels`;
- `POST/PATCH` маркера: `labelMode`, `fillOpacity`; `icon: null`/`color: null` явно означають «наслідувати».
- Асистент (`world-service/inputs.ts`, `writers-markers.ts`) приймає ті самі поля.

Типи: `types/world.ts` (`WorldLayer`, `WorldViewLayer`, `WorldMarker`, `Create/Update…Data`), `lib/api/world*` без нових функцій.

## UI

- **Рядок шару (`LayerRow`):** іконка (вибір із `marker-icon-options`), прозорість зон (слайдер, крок 0.05), підписи зон `auto/hidden`. Існуючий колір лишається.
- **Картка маркера (`DmMarkerBubble`, панель маркера):** іконка й колір з кнопкою «Наслідувати від шару» (видима, лише якщо в маркера є шар і власне значення); для зони додаються режим підпису `auto/hidden/always` і прозорість. Поле показує «успадковано від шару», коли значення `null`.
- **Легенда (`LayerLegend`):** око показати/сховати вже є; додається рядок «Без шару» (локальний перемикач маркерів із `layerId = null`), коли шари існують. Стан тримає `useLayerVisibility` (ключ `__none__`), гравець і «Очима героя» отримують його без змін.
- **Карта:** `WorldPins` і `WorldZones` та підпис зони беруть вигляд з `resolveMarkerStyle`; зона малює `fillOpacity` з цієї функції (вибрана +0.14, стеля 1).
- i18n: ключі в `messages/{uk,en}/world.json`; запис `whatsNew` у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` у обох `messages/*/whatsNew.json`.
- Обмеження компонентів: ≤ ~7 props (групи об'єктами), `WorldMapView` без нових props (exempt 14), хуки з барела `@/lib/hooks/world`, діалоги через `ResponsiveDialog`.

## Тести (пишуться агентами, запускаються один раз у кінці)

- `marker-style.test.ts`: пріоритет маркер → шар → дефолт, `null` vs значення, `zoneLabels` шару.
- `zone-labels.test.ts`: `hidden` (навіть hover), `always` (колізія, зум), `auto` без змін.
- `view-handlers`/`player-view`: стиль шару видимий, `visibility`/`heroIds` не витікають, стиль прихованого шару не віддається.
- Хендлери шару й маркера: нові поля, межі, невалідний ключ іконки → 400, `icon: null` скидає.
- Компонентні: `LayerRow` (поля), поле «Наслідувати від шару», `LayerLegend` («Без шару»).
- Асистент: нове поле проходить через `world-service`.

## Гейти й жива перевірка

Один повний `pnpm test:run`, `tsc`, `pnpm cycles`, `lint:dirs` на гілці в кінці. Міграцію застосувати до `prodcopy_layers` (`prisma migrate deploy` на цій БД).
Жива перевірка (`next start -p 3010`, БД `prodcopy_layers`, `meauvil-test`): створити шар, задати іконку/колір/прозорість, переконатися, що маркери без власного стилю змінилися, а з власним — ні; «Наслідувати» повертає; сховати підписи шару й один підпис примусово показати; перемикач «Без шару»; гравець бачить стиль, але не `visibility`; телефон 390 px.

## Відомі ризики

- `NODE_OPTIONS=--max-old-space-size=10240` для `next build`.
- Колізії експорту barrel `lib/hooks/world`; нові хуки не потрібні, лише розширення наявних.
- Часткові дублікати схем у асистенті: перевірити, що змінено обидва місця.
