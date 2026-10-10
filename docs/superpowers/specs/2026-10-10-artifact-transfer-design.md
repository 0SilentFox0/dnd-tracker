# Передача артефактів і артефакти в довіднику

Дата: 2026-10-10. Дві частини, порядок виконання: 1 → 2.

## Мета

- Артефакт — унікальний предмет: одна копія на кампанію, вдягнена на одного героя або нічия.
- Гравець може віддати свій артефакт іншому герою кампанії; ДМ — передати будь-який.
- Гравці бачать у довіднику всі артефакти й сети кампанії та в кого вони зараз.
- Заклинання в довіднику вже є (54 на проді, `lib/cache/info-reference.ts`), але користувач повідомив, що гравці їх не бачать — перевірити під гравцем у браузері й виправити, якщо це баг.

## Рішення, ухвалені з користувачем

- Унікальність: так. Сумки немає — володіти = носити (`inventory.equipped`).
- Хто передає: ДМ (будь-який артефакт будь-кому) і той, хто керує героєм-відправником (`controlledBy`), — без підтвердження отримувача.
- Слот: артефакт іде в той самий ключ слота сітки (`ARTIFACT_GRID_9`) отримувача. Якщо слот зайнятий — **обмін**: предмет отримувача переходить відправнику в той самий слот.

---

## Частина 1. Унікальність і передача

### Зберігання

Без міграції. Джерело істини — `character_inventories.equipped` (JSON `slotKey → artifactId`), як і зараз: його читають бій (`load-character-context`, `extract-artifacts`, `extract-attacks`, `start-build-context`) і лист (`sheet-handler`). Таблицю з `UNIQUE(artifactId)` відкинуто — міграція, бекфіл і переписування п'яти читачів заради кампанії з кількома героями.

Унікальність гарантує сервер: кожен запис `equipped` (PATCH inventory і transfer) виконується в `prisma.$transaction` з `pg_advisory_xact_lock(hashtext('artifacts:' || campaignId))` на початку — два одночасні запити в межах кампанії серіалізуються, перевірка «хто носить» читає вже актуальні дані.

### Чиста логіка — `lib/utils/artifacts/ownership.ts`

- `findHolder(inventories, artifactId, exceptCharacterId?)` → `characterId | null`.
- `planTransfer({ from, to, slot })` → `{ fromEquipped, toEquipped, swappedArtifactId | null }` або помилка: `EMPTY_SLOT` (у відправника в слоті нічого), `SAME_CHARACTER`, `UNKNOWN_SLOT` (ключ не з `ARTIFACT_GRID_9`). Обидва нові `equipped` будуються через `buildEquipped`.

Тести в `lib/utils/artifacts/__tests__/ownership.test.ts`: вільний слот, обмін, порожній слот, сам собі, невідомий слот, `findHolder` з винятком.

### Маршрут передачі

`POST /api/campaigns/[id]/characters/[characterId]/artifacts/transfer`, тіло `{ slot: string, toCharacterId: string }` (Zod). `route.ts` тонкий, логіка в `transfer-artifact.ts` поруч.

1. `requireCampaignAccess(id)`; відправник і отримувач — `loadOwned` (404 для відсутнього, 403 для чужої кампанії); отримувач — персонаж кампанії (`player` або `npc_hero`).
2. Доступ: `isDM` або `from.controlledBy === userId`, інакше 403.
3. Транзакція з advisory lock: читає обидва інвентарі (створює порожній, якщо нема), `planTransfer`, пише обидва.
4. Відповідь: `{ from: Inventory, to: Inventory }`.

Помилки — `errorResponse` з новими українськими текстами в `lib/constants/api-errors.ts` (`ARTIFACT_SLOT_EMPTY`, `ARTIFACT_TRANSFER_SELF`, `ARTIFACT_HELD_BY_OTHER`).

Бій, що вже йде, не змінюється (знімок учасника); передача діє з наступного бою.

### PATCH inventory (ДМ)

`update-inventory.ts`: якщо в тілі є `equipped`, у тій самій транзакції з lock для кожного artifactId перевіряє `findHolder(…, exceptCharacterId = characterId)`; зайнятий іншим → 409 `ARTIFACT_HELD_BY_OTHER` з ім'ям власника.

### Список отримувачів

`GET /api/campaigns/[id]/characters/roster` — для будь-якого учасника: `[{ id, name, avatar, type, equipped }]` усіх героїв кампанії (`player` + `npc_hero`). `equipped` потрібен, щоб показати «обмін на [предмет]»; самі артефакти — з довідника/каталогу за id. Лише імена й вдягнене — листи персонажів лишаються закритими.

### Клієнт

- `lib/api/inventory.ts`: `transferArtifact(campaignId, characterId, { slot, toCharacterId })`; `lib/api/characters.ts`: `getCharacterRoster(campaignId)`.
- `lib/hooks/characters`: `useCharacterRoster(campaignId)` (ключ `characterKeys.roster(campaignId)` у `keys.ts`), `useTransferArtifact(campaignId, characterId)` — після успіху інвалідує листи обох героїв, roster і довідник-власників.
- `useEquipArtifact` — без змін; 409 показується через `useNotify`.

### UI

- **`ItemsTab`** (профіль, гравець і ДМ): у діалозі артефакта кнопка «Передати» (у footer `ResponsiveDialog`), якщо глядач — ДМ або власник героя. Відкриває `TransferArtifactDialog` (`components/character-profile/`): список героїв кампанії, крім поточного (аватар + ім'я); під героєм із зайнятим слотом — «обмін на [назва]». Натиск → `useConfirm` («Передати [артефакт] герою [ім'я]?») → мутація.
- **`CharacterArtifactsSection`** (редактор ДМ): у виборі для слота артефакти інших героїв показані неактивними з підписом «у [ім'я]» (дані з roster).

### Тести

- Маршрут transfer (`app/api/__tests__`): ДМ передає; гравець передає свій; гравець — чужий → 403; отримувач з іншої кампанії → 403; порожній слот → 400; обмін записує обидва інвентарі.
- PATCH inventory: чужий артефакт → 409.
- `TransferArtifactDialog` (happy-dom, `ConfirmProvider`): список без поточного героя, підпис обміну, виклик мутації.

---

## Частина 2. Артефакти в довіднику

- `lib/cache/info-reference.ts`: окрема некешована функція `loadArtifactReference(campaignId)` → `{ artifacts, sets }`. Каталог малий (20 артефактів, 6 сетів), а власники змінюються часто, тому без `unstable_cache` і без нових тегів.
  - Артефакт: `id, name, icon, rarity, slot, description, effects (abilitySummary("artifact", …)), setName, holderName | null`.
  - Сет: `id, name, icon, description, bonuses (abilitySummary("artifactSet", …) або setBonus), artifactNames`.
- `app/campaigns/[id]/info/page.tsx`: вантажить паралельно з кешованими скілами/заклинаннями, передає в `InfoReferenceClient`.
- `useInfoReferenceFilters`: розділ `artifacts` у перемикачі секцій; фільтри — рідкість, слот, сет; пошук за назвою/описом.
- Нові картки `ArtifactReferenceCard`, `ArtifactSetReferenceCard` (`components/campaigns/info/`), секція в `ReferenceSectionAccordion`. Власник: «у [ім'я]» / «вільний».
- Підзаголовок сторінки й плитки: «Скіли, заклинання та артефакти…».
- Тести: `loadArtifactReference` (власник з `equipped`, вільний), фільтри хука, рендер секції.

### Заклинання

Перед реалізацією частини 2 — відкрити довідник під обліковим записом гравця (локально), переконатися, чи секція заклинань показується. Якщо ні — `superpowers:systematic-debugging` і виправлення в межах цієї гілки.

---

## Поза обсягом

- Сумка / невдягнені артефакти, підтвердження передачі отримувачем, журнал передач.
- Артефакти типу `item` (у сітці немає слота) — як і зараз, не вдягаються.
