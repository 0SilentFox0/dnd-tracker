# Інвентар героя як в іграх — дизайн

Дата: 2026-10-27 · Гілка: `feat/inventory` (worktree `../dnd-tracker-inventory`)

## Мета

Вкладки профілю «Речі» (сітка 3×3 екіпірування) і «Підсумок» (гаманець, неекіпіровані артефакти, особливі предмети, журнал) об'єднуються в одну вкладку «Інвентар» у стилі ігрового інвентаря: зверху слоти екіпірування з силуетами, під ними гаманець і сітка рюкзака. Референс — скриншот користувача (слоти з силуетами + сітка рюкзака).

## Рішення (погоджені)

- Перенесення: drag-and-drop на десктопі (нативний HTML5, без нової залежності) + тап/клік → дії в панелі деталей (працює всюди, на телефоні — єдиний спосіб).
- Рюкзак: одна сітка — артефакти, потім особливі предмети (бейдж кількості, позначка витратного). Гаманець — рядок монет між екіпіруванням і рюкзаком. Журнал — згорнута секція внизу.
- Слоти: сітка 3×3 без портрета, порядок `ARTIFACT_GRID_9` (кільце, шолом, амулет / дальня зброя, броня, щит / зброя, чоботи, плащ).
- Деталі: клік виділяє предмет; на десктопі (`lg`) панель деталей праворуч від сіток, на телефоні — `ResponsiveDialog` (bottom sheet). На десктопі hover-підказка (назва + рідкість, `title`/tooltip).
- Редактор DM (`ProfileEditor` → `CharacterArtifactsSection`) не змінюється — він потрібен і для чернеток без «Підсумку».

## Розкладка

```
lg:  [ Екіпірування 3×3 ]            [ Деталі вибраного ]
     [ 💰 з · ср · мд     ]            [  дії             ]
     [ Рюкзак 6 колонок  ]
     [ Активні сети (SetList)                          ]
     [ ▸ Журнал (згорнуто)                             ]
mobile: одна колонка, рюкзак 5 колонок, деталі — bottom sheet
```

## Поведінка

- Порожній слот: напівпрозорий SVG-силует типу слота. Заповнений: іконка артефакту в рамці кольору рідкості (`ARTIFACT_RARITY_COLOR`), як у теперішньому `ItemsTab`.
- Рюкзак: мінімум 3 повні ряди порожніх клітинок, далі росте рядами. Для DM остання клітинка «+» → меню «Видати артефакт» (`GrantArtifactDialog`) / «Додати предмет» (`ItemDialog`).
- Під час drag артефакту: слот його типу підсвічений, решта приглушені. Drop рюкзак→слот = `equip { artifactId }` (сервер уже міняє місцями зайнятий слот); слот→рюкзак = `stash { slot }`. Drop на неприйнятний слот ігнорується.
- Панель деталей: назва, рідкість, слот, опис, сет (якщо є). Дії:
  - артефакт у рюкзаку: Одягнути, Передати (`TransferArtifactDialog`), Забрати (DM, `revoke`);
  - артефакт у слоті: Зняти, Передати;
  - особливий предмет: Використати (витратний), Редагувати, Видалити.
- Гаманець: рядок монет; клік (коли `canAct`) відкриває наявний `MoneyDialog`.
- Права без змін: `canAct = isDM || isOwner`; інакше лише перегляд (без drag, без дій). Поки персонаж на схваленні — екіпірування видно, на місці рюкзака текст «Підсумок з'явиться після схвалення персонажа».
- Помилки дій — як зараз у `useStashAction` (тексти `StashError`).

## Код

Перевикористовується: `useStash`, `useStashAction`, `useFreeArtifacts`, `TransferArtifactDialog`, `GrantArtifactDialog`, `ItemDialog`, `MoneyDialog`, `InventoryLogPanel`, `SetList`, `ARTIFACT_GRID_9`, `ARTIFACT_RARITY_COLOR`, `artifactSlotLabel`, `ResponsiveDialog`, `useConfirm`.

Нове:

- `lib/utils/inventory/backpack.ts` — `buildBackpackCells(stash: StashView, opts: { columns, minRows }): BackpackCell[]` (`{ kind: "artifact" | "item" | "empty", ... }`), чиста, з тестами.
- `lib/hooks/characters/useInventory.ts` — `useInventory(campaignId, characterId)` об'єднує `sheet.items.grid` (з `ProfileContext`) і `useStash`/`useStashAction`; повертає `{ equipment, backpack, purse, selection: { value, set }, actions: { equip, unequip, use, ... }, status }`.
- `components/character-profile/inventory/`: `InventoryTab`, `EquipmentGrid`, `BackpackGrid`, `InventoryCell` (спільна клітинка з drag/drop/selected/rarity), `ItemDetails` (панель/sheet), `PurseBar`, `slot-silhouettes.tsx` (9 inline SVG).
- `CharacterProfile`: вкладки `items` + `stash` → одна `{ id: "items", label: "Інвентар" }`; `ProfileTabId` без `"stash"`.
- Видаляються `ItemsTab.tsx`, `stash/StashTab.tsx`, `stash/StashArtifactsPanel.tsx`, `stash/SpecialItemsPanel.tsx`, `stash/PursePanel.tsx` (їхні тексти/логіка переходять у нові компоненти); діалоги з `stash/` лишаються.

## Тести

- `buildBackpackCells`: порядок, мінімум рядів, доповнення до повного ряду, клітинка «+» для DM.
- `useInventory`: виклики `equip`/`stash`/`useItem` з правильними аргументами.
- Компонентний (happy-dom): клік по клітинці → деталі → дія; `drop` на слот викликає `equip`; неприйнятний слот — ні; режим перегляду без дій.
- Оновити `profile-view.test.tsx` (вкладки).
- Браузер: десктоп + 390px, DM і гравець, drag, swap, передача, використання предмета.

## Поза обсягом

Перетягування між героями, сортування рюкзака, кілька кілець, портрет героя в інвентарі.
