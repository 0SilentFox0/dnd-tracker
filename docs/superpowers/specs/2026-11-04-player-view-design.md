# «Вигляд гравця» для показу й боїв

Дата: 2026-11-04. Статус: **рішення затверджені користувачем 2026-11-04** (пункт 7 батчу 2026-11-04). Гілка реалізації (планується): `feat/player-view`.

## Мета

Коли DM транслює свій екран гравцям (проєктор, демонстрація екрана), вони не повинні бачити DM-елементи: панелі й кнопки керування, DM-підказки, музичні контролі, DM-вигляд карти світу. DM вмикає «вигляд гравця» на своєму екрані, і інтерфейс виглядає так само, як у гравця.

Що це не є: захист даних. Сервер і мережа лишаються як є (див. «Дані й безпека»); режим ховає лише інтерфейс.

## Рішення

Затверджено користувачем 2026-11-04.

1. Перемикач локальний, у браузері DM, нічого не пишемо на сервер. Прапорець **пер-вікнівий**: зберігається в `sessionStorage` (не `localStorage`), без синхронізації між вкладками через подію `storage`. Причина: DM відкриває друге вікно, де керує як DM, а в першому (транслюваному) лише показує. Ключі: бій `player-view:<battleId>`, показ `player-view:show:<campaignId>`. Прапорець переживає перезавантаження вкладки; закриття вкладки його скидає. Наявний `createStorageValue`/`createStorageFlag` працює лише з `localStorage` і подією `storage`, тому потрібен варіант на `sessionStorage` без cross-tab синхронізації (див. Reuse).
2. Екрани: `/campaigns/[id]/show` і бій. `ScenarioShowDock` (сценарій) бачить лише DM і НЕ транслюється, режим на нього не поширюється.
3. Є і кнопка, і гаряча клавіша `P`. Клавіша не спрацьовує в `input`/`textarea`/`select`/`contenteditable` і коли відкритий `[role="dialog"]`, і не має конфліктувати з наявними клавішами бою/показу (звірка нижче).
4. Індикатор режиму завжди видимий: мала значок-кнопка з `aria-pressed`, дає вийти з режиму. На трансляції її бачать гравці; це прийнято.
5. У режимі гравця DM лише дивиться: без героя й без контролів. Керувати він може в іншому вікні, де режим вимкнений (пер-вікнівість, п. 1).
6. `DiceRoller` у показі в режимі гравця лишається (гравці дивляться трансляцію й бачать, що випало): DM у режимі гравця бачить той самий вигляд, що й гравець, включно з `DiceRoller`. Висновок з коду: див. «Перевірено в коді», блок `DiceRoller`.
7. Достатньо клієнтського приховування, серверного фільтра немає.
8. Індикатор видимий; стан запам'ятовується лише в межах вкладки (п. 1).

## Перевірено в коді (у цьому worktree)

- **Бій, єдина точка.** Усі клієнтські DM-гілки бою читають `viewer.isDM` з `deriveScene` (`lib/utils/battle/view/derive-scene.ts:14`: `const isDM = battle.isDM === true`). Пошук по `lib`, `components`, `app` не знайшов іншого клієнтського читання `battle.isDM` (серверні читання в `lib/server/**`, `lib/utils/api/actor.ts`, `read-sheet.ts` — не клієнтський інтерфейс). Хуки карти (`useBattleMapScene`, `useMapPlacing`, `useMapTerrainTool`, `useMapWeatherTool`), аудіо (`useBattleAudioHost`), `useAwaitingDmDialog`, `useDownedHeroPrompt` одержують `isDM` з `viewer`.
- **`dmControlledId`** (`useBattleSceneValue`, локальний стан) входить у `deriveScene(battle, userId, dmControlledId)` і в `deriveTurn` (`dmHero = isDM && dmControlledId ? …`): при форсуванні має передаватися `null`.
- **DM-панель.** `DmQuickActionsPanel` повертає `null` при `!viewer.isDM` (`DmQuickActionsPanel.tsx:80` за звітом розвідки; рядок змістовно звірено з `data-tour="battle.dm-open|dm-close|dm-actions|dm-participants"`, `:99,124,132,163`). `DmPanel` у `DesktopBattleLayout` і `MobileBattleLayout` рендериться лише за `isDM`.
- **Інші DM-гілки бою** (усі через `viewer.isDM`): `BattleTopBar.tsx:41` («Завершити», «Скинути», «Наступний хід»; `data-tour="battle.reset"`, `battle.next-turn`), `BattleScreen.tsx:103,126` (`OnboardingHint dm.battle-scene`, `DmRevivePrompt`), `BattlePreparationView` (кнопка старту `data-tour="battle.start"`, підказка `needOne`), `AwaitingDmBanner`, `CritChoiceWaitingBanner` (показується лише НЕ-DM), `BattleResultScreen` (`exitHref`).
- **Видимість даних.** `canSeeExactStats` і `sanitizeLogEntry` (`lib/utils/battle/view/visibility.ts`) використовують `viewer.isDM`: при форсуванні вороги й лог показуються як гравцю. `knowledge` сервер вантажить лише для не-DM (`run-battle-mutation.ts:192`), тому в DM його може не бути (див. «Крайні випадки»).
- **Показ.** `app/campaigns/[id]/show/page-client.tsx`: `isDM` проп (з сервера) керує `useShowKeys`, `useShowAudioHost`, `ShowStage`, `DiceRoller` (лише `!isDM`) і `ShowControlPanel` (лише `isDM`). `ShowPageClient` уже має гравцевий вигляд при `isDM=false`.
- **`storage-value.ts`.** `createStorageValue` читає/пише лише `window.localStorage` і слухає подію `storage` (кеш скидається при `storage` з іншої вкладки), тому для пер-вікнівого прапорця не підходить як є: у двох вікнах одного origin прапорець синхронізувався б. Потрібна фабрика/параметр сховища на `sessionStorage` без підписки на `storage`.
- **`DiceRoller`.** `components/common/DiceRoller.tsx`: кидок рахується локально (`useDiceRoller`: `rollDie(cryptoRandom)`, `setResult`), у коментарі компонента: «кидок бачить лише той, хто кидає»; у файлах компонента й хука немає виклику мережі чи Pusher. Рендериться в `page-client.tsx:33` лише `!isDM`. Отже результат не доходить до інших глядачів, а гравці бачать його, лише дивлячись на транслований екран того, хто кидає. Зміни сервера не потрібні; у режимі гравця `DiceRoller` з'являється в DM-вікні, бо `effectiveDM = false`, і кидок видно на трансляції. Не перевірено: чи є десь окрема синхронізація результату кидка через `ShowState`/Pusher поза цими двома файлами (grep по `DiceRoller` знайшов лише `page-client.tsx`, компонент і хук).
- **Гарячі клавіші (звірка `P`).** Пошук `keydown` у `app`, `components`, `lib`: клавіші показу `ArrowLeft/ArrowRight`, `KeyB` (завіса), `KeyN` (сценарій, `extraKeys`), пазл `KeyQ`/`KeyE`; у бою знайдено лише `Escape` (`useMapPlacing`, `useAbilityMapAim`, `useMapTerrainTool`, `useSpellMapTargeting`, `useMazeTools`). `KeyP` ніде не використано. Важливо: `useShowKeys` вішає слухач лише коли `control !== null`, а в режимі гравця `ShowPageClient` передає `null` (`isDM` ефективно false), тож `P` не можна додавати через `extraKeys`: потрібен окремий слухач, який працює й у режимі гравця (за зразком пропусків `TYPING`/`DIALOG`).
- **Scenario dock.** `components/scenario/play/ScenarioShowDock.tsx` жорстко `isDM: true` для `useShowAudioHost`: це DM-панель сторінки сценарію, а не транслована сторінка `/show`.
- **`data-tour` DM-елементів**, що мають зникнути з DOM: `battle.dm-*`, `battle.reset`, `battle.next-turn`, `battle.start`, `music.transport` (`DmAudioControls.tsx:37`), `music.playlist` (`DmPlaylist.tsx:118`).

## Не перевірено

- Чи є в боях і слайдах «приховані учасники/слайди/нотатки» як окремі DM-поля в клієнтських даних: пошук знайшов лише `invisible` і маркер `hidden` (`map-scene.ts`), повної перевірки не було. Приховані слайди й нотатки, схоже, живуть у DM-API колод, а не в `ShowState` (за звітом розвідки, не звірено).
- `ShowBattleCall`, `ShowStage`, `ShowWorldStage`, `ShowDeckStrip`, `PuzzleStage`: DM-гілки читалися лише за звітом, не за кодом.
- Що вказують демо-тури й онбординг (`lib/onboarding/*`, `demoTours`) на `battle.dm-open` та інші DM-цілі, і як вони поводяться без цілі.
- Чи Radix-діалоги з `open={false}` (напр. `CritChoiceDialog`, що рендериться завжди) не лишають DM-тексту в DOM.
- Мобільна розкладка: де розмістити кнопку перемикача.
- Режим карти «лабіринт» (`useMazeView`, `useMazeTools`): DM-інструменти й вигляд «як герой» через `viewer.isDM`, поведінка при форсуванні не перевірена.

## Reuse before writing

| Що | Де | Як використовуємо |
|---|---|---|
| Локальний прапорець | `lib/hooks/common/storage-value.ts` (`createStorageFlag`, `useStorageValue`), приклади `useFxEnabled`, `useBattleViewMode` | `usePlayerView(scope)` для бою (`player-view:<battleId>`) і показу (`player-view:show:<campaignId>`). `createStorageValue` лише `localStorage` + `storage`-подія, тому потрібна нова фабрика (напр. `createSessionFlag`) або параметр `storage` у `createStorageValue`; без підписки на `storage`; `useStorageValue` перевикористовуємо |
| Перемикач у хедері | `BattleTopBar.tsx` (кнопка `fx`, `aria-pressed`) | така сама кнопка поряд |
| Кнопка в куті показу | `FullscreenButton` у `page-client.tsx` | поряд із нею |
| Гарячі клавіші | `lib/hooks/show/useShowKeys.ts` (`extraKeys`, пропуск у input і `[role="dialog"]`) | окремий слухач `KeyP` за зразком (`TYPING`, `DIALOG`, без модифікаторів, `e.code` для укр. розкладки), спільний для бою і показу; через `extraKeys` не виходить (див. вище) |
| Єдина точка для бою | `deriveScene` | необов'язковий параметр форсування |
| Показ | `ShowPageClient` (`isDM` проп) | форсований `isDM=false` |
| Тест рендеру бою | `components/battle/scene/__tests__/screen*.test.tsx` | основа для DOM-тесту |
| i18n, whats-new | `messages/*`, `lib/onboarding/whats-new.ts` | нові ключі в обох мовах |

Нового: сховище на `sessionStorage` без cross-tab синхронізації, хук `usePlayerView`, кнопка-перемикач (спільний компонент), параметр форсування в `deriveScene`, тести.

## Дизайн

### Стан
`lib/hooks/<домен>/usePlayerView`: прапорець на `sessionStorage` (ключі `player-view:<battleId>`, `player-view:show:<campaignId>`), бій і показ мають окремі прапорці; без підписки на подію `storage`, вікна не синхронізуються. Читання/запис у try/catch (як решта прапорців), без сховища працює як «вимкнено». Переживає перезавантаження вкладки, закриття вкладки скидає.

### Бій
- `deriveScene(battle, userId, dmControlledId, opts?: { playerView?: boolean })`: за `playerView` рахує `isDM = false` і ігнорує `dmControlledId`. Вимикаються без окремого коду: `DmPanel`, `BattleTopBar` DM-кнопки, DM-діалоги, інструменти карти, `reserve`, DM-аудіо, DM-гілки `deriveTurn`, `canSeeExactStats`, `sanitizeLogEntry`.
- Параметр передається з `useBattleSceneValue`; `useAwaitingDmDialog` і всі хуки беруть `viewer.isDM` з результату, тому окремих змін не потребують.
- Кнопка в `BattleTopBar` має лишатися доступною для DM у обох станах; гарантія повернення: клавіша `P` і кнопка не залежать від `viewer.isDM` у DOM (для цього кнопка читає «справжню» роль із `battle.isDM`, а не з `viewer`).

### Показ
- `ShowPageClient`: `const effectiveDM = isDM && !playerView`; усі гілки й пропи читають `effectiveDM`. Кнопка-індикатор і клавіша `P` лишаються лише для справжнього DM (`isDM`), клавіша `P` працює й тоді, коли `useShowKeys` вимкнений. `DiceRoller` лишається видимим у режимі гравця (рішення 6; рендериться за `!effectiveDM`).

### Дані й безпека
Режим лише клієнтський: `pendingSummons`, `damageBreakdown` та інші поля приходять у мережі й видимі в DevTools. Для трансляції екрана цього достатньо; серверного фільтра не робимо (рішення 7).

## Крайні випадки

- DM, що водночас керує власним героєм: при форсуванні `controlledBy === userId` лишається, тож DM може побачити гравцеві контроли свого героя. Рішення 5: у режимі DM лише дивиться, тому контролі героя не мають з'являтися; при реалізації форсування має гасити й це (звірити в плані, `deriveTurn` не перевірено на цей випадок).
- `knowledge` відсутній у DM: «спостережені риси» ворогів можуть бути порожніми, показ «як гравцю» неточний. Не блокує, треба врахувати в тесті й тексті в whats-new.
- Режим при перезавантаженні/зміні сторінки в тій самій вкладці зберігається (`sessionStorage`), індикатор завжди видимий (рішення 4); нова вкладка/вікно починає з вимкненого режиму.
- Перший рендер: сервер не знає прапорця, тому на першому кадрі може бути DM-вигляд; потрібен рендер гравцевого вигляду до гідратації або приховування до зчитування прапорця (деталі для плану).
- Мобільний екран: кнопка в топбарі / куті без перекриття іншими елементами.

## Тести

- **Гарантія «жодного DM-тексту в DOM».** Рендер `BattleScreen` з DM-сесією й форсованим player-виглядом (основа: `components/battle/scene/__tests__/screen*.test.tsx`), далі: (а) `container.querySelectorAll('[data-tour^="battle.dm"], [data-tour="battle.reset"], [data-tour="battle.next-turn"], [data-tour="battle.start"], [data-tour="music.transport"], [data-tour="music.playlist"]')` порожній; (б) `container.innerHTML` не містить жодного значення з DM-пространств (`messages/uk/battleDm.json` та DM-ключів `show.json`, список збирається з JSON у тесті, не вручну); (в) немає `aria-label` DM-кнопок.
- Те саме для `ShowPageClient` з `isDM=true` і форсованим виглядом: немає `ShowControlPanel`, DM-аудіо, DM-підказки; `DiceRoller` присутній.
- Юніт `deriveScene` з `playerView: true` для DM-користувача: `viewer.isDM === false`, `roster.reserve` порожній, `turn.isMyTurn === false` (без героя), `dmControlledId` ігнорується.
- Тест хука `usePlayerView` (збереження в `sessionStorage`, помилка сховища, ключ на рівень сутності, відсутність синхронізації між вікнами: подія `storage` не змінює стан).
- Тест клавіші `P`: перемикає; ігнорується в `input`/`textarea` і при відкритому `[role="dialog"]`.
- Сторож: нове читання `battle.isDM` поза `deriveScene` (grep-тест або ESLint-правило), щоб інші DM-гілки не оминули форсування. Вирішити в плані.

## i18n і онбординг

Ключі `battle.playerView.*` і `show.playerView.*` (підписи кнопки, `aria-label`, підказка гарячої клавіші) у `messages/uk` та `messages/en`. Запис у `lib/onboarding/whats-new.ts` і `whatsNew.<id>` в обох `whatsNew.json`; hint для DM. DM-only тексти не повинні потрапити в DOM гравцевого вигляду (тест вище).

## Документація

`docs/architecture/battle.md` (розділ «Player UI logic») і `docs/architecture/show.md`; `docs/STATUS.md`.

## Затверджені рішення

Усі вісім питань закрито користувачем 2026-11-04; відповіді зведено в розділі «Рішення» (пп. 1-8). Окреме уточнення до п. 1: прапорець пер-вікнівий (`sessionStorage`), бо DM керує у другому вікні, а транслюється перше.

## Відкрите для плану

- Конкретний механізм першого кадру без DM-мерехтіння (SSR/гідратація): з `sessionStorage` сервер прапорця не знає.
- Форма фабрики на `sessionStorage` (нова функція чи параметр `storage`) і чи залишати `useStorageValue` спільним.
- Сторож проти нових DM-гілок, що обходять `deriveScene`.
- Перевірка демо-турів і підказок, що цілять у `battle.dm-*`.
