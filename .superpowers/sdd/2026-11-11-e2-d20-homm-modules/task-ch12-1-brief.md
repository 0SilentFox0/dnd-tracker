# Ч12 С1 — `SystemUi.battle` обовʼязковий і внески d20 (КБ, слоти, рятунки від смерті, крит-вибір)

Прочитай `common-ch12.md` і `part12-design.md` (контракт `SystemBattleUi`, «С1», В1, В6, П1–П3, П8). Сесія — перша в Ч12; після неї бій d20/HOMM/wfrp виглядає так само, як до неї (зміни лише в тому, звідки береться розмітка).

## Коміти

1. **`feat(ch12): SystemUi.battle is required and composed per campaign`**
   - `components/systems/types.ts`: типи з дизайну (`DefenseCtx`, `HeroStatsProps`, `ParticipantStatsProps`, `HeroPanelProps`, `BattleBadgeProps`, поки без `turnStart`/`TurnGate*` — їх додасть С2); `SystemBattleUi` += `HeroStats?`, `defense?`, `ParticipantStats?`, `ConditionsDialog?`, `heroPanels?`, `badges?`, `dialogs?`, `notices?`; `SystemUi.battle` — **обовʼязковий**; `SystemUi.battleConditionsDialog` видалити.
   - `systems/wfrp/ui/index.ts`: `battleConditionsDialog` → `battle.ConditionsDialog`. `systems/d20/ui/index.ts`: `battle: {}`. `lib/__tests__/fixtures/d6pool/ui.ts`: `battle: {}`. Інші фікстури/обʼєкти `SystemUi` (`rg -l ": SystemUi = " lib systems components`) — так само.
   - `components/battle/use-system-battle-ui.ts`: `systemUiOf(rules.system.key, rules.system.modules).battle` (правила — `useBattleSceneData().battle.rules`), повертає `SystemBattleUi` (не `| undefined`); `useMemo` не потрібен, якщо `systemUiOf` повертає кешований обʼєкт (перевір `components/systems/registry.ts:44-51`). Прибрати `?.` у викликачах, де він став зайвим (`rg -n "useSystemBattleUi\(\)\?" components`).
   - `components/battle/dm/DmQuickActionsPanel.tsx:137`: `useSystemBattleUi().ConditionsDialog` замість `systemUiOf(battle.rules.system.key).battleConditionsDialog`.
   - Тест `components/systems/__tests__/battle-compose.test.ts` (або поруч із наявними тестами `composeUi`): `composeUi(base, [addonA, addonB])`, де база має `battle: { badges: [A] }`, addon-и — `battle: { badges: [B] }`, `battle: { dialogs: [C] }` → `badges = [A, B]`, `dialogs = [C]`, решта полів бази на місці; два addon-и з однаковим виключним `battle.HeroStats` → кидає; `systemUiOf('dnd5e').battle` визначений.

2. **`refactor(ch12): armor class in battle comes from the d20 battle UI`**
   - Нові `systems/d20/ui/battle/HeroStats.tsx` (`"use client"`): `compact` → ` · AC n` (рядок, як `MyHeroPanel.tsx:117-118`), інакше блок `Shield` + число (як `:143-151`); `useBattleSceneData()` для `initiativeOrder`. Літерал `AC` у компакт-рядку лишити як був (переклад — поза Ч12).
   - `systems/d20/ui/battle/defense.ts`: `d20Defense(p, ctx)` — точне `String(getEffectiveArmorClass(p, ctx.order))` при `ctx.exact`, інакше `formatKnownArmorClass(resolveKnownArmorClass(ctx.log, p.basicInfo.id, ctx.knowledge))` (рівно `ParticipantList.tsx:55-68`).
   - `systems/d20/ui/battle/ParticipantStats.tsx` (`"use client"`): секція «Броня» з `ParticipantDetails.tsx:197-227` (точне КБ або «між» + свідчення); `Section` — локальний компонент `ParticipantDetails.tsx:39`: винеси його в `components/battle/participants/Section.tsx` (або використай наявний примітив з `components/battle/hud`/`components/hud`) і імпортуй із d20.
   - `systems/d20/ui/index.ts`: `battle: { HeroStats, defense: d20Defense, ParticipantStats }`.
   - Core: `MyHeroPanel.tsx` — `const { HeroStats } = useSystemBattleUi()`; `:117-118` → `{HeroStats && <HeroStats hero={hero} compact />}`, `:143-151` → `{HeroStats && <HeroStats hero={hero} compact={false} />}`; `ParticipantList.tsx:40,55-68` — `acText = ui.defense?.(p, { order, log: battleLog ?? [], knowledge, exact }) ?? null` (залежність `useMemo` — `ui.defense` замість `d20Stats`); `ParticipantDetails.tsx:124,197-227` → `{ParticipantStats && <ParticipantStats participant={participant} exact={exact} />}` (змінна `known` лишається для `traits`? — ні, `known` потрібна лише секції броні; прибери, якщо більше не читається).
   - `lib/hooks/battle/useBattleRules.ts:24`: ключ `d20Stats` видалити (і імпорт `statColumnsOf`, якщо більше не потрібен); тест `lib/hooks/battle/__tests__/use-battle-rules.test.tsx` — без `d20Stats`.
   - Тести (дзеркально в `systems/d20/__tests__/ui/battle/`): `defense` — точне/діапазон/порожні свідчення; `HeroStats` compact і повний; core: `MyHeroPanel` у wfrp-бою не показує КБ (мок `use-system-battle-ui` або справжній реєстр із прогрівом).
   - MyHeroPanel змінено свідомо: КБ через слот.

3. **`refactor(ch12): spell slots and death saves move to the d20 battle UI`**
   - `git mv components/battle/hud/SlotGrid.tsx systems/d20/ui/battle/SlotGrid.tsx`; прибрати рядок `components/battle/hud/index.ts:8`; тест SlotGrid у `components/battle/hud/__tests__/hud-primitives.test.tsx` — виділи його кейси в `systems/d20/__tests__/ui/battle/slot-grid.test.tsx` (решту файлу не чіпай).
   - `systems/d20/ui/battle/SpellSlotsPanel.tsx`: `useBattleRules().spells ? <SlotGrid participant={hero} /> : null`; d20 `heroPanels: [SpellSlotsPanel]`.
   - `DeathSavePips` (`ParticipantRow.tsx:52-75`; локальний `Pips` вище в тому ж файлі — переноси разом, якщо інших читачів у `ParticipantRow` немає, інакше винеси `Pips` у `components/battle/hud/` і імпортуй) → `systems/d20/ui/battle/DeathSaveBadge.tsx`: рендер лише при `place === 'row'` і `participant.battleData.deathSaves`; d20 `badges: [DeathSaveBadge]`.
   - Core: `ParticipantRow.tsx:200-201` → `{badges?.map((Badge, i) => <Badge key={i} participant={participant} place="row" />)}` (`const { badges } = useSystemBattleUi()`); `MyHeroPanel.tsx:157` → `{!compact && heroPanels?.map((Panel, i) => <Panel key={i} hero={hero} />)}`; бейджі `place="hero"` у `MyHeroPanel` — у рядку імені поруч із місцем, де зараз мораль (`:97-108`; мораль поки лишається — її переносить С2).
   - Ключ `battle.*.deathSaves` (`t('deathSaves')`) лишається в core-namespace (В10).
   - Тести: `ParticipantRow` з `deathSaves` у d20 показує піпси, у wfrp — ні; `MyHeroPanel` у d20 з `spells` — `SlotGrid` є.
   - MyHeroPanel змінено свідомо: слоти й бейджі через слоти.

4. **`refactor(ch12): crit choice dialog and banner move to the d20 battle UI`**
   - `git mv components/battle/crit-choice/CritChoiceDialog.tsx systems/d20/ui/battle/crit-choice/CritChoiceDialog.tsx`, те саме для `CritChoiceWaitingBanner.tsx`; `git mv lib/hooks/battle/useCritChoiceDialog.ts systems/d20/hooks/battle/useCritChoiceDialog.ts` (рядок `lib/hooks/battle/index.ts:41` прибрати; `CritChoiceRow` — перевір інших читачів, `rg -n "CritChoiceRow"`).
   - `CritChoiceDialog` сам викликає `useCritChoiceDialog()` (проп `dialog` прибрати).
   - d20 `dialogs: [CritChoiceDialog]`, `notices: [CritChoiceWaitingBanner]`.
   - `components/battle/scene/BattleScreen.tsx`: прибрати імпорти `:14-15,21` і `critChoice` (`:145`); на місці `:232` — `notices.map(...)`, на місці `:248` — `dialogs.map(...)` (`const { notices = [], dialogs = [] } = useSystemBattleUi()` — або `?.map`). Умови навколо (`isDM`/фаза) — як були навколо банера/діалогу; якщо умова специфічна для крит-вибору — перенеси її всередину d20-компонента.
   - `CritWaitingNote` лишається в `components/battle/crit-choice/` (читають майстри core).
   - Тести: `git mv components/battle/crit-choice/__tests__/CritChoiceDialog.test.tsx` і `lib/hooks/battle/__tests__/useCritChoiceDialog.test.tsx` → `systems/d20/__tests__/ui/battle/crit-choice/` та `systems/d20/__tests__/hooks/battle/` (імпорти поправити; мок `useBattleScene` за тим самим шляхом `@/lib/hooks/battle`); `useSpellBook-crit.test.tsx` лишається.
   - Якщо `systems/d20/hooks` — новий шар: `pnpm systems:index` (повторний запуск — порожній diff) і перевір ESLint-шар `hooks` для d20.

## Не чіпати

- Мораль (бейдж, панель d10, `turn-flow`, оверлей) — С2. Тексти/namespace — С3.
- `knowledge.ts`, `slotLevels`/`pactSlot`, `CritWaitingNote`, легендарні дії/лігво (В6, В9).

## Готово, коли

- `tsc` чистий (під локом); `pnpm systems:index` ідемпотентний; prettier+eslint по зачеплених файлах чисті.
- `rg -n "d20Stats" components/battle lib/hooks/battle` — порожньо.
- Тести написано/перенесено за переліком (не запускались, або точково — з результатом у звіті).
- Ratchet: exempt-файли без змін; нових `@/systems` у core немає.
- Звіт `task-ch12-1-report.md`, окремо: таблиця слотів «слот → компонент d20/wfrp → місце рендеру в core»; як повелися `memo`-порівняння `ParticipantRow`; чи знадобився `Section` і куди він ліг.
