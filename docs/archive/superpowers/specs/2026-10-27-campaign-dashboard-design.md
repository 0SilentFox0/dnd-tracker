# Дашборд кампанії — редизайн

Дата: 2026-10-27 · Гілка `feat/campaign-dashboard` (worktree `../dnd-tracker-dashboard`)

## Мета

Сторінка `app/campaigns/[id]/page.tsx` — плаский ряд із 12 однакових `HudTile`. Потрібно: зберегти вайб таверни (фон, HUD-панелі), але щоб DM і гравець за секунду знаходили, куди йти.

Основний сценарій DM — **підготовка між сесіями** (сценарій, бібліотеки, схвалення). Гравець — швидко до свого героя або бою.

Критерій успіху: без прокрутки видно «що робити далі» і потрібну групу розділів — і на десктопі, і на 390px.

## Що перевикористовуємо

- `HudPage`, `HudPageHeader`, `HudPanel`, `HudTile` (`components/hud/page`), `HudSection` (`components/hud/form`).
- `CampaignMembersList`, `CampaignSettingsButton`, `InviteCodeDisplay`, `OnboardingChecklist` + `PrefetchedQuery` — без змін, лише переставляються.
- `SearchInput`, `useSearch`, `SearchEmptyState`, `matchesQuery` (злито в main `146d6877`).
- `OptimizedImage` для портрета, `BATTLE_STATUS_LABEL`, `CharacterStatus`, `CharacterType`, `pluralUk`.
- Новий компонент плитки не створюємо: `HudTile` отримує опційний проп `compact`.

## Розкладка

```
HudPageHeader (назва, опис, email)
grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4
├─ основна колонка
│   ├─ DmNextSteps      (лише DM)
│   ├─ PlayerHeroCard   (лише гравець)
│   └─ DashboardGroups  (пошук + групи розділів)
└─ бічна колонка (на телефоні — після основної)
    ├─ CampaignSummaryPanel — макс. рівень, код запрошення (#invite), статус, ⚙ (DM)
    ├─ HudPanel «Учасники» — CampaignMembersList
    └─ OnboardingChecklist
```

Бічна колонка вузька (320px): блок налаштувань стає вертикальним списком (2 колонки «мітка / значення»), а не сіткою з 4 колонок. Якір `#invite` зберігається (на нього веде онбординг).

## Компоненти (`components/campaigns/dashboard/`)

### `DmNextSteps` (server)

Акцентна `HudPanel` «Що далі», два рядки:

- **Підготовка** (кожен пункт — лише якщо є дані):
  - «На схваленні: N» → `/campaigns/[id]/dm/characters` (якщо N > 0);
  - до 3 сторінок сценарію за `updatedAt desc` → `/campaigns/[id]/dm/scenario/[pageId]`;
  - до 3 боїв `prepared`/`active` (спершу `active`), з бейджем `BATTLE_STATUS_LABEL` → `/campaigns/[id]/battles/[battleId]`.
- **Сесія**: кнопки «Показ» (`dm/show`) і «Музика» (`dm/music`) — завжди.

Якщо в «Підготовці» порожньо — рядок не рендериться (лишається «Сесія»).

Props: `{ campaignId, data: DmDashboardData }`.

### `PlayerHeroCard` (server)

- Немає героя → заклик «Створити персонажа» → `/campaigns/[id]/character`.
- Є герой: портрет (`OptimizedImage`, фолбек — ініціал), імʼя, раса · клас, рівень, КБ, швидкість; кнопка «Відкрити героя» → `/campaigns/[id]/character`.
- Бейджі: «На схваленні» (`PENDING` без `reviewNote`), «Повернуто ДМ» + текст `reviewNote` (`PENDING` з `reviewNote` — окремого статусу відхилення в `CharacterStatus` немає), «Новий рівень» (`seenLevel != null && seenLevel < level`).
- У бою (активний бій з учасником-героєм): кнопка «До бою» → `/campaigns/[id]/battles/[battleId]` і HP учасника `currentHp/maxHp` (+ `tempHp`, якщо > 0).
- Точка розширення: HP рендериться окремим під-блоком `HeroHp`, що приймає `{ current, max, temp } | null`. Коли constructor принесе постійне HP (залежно від режиму гри), джерело даних підставляється в `readPlayerDashboard` без зміни розкладки. Зараз поза боєм HP не показується.

Props: `{ campaignId, data: PlayerDashboardData }`.

### `DashboardGroups` (client)

- `SearchInput` (label «Пошук розділу») над групами; `useSearch(tiles, t => [t.title, ...t.keywords])`.
- Без запиту — групи з заголовками (`HudSection` або легкий заголовок `hud-sc`); із запитом — плоский список збігів без заголовків груп; порожньо — `SearchEmptyState`.
- Enter у полі пошуку → `router.push` на перший збіг.
- Отримує готові серіалізовані плитки (`href`, `iconKey`, `title`, `subtitle?`, `keywords`, `group`, `compact?`); іконки резолвляться на клієнті з мапи `iconKey → LucideIcon` (функції не передаються через межу server/client).

Групи DM (таблиця `lib/constants/campaign-dashboard.ts`, замінює масив `dmTiles`):

| Група | Розділи |
|---|---|
| Гра | Сценарій, Бої, Показ, Музика |
| Герої | Персонажі (subtitle «· N на схваленні»), Довідник (`/info`) |
| Бібліотеки (`compact`) | Юніти, Заклинання, Артефакти, Скіли, Дерева прокачки, Раси |

Гравець: одна група — Мій персонаж, Показ (`/show`), Довідник.

Кожен розділ має `keywords` (синоніми, напр. «моби», «npc» для юнітів; «закл», «магія» для заклинань). Сітка: Гра/Герої — `sm:grid-cols-2 xl:grid-cols-3`, Бібліотеки — `grid-cols-2 sm:grid-cols-3`.

### `HudTile.compact`

`compact` → іконка `size-8`, без subtitle, менший padding. Решта поведінки незмінна.

## Дані — `lib/server/campaigns/dashboard.ts`

```ts
readDmDashboard(campaignId): Promise<DmDashboardData>
// { pendingDrafts: number, scenarioPages: {id,title}[], battles: {id,name,status}[] }
readPlayerDashboard(campaignId, userId): Promise<PlayerDashboardData>
// { hero: {id,name,level,race,class,avatar,armorClass,speed,status,reviewNote,seenLevel} | null,
//   activeBattle: {battleId, hp: {current,max,temp}} | null }
```

- DM: `character.count` (PENDING), `scenarioPage.findMany` (`take 3`, `select {id,title}`), `battleScene.findMany` (`status in [prepared, active]`, `take 3`, `select {id,name,status}`, сортування active-first у JS, далі `createdAt desc`). Паралельно.
- Гравець: `character.findFirst` (`campaignId`, `controlledBy: userId`, `type: PLAYER`, свіжіший перший — той самий критерій, що `/character`), вузький `select`; потім, якщо герой є, `battleParticipant.findFirst` (`sourceId: hero.id`, `battle: { status: active, campaignId }`, `select {battleId,currentHp,maxHp,tempHp}`).
- Жодних JSON-колонок (`participants`, `map`, `snapshot`, `abilities`). Без polling/Pusher.
- У `page.tsx` обидва виклики йдуть у наявний `Promise.all` з онбордингом; кожен з `.catch(() => null)` — при помилці блок просто не рендериться.
- Типи `DmDashboardData` / `PlayerDashboardData` — у `types/campaigns.ts`.

## Шари

`page.tsx` лишається server component. Єдиний клієнтський компонент — `DashboardGroups` (лише фільтрація готового масиву). `@/lib/api` не потрібен; нових API-роутів немає.

## Тести

- `lib/server/campaigns/__tests__/dashboard.test.ts` — замоканий `prisma`: вузькі `select` без JSON, active-first сортування боїв, `hero: null`, `activeBattle: null`.
- `lib/constants/__tests__/campaign-dashboard.test.ts` — кожен DM-`path` існує як `app/campaigns/[id]/dm/<path>/page.tsx`; ключові синоніми знаходять потрібні розділи через `matchesQuery`.
- `components/campaigns/dashboard/__tests__/` (happy-dom): `DmNextSteps` ховає порожню «Підготовку»; `PlayerHeroCard` — без героя / на схваленні / повернуто з `reviewNote` / у бою; `DashboardGroups` — фільтр, порожній стан, Enter → перший збіг; `HudTile compact` без subtitle.
- Браузер (субагент Sonnet, копія HOMM5): DM і гравець, 390px і десктоп; без горизонтального скролу, «Що далі» видно без прокрутки на десктопі.

## Завершення

`/simplify` на диф гілки, оновити `docs/STATUS.md`, `docs/architecture/` (якщо зачеплено), запис у `lib/onboarding/whats-new.ts` («Новий дашборд кампанії»). Злиття в main — після «ок» користувача; spec/plan → `docs/archive/superpowers/` у merge-коміті.

## Поза обсягом

- Пошук по сутностях кампанії (заклинання, юніти, артефакти, персонажі, сторінки сценарію) з окремим API — наступний крок.
- Постійне HP героя — після constructor (точка розширення `HeroHp` закладена).
