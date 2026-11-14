# Редактор мап, етап 0b — UI бібліотеки карт

Гілка `feat/map-editor-0b` (worktree `../dnd-tracker-maps-0b`, від main 6774bc107). Серверне ядро етапу 0 готове; тут лише UI, прапорець кампанії, онбординг. Не входить: B6 (двері), етапи C–H.

## Reuse (що беремо, чого бракує)

Є: `lib/api/battle-maps.ts`, `lib/hooks/battle-maps` (`useBattleMaps`, `useBattleMapMutations`, `battleMapKeys`), `useBattleMapEditor` (без змін, на вхід `BattleMapConfig`), `BattleMap` + `EdgeEditor`, `useCoarsePointer`, `useConfirm`, `useUnsavedChangesGuard`, `useLibraryList`, `DmListBody/DmCardGrid/DmEntityCard`, `EmptyState/QueryState`, `HudPage*`, `battleOps.mapUpdate`/`actions.mapUpdate`, `REJECT.mapUpdateCollision`, патерн `acquaintancesEnabled`.
Нове (чому): хук `useBattleMap(campaignId, mapId)` + `battleMapKeys.detail` (редагована, непривʼязана до версії карта; є лише pinned-версія); `cloneBattleMap(name?)`; винесення керування `BattleFormMap` з обгортки `HudSection` (спільне з повноекранним редактором); picker карти у формі бою; кнопка «Оновити карту».

## Задачі (SDD, Sonnet, без рев'ю по задачах)

- **T1 Прапорець.** `Campaign.mapLibraryEnabled Boolean @default(false)` (міграція expand-only, без RLS — колонка), `updateCampaignSchema`, `CAMPAIGN_SETTINGS_SELECT`, `types/campaigns.ts`, чекбокс у `CampaignSettingsDialog` (+тест, uk/en), хелпер сторінкового guard. Увімкнути для кампанії власника — лише на локальній/prodcopy БД (prod не чіпаємо).
- **T2 Хуки/API.** `useBattleMap` + `detail`-ключ, інвалідація після update, `cloneBattleMap({name})`; тести хуків.
- **T3 Сторінка «Карти».** `app/campaigns/[id]/dm/maps/{page.tsx,page-client.tsx}` (guard `requireCampaignDM` + флаг → редірект), список/створення (розмір, назва)/клон/видалення з `useConfirm`, 409 → повідомлення «карта використовується»; запис у `DM_DASHBOARD_SECTIONS` (libraries), `DM_SECTIONS`/Breadcrumbs, `common.dmSections.maps`; i18n uk/en.
- **T4 Повноекранний редактор.** `app/campaigns/[id]/dm/maps/[mapId]/…`: `useBattleMapEditor(map)` + `BattleMap` на весь екран, інструменти стіна/ґрати/стерти, збереження через `update` (ETag/версія, конфлікт → повідомлення), `useUnsavedChangesGuard`; на coarse pointer — «відкрийте на комп'ютері»; розбити `BattleFormMap` на controls + обгортку.
- **T5 Picker у формі бою.** `mapId` у `BattleSetupInitial`/`useBattleForm` (взаємовиключно з `map`), селект «Карта з бібліотеки» (за флагом) + превʼю; inline-редактор фото-карт лишається; перехід у «Карти» для створення.
- **T6 «Оновити карту» в бою.** Кнопка в `BattleMapPanel` (DM, лише linked-бій, активна коли `brief.version > mapRef.version`), діалог пояснення; помилка `mapUpdateCollision` показує імена; тести.
- **T7 Онбординг/асистент.** `whats-new` запис + `whatsNew.<id>` uk/en, hint `dm.maps` + стаття в `dm-battle` (skeleton-тест), i18n. `coverage.ts`: лишаємо `planned` (асистент не експонує) — лише оновити текст adapter.
- **T8 Борг (за вибором власника).** (a) waterfall: серверний `getMap(mapRef…)` у `page.tsx` бою + вкладений `PrefetchedQuery` для `battleMapKeys.edges`; (b) loading-flash при `map-update`-дельті (тримати попередні ребра, доки нова версія тягнеться, `placeholderData`); (c) повні `mapState` у знімках — окремий контракт, пропонується відкласти.

## Гейти (в кінці)

ps-перевірка → `tsc` → повний `test:run` → battle-sweep на `prodcopy_0b` → живий прогін Sonnet у Chrome (1280 і 375: «Карти», редактор, touch-повідомлення, picker, «Оновити карту», шаблон заклинання через стіну, герої, rollback `map-edge-remove`) → `/simplify` (1–2 агенти) → одне Opus-рев'ю + одна fix-хвиля → `map-modes.md`, `STATUS.md`, пам'ять.
