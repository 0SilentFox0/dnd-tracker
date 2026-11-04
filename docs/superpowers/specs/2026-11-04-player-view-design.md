# «Вигляд гравця» для показу й боїв (ЧЕРНЕТКА)

Дата: 2026-11-04. Статус: **чернетка, рішення не підтверджені користувачем** (пункт 7 батчу 2026-11-04). Гілка реалізації (планується): `feat/player-view`.

## Мета

Коли DM транслює свій екран гравцям (проєктор, демонстрація екрана), вони не повинні бачити DM-елементи: панелі й кнопки керування, DM-підказки, музичні контролі, DM-вигляд карти світу. DM вмикає «вигляд гравця» на своєму екрані, і інтерфейс виглядає так само, як у гравця.

Що це не є: захист даних. Сервер і мережа лишаються як є (див. «Дані й безпека»); режим ховає лише інтерфейс.

## Рішення

Підтверджених користувачем рішень поки немає. Усе нижче: **РЕКОМЕНДАЦІЯ, до підтвердження**, повний перелік варіантів у розділі «Питання до користувача».

1. РЕКОМЕНДАЦІЯ: локальний перемикач у браузері DM, нічого не пишемо на сервер. Стан у `localStorage` через `createStorageFlag`.
2. РЕКОМЕНДАЦІЯ: у бою «вигляд гравця» форсується в єдиній точці `deriveScene` (`isDM = false`, `dmControlledId = null`), у показі: у `ShowPageClient` (`isDM = false`).
3. РЕКОМЕНДАЦІЯ: гаряча клавіша `P` і кнопка в хедері бою/куті показу; кнопка лишається видимою як індикатор режиму.
4. РЕКОМЕНДАЦІЯ: DM у режимі лише дивиться; керування (DM і «як гравець») не з'являється.
5. РЕКОМЕНДАЦІЯ: серверного фільтра немає, лише клієнтський.

## Перевірено в коді (у цьому worktree)

- **Бій, єдина точка.** Усі клієнтські DM-гілки бою читають `viewer.isDM` з `deriveScene` (`lib/utils/battle/view/derive-scene.ts:14`: `const isDM = battle.isDM === true`). Пошук по `lib`, `components`, `app` не знайшов іншого клієнтського читання `battle.isDM` (серверні читання в `lib/server/**`, `lib/utils/api/actor.ts`, `read-sheet.ts` — не клієнтський інтерфейс). Хуки карти (`useBattleMapScene`, `useMapPlacing`, `useMapTerrainTool`, `useMapWeatherTool`), аудіо (`useBattleAudioHost`), `useAwaitingDmDialog`, `useDownedHeroPrompt` одержують `isDM` з `viewer`.
- **`dmControlledId`** (`useBattleSceneValue`, локальний стан) входить у `deriveScene(battle, userId, dmControlledId)` і в `deriveTurn` (`dmHero = isDM && dmControlledId ? …`): при форсуванні має передаватися `null`.
- **DM-панель.** `DmQuickActionsPanel` повертає `null` при `!viewer.isDM` (`DmQuickActionsPanel.tsx:80` за звітом розвідки; рядок змістовно звірено з `data-tour="battle.dm-open|dm-close|dm-actions|dm-participants"`, `:99,124,132,163`). `DmPanel` у `DesktopBattleLayout` і `MobileBattleLayout` рендериться лише за `isDM`.
- **Інші DM-гілки бою** (усі через `viewer.isDM`): `BattleTopBar.tsx:41` («Завершити», «Скинути», «Наступний хід»; `data-tour="battle.reset"`, `battle.next-turn`), `BattleScreen.tsx:103,126` (`OnboardingHint dm.battle-scene`, `DmRevivePrompt`), `BattlePreparationView` (кнопка старту `data-tour="battle.start"`, підказка `needOne`), `AwaitingDmBanner`, `CritChoiceWaitingBanner` (показується лише НЕ-DM), `BattleResultScreen` (`exitHref`).
- **Видимість даних.** `canSeeExactStats` і `sanitizeLogEntry` (`lib/utils/battle/view/visibility.ts`) використовують `viewer.isDM`: при форсуванні вороги й лог показуються як гравцю. `knowledge` сервер вантажить лише для не-DM (`run-battle-mutation.ts:192`), тому в DM його може не бути (див. «Крайні випадки»).
- **Показ.** `app/campaigns/[id]/show/page-client.tsx`: `isDM` проп (з сервера) керує `useShowKeys`, `useShowAudioHost`, `ShowStage`, `DiceRoller` (лише `!isDM`) і `ShowControlPanel` (лише `isDM`). `ShowPageClient` уже має гравцевий вигляд при `isDM=false`.
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
| Локальний прапорець | `lib/hooks/common/storage-value.ts` (`createStorageFlag`, `useStorageValue`), приклади `useFxEnabled`, `useBattleViewMode` | `usePlayerView(scope)` для бою (ключ з `battleId`) і показу (ключ з `campaignId`) |
| Перемикач у хедері | `BattleTopBar.tsx` (кнопка `fx`, `aria-pressed`) | така сама кнопка поряд |
| Кнопка в куті показу | `FullscreenButton` у `page-client.tsx` | поряд із нею |
| Гарячі клавіші | `lib/hooks/show/useShowKeys.ts` (`extraKeys`, пропуск у input і `[role="dialog"]`) | `KeyP` у показі; у бою тонкий хук за тим самим зразком |
| Єдина точка для бою | `deriveScene` | необов'язковий параметр форсування |
| Показ | `ShowPageClient` (`isDM` проп) | форсований `isDM=false` |
| Тест рендеру бою | `components/battle/scene/__tests__/screen*.test.tsx` | основа для DOM-тесту |
| i18n, whats-new | `messages/*`, `lib/onboarding/whats-new.ts` | нові ключі в обох мовах |

Нового: хук `usePlayerView`, кнопка-перемикач (спільний компонент), параметр форсування в `deriveScene`, тести.

## Дизайн (рекомендований)

### Стан
`lib/hooks/<домен>/usePlayerView`: `createStorageFlag("player-view:<scope>", false)`; бій і показ мають окремі прапорці. Читання в try/catch (як решта прапорців), без localStorage працює як «вимкнено».

### Бій
- `deriveScene(battle, userId, dmControlledId, opts?: { playerView?: boolean })`: за `playerView` рахує `isDM = false` і ігнорує `dmControlledId`. Вимикаються без окремого коду: `DmPanel`, `BattleTopBar` DM-кнопки, DM-діалоги, інструменти карти, `reserve`, DM-аудіо, DM-гілки `deriveTurn`, `canSeeExactStats`, `sanitizeLogEntry`.
- Параметр передається з `useBattleSceneValue`; `useAwaitingDmDialog` і всі хуки беруть `viewer.isDM` з результату, тому окремих змін не потребують.
- Кнопка в `BattleTopBar` має лишатися доступною для DM у обох станах; гарантія повернення: клавіша `P` і кнопка не залежать від `viewer.isDM` у DOM (для цього кнопка читає «справжню» роль із `battle.isDM`, а не з `viewer`).

### Показ
- `ShowPageClient`: `const effectiveDM = isDM && !playerView`; усі гілки й пропи читають `effectiveDM`. Кнопка перемикача й клавіша `P` лишаються лише для справжнього DM (`isDM`). Поряд із `DiceRoller`: питання до користувача.

### Дані й безпека
Режим лише клієнтський: `pendingSummons`, `damageBreakdown` та інші поля приходять у мережі й видимі в DevTools. Для трансляції екрана цього достатньо; якщо потрібна справжня ізоляція, потрібен окремий серверний фільтр (питання 6).

## Крайні випадки

- DM, що водночас керує власним героєм: при форсуванні `controlledBy === userId` лишається, тож DM може побачити гравцеві контроли свого героя. Рекомендація: приймаємо (це гравцевий вигляд).
- `knowledge` відсутній у DM: «спостережені риси» ворогів можуть бути порожніми, показ «як гравцю» неточний. Не блокує, треба врахувати в тесті й тексті в whats-new.
- Режим при зміні сторінки: ключ у `localStorage` зберігається, DM має бачити індикатор (інакше забуде вимкнути).
- Перший рендер: сервер не знає прапорця, тому на першому кадрі може бути DM-вигляд; потрібен рендер гравцевого вигляду до гідратації або приховування до зчитування прапорця (деталі для плану).
- Мобільний екран: кнопка в топбарі / куті без перекриття іншими елементами.

## Тести

- **Гарантія «жодного DM-тексту в DOM».** Рендер `BattleScreen` з DM-сесією й форсованим player-виглядом (основа: `components/battle/scene/__tests__/screen*.test.tsx`), далі: (а) `container.querySelectorAll('[data-tour^="battle.dm"], [data-tour="battle.reset"], [data-tour="battle.next-turn"], [data-tour="battle.start"], [data-tour="music.transport"], [data-tour="music.playlist"]')` порожній; (б) `container.innerHTML` не містить жодного значення з DM-пространств (`messages/uk/battleDm.json` та DM-ключів `show.json`, список збирається з JSON у тесті, не вручну); (в) немає `aria-label` DM-кнопок.
- Те саме для `ShowPageClient` з `isDM=true` і форсованим виглядом: немає `ShowControlPanel`, DM-аудіо, DM-підказки; `DiceRoller` за рішенням.
- Юніт `deriveScene` з `playerView: true` для DM-користувача: `viewer.isDM === false`, `roster.reserve` порожній, `turn.isMyTurn === false` (без героя), `dmControlledId` ігнорується.
- Тест хука `usePlayerView` (збереження, помилка сховища, ключ на рівень сутності).
- Сторож: нове читання `battle.isDM` поза `deriveScene` (grep-тест або ESLint-правило), щоб інші DM-гілки не оминули форсування. Вирішити в плані.

## i18n і онбординг

Ключі `battle.playerView.*` і `show.playerView.*` (підписи кнопки, `aria-label`, підказка гарячої клавіші) у `messages/uk` та `messages/en`. Запис у `lib/onboarding/whats-new.ts` і `whatsNew.<id>` в обох `whatsNew.json`; hint для DM. DM-only тексти не повинні потрапити в DOM гравцевого вигляду (тест вище).

## Документація

`docs/architecture/battle.md` (розділ «Player UI logic») і `docs/architecture/show.md`; `docs/STATUS.md`.

## Питання до користувача

1. **Де живе перемикач.** (а) Локальний у браузері DM, без сервера [рекомендація]. (б) Окремий URL (`?view=player` або `/player`) для проєктора. (в) Обидва.
2. **Що транслюється.** Сторінка `/campaigns/[id]/show` і сторінка бою, чи також DM-вид показу всередині сценарію (`ScenarioShowDock`, там `isDM: true` жорстко)? Рекомендація: лише `/show` і бій.
3. **Гаряча клавіша.** `P` [рекомендація], інша, чи лише кнопка?
4. **Індикатор режиму.** (а) Постійно видима напівпрозора кнопка, її бачать і гравці при трансляції [рекомендація]. (б) Ховається через кілька секунд і з'являється при наведенні. (в) Без індикатора.
5. **Що може DM у цьому режимі.** (а) Лише дивитися, без жодного керування [рекомендація, це мета трансляції]. (б) Дивитися й керувати NPC/ходом через клавіатурні скорочення.
6. **`DiceRoller` у показі** для DM у цьому режимі: показувати (як гравцю) чи ні [рекомендація: ні].
7. **Серверний фільтр.** Достатньо клієнтського приховування (резерв, `damageBreakdown` лишаються в мережі) [рекомендація], чи потрібен окремий серверний «player-проєкція» сцени для справжньої ізоляції?
8. **Збереження стану.** Пам'ятати прапорець між візитами чи скидати при кожному заході [рекомендація: пам'ятати на рівні бою/кампанії, із видимим індикатором].

## Відкрите для плану

- Конкретний механізм першого кадру без DM-мерехтіння (SSR/гідратація).
- Сторож проти нових DM-гілок, що обходять `deriveScene`.
- Перевірка демо-турів і підказок, що цілять у `battle.dm-*`.
