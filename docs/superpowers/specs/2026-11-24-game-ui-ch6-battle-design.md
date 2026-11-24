# Ч6. Екран бою в стилі Game: спека

Частина епіку [game-style UI](2026-11-21-game-style-ui-approved-design.md) (розділ «Бій»; у старій нумерації плану це «Ч2. Екран бою»). Токени: [2026-11-21-game-style-tokens.md](2026-11-21-game-style-tokens.md). Аудит: [2026-11-21-game-style-audit.md](2026-11-21-game-style-audit.md). Мова для всіх екранів — вимоги власника від 2026-11-24 (нижче), втілені в прототипі Ч5 `prototypes/2026-11-24-character-sheet-premium.html`. Референс-скрін `plans/assets/2026-11-21-game-style-ui/battle-turn.jpg` — чужий продукт: беремо принципи, не арт.

Статус: **спека, код не змінюється**. План: [2026-11-24-game-ui-ch6-battle.md](../plans/2026-11-24-game-ui-ch6-battle.md).

## Залежності (блокують старт реалізації)

1. **Злиття Ч5** (лист персонажа): Ч5 одночасно міняє `components/**`, `app/globals.css`, `messages/**`; Ч6 стартує від main після злиття, інакше конфлікти токенів і i18n.
2. **Крок «дизайн-основа»** (окремо, поза цією задачею): спільний статичний фон платформи, токени руху (тривалості/easing, хуки на кшталт `useMotion`), доопрацьовані токени `--game-*`. Ч6 **посилається** на неї і не вигадує власних токенів тривалостей, кольорів чи фону; усі `TBD-motion` нижче = «взяти з дизайн-основи».
3. Ч1–Ч4 (оболонка `GameShell`, дашборд, список/журнал, світ) уже в main; Ч7 (дальність, туман) **не** входить.

## Вимоги власника (2026-11-24), що діють на бій

- «Преміум» = стриманість і ієрархія: акцент на найважливішому для гри (чий хід, що я можу, моє HP). Золото лише для змісту (вибраний токен/слот, головна дія, володіння), червоний лише HP. Без орнаментів, глоу, частинок.
- Доступність: контраст ≥ 4.5:1 (у всіх палітрах, зокрема `parchment`/`frost`, де бій сьогодні нечитабельний), цілі ≥ 40 px, не лише колір (ромб ресурсу має ще й підпис/стан, HP має число), focus-кільця, `prefers-reduced-motion`.
- Один спільний фон платформи. Для бою фоном сцени є мапа; панелі над нею мають гарантований контраст (непрозоре/скляне тло з достатньою щільністю, не залежне від того, що під ним).
- Рух із змістом, `transform`/`opacity`, 60 fps; із reduced-motion спокійна заміна (миттєва поява/короткий fade без зсуву).
- Форми: заокруглений квадрат. Гексів немає, **крім** гекс-сітки мапи (ігрова механіка) і круглих жетонів. Старі «гекс-кнопка ДІЯ» і круглі «сфери» затвердженого макета Ч0 перекриті цим рішенням: кнопка дії = заокруглений квадрат; слоти заклять і ромби ресурсів лишаються (ромб — не гекс, це індикатор).

## Reuse-пошук і рішення

Шукали в `components/{ui,hud,common}`, `components/battle`, `lib/hooks/{battle,common}`, `lib/utils/api`.

| Потреба | Є | Рішення |
|---|---|---|
| Оболонка/шапка | `components/layout/HeaderGate.tsx`, `game-shell-route.ts` | бій без шапки: предикат повноекранного маршруту (див. «Оболонка»); `GameShell` не використовуємо |
| Адаптивна композиція | `DesktopBattleLayout`, `MobileBattleLayout`, `BattleTopBar`, `CornerStack`, `MapStrip` (`MapStripSlotContext`, `NoticeStackContext`) | лишаються власниками композиції; колонки замінюються на сцену; патерн «слот-портал» з `MapStrip` перевикористовується для дока |
| Стан бою/вибору | `useBattleScene` (`select`, `selectedId`, `intents.mapAim/mapPick`), `useSelectedParticipant`, `useBattleViewMode`, `useMobileBattleTabs` | без змін; нових джерел стану немає |
| Кроки ходу | `usePlayerTurn` (`status.actionUsed/attackLeft/bonusAvailable`, `phase`), `MyTurnControls` (власник майстрів: `AttackWizard`, `SpellBook`, `CoreActionsDialog`, `GearDialog`, `BonusActionPicker`, `TurnCountdown`) | **`MyTurnControls` лишається власником хуків і не ремаунтиться**; док — презентер, який він портує в слот. Паралельної моделі дій не вводимо |
| Сітка дій | `ActionGrid` (тайли attack/magic/channel/ability/bonus/core/gear/strikeAndReturn + endTurn), `available`/`actions` пропси | лишається; змінюється лише контейнер (поповер на desktop, шторка на phone) |
| Герой | `MyHeroPanel` (портрет `ZoomablePortrait`, `HealthBar`, `HpFigure`, `TurnTimerBar`, `heroPanels` слот системи, `EffectLine`, заряди/пули, `ReadiedAttackButton`, `ReactionSpellButton`, `compact` режим) | нові «аватар-кластер» і «панель станів» будуються з цих самих примітивів; логіка в `MyHeroPanel` лишається |
| Бульбашка токена | `ParticipantDetails` (права перегляду `canSeeExactStats`, `statblockOf`, `observed`), `MapTokenHud` (HP-плашка на мапі), `components/ui/popover` (Radix) | `ParticipantDetails` усередині Radix-popover із віртуальним якорем-токеном |
| Шторки | `ResponsiveDialog` (діалог desktop / bottom sheet phone), `DmQuickActionsPanel` (уже має проп `panel: {open,onOpenChange}`), `ReserveSheetButton`, `Disclosure` | на phone — `ResponsiveDialog`; на desktop бокова шторка `BattleDrawer` (**нове**: у `components/ui` немає side-sheet; будується на Radix Dialog non-modal; один компонент для log/DM/reserve/tools) |
| Лог | `LastActionTicker` (`onOpenLog`), `BattleLog`, `useBattleLogHistory`, `log.show/close/open/focus` | ticker лишається; `BattleLog` — у шторці |
| Тулбар мапи | `BattleMapPanel` (`tools` через `MapToolsSlot` на desktop, inline на phone: weather/background/motion/terrain/fog/modeTools/`UpdateMapButton`) | один слот-контекст, тепер у шторці «Інструменти»; логіку панелі не міняємо |
| Кіт | `HudButton`, `HudIconButton`, `HudToggleChip`, `HudChipTabs`, `HUD_SURFACE` | основа контролів; нових примітивів у `hud` не створюємо без потреби (можливий `hud/DockDiamond` лише якщо дизайн-основа не дасть) |
| Мова/форми | `useMediaQuery`, `DESKTOP_QUERY`, `useReducedMotion`, `useFxEnabled` | як є |
| Системи | `useSystemBattleUi()` (`HeroStats`, `heroPanels`, `badges`, `turnStart`, `notices`, `dialogs`, `ChannelLabel`), `useBattleRules().actionEconomy`, `modeUiOf(battle.map)` | усі «системні» місця лишаються слотами; док читає `actionEconomy` |

**Чому щось нове:** `BattleDrawer` (немає side-sheet), `ActionDock` (презентер; макет вимагає нової композиції), `TokenBubble` (контролер якоря/позиції; вміст — наявний `ParticipantDetails`), `HeroCluster` (композиція аватар + HP + слоти з наявних примітивів), `useTokenAnchor` (екранна позиція токена).

## Оболонка

**Рішення власника (2026-11-24): на бою немає шапки** (ні старого `Header` з крихтами, ні шапки `GameShell`, ні назви бою, ні індикатора зʼєднання). Сцена — повний екран: мапа займає `100dvh`. Єдиний постійний елемент зверху зліва — **плашка раунду поверх мапи** (`RoundBadge`, номер раунду).

Сьогодні `HeaderGate` показує старий `Header` (≈ 89 px, `--app-header-h`, `.below-header { height: calc(100dvh - var(--app-header-h)) }`) на всіх маршрутах, крім `shouldUseGameShell`/лендингу/auth. **Реалізація:** до `HeaderGate` додається предикат повноекранного маршруту (поряд із `shouldUseGameShell`, у `components/layout/game-shell-route.ts`: `isFullBleedRoute(pathname)` → `/campaigns/[id]/battles/[battleId]`, з тестом) — `Header` не рендериться; бій **не** обгортається в `GameShell`. Висота сцени `100dvh` (phone: `100dvh` з урахуванням `env(safe-area-inset-*)`), `.below-header` у бої замінюється на повноекранний клас; `PREPARED`-гілка (`BattlePreparationView`) теж повноекранна, але прокручується.
Наслідки: (а) **вихід з бою** — пункт «До кампанії» (посилання) у шторці «Інструменти» (без нього користувач застрягає); (б) `BattleTopBar` скорочується до `RoundBadge` + `useTurnTimer()` (хук має лишитись змонтованим, це таймер ходу) — назва, FX, «вигляд гравця», DM-кнопки переїжджають; (в) `ConnectionBanner` лишається **лише як банер збою** (показується тільки при втраті зʼєднання, постійного індикатора немає — інакше гравець не дізнається про розрив); (г) навігація між розділами під час бою — через «До кампанії» й меню там.

## Композиція

Одна модель взаємодії для desktop і phone; різниться лише розкладка.

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Раунд 3]          [ ініціатива, компактно, по центру ]     [⋯ край]│
│ (плашка поверх)    LastActionTicker (1 рядок)               [журнал]│
│                                                                     │
│                  МАПА НА ВЕСЬ ЕКРАН (BattleMapPanel)          [DM]  │
│             ⟨бульбашка біля вибраного токена⟩               [резерв]│
│                                                              [інстр.]│
│ [аватар+слоти]       [ нижній док дій ]                             │
└─────────────────────────────────────────────────────────────────────┘
```

- **Мапа:** `BattleMapPanel` займає всю сцену (без `aside`, без рядка тулбара над мапою). Бій без мапи: у центрі колонки `BattleColumns` (як зараз) під ініціативою; док і шторки ті самі.
- **Бульбашка токена:** клік/тап по токену → `select(id)` (існуюча модель) → `TokenBubble` (Radix popover з віртуальним якорем) показує `ParticipantDetails`; для героя гравця — ще HP/ресурси/стани (з `MyHeroPanel`-примітивів). Один відкритий; закриття `Esc`, клік поза, повторний клік по токену; `select(null)` синхронно. **Пріоритет цілі:** коли активні `intents.mapAim`/`mapPick`/`placing`/інструмент мапи — клік по токену обирає ціль, бульбашка **не** відкривається (інакше зламаємо майстри заклять/атак). Клік по `InitiativeTrack` теж `select`; якщо токен поза видимою областю камери — бульбашка прив'язується до краю з кнопкою «до токена» (є `MapTokenHud` `onReturn`). Без мапи — деталі відкриваються у шторці/діалозі (як сьогодні на phone).
- **Нижній док (по центру):** ромби дія / бонус / реакція (**підпис і стан текстом**, не лише колір; використана дія лишається в розмірі, сіра), смуга руху (лише якщо є сітка й дані руху, нейтрально до системи), головна кнопка «Дія» → `ActionGrid`, коли ресурсів нема — «Кінець ходу» (`turn.actions.endTurn`). Не мій хід: док згортається в індикатор «Хід: <ім'я>» (зараз `actionsWait`/`waitingFor`). Спостерігач (`viewer.readOnly`, `playerView`) і DM без героя: док не рендериться (як сьогодні немає `MyTurnControls`). Набір ромбів від `useBattleRules().actionEconomy` (`{bonusAction, reaction}`): системи без бонусної дії/реакції не показують зайвих ромбів.
- **`ActionGrid`/`CoreActionsDialog`:** відкриваються від кнопки «Дія» як поповер над доком (desktop, радіальний варіант не робимо: гірша доступність) і як bottom sheet через `ResponsiveDialog` (phone). Усі наявні тайли й доступність умов (`available`) зберігаються 1:1.
- **Аватар-кластер (ліворуч внизу):** аватар героя з HP-смугою та числом, таймер ходу (`TurnTimerBar`), слоти заклять із `heroPanels` системи; клік по аватару — панель станів (з `EffectLine`/ефектів учасника, дані з ефектів бою, не окреме сховище). `ConditionTestPanel`, заряди/пули, `ReadiedAttackButton`, `ReactionSpellButton`, `pendingCast` лишаються в панелі героя (розгортається з аватара).
- **Ініціатива:** `InitiativeTrack` зверху по центру, нижча висота; reorder (`useTrackReorder`) і вибір лишаються.
- **Журнал:** `LastActionTicker` + кнопка на краю → шторка з `BattleLog` (`log.show/focus`).
- **Шторки на краях:** кнопки на правому краї сцени (≥ 40 px): Журнал, DM (лише `isDM`, `DmPanel`), Резерв (`ReserveGroup`, лише коли є мапа), Інструменти (слот `BattleMapPanel`, перемикач «Мапа/Колонки» / «Мапа-Союзники-Вороги», FX, «вигляд гравця», звук/музика, для DM — «Завершити бій» і «Скинути», «До кампанії»). «Наступний хід» для DM — швидка кнопка в доку (рішення власника); швидкі дії DM (`DmQuickActionsPanel`) лишаються в DM-шторці.
- **Банери:** `ConnectionBanner`, `BattleOverBanner`, `AwaitingDmBanner`, `BattleToast`, `CounterWindowBanner`, system `notices` — тонкий стек зверху під ініціативою (`NoticeStackContext` лишається).
- **`CornerStack`** (зараз лівий низ: `ActionResultCard`, `AudioDock`, `SoundboardPanel`) конфліктує з аватар-кластером → звук/саундборд переїжджають у шторку «Інструменти», `ActionResultCard` — над доком по центру.
- **Phone:** та сама модель. Мапа на всю висоту; док ≥ 40 px цілі, резервує безпечну зону (`env(safe-area-inset-bottom)`), мапа закінчується над доком (відкрите питання Ч0 №2 закрито: мапа не перекривається доком, жетони не опиняються під кнопками); аватар 56 px; слоти заклять — лише через «Закляття» (шторка 5+4 зі слотів, як у затвердженому дизайні Ч0); `ActionGrid` — bottom sheet. Таби Мапа/Союзники/Вороги з `MobileBattleLayout` лишаються як перемикач «вигляду» у шторці «Інструменти» (потрібні для бою без мапи і як альтернатива).

## Матриця «що є сьогодні → де в новому макеті»

| Сьогодні (desktop / phone) | Новий макет (desktop = phone, крім позначеного) |
|---|---|
| Ліва колонка `MyHeroPanel` (desktop) / нижня смуга `MyHeroPanel` (phone, не-мапа) | Аватар-кластер зліва внизу; повна панель героя розгортається з аватара (popover / bottom sheet) |
| `MyTurnControls` + `ActionGrid` у лівій колонці / `strip` + `MapStripRow` на phone | Док + `ActionGrid` у поповері/шторці; `MyTurnControls` не ремаунтиться, портує док у слот |
| `actionsWait` (desktop) / `waitingFor` (phone) | Індикатор в доку «Хід: …» |
| Правий `aside` (`ParticipantDetails` ↔ `BattleLog`, кнопка `backToLog`) / діалог деталей на phone | Бульбашка токена; журнал окремо в шторці (більше не підміняється деталями) |
| `LastActionTicker` (з `onOpenLog` лише phone) | Ticker під ініціативою обох екранів; тап → шторка журналу |
| `InitiativeTrack` (h-20) | Компактніше (висота TBD-дизайн-основа), ті самі reorder/select |
| `BattleTopBar`: назва, «Ваш хід», FX, player-view, раунд, зʼєднання | Лише `RoundBadge` зліва вгорі поверх мапи; назви й постійного індикатора зʼєднання немає (`ConnectionBanner` лише при збої); «Ваш хід» — акцент дока/аватара; FX і «вигляд гравця» — в «Інструменти» |
| `BattleTopBar` DM: Завершити / Скинути (`hidden lg:flex`) | «Інструменти» (секція DM, обидва екрани) |
| `BattleTopBar` DM: Наступний хід | Швидка кнопка в доку (також для DM без героя) |
| Вихід з бою (через `Header`) | «До кампанії» в «Інструменти» |
| `DmPanel` у лівій колонці (desktop) / Settings2-шторка (phone) | DM-шторка на краю обох екранів (`DmQuickActionsPanel panel`) |
| `ReserveGroup` у колонці / `ReserveSheetButton` у табах | Кнопка «Резерв» на краю; шторка |
| Рядок інструментів над мапою (`MapToolsSlot`) / inline-ряди на phone | Шторка «Інструменти» (`BattleMapPanel` слот), ті самі інструменти |
| Перемикач «Мапа/Колонки» (`HudChipTabs`, `useBattleViewMode`) / таби Мапа-Союзники-Вороги | Перемикач вигляду в «Інструменти»; режим без мапи лишається колонками |
| `AudioDock`, `SoundboardPanel` у `CornerStack` | Шторка «Інструменти» (звук/музика/саундборд) |
| `ActionResultCard`, `BattleResultScreen`, `CompleteBattleDialog`, `DmRevivePrompt`, `CounterWindow*`, `AttackWizard`/`SpellBook`/діалоги | Без змін (діалоги/оверлеї поза композицією); `ActionResultCard` над доком |
| `ParticipantList` (союзники/вороги) | Колонки (без мапи) і вид у «Інструменти» |
| `PREPARED`: `BattlePreparationView` | Без змін, лише оболонка `GameShell` і змінна висоти |
| Режими мап (maze, motion, зони, туман-тулбар) | Через `modeUiOf`/слоти без змін; їхні тулбари — у шторці «Інструменти»; режимні `TurnControls` (`ui.TurnControls`) рендеряться в `ActionGrid`-контейнері |
| Права: DM / гравець / резерв-стаб / спостерігач `readOnly` / `playerView` | Док тільки у героя гравця й тільки в активному ході; DM-шторка тільки `isDM && !readOnly`; в `readOnly` лише мапа, ініціатива, ticker, журнал (без контролів) |
| Системи (`wfrp`, d6pool, d20+модулі) | Слоти `systems/<id>/ui`, `systemUiOf`: `heroPanels`, `HeroStats`, `badges`, `turnStart`, `notices`, `dialogs`; ромби дока від `actionEconomy`; жодних `=== "<id>"` у ядрі |

Критерій повноти: перед мержем виконавець перевіряє кожен рядок у таблиці на живому прогоні; рядок без видимого тригера = блокер.

## Системна нейтральність

Док і кластер не називають систему: ромби — з `actionEconomy`, слоти/лічильники/ресурси — з `useSystemBattleUi()` і `poolViews`/`abilityCharges` (`lib/utils/battle/view`), гейт ходу — `turnStart.Panel/Label` усередині контейнера дока (порядок «мутація → resolve → кубики FX → підсумок → skipTurn» не змінюється, див. battle.md «Гейт ходу»). Нові тексти — у `battle`-namespace, системні — у namespace системи.

## Анімації (залежать від «дизайн-основи»)

Лише `transform`/`opacity`; усі тривалості/easing — токени дизайн-основи (`TBD-motion`), хуки руху — її ж. Що анімуємо: поява/зникнення бульбашки (scale 0.96→1 + fade від якоря), шторки (slide від краю + fade), поява/згортання дока при зміні ходу, споживання ромба (заливка → сірий), початок ходу героя (спокійний акцент на аватарі/доці, не ефект), HP (наявні `useHitChange`/`map-hud-trail` лишаються), перехід вибору токена (контур). Існуючі FX (Canvas 2D: `BattleFxLayer`, `PortraitFx`, `HitFrame`, vignette) **не чіпаємо**. `prefers-reduced-motion`: без зсувів/масштабу, миттєва зміна або короткий fade; перевірка через `useReducedMotion`/`useFxEnabled`.

## i18n

Ключі в `messages/{uk,en}/battle.json` (підрозділи `dock`, `bubble`, `drawers`, `hero.states`), без Cyrillic у коді (ESLint). Сторінка бою вже під `ExtendLocaleScope` у `app/campaigns/[id]/battles/layout.tsx` (`BATTLE_NAMESPACES` + `systemScope(...,'battle')` + `logScope`), поверх `LocaleScope` з `app/campaigns/layout.tsx`, який **замінює** кореневі повідомлення; нового namespace **не** створюємо (додаємо в існуючий `battle`), тому `scope-size` страждає лише на розмір: перевірити запас у `lib/i18n/__tests__/scope-size.test.ts` (ліміт `LIMIT_KB = 112`, `member`/`battle` бюджети систем із `meta.i18n.budgetKb`), заміряти uk-gzip до/після; якщо бракує — підняти бюджет свідомо, не обходити. Запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` у `messages/*/whatsNew.json` (користувацька зміна) і оновлення hint-статті онбордингу бою (`player.battle`, `dm.battle-scene`, demo-тури `battle.*` через `data-tour`: `battle.topbar`, `battle.hero`, `battle.log`, `battle.map-tools`, `battle.reset`, `battle.next-turn` — **`data-tour` якорі зберегти або мігрувати разом із тестами турів**).

## Проблеми поточного UI

**Джерело: аналіз коду + аудит 2026-11-21.** Живий огляд поточного бою (next start, :3100) — окремий додаток, див. нижче. Підтверджено кодом:

1. Подвійна шапка: старий `Header` (≈ 89 px) + `BattleTopBar` (48) + ряд ініціативи (80) + рядок тулбара мапи ≈ 215–250 px вертикалі до мапи на 900 px; бічні колонки 320 + 280 = 600 px (≈ 42 % ширини 1440).
2. Деталі учасника підміняють лог у правій колонці (`backToLog`): ціль/контекст губляться, лог недоступний, поки вибрано токен.
3. DM-кнопки «Завершити/Скинути/Наступний хід» у верхній панелі лише від `lg`; на phone вони в іншому місці (`Settings2`-шторка) — дві моделі.
4. Phone, не-мапа вкладка: тулбар + ініціатива + ticker + статус + таби = 4–5 смуг до вмісту; на мапі мапу стискають багаторядкові інструменти (аудит).
5. `CornerStack` (лівий низ) складає `ActionResultCard`, `AudioDock`, `SoundboardPanel` поверх мапи в тому ж куті, де буде аватар.
6. Дві реалізації «дій ходу»: `ActionGrid` у колонці (desktop) і `strip`/`MapStripRow` (phone) — різна взаємодія для однієї функції.
7. Низький контраст бою на `parchment`/`frost` (відомо з плану Ч0).

Додаток «Живий огляд»: **не виконано в цій сесії** — потрібен вхід користувача на `localhost:3100` у вікні розширення Chrome; підготовка стенда делегована Sonnet-субагентові, огляд (desktop 1440×900, phone 390×844, масштаб скрінів 0.5–0.6, перевірка DOM/тексту замість скрінів) виконується окремим кроком T0 плану й доповнює цей розділ.

## Ризики

| Ризик | Що зачіпає | Мітигація |
|---|---|---|
| Прибрана шапка: немає виходу, висота `100dvh`, safe-area | `HeaderGate`, `.below-header`, PREPARED-гілка, `useTurnTimer` | предикат маршруту + тест; «До кампанії» в Інструментах; `RoundBadge` тримає `useTurnTimer`; live-перевірка PREPARED/ACTIVE на phone з адресним рядком |
| Ремаунт `MyTurnControls` вбиває відкритий майстер/прицілювання | атака, закляття, `mapAim` | док портується в слот; обгортка не видаляється з дерева; тест «майстер переживає зміну вкладки/шторки» |
| Клік по токену конфліктує з прицілюванням | `intents.mapAim/mapPick`, `placing`, інструменти мапи | пріоритет цілі (бульбашка лише коли жоден інтент не активний); тест сітки взаємодій |
| Інваріанти бою | `runBattleMutation`, `snapshot`+`snapshotHash`, `advanceTurn`, `applyDamageConsequences`, `ClientBattleDelta` | **Ч6 не торкається `lib/server/**`, `lib/utils/battle/pipeline|turn`, API-роутів, схем**; лише `components/battle/**` і читання хуків. Кінець ходу — наявний `turn.actions.endTurn`/`nextTurn` |
| Перерендери мапи | `MapStage`, `MapTokenHud` (memo), Canvas FX | бульбашка/док не читають `useBattleScene()` цілком у мапі; селектори вузькі; `ParticipantRow`-стиль memo; позицію токена беремо з DOM (`data-map-hud`), не через ререндер мапи; `useTokenAnchor` у rAF лише поки бульбашка відкрита |
| Egress / Pusher | дельти | жодних нових запитів; `usePusherBattleSync`/`applyBattleDelta` без змін; нові поля не потребують рефетчу |
| Приховані дані для гравця | `canSeeExactStats`, `reserveStub`, `observed` | бульбашка = `ParticipantDetails` як є; не показувати HP ворога точно; тест прав |
| Bundle/перша паливна | `MobileBattleLayout` в entry-чанку, desktop підвантажується | нові презентери dynamic там, де не потрібні на першому екрані; не роздувати entry |
| Контраст на всіх палітрах | `HUD_SURFACE`, скло над мапою | панелі зі щільним тлом незалежно від мапи; перевірка через `PaletteSwitcher` у живому прогоні |
| `scope-size` | `battle.json` ↔ ліміт | замір до/після (див. i18n) |
| Demo-тури/онбординг | `data-tour` якорі | зберегти або мігрувати з тестами (`components/battle/demo`) |
| Паритет phone | усі шторки/док | кожна задача плану закриває обидва екрани; живий прогін обов'язковий |

## Тести

Покриваємо (Vitest, UI з `// @vitest-environment happy-dom`): `game-shell-route` (+маршрут бою); `useTokenAnchor` (чиста геометрія); `TokenBubble` — один відкритий, `Esc`/клік поза, пріоритет `mapAim/mapPick`, права (гравець не бачить точного HP ворога); `ActionDock` — набір ромбів від `actionEconomy`, використана дія сіра, «Кінець ходу» коли ресурсів нема, не рендериться для `readOnly`/не-героя; сітка прав DM/гравець/спостерігач/резерв × desktop/phone (ролі й наявність тригерів шторок); `MyTurnControls` не ремаунтиться при відкритті шторок; регресії наявних тестів `components/battle/**` і `lib/hooks/battle/__tests__` (`useMobileBattleTabs`, `useBattleViewMode`), `ui-layers`, `i18n` ключі, `scope-size`. Вручну (живий прогін, T9): весь список матриці на desktop і phone, три палітри (`tavern`, `parchment`, `frost`), reduced-motion, режими maze і wfrp/d6pool, бій без мапи, резерв, DM «вигляд гравця», завершення бою. Агенти тести не запускають; один повний `pnpm test:run` у кінці (правило проєкту).

## Рішення власника (2026-11-24, відповіді на відкриті питання)

1. **Без шапки.** Ні `Header`, ні назви бою, ні індикатора зʼєднання; раунд — лівий верхній кут поверх мапи; мапа на весь екран; «вигляд гравця» і DM-кнопки — в «Інструменти».
2. **Phone:** деталі токена — bottom sheet.
3. **«Наступний хід»** — швидка кнопка в доку.
4. **Перемикач «Мапа/Колонки»** і таби phone — в «Інструменти».
5. **Іконки входять у Ч6** (не заглушки): див. «Іконки». Відкладеним лишається лише решта арту (фони екранів, портрети, текстури) — на заглушках до кінця епіку.
6. Радіальне меню відхилено (поповер/шторка) — не заперечено.

Лишається відкрите: стилістичний орієнтир набору іконок (див. нижче) і чи потрібен у бою звук-відгук на дії (поза Ч6, лише відмітка).

## Іконки

Входять у Ч6: дії (атака, закляття, бонусна дія, реакція, дії ядра, спорядження, здібність, канал, «strike and return», кінець ходу, наступний хід), ресурси дока (ромби), рух, кнопки краю (журнал, DM, резерв, інструменти, вигляд, FX, «вигляд гравця», вихід), стани героя. Правила: наша мова форм (заокруглений квадрат/м'які кути, моно-лінійні 24 px, `currentColor`), не копіювати чужий арт; перед створенням — **reuse-пошук**: `lucide-react` (вже використовується), `components/battle/hud`, наявні іконки ефектів/дій у `public`/`lib/constants`, пайплайн ідентичних іконок (`scripts/assets/grim-icons`, `icons.json`). Кастомні SVG робимо лише там, де lucide не дає читабельного образу; кожна — React-компонент у `components/hud/icons/battle/` (рівень `hud`, без доменних типів), єдина сітка/товщина штриха. Перед підключенням — HTML-превʼю сету (всі палітри, розміри 16/24/40) на погодження власнику. Контраст і не-лише-колір діють і для іконок.

