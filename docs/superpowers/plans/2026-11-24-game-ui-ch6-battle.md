# Ч6 — екран бою (game-style UI): план

> **Для виконавців:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Кроки з чекбоксами. За правилами проєкту: агенти **не запускають тести** (один повний `pnpm test:run` у кінці, T8); lint по папках; без per-task ревʼю, одне фінальне Opus-ревʼю; виконавці — Sonnet.

**Ціль:** замінити три колонки бою на сцену «мапа на весь екран + бульбашка токена + нижній док дій + шторки», з однією моделлю взаємодії на desktop і phone, без зміни доменної поведінки.

**Архітектура:** лише `components/battle/**` (+ маршрут оболонки, CSS-змінна висоти, i18n, whats-new). `MyTurnControls` лишається власником хуків/майстрів і портує презентер дока в слот лейаута; бульбашка = Radix popover з віртуальним якорем над наявним `ParticipantDetails`; шторки = `BattleDrawer` (desktop) / `ResponsiveDialog` (phone).

**Спека:** [2026-11-24-game-ui-ch6-battle-design.md](../specs/2026-11-24-game-ui-ch6-battle-design.md) (матриця, ризики, reuse) — читати першою.

## Залежності й гейти (T0 перевіряє)

- Ч5 **злито в main**; гілка Ч6 перебазована на main.
- «Дизайн-основа» (спільний фон, токени/хуки руху) **є в main**. Якщо ні — T1–T6 роблять статику на `--game-*`, T7 чекає. Власних тривалостей/easing не вводити.
- Не торкаємось: `lib/server/**`, `lib/utils/battle/{pipeline,turn}`, `app/api/**`, `prisma/**`, `components/fx/**`, `components/battle/map/{fog,weather,tiles,edges,motion}`, `components/battle/wizards/**`, `components/battle/setup/**`, `components/battle/overlays/**`, `systems/**`, `lib/utils/rules/**`.

## Global constraints

- Шари `ui → hud → common → fx → domain`; ESLint `ui-layers/zone`, `raw-controls` (лише `HudButton`/`Button`); жодних `=== "<id системи>"` у ядрі; нових `@/systems/*` імпортів немає.
- ≤ ~7 props, домен-обʼєкти; презентери не читають `useBattleScene()` цілком у гарячих місцях (вузькі селектори).
- Тексти лише через ключі `battle.*` (uk+en); коментарі англійською, мінімум.
- Цілі ≥ 40 px, контраст ≥ 4.5:1 у `tavern`/`parchment`/`frost`, focus-кільця, не лише колір; золото = вибране/головна дія, червоний = HP; заокруглений квадрат.
- Рух: `transform`/`opacity`, токени дизайн-основи, `useReducedMotion` → заміна без зсуву/масштабу.
- Інваріанти бою (battle.md) не чіпаємо; кінець ходу — наявні `turn.actions.endTurn`/`actions.nextTurn`.

## Review Focus (кожен рядок має тест у задачі-власнику)

1. Клік по токену під час `mapAim`/`mapPick`/`placing` обирає ціль і **не** відкриває бульбашку (T3).
2. Відкриття шторок, зміна вигляду чи ходу **не ремаунтить** `MyTurnControls` і не скидає майстер/прицілювання (T2, T6).
3. Гравець не бачить точного HP ворога/резерву; `readOnly`/`playerView` без контролів (док, DM-шторка) (T2, T3, T4).
4. Система без бонусної дії/реакції (`actionEconomy` false) без зайвих ромбів; wfrp/d6pool відкривається без падіння слотів (T2).
5. Бій без мапи: усе доступне, порожньої сцени немає (T1, T6).
6. Бій у `GameShell`: старий `Header` не рендериться; висота сцени коректна в `PREPARED` і `ACTIVE` (T1).

---

### T0. Гейти й живий огляд поточного бою (Sonnet-субагент, без коду)

**Файли:** розділ «Проблеми поточного UI» спеки; нічого в `components/**`.
- [ ] Перевірити гейти (Ч5 і дизайн-основа в main); перебазувати `feat/game-ui-ch6` на main.
- [ ] Користувач логіниться на `http://localhost:3100` (стенд: БД `ch6_battle`; бій `/campaigns/cmuylhk0c0001ia06lg5eommv/battles/cmw3su6pw0001l408ouxdbzrv`, DM-акаунт відомий користувачу). Після rebase перезібрати: `next build --experimental-build-mode compile`, `pnpm exec next start -p 3100` (не `next dev`).
- [ ] Chrome-розширення (власне вікно): desktop 1440×900, phone 390×844, скріни 0.5–0.6, DOM/текст замість скрінів; ролі DM/гравець, три палітри, відкриті майстри. Реальні проблеми → розділ «Живий огляд» спеки.
- [ ] Коміт `docs: ch6 live audit of current battle UI`.

### T1. Оболонка і каркас сцени (desktop) — 1 виконавець

**Файли:**
- Modify: `components/layout/game-shell-route.ts` (+маршрут `/campaigns/[id]/battles/[battleId]`), `components/layout/__tests__/game-shell-route.test.ts`
- Modify: `app/campaigns/[id]/battles/[battleId]/page.tsx`/`page-client.tsx` (обгортка `GameShell` з `fit`: **прочитати, як це робить сторінка світу/`GameWorldShell`**)
- Modify: CSS висоти — у бої замінити `.below-header` на змінну висоти оболонки (прочитати правила `[data-shell-fit]` у `app/globals.css`; інші споживачі `.below-header` не ламати)
- Modify: `components/battle/scene/layout/DesktopBattleLayout.tsx` (прибрати `aside`-и й рядок тулбара; сцена = `relative` контейнер зі слотами; `BattleColumns` лишається для бою без мапи/режиму колонок), `components/battle/scene/BattleScreen.tsx` (PREPARED на нову висоту)
- Create: `components/battle/scene/layout/SceneSlots.tsx` — `SceneSlotsContext` + `useSceneSlot('dock'|'rail'|'top')` (патерн `MapStripSlotContext`)

**Interfaces:** Produces `SceneSlotsContext`, `useSceneSlot`; `data-tour` якорі `battle.topbar|hero|log|map-tools|reset|next-turn` зберігаються на нових місцях.

- [ ] Тест маршруту: `shouldUseGameShell('/campaigns/c1/battles/b1') === true`; `/campaigns/new` без змін.
- [ ] Каркас: `BattleMapPanel` на всю сцену (рядок інструментів тимчасово лишається, переїде в T4).
- [ ] Перевірити, що `HeaderGate` не показує `Header` на бою.
- [ ] `pnpm exec eslint --fix` по touched; коміт `feat(battle): ch6 scene shell and slots`.
- **Не чіпати:** `MobileBattleLayout` (T6), логіку `BattleMapPanel`.

### T2. Нижній док і аватар-кластер — 1–2 виконавці

**Файли:**
- Create: `components/battle/turn/dock/{ActionDock,DockDiamond,MoveBar,ActionsPopover}.tsx` (`ActionsPopover`: Radix popover на desktop, `ResponsiveDialog` на phone за `DESKTOP_QUERY`)
- Modify: `components/battle/turn/MyTurnControls.tsx` — проп `dock?: boolean`: `createPortal(<ActionDock/>, useSceneSlot('dock'))`; хуки/майстри/діалоги **не переміщуються**; `full`/`strip` лишаються до T6
- Modify: `ActionGrid.tsx` — лише обгортка/стилі; тайли, `available`, `actions`, `endTurn` без змін
- Create: `components/battle/participants/hero/{HeroCluster,HeroStatesPanel}.tsx` з примітивів `components/battle/hud` (`HealthBar`, `HpFigure`, `TurnTimerBar`, `EffectLine`) і слотів `heroPanels`; `MyHeroPanel` лишається (повна панель у розгортанні аватара)
- Test: `components/battle/turn/dock/__tests__/{ActionDock,DockDiamond}.test.tsx` (happy-dom)

**Interfaces:** `ActionDock` props `{ status: { actionUsed: boolean; bonusAvailable: boolean; reactionAvailable: boolean | null }; economy: { bonusAction: boolean; reaction: boolean }; move?: { used: number; max: number }; phase: TurnPhase; onActions(): void; onEnd(): void }`. Реакцію/рух брати з `hero.actionFlags`/`battleData.movement` — **звірити поля в `types/battle.ts` (≈311, 382, 403) і `usePlayerTurn.status`; відсутній читач додати в `lib/utils/battle/view`, не в мутаційні хуки.**

- [ ] Тести спершу: ромби лише за `economy.*`; витрачена дія `data-state="spent"` + текст; «Кінець ходу», коли ресурсів нема; не рендериться без героя/при `readOnly`; `countdown` лишає `TurnCountdown`.
- [ ] Реалізація; гейт ходу (`turnStart.Panel`) усередині контейнера дока, порядок «мутація → resolve → FX → підсумок → skipTurn» не змінюється.
- [ ] Не мій хід → індикатор «Хід: <ім'я>» (`battle.dock.waiting`).
- [ ] eslint по `components/battle/turn components/battle/participants`; коміт `feat(battle): ch6 action dock and hero cluster`.
- **Не чіпати:** `usePlayerTurn`, `useAttackWizard`, `AttackWizard`, `SpellBook`, `CoreActionsDialog` (крім відкриття).

### T3. Бульбашка токена — 1 виконавець

**Файли:**
- Create: `components/battle/map/bubble/TokenBubble.tsx` (Radix `Popover`, virtual anchor), `lib/hooks/battle/useTokenAnchor.ts` (чиста `anchorRect(el, stage)` + hook на rAF лише поки відкрито; якір `[data-map-hud="<id>"]`), експорт у `lib/hooks/battle/index.ts`
- Modify: `DesktopBattleLayout.tsx` (рендер над сценою)
- Test: `lib/hooks/battle/__tests__/useTokenAnchor.test.ts`, `components/battle/map/bubble/__tests__/TokenBubble.test.tsx`

**Правила:** відкрита ⇔ `selectedId != null` і жоден з `intents.mapAim`/`mapPick`/`placing`/`toolActive`; `Esc`, клік поза, повторний клік по токену → `select(null)`; один екземпляр; токен поза видом → «до токена» (наявна `onReturn`-логіка камери, не дублювати); вміст `ParticipantDetails` як є; для героя гравця додатково `HeroStatesPanel`.
- [ ] Тести: (1) `mapAim` → закрита попри `selectedId`; (2) `Esc` → `select(null)`; (3) гравець не бачить точного HP ворога (фікстури `canSeeExactStats`); (4) `isFallen` токен закриває бульбашку.
- [ ] Без мапи: деталі у `ResponsiveDialog`; клік по `InitiativeTrack` не ламати.
- [ ] коміт `feat(battle): ch6 token bubble`.

### T4. Шторки на краях — 1–2 виконавці

**Файли:**
- Create: `components/battle/scene/drawers/{BattleDrawer,DrawerRail,ToolsDrawer}.tsx` (`BattleDrawer`: desktop side-sheet на Radix Dialog non-modal, `Esc`/клік поза; phone — `ResponsiveDialog`; `DrawerRail`: кнопки ≥ 40 px Журнал/DM/Резерв/Інструменти за правами; `ToolsDrawer`: слот інструментів `BattleMapPanel` через `MapToolsSlotContext`, перемикач «Мапа/Колонки» (`useBattleViewMode`), FX, `BattlePlayerViewToggle`, `AudioDock`, `SoundboardPanel` (isDM && !readOnly))
- Modify: `dm/DmPanel.tsx` (desktop-шторка через наявний `panel`; «Завершити/Скинути/Наступний хід» переїжджають із `BattleTopBar` з тими самими handlers `onComplete`, `confirm`+`actions.reset`, `actions.nextTurn`)
- Modify: `BattleTopBar.tsx` (лишити назву·раунд·зʼєднання·`useTurnTimer`), `BattleScreen.tsx` (`CornerStack` без звуку/саундборду; `ActionResultCard` над доком), `ReservePanel.tsx` (вміст для шторки)
- Test: `components/battle/scene/drawers/__tests__/DrawerRail.test.tsx` (сітка DM/гравець/спостерігач/`playerView`; резерв лише з мапою)

- [ ] Тест сітки прав спершу.
- [ ] Зберегти `data-tour="battle.log|map-tools|reset|next-turn"`; оновити demo-тури та їхні тести (`components/battle/demo`).
- [ ] eslint по `components/battle/{scene,dm,participants}`; коміт `feat(battle): ch6 drawers and rail`.

### T5. Ініціатива, ticker, банери — 1 виконавець (разом із T4 за потреби)

**Файли:** `InitiativeTrack.tsx` (щільність за дизайн-основою; reorder/select без змін), `LastActionTicker.tsx` (`onOpenLog` на обох екранах → `log.show()`), `DesktopBattleLayout.tsx` (верхній шар: ініціатива по центру, ticker, банери через `NoticeStackContext`), банери (позиція).
- [ ] Наявні тести `InitiativeTrack`/ticker зелені; новий: тап по ticker відкриває лог.
- [ ] коміт `feat(battle): ch6 top layer`.

### T6. Phone: `MobileBattleLayout` на ту саму модель — 1–2 виконавці

**Файли:**
- Modify: `MobileBattleLayout.tsx` — прибрати `strip`/`MapStripRow` для ходу героя й нижню `MyHeroPanel`-смугу; мапа на всю висоту над безпечною зоною дока (`env(safe-area-inset-bottom)`); ті самі `SceneSlots`, `DrawerRail`, `TokenBubble` як sheet, `ActionsPopover` як sheet; таби Мапа/Союзники/Вороги → «Вигляд» у `ToolsDrawer`; бій **без мапи** лишає `ParticipantList`
- Modify: `lib/hooks/battle/useMobileBattleTabs.ts` (лише за потреби; `useMobileBattleTabs.test.tsx` зелений), `MyTurnControls.tsx` (прибрати `strip`)
- Test: `components/battle/scene/__tests__/MobileBattleLayout.test.tsx` (happy-dom): док у ході героя; `MyTurnControls` не ремаунтиться при шторці/зміні вигляду (лічильник монтувань); DM-шторка лише `isDM`; без мапи — списки

- [ ] Тести спершу; перевірити `expand`/`expandTick` для `AudioDock`.
- [ ] коміт `feat(battle): ch6 phone parity`.
- **Не чіпати:** wizards, `BattlePreparationView`.

### T7. Анімації (потребує дизайн-основу) — 1 виконавець

**Файли:** `TokenBubble`, `BattleDrawer`, `ActionDock`, `DockDiamond`, `HeroCluster` + хуки/класи руху дизайн-основи; власних токенів немає.
- [ ] Бульбашка: scale 0.96→1 + fade від якоря; шторка: slide+fade; ромб: перехід заливки; початок ходу: спокійний акцент аватара/дока; усе під `useReducedMotion`.
- [ ] Не чіпати `BattleFxLayer`, `PortraitFx`, `HitFrame`, `map-hud-*`.
- [ ] коміт `feat(battle): ch6 motion`.

### T8. i18n, whats-new, docs, перевірки — 1 виконавець

**Файли:** `messages/{uk,en}/battle.json` (`dock`, `bubble`, `drawers`, `hero.states`), `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json`, hint-статті бою, `docs/architecture/battle.md` (сцена: слоти, док-портал, бульбашка, шторки, пріоритет інтентів), `ui-layers.md`, `docs/STATUS.md`; `git mv` спеки/плану в `docs/archive/superpowers/` у merge-коміті.
- [ ] Заміряти uk-gzip `battle`/`member` scope до/після (`lib/i18n/__tests__/scope-size.test.ts`); запас < 0.5 KB → свідомо підняти бюджет із записом у STATUS.
- [ ] Один раз: `pnpm test:changed main`, потім **один** `pnpm test:run`; `pnpm cycles`; `pnpm lint:dirs --changed`; `pnpm exec tsc --noEmit`.
- [ ] `/simplify` (1–2 агенти), одне Opus-ревʼю.

### T9. Живий прогін (Sonnet-субагент, браузер)

`next start -p 3100`, БД `ch6_battle`; користувач логіниться. Desktop 1440×900, phone 390×844; палітри `tavern`/`parchment`/`frost`; reduced-motion; ролі DM/гравець/`playerView`; бій без мапи; резерв; maze; wfrp/d6pool; атака, закляття з прицілюванням, кінець ходу, завершення бою; кожен рядок матриці зі спеки → таблиця «ок/блокер» у STATUS. Тестові бої прибрати; без push/merge без «так».

## Послідовність

T0 → T1 → T2 → T3 → (T4 ‖ T5) → T6 → T7 → T8 → T9. Найризикованіші: T1 (висота/шапка), T2 і T6 (ремаунт `MyTurnControls`).

## Оцінка обсягу

≈ 9 задач, 22–30 файлів у `components/battle`, 1 маршрутний файл оболонки, i18n/docs, 8–10 нових тестових файлів. ≈ 7–9 запусків Sonnet + 1 Opus-ревʼю + 1 живий прогін; перед запуском ланцюга нагадати про `/usage`.

## Що не робимо в Ч6

Дальність/тип сітки й туман (Ч7); арт (заглушки); зміни правил бою, API, схем, FX-пайплайну; радіальне меню; власна система руху.
