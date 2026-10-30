# Герої: підсумок (stash) і чернетки гравця

## Підсумок (stash)

- Колонка `stash` у `CharacterInventory` (масив id артефактів) + таблиця `inventory_log`. **Власність артефакта = `equipped` ∪ `stash`**; усі перевірки «хто тримає» (`findHolder`, `lib/cache/artifact-reference.ts`) враховують обидва місця.
- Одна дія гравця/DM = один `POST …/characters/[characterId]/stash` (`spend`/`gain`/`setMoney`/`addItem`/`editItem`/`useItem`/`removeItem`/`stash`/`equip`/`grant`/`revoke`). Логіка — чистий редуктор `applyStashAction` (`lib/utils/inventory/stash-actions.ts`); роут лише валідує, бере лок кампанії (`lockCampaignArtifacts`) і пише результат та рядок журналу в одній транзакції.
- Витрата монет із решею — `lib/utils/inventory/money.ts`. `grant`, `revoke`, `setMoney` — лише DM.
- `inventory_log` лише додається (рядки не змінюються й не видаляються). Види: `money_*`, `item_*`, `artifact_stash|equip|unequip|grant|revoke|transfer`. Підписи — `components/character-profile/stash/describe-log.ts`; журнал читається курсором (`stash/log`).
- Передача артефакта іншому герою кладе його в підсумок отримувача (`artifacts/transfer`).
- DM-форма інвентарю (`PATCH …/inventory`, `equipSlot`): артефакт, що був у слоті, не губиться, а йде в кінець підсумку; запис журналу — `artifact_equip` (з `swappedArtifactId`) або `artifact_unequip` («знято в підсумок (DM)»), коли слот очищено. Нове розміщення не-щитового артефакта в клітинку «Щит» відхиляється (422, `OFF_HAND_EQUIP`) незалежно від режиму класів (виняток — легка ближня зброя, коли класи ввімкнені); уже збережені значення клітинки приймаються без змін.
- Клієнт: `useStash` (`lib/hooks/…`) — `staleTime`, `setQueryData` з відповіді POST, інвалідація листа/ростера/довідника лише для дій, що це зачіпають. Вільні артефакти для видачі — окремий DM-ендпоінт `stash/free-artifacts`, що вантажиться лише при відкритому діалозі.
- Клієнт: вкладка «Інвентар» (`components/character-profile/inventory/`, хук `useInventory`) замінила «Речі» й «Підсумок». Клітинки рюкзака й правила дропу — `buildBackpackCells`/`dropAction` (`lib/utils/inventory/backpack.ts`). Увага: `SheetArtifact.slot` у листі — ключ клітинки (напр. `ring1`), а `StashArtifact.slot` — тип слота (`ring`). Drag-and-drop лише на десктопі; тап-дії (деталі, «Вдягнути»/«Зняти»/передати/використати) працюють усюди, на телефоні деталі — bottom sheet.

## Чернетки гравця

- `characters.status`: `pending` (чернетка) → `active` (схвалено DM). Гравець без активного героя створює чернетку (`POST …/characters/draft`), редагує її (`PATCH …/[characterId]/draft`), DM схвалює або повертає з коментарем (`…/review`).
- **Кожен запит героїв для бою, балансу, ростера, AI й підсумку партії мусить містити `ACTIVE_CHARACTER`** (`lib/constants/characters.ts`) — чернетка ніколи не потрапляє в бій. Нові запити по `character` без цього фільтра — помилка.
- Одна чернетка на гравця: перевірка й створення під `pg_advisory_xact_lock` (`lib/server/characters/draft-lock.ts`); ще до завантаження аватара — швидка перевірка, щоб відмова не лишала файлів у сховищі.
- **Режим класів** (`rules.classes.enabled` і в кампанії ≥1 клас, `draft-class.ts`): чернетка приймає `classId` (обов'язковий, інакше 422 `DRAFT_CLASS_REQUIRED`) замість `class`/`archetype`; сервер пише `classes: [{ classId, level: 1 }]` через `applyClasses` (рівень, текст класу, слоти), `archetype = null`. Генератор бере випадковий клас кампанії; характеристики — за пріоритетом: ability заклинань, рятівні кидки класу, решта. Форма показує вибір класу замість архетипу. Без класів — поведінка HOMM без змін.
- Характеристики валідуються на сервері (`validateAbilityScores`: стандартний набір або point-buy), а не довіряються клієнту. Загальний `PATCH` героя для власника-чернетки дає 403 (`DRAFT_EDIT_VIA_DRAFT`).
- Збереження чернетки зберігає `id` незмінених цілей і всі цілі, написані DM (`mergeDraftGoals`); порожній `avatar` очищає аватар, відсутнє поле не чіпає.
- Генератор (`lib/utils/characters/generate`) і анімація «прокрутки» (`useRollReveal`, `usePlayerDraftForm`) — на клієнті; клавіша Esc пропускає анімацію.

### Аватари

- **Портрети рас:** `GET …/draft/portraits` без `race` повертає `{ pools: { [раса]: string[] } }` (аватари юнітів кампанії, до 50 на расу); форма завантажує пули всіх рас при монтуванні (кеш 1 год), тож перший `generate.all()` одразу має крок аватара. Кнопка «Інший портрет» неактивна, поки пул раси порожній чи вантажиться. Портрет — посилання на зображення юніта (не копія).
- **AI-аватар:** `POST …/draft/avatar` генерує зображення на ключі DM (`pickDmImageModel`), 1:1, ≤512 px, WebP у бакет `avatars`; `maxDuration = 120`, `request.signal` скасовує виклик. Ключ ніколи не залишає сервер.

### AI на ключі DM для гравців

- Передісторія й аватар: `guardDraftAi` (DM, або гравець без активного героя) + `limitDraftAi` (10 викликів / 10 хв на користувача й кампанію, окремий `scope` на кожну функцію).
- Ліміт — Upstash (`lib/utils/api/rate-limit.ts`). Без Upstash (на проді його зараз немає) виклики з `memoryFallback: true` рахуються ковзним вікном у пам'яті інстанса (ключ scope+користувач+кампанія, обмежений розмір мапи); інші ендпоінти лишаються fail-open. Ліміт per-instance, тобто на кількох інстансах ефективно ширший.
- Доступність AI для форми (`GET …/draft/backstory`) перевіряє лише наявність ключів DM (`readDmAiAvailability`), без розшифрування; клієнт кешує відповідь 5 хв.

## Refactor S6/S8: derivation і lifecycle

Чистий `lib/utils/characters/classes/application.ts` володіє class validation/derivation, server `apply-classes.ts` — loading та compatibility exports. Participant context підтримує scoped preloaded feat/background refs; grants/pools складає `character-spell-grants.ts`. Integrated SQL lifecycle create→choices→level-up→rest→battle→finish→sheet перевіряє збереження derived slots, origin feat, HP і spent resources; це local store/service evidence, не browser auth end-to-end.

`useBackgroundForm` володіє state/patch/validation/submit/cancel; mutation — чинний `useUpdateBackground`/`useCrudMutation`, navigation — `useNavigateFresh`. BackgroundForm рендерить HUD/choices. Class/feat body normalization лишається доменною. Докази — [S6](../archive/superpowers/plans/2026-10-26-constructor-refactor-s6-progress.md) і [S8](../archive/superpowers/plans/2026-10-26-constructor-refactor-s8-progress.md).

## Шлях персонажа (вкладка `skills`)

Для героя з `sheet.classProgression` вкладка `?tab=skills` зветься «Шлях» і показує `CharacterPath` (`components/character-profile/path/`) замість DM-таблиці `ClassProgressionMap` (вона лишається лише в редакторі класу, `mode="dm"`). Дані — наявний `buildClassProgression`; нових API чи колонок нема. Чисте розбиття на «отримано / зараз / далі» і підрахунок невибраних заклинань — `lib/utils/characters/classes/path.ts` (`splitPathRows`, `rowItems`, `openSpellPicks`). `SpellPicksNudge` показує банер «Оберіть заклинання» на «Шляху» й у «Магії», коли є відкритий `kind: "spell"` вибір. Заклинання клас сам не видає: їх вибирають у «Виборах», тож без банера кастер лишався б із порожньою книгою. Довгий `choice.description` у `ChoicePicker` згортається під «Докладніше». Іконки feature поки літера класу (справжні — окремий останній етап). Спек: `docs/superpowers/specs/2026-10-30-character-path-stage1-design.md`.
