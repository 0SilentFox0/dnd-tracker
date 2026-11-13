# Ч12 С2 — звіт

Статус: DONE (4 коміти, tsc чистий).

## Коміти
- 46273e687 refactor(ch12): the turn flow speaks of a turn gate
- b062ed62c feat(ch12): the turn-start check comes from the composition (M1)
- c55b3c4fe refactor(ch12): morale panel, label and badge come from the morale battle UI
- 8a18724f8 refactor(ch12): the morale result overlay is a morale dialog

## Що -> куди
| що | куди |
|---|---|
| `needsMoraleCheck` | видалено; sim-скрипти -> `awaitsMoraleCheck` зі скоупом `state.currentTurnIndex` (`balance-library.ts`, `simulate-battle.ts`: хелпер `awaitsMorale(name)`) |
| `TurnStartCheck` (`due`, `outcomeOf`) | `lib/utils/rules/systems/types.ts`, `RuleSystemTurn.startCheck?`; морально-модуль `systems/morale/index.ts` |
| клієнтський скоуп | `lib/hooks/battle/turn-start-check.ts` (`turnStartDue`, `turnStartOutcome`); `turnIndex` = `scene.battle.currentTurnIndex`, `rules` = `scene.battle.rules`; читачі `usePlayerTurn`, `useBattleMapScene` |
| `rollMorale` | `systems/morale/hooks/useMoraleRoll.ts`; `usePlayerTurn` віддає `gate: { resolve, skipTurn }` |
| панель/підпис/бейдж | `systems/morale/ui/battle/{MoralePanel,MoraleLabel,MoraleBadge}.tsx`, слоти `turnStart`, `badges` |
| `moraleOutcome` | `systems/morale/rules/turn/outcome.ts` |
| `moraleTriggerRolls` (+тест) | `systems/morale/rules/trigger-rolls.ts` |
| `ResultOverlay` | `systems/morale/ui/battle/MoraleResultOverlay.tsx` (dynamic у `systems/morale/ui/index.ts`, слот `dialogs`) |
| форма fx | `types/battle-scene.ts`: `{ kind: 'system'; module; data }`; `systems/morale/rules/result-fx.ts` (`moraleResultFx`, `moraleResultOf` — вузький гард без `as`) |

Лишилось у core (В5/В7/В8/В14): `effectiveMorale`, `awaitsMoraleCheck`, `threshold`/`PendingMoraleCheckPayload` (читачі: engine/effects, sim, turn/act-gate, FX-черга); FX моралі (`useBattleFxQueue`, `useFxImpacts`, `morale-dice`, `badge-labels`), `useMazeDarkAutoSkip`, `LogEntryCard`, `mock-participants`, `useBattleActions`/`useMoraleCheck`, `view/result-fx.ts` (нейтральний предикат).

## Окремо
- `ActGateScope` на клієнті: `{ participants: battle.initiativeOrder, scene: { turnIndex: battle.currentTurnIndex, pendingMoraleCheck }, rules: battle.rules }`.
- `scripts/sim`: `turnIndex` у sim є (`state.currentTurnIndex`), `needsMoraleCheck` видалено.
- Порядок П5 збережено: `useMoraleRoll.ts` — `mutateAsync` -> `gate.resolve` -> `afterMoraleDice` (при FX) -> `result.show` -> `gate.skipTurn()` (у `usePlayerTurn.gate.skipTurn`: `expectedVersion` до таймера, `onError` -> `RECOVER`).
- Видима зміна: після перезавантаження посеред ходу, коли учасник уже діяв, панель моралі не показується (паритет із серверним `moraleGate`).
- Смуга фази `gate`: `MapStripRow` приймає `ReactNode`, тож `turnStart.Label` без `outcome`; ключ `strip.gate` лишається в `battle.json` (С3 перенесе в `battleMorale`).

## Відхилення
- `ActionGrid` отримує `gateLabel?: ReactNode` (як `channelLabel`) від `MyTurnControls`.
- `usePlayerTurn.test.tsx` складає `usePlayerTurn` + `useMoraleRoll` (як панель), щоб зберегти покриття панічного таймера/409.
- Хвіст С1, знайдений і виправлений: `roll-step.test.tsx` мокав `@/lib/hooks/battle` без `useBattleSceneData` -> мок `use-system-battle-ui`.

MyHeroPanel змінено свідомо: мораль прибрано (бейдж модуля).

## Тести
Нові: `systems/morale/__tests__/rules/turn/{start-check,outcome}.test.ts`, `hooks/use-morale-roll.test.tsx`, `ui/battle/{morale-badge,morale-result-overlay}.test.tsx`; перенесені `trigger-rolls.test.ts`, `result-overlay` -> `morale-result-overlay`; оновлені `usePlayerTurn`, `my-turn-controls` (gate зі слотом/без), `action-grid`, `turn-flow`, `hero`, `morale-rules`, `action-result-card`, `client-entry-imports`, `roll-step`.
Точково (під локом): `systems/morale`, `lib/hooks/battle`, `components/battle`, `lib/utils/battle/{view,flows,morale}`, `system-literals`, `client-entry-imports`, `system-imports`, `system-contract` — зелені.

## Ratchet
exempt-файли без змін. `LEAK_NAMES` += `moraleOutcome: 0`, `moraleTriggerRolls: 0`, `needsMoraleCheck: 0`. `pnpm systems:index` ідемпотентний.
