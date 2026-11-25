# Ч6b — екран бою за прототипом Ч0: план

> **Для виконавців:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Кроки з чекбоксами. За правилами проєкту: агенти **не запускають тести** (один повний `pnpm test:run` у кінці, T9), lint по папках, без per-task ревʼю, одне фінальне Opus-ревʼю.

**Ціль:** привести екран бою Ч6 до розкладки й вигляду прототипу Ч0: HUD дій праворуч внизу, аватар + слоти заклять ліворуч внизу, ініціатива дугою, плаваючі скляні журнал/інструменти, зум, UI-перемикач сітки.

**Архітектура:** переробка на місці компонентів Ч6 в `components/battle/**` (+ невеликі чисті хелпери у `lib/utils/battle/view`, хуки у `lib/hooks/battle`). Рушій/API/схеми не чіпаємо; `MyTurnControls` лишається власником хуків і не ремаунтиться.

**Stack:** Next.js 16 / React 19, Tailwind, Radix, next-intl, Vitest (+happy-dom для UI).

**Спека:** [2026-11-24-game-ui-ch6b-prototype-alignment-design.md](../specs/2026-11-24-game-ui-ch6b-prototype-alignment-design.md) — читати першою; плюс [спека Ч6](../specs/2026-11-24-game-ui-ch6-battle-design.md), [battle.md#сцена-бою-ч6](../../architecture/battle.md), прототип `docs/superpowers/prototypes/2026-11-21-game-style-ui-ch0.html` (вкладка «Бій», `#battle`; статично `http://127.0.0.1:4174/docs/superpowers/prototypes/2026-11-21-game-style-ui-ch0.html`; CSS мініфікований у `<style>`, шукати класи `.battleHud`, `.actionPopover`, `.spellDock`, `.initiative`, `.roundCounter`, `.sceneTools`, `.combatLog`, `.zoomControls`, `.bubble`).

## Global Constraints

- Шари `ui → hud → common → fx → domain`; ESLint `ui-layers/zone`, `raw-controls` (лише `HudButton`/`Button`); жодних `=== "<id системи>"` у ядрі; нових `@/systems/*` імпортів немає; `@/lib/...`, не `../../`.
- ≤ ~7 props, домен-обʼєкти; презентери не читають `useBattleScene()` цілком у гарячих місцях (вузькі селектори, `memo`).
- Тексти лише через ключі `battle.*` (uk+en), Cyrillic у коді заборонений; коментарі англійською, мінімум (глобальне правило користувача).
- Цілі ≥ 40 px, контраст ≥ 4.5:1 у `tavern`/`parchment`/`frost`, focus-кільця, не лише колір; золото = вибране/головна дія, червоний = HP; **без гекс-форм у HUD** (кнопка «ДІЯ» — заокруглений квадрат).
- Рух: лише `transform`/`opacity`, `useReducedMotion`; нових токенів тривалості не вводити.
- **Не чіпати:** `lib/server/**`, `lib/utils/battle/{pipeline,turn}`, `app/api/**`, `prisma/**`, `components/fx/**`, `components/battle/map/{fog,weather,tiles,edges,motion}`, `components/battle/wizards/**`, `components/battle/setup/**`; логіку `usePlayerTurn`, `useAttackWizard`, `SpellBook`, `AttackWizard`.
- `data-tour` якорі (`battle.topbar|hero|log|map-tools|reset|next-turn|turn-controls|initiative`) зберегти; demo-тури та їхні тести не ламати.
- Кожна задача закриває **desktop і phone**, якщо не сказано інакше.

## Review Focus (кожен рядок має тест у задачі-власнику)

1. Клік по аватару героя, тоглу станів і зуму проходить (жодна повноширока обгортка не перехоплює) (T2).
2. Гаряча клавіша 1–6 не спрацьовує в полі вводу, при відкритому діалозі/майстрі, під час `mapAim`/`mapPick`, при недоступній дії (T3).
3. Герой без заклинань або система без слотів (wfrp/d6pool): кластер без порожніх слотів і без падіння; слоти 6–9 лише коли `max > 0`; `pactSlot` показано (T4).
4. Ініціатива-дуга: reorder/drag і `select` працюють, активний у центрі, довга черга не ламає ширину, на phone не перекриває `RoundBadge` (T5, T7).
5. `parchment`/`frost`: текст кластера, ініціативи, зуму, журналу й панелі інструментів ≥ 4.5:1 (T1, перевірка в T10).
6. «Гекс» у «Сітка» неактивний і нічого не зберігає й не змінює (T6).
7. `readOnly`/`playerView`/спостерігач: без HUD, без слотів кластера (лише аватар), DM-кнопки лише `isDM` (T2, T4).

## Файлова карта

| Файл | Що |
|---|---|
| `components/battle/hud/battle-hud.css` + `components/hud/*` (`HUD_SURFACE`) | клас/константа `hud-glass`, світлі варіанти для `parchment`/`frost` (знайти селектор палітри в `app/globals.css`/`components/hud`) |
| `components/battle/scene/layout/DesktopBattleLayout.tsx` | нова розкладка кутів (HUD праворуч внизу, кластер ліворуч внизу, зум над HUD), прибрати повношироку обгортку дока |
| `components/battle/turn/dock/{ActionDock,DockDiamond,MoveBar,DockNextTurn,DockWaiting,TurnDock}.tsx` | компактна скляна панель HUD (сітка 3 колонки) |
| `components/battle/turn/dock/ActionsPopover.tsx` + контент `ActionGrid.tsx` | згрупований поповер «Дія»/«Бонусна дія», підписи, `kbd` |
| `lib/hooks/battle/useActionHotkeys.ts` (+`index.ts`) | нові гарячі клавіші |
| `lib/utils/battle/view/hero.ts` | `heroSlotViews(p)` (чиста) |
| `components/battle/participants/hero/{HeroCluster,SpellSlotRow,RecommendedSpells}.tsx` | аватар + таймер + слоти + рекомендовані закляття |
| `components/battle/participants/InitiativeTrack.tsx`, `scene/layout/BattleTopBar.tsx` | дуга, `RoundBadge` з «›» |
| `components/battle/scene/drawers/{BattleDrawer,ToolsDrawer,DrawerRail}.tsx`, `components/battle/log/*` | плаваючі скляні журнал/інструменти, фільтри |
| `components/battle/map/camera/MapCameraControls.tsx`, `components/battle/map/bubble/*` | зум із відсотком, скло бульбашки |
| `components/battle/scene/layout/MobileBattleLayout.tsx` | та сама модель на phone |
| `messages/{uk,en}/battle.json`, `lib/onboarding/whats-new.ts`, `docs/architecture/battle.md`, `docs/STATUS.md` | i18n, docs |

---

### T1. Скло, палітри, перевірки гейтів — 1 виконавець

**Файли:** Modify `components/battle/hud/battle-hud.css` (або місце `HUD_SURFACE`), `components/hud/*` за потреби. Нічого в логіці.

**Interfaces:** Produces `HUD_GLASS` (рядок класів/клас `hud-glass`): `border border-[var(--line або hud-аналог)] bg-<напівпрозоре> backdrop-blur-[14px] rounded-[12px] shadow`; світлий варіант під `parchment`/`frost` з темним текстом (прототип: `body.light .game .glass`). Усі наступні задачі беруть скло лише звідси.

- [ ] Reuse: знайти наявний `HUD_SURFACE` і палітрний селектор (`PaletteSwitcher`); розширити, не дублювати. `--game-*` токенів у main немає — використати `--gold/--ink/--hud-muted`.
- [ ] Перевірки гейтів, записати відповіді в `.superpowers/sdd/2026-11-24-game-ui-ch6b/progress.md`: (а) чи є в застосунку функції «Слідкувати» і «Світло» (пошук по `components/battle/map/panels`, `lib/hooks/battle`); (б) де зараз показуються слоти заклять (`SpellBook`, `HeroStatesPanel`); (в) формат журналу: які поля дозволяють фільтр «Бій / Система» (`components/battle/log/LogTimeline.tsx`, тип запису журналу).
- [ ] Тест (happy-dom): рендер з `HUD_GLASS` у двох палітрах має очікувані класи (мінімальний, лише що константа експортована й світлий варіант присутній).
- [ ] eslint по touched; коміт `feat(battle): ch6b glass surface and light palettes`.

### T2. Розкладка кутів і компактний HUD дій — 1 виконавець

**Файли:** Modify `DesktopBattleLayout.tsx` (ряд 168–183: прибрати повношироку обгортку `inset-x-0 bottom-0 … *:pointer-events-auto` і `px-[324px]`; `TurnDock`/слот дока тепер у правому нижньому куті; `HeroCluster` лишається в лівому нижньому), `ActionDock.tsx`, `DockDiamond.tsx`, `MoveBar.tsx`, `DockNextTurn.tsx`, `DockWaiting.tsx`, `TurnDock.tsx`; Test `components/battle/turn/dock/__tests__/ActionDock.test.tsx`, `components/battle/scene/__tests__/dock-click-through.test.tsx`.

**Interfaces:** `ActionDock` props без змін (`status`, `economy`, `move`, `phase`, `on`, `panel`, `children`); змінюється лише розмітка. Новий контейнер: `right-3 bottom-3 w-[min(370px,calc(100%-24px))]`, `pointer-events-none`, інтерактивні діти `pointer-events-auto`. Сітка: `[ромби (дія/бонус/реакція з підписами) + MoveBar] [кнопка «ДІЯ»] [допоміжна: «Кінець ходу»/«Наступний хід» DM]`. Скло з T1. Зум (`MapCameraControls`) стоїть над HUD (правий нижній, `bottom` = висота HUD + відступ), не під ним.

- [ ] Тест спершу (`dock-click-through`, happy-dom): рендер `DesktopBattleLayout`-фрагмента/`ActionDock` у контейнері; клік по кнопці-аватару (`HeroCluster` toggle), тоглу станів і кнопках зуму викликає хендлер; жодна обгортка поза `ActionDock` не має `pointer-events:auto` на повну ширину (перевірка computed className: на обгортці `pointer-events-none`).
- [ ] Тести `ActionDock`: ромби лише за `economy.*`; витрачена дія `data-state="spent"` + текст; «Кінець ходу» коли ресурсів нема; не мій хід → `DockWaiting`; DM без героя → лише «Наступний хід».
- [ ] Реалізація. `MyTurnControls` не ремаунтиться (портал у слот зберегти; слот тепер у правому куті).
- [ ] eslint по `components/battle/turn components/battle/scene`; коміт `feat(battle): ch6b compact action HUD bottom-right`.

### T3. Поповер дій: групи, підписи, гарячі клавіші — 1 виконавець

**Файли:** Modify `ActionsPopover.tsx` (заголовок «Дії ходу · <імʼя> · раунд N»), `ActionGrid.tsx` (контент поповера: групи «Дія» / «Бонусна дія» зі статусом «доступна/витрачена» і рядками іконка + назва + підзаголовок + `<kbd>`), Create `lib/hooks/battle/useActionHotkeys.ts`, Modify `lib/hooks/battle/index.ts`; Test `lib/hooks/battle/__tests__/useActionHotkeys.test.tsx`, `components/battle/turn/__tests__/ActionGrid-groups.test.tsx`.

**Interfaces:**
```ts
// lib/hooks/battle/useActionHotkeys.ts
export function useActionHotkeys(opts: {
    enabled: boolean;                       // popover open && no dialog/wizard/intent
    items: { key: string; run(): void; disabled: boolean }[]; // order = digits 1..6
}): void;
```
Обробник `keydown` на `document`: ігнорує `event.target` з `input|textarea|select|[contenteditable]`, модифікатори (ctrl/meta/alt), `event.repeat`; цифра `n` → `items[n-1]` якщо не `disabled`; `Q` лише закриває поповер (`onClose`, додати в `opts` як `close(): void`).

- [ ] Тести спершу: цифра викликає `run` n-го; не викликає для `disabled`; не викликає з фокусом у `<input>`; не викликає при `enabled=false` (діалог/майстер/`intents.mapAim|mapPick`); `Q` викликає `close`; cleanup знімає слухач.
- [ ] `enabled` рахує `MyTurnControls`: поповер відкритий && немає відкритого майстра/діалогу && `!intents.mapAim && !intents.mapPick`. Тайли й `available` з `ActionGrid` 1:1; групування лише презентація (що в «Бонусній дії» — тайл `bonus` і `strikeAndReturn`, якщо `ActionGrid` так їх рахує; звірити з кодом).
- [ ] eslint; коміт `feat(battle): ch6b grouped action popover and hotkeys`.

### T4. Аватар + слоти заклять + рекомендовані — 1 виконавець

**Файли:** Modify `lib/utils/battle/view/hero.ts` (+ експорт у `view/index.ts`), `components/battle/participants/hero/HeroCluster.tsx`; Create `hero/SpellSlotRow.tsx`, `hero/RecommendedSpells.tsx`; Test `lib/utils/battle/view/__tests__/hero-slots.test.ts`, `components/battle/participants/hero/__tests__/HeroCluster-slots.test.tsx`.

**Interfaces:**
```ts
// lib/utils/battle/view/hero.ts
export type SlotView = { level: number; roman: string; current: number; max: number; pact?: boolean };
export function heroSlotViews(p: BattleParticipant): SlotView[]; // slotLevels(p) + pactSlot(p); roman via ROMAN_NUMERALS
// SpellSlotRow props: { slots: SlotView[]; selected: number | null; onSelect(level: number): void }
// RecommendedSpells props: { hero: BattleParticipant; level: number | null }
```
Слот: круглий, римська цифра, `current/max`, `aria-pressed`, `aria-label` з i18n («Рівень N, current з max»), ≥ 40 px (на phone 36–40 px, перенесення рядка). Вибраний рівень = золота рамка. `RecommendedSpells`: до 4 закляттів вибраного рівня з даних `useSpellBook` (перевикористати, нічого не рахувати вдруге); клік відкриває наявний `SpellBook`/касти (як із діалогу); якщо `useSpellBook` не віддає потрібного для клік-відкриття — клік відкриває `SpellBook` на цьому рівні через наявну точку відкриття з `MyTurnControls`, не вигадуючи новий шлях касту. Кластер: круглий портрет 62 px (phone 52) із `TurnTimerBar`/таймером, імʼя, HP+число (`HealthBar`/`HpFigure`), слоти праворуч, нижче рекомендовані; розгортання станів (`HeroStatesPanel`, `ReadiedAttackButton`, `ReactionSpellButton`, `pendingCast`) лишається. Phone: слоти й рекомендовані розкриваються з аватара.

- [ ] Тести спершу: `heroSlotViews` — рівні 1–5 завжди, 6–9 лише з `max>0`, `pactSlot` додається з `pact:true`, герой без `spellcasting` → `[]`; кластер: `slots=[]` → рядка слотів немає, аватар/HP є; `readOnly`/спостерігач → лише аватар; wfrp/d6pool-фікстура без слотів не падає.
- [ ] `HeroCluster` не читає `useBattleScene()` цілком (лишити `useBattleSceneData`); `memo` зберегти.
- [ ] eslint по `components/battle/participants lib/utils/battle/view`; коміт `feat(battle): ch6b hero spell dock`.

### T5. Ініціатива дугою + RoundBadge «›» — 1 виконавець

**Файли:** Modify `InitiativeTrack.tsx`, `BattleTopBar.tsx` (`RoundBadge`), `DesktopBattleLayout.tsx` (верхній шар: ініціатива без підкладки-картки, ticker нижче); Test `components/battle/participants/__tests__/InitiativeTrack-arc.test.tsx`, `components/battle/scene/__tests__/top-bar.test.tsx` (оновити).

**Рішення:** дуга — це CSS-перетворення поверх наявного ряду (`useFlip`, `useInitiativeDrag`, `queue` не чіпаємо): кожному елементу `style` `--d` = відстань від `e.current` в позиціях; `scale = max(.7, 1 − .1·|d|)`, `opacity = max(.45, 1 − .18·|d|)`, `translateY = .6·d²` px (вигин дуги); активний найбільший (44 → 48 px), імʼя 10 px лише в активного й сусідів (phone: лише в активного). Контейнер центрований, `overflow-x:auto` лишається для довгих черг, активний `scrollIntoView({inline:'center'})` при зміні ходу (поважати `useReducedMotion` → `behavior:'auto'`). Лише `transform`/`opacity`. Чиста функція `arcStyle(d: number): { scale: number; opacity: number; y: number }` у `lib/utils/battle/view/initiative-arc.ts`.

`RoundBadge`: «РАУНД NN» + для DM кнопка «›» (`actions.nextTurn`, той самий handler, що в `DockNextTurn`; pending-стан; `aria-label`); індикатор зʼєднання лишається; золота ліва межа, скло (T1).

- [ ] Тести спершу: `arcStyle(0)` = `{1,1,0}`, монотонне спадання, нижні межі; `InitiativeTrack` — активний має `data-current`, `select` по кліку, reorder-проп викликається; `RoundBadge`: «›» лише при `isDM && !readOnly`, клік → `nextTurn`.
- [ ] eslint; коміт `feat(battle): ch6b arc initiative and round badge`.

### T6. Плаваючі панелі: журнал, інструменти, зум, бульбашка, «Сітка» — 1–2 виконавці

**Файли:** Modify `scene/drawers/BattleDrawer.tsx` (desktop: плаваюча скляна панель 220–260 px зліва/справа замість side-sheet; phone: без змін `ResponsiveDialog`), `ToolsDrawer.tsx` (режими «Грати/Редагувати мапу»; сітка кнопок 3×N лише з наявних інструментів; нижній ряд «DM панель»/«Резерв»; секції Ч6 лишаються; кнопка «Сітка»), `DrawerRail.tsx` (кнопки «☷ Журнал»/«☷ Інструменти» для повернення зі згорнутого), `components/battle/log/*` (фільтри «Усі/Бій/Система», заголовки «РАУНД N»; логіка фільтра за полем, знайденим у T1(в)), `map/camera/MapCameraControls.tsx` (формат «− 100% +» зі скла), `map/bubble/TokenBubble.tsx` (скло, заголовок «Імʼя · HP», смуга HP, станів — вміст `ParticipantDetails` без змін); Test `components/battle/scene/drawers/__tests__/{ToolsDrawer-grid,floating-panels}.test.tsx`, `components/battle/log/__tests__/log-filter.test.tsx`.

**Interfaces:** `ToolsDrawer` лишає наявні props (`open`, `onOpenChange`, `onComplete`, `view`, `onToolsSlot`); додається `GridShapePicker` (локальний компонент у `ToolsDrawer.tsx` або `scene/drawers/GridShapePicker.tsx`): `Квадрат` активний, `Гекс` — `disabled`, `aria-disabled`, підпис `battle.drawers.gridHexSoon`; без зберігання, без змін у даних рушія. Перемикач «Грати/Редагувати» — лише показ/сховування блоку наявних інструментів мапи (не режим рушія).

- [ ] Тести спершу: `GridShapePicker` — «Гекс» disabled, клік нічого не викликає, «Квадрат» вибраний; `ToolsDrawer` не рендерить «Слідкувати»/«Світло», якщо T1(а) показав, що функції нема; журнал: фільтр «Система» ховає бойові записи й навпаки (на фікстурі з обома типами); згортання журналу → видна кнопка «Журнал», повторне відкриття показує панель; зум показує відсоток із камери.
- [ ] Не змінювати поведінку `log.show/close/focus`, `useBattleLogHistory`.
- [ ] eslint по `components/battle/{scene,log,map/camera,map/bubble}`; коміт `feat(battle): ch6b floating log and tools panels`.

### T7. Phone на тій самій моделі — 1–2 виконавці

**Файли:** Modify `MobileBattleLayout.tsx`, за потреби `HeroCluster`/`ActionDock` (phone-варіанти класами); Test `components/battle/scene/__tests__/MobileBattleLayout.test.tsx` (оновити).

- [ ] Phone (390×844): HUD дій праворуч внизу зі зменшеною сіткою (ромби скорочені до значків із підписом на фокус/довгий текст у `aria-label`, «ДІЯ» 56×58), аватар 52 px зліва внизу, слоти й рекомендовані розкриваються з аватара; зум лівіше HUD; поповер дій — bottom sheet (`ResponsiveDialog`) із тими самими групами.
- [ ] Інструменти й журнал/DM/Резерв — за кнопкою «•••» (одна), **не** постійний ряд зверху; `RoundBadge` і ініціатива не перекриті (баг T9 №3); мапа закінчується над безпечною зоною HUD.
- [ ] Тести: `MyTurnControls` не ремаунтиться при відкритті «•••»/шторки (лічильник монтувань); DM-пункти лише `isDM`; бій без мапи — списки й HUD доступні; `readOnly` без HUD.
- [ ] eslint; коміт `feat(battle): ch6b phone parity`.

### T8. Дрібні баги T9 — 1 виконавець (можна поєднати з T7)

**Файли:** `TokenBubble.tsx`/пов'язаний хук вибору, `ParticipantList`/`DrawerRail` (відступ колонки AC), `BattleSceneProvider` за потреби; Test `components/battle/map/bubble/__tests__/TokenBubble-esc.test.tsx`.

- [ ] №4: `Esc` закриває бульбашку (`select(null)`) і DM-шторку; тест `Esc` у happy-dom; перевірити, що Select «Перегляд як гравець» не лишає DM-рейку/HUD після перемикання (за кодом, якщо відтворюється).
- [ ] №6: при відкритих «Інструментах» клік по токену відкриває бульбашку, якщо немає активного інтенту/інструмента мапи (`mapAim|mapPick|placing|toolActive`); без мапи рейка не перекриває колонку AC (відступ `pr-*` у списку, коли рейка видима).
- [ ] коміт `fix(battle): ch6b esc, bubble with tools, rail overlap`.

### T9. i18n, docs, гейти — 1 виконавець

**Файли:** `messages/{uk,en}/battle.json` (`dock` групи/«доступна»/«витрачена»/гарячі клавіші, `hero.slots`/`hero.recommended`, `drawers.gridShape`/`gridHexSoon`/`modes`, `log.filters`), `lib/onboarding/whats-new.ts` + `whatsNew.<id>` (оновити існуючий запис Ч6, не новий, якщо ще не випущений; інакше новий), hint-статті бою за потреби, `docs/architecture/battle.md#сцена-бою-ч6` (нова розкладка), `docs/STATUS.md` (рядок Ч6b; відкриті: гекс-епік, `useActionHotkeys` «Q», maze `unknownSystem`, T7 анімації).

- [ ] Заміряти uk-gzip `battle`/`member` до/після (`lib/i18n/__tests__/scope-size.test.ts`); якщо ліміт перевищено — підняти бюджет свідомо, записати в STATUS.
- [ ] Один раз: `pnpm test:changed main`, потім **один** `pnpm test:run`; `pnpm cycles`; `pnpm lint:dirs --changed main`; `pnpm exec tsc --noEmit`.
- [ ] `/simplify` (1 агент), одне Opus-ревʼю (Review Focus вище).

### T10. Живий прогін (Sonnet-субагент, браузер)

Збірка: `NODE_OPTIONS=--max-old-space-size=10240 pnpm exec next build --experimental-build-mode compile`; `kill $(lsof -ti :3100)`; `RATE_LIMIT_ALLOW_MEMORY=1 pnpm exec next start -p 3100` (БД `ch6_battle`, worktree ch6). Користувач логіниться сам у вікні розширення Chrome. Звичайний бій без maze (Maze «Лабіринт» дає 500 `unknownSystem` — дані до backfill, не UI).

- [ ] Порівняти зі скрінами прототипу (desktop 1440×900, phone 390×844; масштаб скрінів 0.5–0.6, DOM/текст-перевірки): HUD праворуч внизу, аватар+слоти ліворуч внизу, ініціатива дугою, плаваючі журнал/інструменти, зум з відсотком, бульбашка.
- [ ] Палітри `tavern`/`parchment`/`frost` (контраст кластера, ініціативи, зуму, панелей); ролі DM/гравець/`playerView`/спостерігач.
- [ ] Кліки: аватар, тогл станів, зум, «ДІЯ», «Наступний хід»; гарячі клавіші 1–6/Q; слоти (вибір рівня, рекомендоване закляття → SpellBook → прицілювання); `Esc`; «Сітка → Гекс» неактивний.
- [ ] Не перевірене в T9 Ч6: `MyTurnControls` vs шторки, fallen-токен, «до токена», резерв, PREPARED, ticker, reduced-motion, wfrp/d6pool, консольні помилки.
- [ ] Звіт у `.superpowers/sdd/2026-11-24-game-ui-ch6b/t10-report.md`; розбіжності з прототипом → задачі виправлення.

## Послідовність

T1 → T2 → (T3 ‖ T4 ‖ T5) → T6 → T7 (+T8) → T9 → T10. Найризикованіші: T2 (розкладка + блокер), T4 (дані слотів і рекомендованих), T7 (phone).

## Оцінка вартості

≈ 8 запусків Sonnet-виконавців (T1–T8, T7+T8 разом) + T9 (Sonnet) + 1 Sonnet живий прогін + 1 Opus-ревʼю; ~20–35 файлів у `components/battle`, 3–4 нових хука/хелпери, ~10 нових тестових файлів. Орієнтовно один день підписки середнього навантаження; перед стартом перевір `/usage`. Контекст ~150k = стоп і підсумок.

## Що не робимо

Гекс-механіка (окремий епік), T7 анімації Ч6, credits-сторінка, `revealToken`, зміни рушія/API/схем, радіальне меню.
