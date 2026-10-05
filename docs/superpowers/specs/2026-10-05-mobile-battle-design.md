# Мобільний бій: дельти, редʼюсери, BattleSceneProvider і новий HUD

- **Дата:** 2026-10-05
- **Пункт роадмапу:** 6
- **Гілка:** `feat/mobile-battle` (одна гілка на весь пункт)
- **Макети:** `.superpowers/brainstorm/14662-1791226381/content/` (локально, не в git):
  `hud-v9.html` (екрани телефону A–J), `animations-v2.html` (K–O), `hit-overlay.html`, `desktop-all-v3.html`
  (усі 15 екранів на десктопі), `hud.css` / `dk-base.css`. Портрети в макетах — арт Heroes V (Ubisoft), лише для
  макета; у застосунку — аватарки учасників. Іконки в макетах — game-icons.net (CC BY 3.0); у застосунку — іконки
  скілів/спелів із БД.

## 1. Мета

Плавний, надійний і швидкий бій для гравців на телефоні й ноутбуці при мінімальному egress Supabase.
DM завжди грає з десктопа — його екрани переходять на нову розкладку, але окремого мобільного DM-редизайну немає.

**Критерії успіху**

- Звичайна дія в бою з 10 учасниками не викликає жодного GET бою ні в кого з гравців (дельта в Pusher і відповіді).
- Подвійний тап не виконує дію двічі (409 → повідомлення, без дублю).
- На 390 px усі екрани бою без горизонтального скролу; кнопки дій у зоні великого пальця; кнопки не зсуваються під
  час оновлень.
- Гравець бачить, що сталося (остання дія, журнал), свій стан (HP, AC, слоти по колах, мораль, заряди, ефекти) і
  чесну інформацію про ворогів (стан замість HP, відомий AC замість точного).
- `pnpm simulate-battle` — 34/34.

## 2. Шар даних і транспорт

### 2.1 Сервер

`runBattleMutation` після `saveBattle` будує `ClientBattleDelta`:

```ts
interface ClientBattleDelta {
  battleId: string;
  version: number;
  scene: { status; round; turnIndex; pendingMoraleCheck };
  upserted: BattleParticipant[];   // змінені або нові (у т.ч. pending)
  removed: string[];
  order?: string[];                // лише коли змінився порядок (старт, саммон, видалення)
  pending?: BattleParticipant[];   // лише коли змінився список pending
  setup?: unknown;                 // лише для prepared (participants підготовки)
  log: BattleAction[];             // нові події (вже у формі BattleAction)
  cancelledFrom?: number;          // rollback/reset/start
}
```

- **Pusher:** одна подія `battle-delta`. Якщо серіалізована дельта > `PUSHER_DELTA_LIMIT_BYTES` (9 500) —
  `{ battleId, version, refetch: true }`. `battle-completed` і `turn-started` (канал гравця) лишаються;
  `battle-updated` і `battle-started` прибираються.
- **Відповідь мутації:** `{ delta, response? }` без ліміту розміру — той, хто діяв, ніколи не рефетчить.
  Відповіді `respond: "wrapped" | "response"` переходять на цю форму; додаткові дані (`moraleResult`, результат
  атаки) — у `response`.
- `GET /` і `dryRun` (превʼю спела з саммоном) не змінюються — повертають повний бій.
- `expectedVersion` уже перевіряється (409 `{ code: "conflict", version }`); тепер його шле клієнт.

### 2.2 Клієнт

- `lib/utils/battle/client/apply-delta.ts` — чиста `applyBattleDelta(cached, delta) → BattleScene | "refetch"`:
  - `delta.version <= cached.version` → `cached` без змін;
  - `delta.version === cached.version + 1` → патч: `upserted` замінює учасника за id (незмінені зберігають
    посилання), `removed` прибирає, `order` перебудовує `initiativeOrder`, `scene` — поля бою, `log` доклеюється
    (з урахуванням `cancelledFrom`, як нинішній `mergeLog`);
  - пропуск версії або `refetch` → `"refetch"`.
- `useBattleAction(apiFn, options)` у `lib/hooks/battles`: підставляє `expectedVersion` з кешу, застосовує дельту,
  на `"refetch"` — `invalidateQueries`, на 409 — `invalidateQueries` + `notify("Стан бою змінився, повторіть дію")`.
  Усі battle-мутації в `useBattles.ts` переходять на нього; інвалідація `["battles", id]` / `["active-battles"]`
  лишається там, де є зараз.
- `usePusherBattleSync` слухає `battle-delta` і застосовує ту саму функцію; на reconnect — одна інвалідація.
  `mergeBattleCache` і логіка light payload видаляються.
- `lib/api/battles.ts`: функції мутацій повертають `{ delta, response }`.
- Роут `damage-breakdown` і `useDamageBreakdown` видаляються (розбивка рахується на клієнті, §4).

### 2.3 BattleSceneProvider

- `app/campaigns/[id]/battles/[battleId]/page.tsx` стає server component: бере `userId` із серверного Supabase
  і рендерить `BattlePageClient`. Клієнтський `supabase.auth.getUser()` зникає.
- `components/battle/scene/BattleSceneProvider.tsx` + `useBattleScene()` (хук у `lib/hooks/battle`):
  `battle`, `me` (userId), `isDM`, `viewer` (для правил видимості), `currentParticipant`, `isMyTurn`,
  `myParticipants`, `queue` (§5.1), `effectiveStats(id)` (AC/статі через `statWithModifiers` з аурами — фікс
  «картка 19, атака 20»), `actions` (мутації й хендлери), `connection`.
- `BattlePageDialogs` і пропс-бандли (`mutations`, `handlers`, `dialogs`) зникають — компоненти читають контекст.

## 3. UI

### 3.1 Візуальна мова

- HUD поверх арту бою (`/screen-bg/battle-bg.jpg` із затемненням), без карток і градієнтного світіння.
- Шрифти: Alegreya SC (імена, заголовки), Alegreya Sans (текст, цифри — `tabular-nums lining-nums`), EB Garamond
  (сторінки книги). Через `next/font`, лише на сторінці бою.
- Портрети круглі, кільце кольору сторони (союзник `#6f8fb0`, ворог `#9c2a1d`), поточний — більший зі світлим
  кільцем, «я» — золоте кільце, повалені — знебарвлені.
- Ефект = іконка скіла/спела, що його наклав (рамка червона — дебаф, золота — баф) + назва + раунди; > 2 → «+N».
- Кола заклинань — метали: 0 залізо, I бронза, II срібло, III золото, IV міфрил, V платина (з відблиском).
- Сітка: висоти кратні 4 px, рядки фіксованої висоти (місце під ефекти зарезервоване), колонка AC фіксованої ширини.
- Токени в `components/battle/hud/theme.ts` + CSS-змінні сторінки бою.

### 3.2 Розкладки

`BattleScreen` обирає:

- **< 1024 px — `MobileBattleLayout`:** шапка (назва, раунд, з'єднання) → `InitiativeTrack` → `LastActionTicker`
  → «ходить X» / банер «Твій хід» → вкладки «Союзники / Вороги» → список → `MyHeroPanel` унизу (у свій хід —
  `ActionGrid` + «Завершити хід» / `TurnCountdown`). Деталі учасника, журнал, майстри — у шторках.
- **≥ 1024 px — `DesktopBattleLayout`:** ліва колонка — `MyHeroPanel` + дії (DM — `DmQuickActionsPanel` замість
  них), середина — союзники й вороги поруч, права — `BattleLog` або `ParticipantDetails` (клік по учаснику,
  «← журнал»). Майстри — модалка по центру (`ResponsiveDialog`), книга — розворот на дві сторінки.

Кнопки шапки й дій мають фіксовані розміри; pending — спінер усередині кнопки, без зміни ширини
(перенесена знахідка «промах по Наступний хід»). «Скинути бій» — через `useConfirm`.

### 3.3 Компоненти (`components/battle/`)

| Компонент | Що робить |
|---|---|
| `InitiativeTrack` | черга з `turnQueue` (§5.1): межа раунду, додаткові ходи з «+», «я», повалені |
| `LastActionTicker` | остання подія журналу; тап (телефон) — журнал у шторці |
| `ParticipantRow` | портрет, ім'я, стан або HP, ефекти, AC (відомий для ворогів) |
| `MyHeroPanel` | HP, AC, слоти I–V (метали), мораль, заряди вмінь, ефекти, «хід через N» |
| `ActionGrid` | Атака / Магія / Бонус / Мораль; використана — тьмяніє |
| `TurnCountdown` | «Хід завершиться через N · Залишитись» |
| `ConnectionBanner` | «Немає зв'язку — стан може бути застарілим» |
| `ParticipantDetails` | стан, AC (відомий + з чиїх атак), ефекти з описом і джерелом, помічене в бою |
| `BattleLog` | журнал (на телефоні в шторці) |
| `AttackWizard` | §4.1 |
| `SpellBook` | §4.2: стрічки-кола, сторінка кола, сторінка заклинання, далі цілі й кидки в тому ж діалозі |
| `BonusActionPicker` | вміння + вибір цілі, якщо ефект має `target: "eventTarget"` |
| `DiceInput` | сітка d20/d10 (20 золотом, 1 червоним), AI ROLL; числовий ввід шкоди (`inputMode="numeric"`) з підказкою кубиків |
| `ResultOverlay` | промах / влучання / критичне (лише натуральна 20) / бойовий дух / паніка |
| `DamageFx` | тряска рядка, спалах портрета, число, що злітає, HP падає з «привидом», повалений знебарвлюється; лікування зелене; шкода по мені — червона віньєтка |

Нейтральні результати моралі — тост (`useNotify`). Екрани завантаження бою — `components/common/states`
(перенесена знахідка). Анімації вимикаються при `prefers-reduced-motion`.

**Видаляються:** `PlayerTurnView`, `PlayerTurnViewDialogs`, `PlayerTurnHud`, `TurnStartScreen`, `BattleFieldView`,
`ParticipantCard` і `participant-card/*`, `InitiativeTimeline`, `TargetSelectionDialog`, `AttackRollDialog`,
`DamageRollDialog`, `DamageSummaryModal`/`Content`, `SpellDialog` + `spell-dialog/*` (з `useSpellDialog`),
`SpellResultModal`, `RollResultOverlay`, `MoraleCheckDialog`, `BonusActionPickerDialog`, `BattlePageDialogs/*`,
`useAttackFlow*`, `useBattleSceneLogic*`, `useBattlePageDialogs`, `useMoraleOverlay`, `useDamageFlash`,
`useDamageBreakdown`. Те, що лишається потрібним (наприклад, DM-діалоги `AddParticipantDialog`, `ChangeHpDialog`,
`DmCasterPickerDialog`), переходить на контекст.

## 4. Флоу на редʼюсерах

Чисті переходи — у `lib/utils/battle/flows/*`, з тестами; хуки — у `lib/hooks/battle` (`useReducer` + мутація).

### 4.1 Атака — `attack-flow.ts` / `useAttackWizard`

`weapon → target → roll[i] → damage[i] → summary → submitting → result`, плюс `error`.

- `i` — удар (лук із 2 пострілами = 2 кидки). Крок зброї пропускається, якщо зброя одна.
- Події: `SELECT_WEAPON`, `SELECT_TARGET`, `SET_MODE(normal|advantage|disadvantage)`, `ROLL(value)`,
  `AI_ROLL`, `DAMAGE(rolls)`, `BACK`, `SUBMIT`, `SUCCESS(result)`, `FAIL(error)`, `CLOSE`.
- Влучання/промах після кидка — локально (`predictAttackNumbers`, як зараз). Промах → одразу відправка → оверлей
  «Промах»; влучання → шкода → підсумок → відправка → «Влучання» або «Критичне» (натуральна 20) → «Деталі шкоди».
- Підсумок: розбивка з `computeDamageBreakdown` на клієнті; кроки цілі (`side: "target"`) для ворога — «Захист і
  опори цілі — невідомо», доки не розкриті (§6).
- `FAIL` лишає майстер на підсумку з повідомленням; введене не губиться.
- AI ROLL — `crypto.getRandomValues` на клієнті (сервер валідує діапазони).
- Вибір зброї показує бонуси з умінь (експертна атака / стрільба тощо) і орієнтовну шкоду з ними.

### 4.2 Заклинання — `spell-flow.ts` / `useSpellBook`

`book(level) → spell → slot → targets → rolls → summary → submitting → result`.

- Один флоу для гравця, превʼю й DM-кастера (DM обирає кастера перед `book`).
- Список — `useSpells(campaignId, { enabled: open })` (спільний ключ кешу); фільтр за `knownSpells`.
- Слот: доступні кола ≥ рівня спела, з тим, що дає вище коло (кубики/цілі).
- Превʼю — локально тим самим рушієм зі спелом із кешу; серверний `dryRun` — лише для спелів із саммоном.
- Концентрація: позначка на спелі; якщо вже тримається інша — попередження в підсумку.

### 4.3 Хід гравця — `turn-flow.ts` / `usePlayerTurn`

`waiting → started → morale? → acting → countdown → ended`.

- Мораль: великий оверлей лише для додаткового ходу й пропуску; інші результати — тост.
- `countdown`: 5 с із «Залишитись» замість автопропуску за 1,5 с; будь-яка pending-мутація блокує дії й відлік.
- «Завершити хід» при невикористаній дії — `useConfirm`.
- Скидання стану — `key={participantId + round}` замість ефектів.
- Сповіщення про хід: `navigator.vibrate` (де є), заголовок вкладки «⚔ Твій хід», банер.

### 4.4 Бонусна дія

Якщо в уміння є ефект `target: "eventTarget"` — пікер просить ціль; сторона — з ефекту (лікування/баф —
союзники, шкода/дебаф — вороги). Сервер уже приймає `targetParticipantId`.

## 5. Відображення для гравця (чисті функції `lib/utils/battle/view/`, з тестами)

### 5.1 `turnQueue(order, turnIndex)`

Послідовність для `InitiativeTrack` і «хід через N»: решта поточного раунду → **додаткові ходи** (усі живі з
`actionFlags.hasExtraTurn`, у порядку ініціативи, як їх віддає `advanceTurn`) → межа раунду → наступний раунд.
Якщо триває додатковий хід (`battleData.extraTurnActive`), поточним є він.

### 5.2 Видимість (`visibleParticipant(p, viewer)`)

- DM — усе.
- Союзник — усе (HP числами, AC, ефекти, опори).
- Ворог для гравця:
  - HP → `healthState`: неушкоджений (100 %) / поранений (> 50 %) / закривавлений (≤ 50 %) / при смерті (≤ 25 %,
    пульсує) / повалений; смуга з 4 сегментів, без чисел;
  - вміння з прапорцем `seeEnemyHp` відкриває точні числа (як зараз);
  - AC → `knownArmorClass(log, targetId)`: з влучань (`AC ≤ total`) і промахів (`AC > total`) усіх атак по цілі —
    «13–15», «≥ 14», «?»; поясненням — чиї атаки;
  - захист і опори → `observedTraits(log, targetId)`: лише ті кроки `side: "target"`, що вже траплялися в подіях.
- Приховування — на клієнті (дельта одна на канал); для гри друзів цього достатньо.
- Журнал для гравця рендериться з `actionDetails` за тими самими правилами: без `targetAC` і без нерозкритих кроків
  цілі (рядок `damageBreakdown` бачить лише DM).

### 5.3 Інше

`lastAction(log)`, `turnsUntil(queue, meId)`, `spellTier(level)`, `abilityCharges(p)` (з `abilityUsage` +
`limits`), `effectiveStats(p, all)`.

## 6. Зміни рушія (сервер, з тестами)

1. `ActiveEffect.source?: { participantId; name; abilityName?; icon? }` — заповнюється при накладанні ефекту в
   `runAbilities`/спелах. Старі ефекти без `source` просто не показують «Від: …».
2. `computeDamageBreakdown` додатково повертає `steps: { label; side: "attacker" | "target"; kind: "dice" | "flat" |
   "percent"; value; after; icon? }[]`; рядки лишаються для журналу DM. Мутації атаки й спела кладуть `steps` у
   `actionDetails.damageSteps` події.
3. Нічого не міняється в правилах; `pnpm simulate-battle` має лишитися 34/34.

## 7. Перенесені знахідки (входять у пункт)

- AC на картці без аур/старого скіла → `effectiveStats` через `statWithModifiers`.
- Кнопки шапки зсуваються під час оновлень → фіксовані розміри, спінер усередині.
- Повідомлення поверх відкритої шторки на реальному iPhone не зсуває прокрутку — перевірити вручну, записати
  результат.
- Бойові екрани завантаження — на `components/common/states`.
- `useSpellDialog` у `components/battle` → логіка в `lib/hooks/battle` (`useSpellBook`).
- «Скинути бій» без підтвердження → `useConfirm`.

## 8. Egress

- Дія → дельта в Pusher і відповіді; GET бою лише на `refetch`, пропуск версії, reconnect і перше відкриття.
- Розбивка шкоди й превʼю спела без саммону — локально (було: завантаження бою з БД на кожне превʼю).
- Fallback-polling лишається 30 с і вимикається, коли Pusher підключений.
- Список спелів — спільний ключ кешу, `enabled` лише коли книга відкрита.

## 9. Тестування

- **Юніт (Vitest):** `applyBattleDelta` (стара версія, послідовна, пропуск, `order`, `removed`, `cancelledFrom`,
  збереження посилань), побудова `ClientBattleDelta` і поріг 9 500 байт (бій із 10 учасниками, атака по одній цілі
  — дельта вміщується), `useBattleAction` (expectedVersion, 409 → notify + invalidate), переходи `attack-flow`,
  `spell-flow`, `turn-flow`, `turnQueue`, `healthState`, `knownArmorClass`, `observedTraits`, `visibleParticipant`,
  `effectiveStats` (аура), `steps` у `computeDamageBreakdown`, `source` в ефектах.
- **Компоненти (happy-dom):** майстер атаки проходить до відправки й показує результат; промах пропускає шкоду;
  `TurnCountdown` скасовується «Залишитись»; «Завершити хід» з невикористаною дією питає підтвердження.
- **E2E:** `pnpm simulate-battle` на локальній БД — 34/34.
- **Браузер:** телефон 390 px (iframe на тому ж origin) і пряме вікно < 640 px; десктоп 1280 px; гравець і DM;
  перевірка, що звичайна дія не робить GET бою (вкладка Network).
- `pnpm lint && pnpm test:run && pnpm build`.

## 10. Поза скоупом

- Мобільна DM-панель (DM завжди з десктопа).
- Персональні дельти для кожного глядача (серверне приховування HP/AC).
- Контракт-міграція старих JSON-колонок `battle_scenes` (пункт 3c).
- Сідери `seed-mock-battle*` (пункт 9).
