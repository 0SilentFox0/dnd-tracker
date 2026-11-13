# Ч12 С2 — мораль у клієнті через модуль; нейтральний `turn-flow` (M1 Ч8)

Прочитай `common-ch12.md`, `part12-design.md` («С2», В5, В7, В8, П4, П5) і звіт `task-ch12-1-report.md`. Мета: core-клієнт бою не знає моралі; гейт ходу й панель кидка приходять від композиції кампанії; у голому `dnd5e` клієнт ніколи не просить кидок моралі (M1 Ч8).

## Коміти

1. **`refactor(ch12): the turn flow speaks of a turn gate`** (лише перейменування, поведінка ≡)
   - `lib/utils/battle/flows/turn-flow.ts`: фаза `'morale'` → `'gate'`; `BEGIN { needsMorale }` → `{ gated }`; `MORALE_RESULT` → `GATE_RESULT`; `moraleResult` → `gateResult`; `MoraleOutcome` → `TurnGateOutcome`; `MORALE_SKIP_MS` → `TURN_SKIP_MS`. `moraleOutcome()` поки лишається тут (переїде в коміті 3).
   - Читачі в тому ж коміті: `lib/hooks/battle/usePlayerTurn.ts`, `components/battle/turn/{MyTurnControls,ActionGrid}.tsx`, `components/battle/overlays/ResultOverlay.tsx` (`MORALE_SKIP_MS`), інші (`rg -n "MORALE_SKIP_MS|moraleResult|'morale'" components/battle lib/hooks/battle lib/utils/battle/flows`). Ключ `turnControls.strip.morale` → `strip.gate` в обох `messages/*/battle.json` (текст той самий), бо `MyTurnControls.tsx:281` бере `t(\`strip.${phase}\`)`.
   - Тести: `lib/utils/battle/flows/__tests__/turn-flow.test.ts`, `lib/hooks/battle/__tests__/usePlayerTurn.test.tsx`, `components/battle/turn/__tests__/{my-turn-controls,action-grid}.test.tsx` — нові імена.

2. **`feat(ch12): the turn-start check comes from the composition (M1)`**
   - `lib/utils/rules/systems/types.ts`: `TurnStartCheck { due(scope: ActGateScope, participantId): boolean; outcomeOf(pending: unknown, participantId): TurnGateOutcome | undefined }` (тип `TurnGateOutcome` — `import type` з `@/lib/utils/battle/flows/turn-flow`; якщо це дає цикл імпортів — визнач `TurnGateOutcome` у `types.ts`, а `turn-flow.ts` хай його реекспортує); `RuleSystemTurn.startCheck?: TurnStartCheck`.
   - `systems/morale/rules/turn/outcome.ts`: `moraleOutcomeOf(pending, participantId)` = для `pending.participantId === participantId` → як нинішній `moraleOutcome(pending.moraleResult)`, інакше `undefined`. `systems/morale/index.ts`: `combat.turn.startCheck = { due: awaitsMoraleCheck, outcomeOf: moraleOutcomeOf }`.
   - Клієнт: `usePlayerTurn.ts:48-57` → `gated: !!startCheck?.due(scope, id)`, де `startCheck = ruleSystemOf(scene.battle.rules).combat.turn?.startCheck`, `scope = { participants: scene.battle.initiativeOrder, scene: { turnIndex: <поточний індекс сцени>, pendingMoraleCheck: scene.battle.pendingMoraleCheck }, rules: scene.battle.rules }` (знайди назву поля індексу ходу в сцені клієнта, напр. `currentTurnIndex`); `:61-68` → `startCheck?.outcomeOf(scene.battle.pendingMoraleCheck, id)`; `useBattleMapScene.ts:33,109-122` → `startCheck?.due(...)` замість `awaitsMoraleCheck`.
   - `needsMoraleCheck` (`lib/utils/battle/view/hero.ts:312-325`, імпорт `effectiveMorale` `:23`) видалити; `scripts/sim/balance-library.ts:67,519` і `scripts/sim/simulate-battle.ts:90,978,1030` → `awaitsMoraleCheck({ participants, scene: { turnIndex, pendingMoraleCheck } }, id)` (з `@/lib/utils/battle/morale/awaits-check`, як уже робить `battle-sweep.ts:135,393`). Якщо в сим-скрипті немає `turnIndex` поточного учасника — **зупинка й звіт**, функцію не видаляти.
   - `lib/utils/battle/view/__tests__/hero.test.ts`: кейси `needsMoraleCheck` перенести як кейси `startCheck` (див. нижче) або видалити, якщо дублюють `morale-rules.test.ts`.
   - Тести `systems/morale/__tests__/rules/turn/start-check.test.ts` (першим — `ruleSystemOf` на справжніх правилах): учасник легасі-знімка з `abilities.moraleCap: 3` і `combatStats.morale: 2` у бою з `parseRules({ system: { key: 'dnd5e' } })` → `combat.turn?.startCheck` відсутній (M1); `homm` і `{ key: 'dnd5e', modules: ['morale'] }` → `due === true`; той самий учасник, що вже діяв (`actionFlags.hasUsedAction`), → `false`; `outcomeOf` для payload іншого учасника → `undefined`. Клієнт: `usePlayerTurn` у голому `dnd5e` стартує у фазі `'acting'`.
   - Видима зміна (рішення в дизайні): після перезавантаження сторінки посеред ходу, коли учасник уже діяв, панель моралі не показується (паритет із серверним `moraleGate`). Записати у звіт.

3. **`refactor(ch12): morale panel, label and badge come from the morale battle UI`**
   - `components/systems/types.ts`: `TurnGateControls`, `TurnStartPanelProps`, `SystemBattleUi.turnStart?: { Panel; Label }` (дизайн).
   - `usePlayerTurn.ts`: прибрати `rollMorale` (`:152-208`) і імпорти `effectiveMorale`/`moraleOutcome`; віддати `gate: { resolve(outcome) → dispatch GATE_RESULT; skipTurn() → нинішній таймер :190-200 (expectedVersion фіксується до таймера, onError → RECOVER) }`. Тексти тосту «без змін» ідуть у модуль.
   - Модуль:
     - `systems/morale/hooks/useMoraleRoll.ts` (`"use client"`): `roll(d10)` = `scene.actions.moraleCheck.mutateAsync({ participantId, d10Roll })` → `gate.resolve(outcome)` → при FX `await afterMoraleDice(signal)` (експортуй `afterMoraleDice` з бареля `lib/hooks/battle`, якщо його там немає) → `extra`/`skip`: `scene.result.show(...)` (форма fx — поки стара `morale-extra|morale-skip`, нейтральною її робить коміт 4), `skip` → `gate.skipTurn()`; `none` → `scene.toast.show(t('battle.notify.moraleUnchanged'…))`. Порядок — дослівно як у старому `rollMorale` (П5). Сигнал скасування (`AbortController` на час життя) — як у `usePlayerTurn.ts:72-84`.
     - `systems/morale/ui/battle/MoralePanel.tsx` (`"use client"`): блок `MyTurnControls.tsx:191-230` з `moraleTriggerRolls(hero, battle.initiativeOrder)` і `useMoraleRoll`.
     - `systems/morale/ui/battle/MoraleLabel.tsx`: `outcome` → `t(\`outcome.${outcome}\`)` (`battle.morale`), без `outcome` → текст смуги (`turnControls.strip.gate`).
     - `systems/morale/ui/battle/MoraleBadge.tsx`: `place === 'hero'` → блок `MyHeroPanel.tsx:97-108` (`effectiveMorale(...).value !== 0`).
     - `systems/morale/ui/index.ts`: `battle: { turnStart: { Panel: MoralePanel, Label: MoraleLabel }, badges: [MoraleBadge] }`.
   - Core: `MyTurnControls.tsx` — у фазі `'gate'` `{turnStart && <turnStart.Panel hero={hero} gate={turn.gate} />}`, імпорт `moraleTriggerRolls` (`:33`) і `tm` прибрати; смуга (`:281`) для `'gate'` — `turnStart?.Label` без `outcome`, якщо `MapStripRow` приймає `ReactNode`, інакше лишити `t('strip.gate')` і записати у звіт. `ActionGrid.tsx:86,172-175` → `turnStart?.Label` з `outcome`. `MyHeroPanel.tsx:27,71,97-108` → мораль прибрати (її показує бейдж із С1-слоту `badges`).
   - Переїзд функцій (лише якщо після коміту core-читачів 0; перевір `rg`): `moraleOutcome` (`turn-flow.ts`) → `systems/morale/rules/turn/outcome.ts`; `moraleTriggerRolls` (`lib/utils/battle/morale/threshold.ts:41-`) → `systems/morale/rules/trigger-rolls.ts` (тест `lib/utils/battle/morale/__tests__/morale-trigger-rolls.test.ts` → `systems/morale/__tests__/rules/`). `effectiveMorale`, `awaitsMoraleCheck`, `threshold`/`PendingMoraleCheckPayload` лишаються core (В7).
   - `LEAK_NAMES` += `moraleOutcome`, `moraleTriggerRolls`, `needsMoraleCheck` з фактичними числами (очікування 0).
   - Тести: `my-turn-controls.test.tsx` — фаза `'gate'` з модулем показує панель d10, у голому `dnd5e` фази `'gate'` немає; `action-grid.test.tsx` — підпис через `Label`; `systems/morale/__tests__/hooks/use-morale-roll.test.tsx` — порядок викликів (`resolve` → кубики → `show` → `skipTurn`), тост для `none`; `MoraleBadge` — нуль не показує.
   - MyHeroPanel змінено свідомо: мораль прибрано (бейдж модуля).

4. **`refactor(ch12): the morale result overlay is a morale dialog`**
   - `types/battle-scene.ts:16-56`: варіант моралі → нейтральний `{ kind: 'system'; module: string; data: unknown }`; `ActionResultFx` = `Exclude<ResultFx, { kind: 'system' }>` (перевір, що `Extract`/`Exclude` поруч лишаються правильними).
   - `lib/utils/battle/view/result-fx.ts:3-4`: `isActionResult` → `!!fx && fx.kind !== 'system'`.
   - `useMoraleRoll`: `scene.result.show({ kind: 'system', module: 'morale', data: { outcome, name, d10, morale } })` — рядок `'morale'` тут у модулі, не в core.
   - `git mv components/battle/overlays/ResultOverlay.tsx systems/morale/ui/battle/MoraleResultOverlay.tsx`: рендер лише для `fx?.kind === 'system' && fx.module === 'morale'`, дані — з `fx.data` (власний тип у модулі, розбір без касту `as` через вузький гард); таймер автозакриття `TURN_SKIP_MS` для `skip`.
   - `MORALE_MODULE_UI.battle.dialogs = [MoraleResultOverlay]` (за потреби ваги — `next/dynamic` у `systems/morale/ui/index.ts`, як `systems/wfrp/ui/index.ts`).
   - `components/battle/scene/BattleScreen.tsx:80-84,222`: динамічний `ResultOverlay` прибрати (оверлей рендериться зі списку `dialogs` з С1).
   - Інші читачі `morale-extra|morale-skip` (`rg -n "morale-extra|morale-skip" components lib types`) — перевести на нейтральну форму або в модуль; `lib/__tests__/client-entry-imports.test.ts`, якщо він називає `ResultOverlay`, — новий шлях.
   - Тест `components/battle/overlays/__tests__/result-overlay.test.tsx` → `systems/morale/__tests__/ui/battle/morale-result-overlay.test.tsx` (`git mv` + нова форма fx); `action-result-card.test.tsx` — якщо використовує стару форму, оновити.

## Не чіпати

- FX моралі (`useBattleFxQueue`, `useFxImpacts`, `morale-dice.ts` — лише експорт `afterMoraleDice`, `badge-labels.ts`), `useMazeDarkAutoSkip`, журнал і `battleLog.*` (В5, В8).
- `lib/utils/battle/morale/{awaits-check,effective-morale,threshold}.ts` — лишаються (В7), крім `moraleTriggerRolls`.
- Серверний `moraleGate`, мутацію `morale-check`, `useMoraleCheck` у `useBattleActions` (В14).
- Namespace текстів — С3 (у С2 модульні компоненти ще читають `battle.morale.*`, `battle.hero.morale`, `battle.notify.moraleUnchanged`).

## Готово, коли

- `tsc` чистий (під локом); prettier+eslint по зачеплених файлах чисті; `pnpm systems:index` ідемпотентний (нова тека `systems/morale/hooks`).
- `rg -n "morale|Morale" components/battle lib/hooks/battle lib/utils/battle/flows lib/utils/battle/view -g '!**/__tests__/**'` — лишились лише FX (В8), журнал/підсумок (В5) і `useBattleActions`/`useMoraleCheck` (В14); перелік — у звіт.
- Ratchet: нові `LEAK_NAMES` з фактичними числами; exempt без змін.
- Звіт `task-ch12-2-report.md`, окремо: як зібрано `ActGateScope` на клієнті (звідки `turnIndex`), що сталося з `scripts/sim`, підтвердження порядку П5 (рядки коду).
