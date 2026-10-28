# Відпочинок (short/long) на карті світу

Дата: 2026-10-28. Гілка: `feat/world-rest`. Статус: затверджено в чаті, чекає рев'ю спеки.

## Мета

Підв'язати правила відпочинку з конструктора (`rules.outOfCombat`) до карти світу: ДМ відпочиває партією з `TravelPanel`, ресурси героїв відновлюються за правилами кампанії, у журналі подорожі з'являється запис `kind: "rest"`.

## Що вже є (reuse, нічого не дублюємо)

- `restParty(access, {kind, characterIds})` — `lib/server/characters/core/rest-handler.ts`: перевіряє `outOfCombat.persistResources` (409 `OOC_RESOURCES_DISABLED`), блокує героїв в активному бою (`assertNotInActiveBattle`), застосовує `applyRest` (`lib/utils/characters/resources/rest.ts`) з `longRestHitDice`, пише `character_logs`.
- Правила: лише `outOfCombat.persistResources` і `longRestHitDice` — нових налаштувань не потрібно.
- Подорож (`travel`/`enter`/`exit`) вже приймає `rest: none|short|long` і пише його в `world_travel_log.rest`, але ресурси не відновлює (`docs/architecture/world-map.md`, «Rest лише запис»).
- `world_travel_log.kind` — String: міграції немає.
- Короткий відпочинок лише відкриває вікно `shortRestOpen`; кістки хітів гравці витрачають самі.

## Рішення

- Якщо `persistResources` вимкнено: кнопка відпочинку на карті вимкнена з підказкою; відпочинок разом із подорожжю лишається чистою позначкою в журналі (поточна поведінка). Помилок 409 посеред подорожі немає.
- Без одного атомарного `$transaction` подорожі й відпочинку: `restParty` має власну транзакцію з `lockCharacters`. Порядок: спершу відпочинок, потім запис подорожі.

## Дизайн

### Сервер

1. `lib/server/world/rest.ts` — `applyWorldRest(access, kind, characterIds): Promise<{ applied: boolean }>`. Якщо `persistResources` вимкнено — `{ applied: false }` без помилки; інакше викликає `restParty`.
2. Zod: `restWorldSchema` у `lib/schemas/world.ts` — `{ mapId, characterIds (як у travelSchema), kind: "short" | "long" }`.
3. `POST /api/campaigns/[id]/world/rest/route.ts` — тонкий; `restHandler` у `lib/server/world/travel-handlers.ts`: `withDM` → `parseBody` → `ownedMap` → `validHeroes` (+ усі герої на цій мапі, інакше `WORLD_HERO_INVALID`) → `applyWorldRest`. Якщо `applied` — запис журналу `kind: "rest"` (`rest` = kind, `from` = `to` = поточна позиція першого героя, `characterIds`) → `publishWorldChanged(campaignId, mapId)`. Відповідь `{ ok: true, applied }`. Якщо `applied: false` — запису в журнал немає.
4. `travel`/`enter`/`exit`: при `rest ≠ none` перед `commitTravel` викликається `applyWorldRest`; його 409 (герой в бою) зупиняє подорож. Правила вимкнено — як зараз.
5. `TRAVEL_KINDS` (`types/world.ts`) += `"rest"`; `readTravelLog` без змін, окрім нового kind.

### Клієнт (шари з CLAUDE.md)

- `lib/api/world.ts`: `restHeroes(campaignId, data)`.
- `lib/hooks/world/useWorldTravel.ts`: мутація `rest` (`invalidateKeys` як в інших, `errorText`).
- `lib/hooks/world/useTravelPanel.ts`: `restNow`, `restEnabled` (з правил кампанії через наявний хук кампанії — конкретний хук визначити в плані).
- `components/world/travel/TravelPanel.tsx`: кнопка «Відпочити» (kind = поточний вибір short/long; при `none` — вимкнена); вимкнена з підказкою «Ресурси між боями вимкнені в правилах кампанії», коли `restEnabled = false`. Чіпи біля подорожі лишаються.
- `TravelLog.tsx`: `KIND_BADGE.rest` — «Відпочинок», іконка `Moon`.

## Тести

- `applyWorldRest`: увімкнено / вимкнено / герой в активному бою.
- handler `rest`: успіх із записом, вимкнені правила без запису, чужа мапа/герой → 4xx, герой не на мапі.
- `travel`/`enter`/`exit` з `rest`: відновлення викликається, 409 зупиняє подорож, вимкнені правила — лише позначка.
- Хук панелі, компонент (вимкнена кнопка + підказка), `readTravelLog` з `kind: "rest"`.

## Поза межами

Токени 5e, офіційні шаблони на prod, Obojima, зміни `rest-handler.ts`, UI гравця (гравці бачать лише запис у своєму журналі).

## Завершення

`lib/onboarding/whats-new.ts`, `docs/architecture/world-map.md` (замінити рядок про «лише запис»), `docs/STATUS.md` (прибрати `restParty` з відкритого), `/simplify` на diff, один повний `pnpm test:run`.
