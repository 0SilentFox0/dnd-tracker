# WFRP 5e W4 — дії, рух, фамбл (M09, M12)

Гілка `feat/wfrp5-canon-w0-w1`, від b6b9727db. Канон: с. 163–169 (лише перефраз). Усе під `canon5e` (профіль `edition`), `legacy` не змінюється.

## Що вже є (не переписувати)
- `combat/momentum.ts`: `spendMomentum`, `grantSecondAttack` (зараз ставить `attacksLeft = 1`), `secondAttackBlocker` (перевіряє: є Momentum, не `used`, `hasUsedAction`, дві руки ближнього бою).
- `server/battle/momentum-mutation.ts` (`secondAttack`, `leadership`), `hooks/useMomentumPanel.ts`, `api/battle` `momentumOp`.
- `combat/disarm.ts` `wfrpAttackBlocked`; ATTACK_SLOT `offHand` (лише слот щита), `hand`.
- Engaged = суміжність на мапі (`reach-check.ts`, pistol = `ignoresEngagement`) — лишається.

## Пакети (послідовно, бо чіпають `resolve-attack.ts`/`momentum.ts`/`slots.ts`)

**P1 — друга атака за каноном + рука (p166–168).**
- Слот `hand: 'main' | 'off'` замість `hand + offHand`-пари (читач зберігає зворотну сумісність зі старим `offHand: true`); `extract-attacks`: слот щита і слот `offHand` (модуль `offhand`) = `off`.
- Стан `lastHand?: 'main' | 'off' | 'cast'` у `WfrpParticipantState` (скидається в `wfrpResetState` на початку ходу): пишеться в `attackerUpdate` будь-якої атаки зброєю і в касті.
- `secondAttackBlocker`: нова причина `cast` (перша дія була кастом); `weapons` — немає не заблокованої зброї ІНШОЇ руки, ніж `lastHand`.
- `grantSecondAttack`: `attacksLeft += 1` (додається до пулу), після гранту `wfrpAttackBlocked` блокує атаки тієї ж руки, що й `lastHand`, поки висить `momentumAttack`.
- Атака з `off`-руки: −2 SL (`OFFHAND_SL_PENALTY` у `constants.ts`), у списку SL-модифікаторів `resolveWfrpAttack` (ближній і дальній). Талант Ambidextrous/Dual Wielder — через `collectModifiers` лише якщо вже є стат; інакше хвіст.
- Хвости W3: `mainHand` береться зі слота `hand`, а не «завжди права»; UI ховає блоковані атаки (`wfrpAttackBlocked` у списку атак героя/DM); тимчасовий `disarmed` — тривалість з рядка крит-таблиці (схема `marker` ефекту отримує необов'язкове `rounds`), інакше лишається постійним.

**P2 — Disengage (p163).** Нова системна операція `disengage` (`server/battle/disengage-mutation.ts`, `api/battle`, `useDisengagePanel` або розширення `useMomentumPanel`):
- є Momentum → втратити, поставити маркер `disengaged` до кінця ходу, дію не витрачати;
- нема → Action: Dodge або Acrobatics (кращий) проти найвищого Melee серед Engaged-ворогів; Disadvantage якщо Outnumbered; Surrounded (≥3 суміжних ворогів) — заборонено; рівний SL виграє ініціатор (`higherSl`, як в усій системі); провал → усі Engaged-вороги отримують Momentum;
- `engagedFoes`/`isSurrounded`/`isOutnumbered` — спільний модуль `combat/engagement.ts`, переюзати `isOutnumbering` з `resolve-attack.ts` (виносимо).
- Leadership-передача Momentum вже є (W2) — додати лише тест на «Free Action, втрата навіть при провалі».
- Flee (p163) не входить: лишається хвостом (зі Terror у W5).

**P3 — Фамбл у бою (M09, p165).** `rules.tables` слот `oops` (d10) і `misfire` (d10), ефекти даних: `wounds` (ігнор TB/AP), `weaponDamage`, `actLast`, `slPenaltyNext`, `loseMove`, `loseAction`, `legPenalty` (+Critical Wound), `hitAlly`/`stunned`. Дефолт за каноном: випустив зброю, наступна Action на підняття (`loseAction`); Oops-таблиця вмикається профілем `fumbleModel: 'oops'` (для `grim-d100*`), інакше `drop`. Misfire: Blackpowder/Engineering/Explosive + 99/00. Лише те, що вписується в наявні маркери/стани; решта — хвіст з поясненням.

**P4 — Рух і дії (p163, M12).** Спочатку ревізія ядра: `actions.enabled=false`, рух = `speed` (walk yards × 3 ft). Перевірити, як ядро веде бюджет руху й чи є Dash. Мінімум, що дозволяє ядро без нового механізму: «Run» (подвоєний бюджет руху ціною Move), Sprint (Action, Athletics Average +2 SL, + Run + SL ярдів), Charge (вимагає ближню атаку тим же ходом; Momentum, якщо відстань ≥ Move ярдів і ≤ Run). Якщо ядро не дає хука на бюджет — зафіксувати як відкритий хвіст з описом, що саме треба в core.

## Не входить
W5/W6, Broken Cool щораунд, Deafened/Blinded дальні, M13 (модифікатори дальності/укриття/called shot/Helpless), M14 (розмір), Flee.

## Закриття
`pnpm test:related`/`test:changed`, `pnpm lint:dirs --changed`, `pnpm cycles`, `NODE_OPTIONS=--max-old-space-size=8192 tsc`, один Opus-рев'ю; оновити `rule-systems.md` («Wfrp: редакція») і `STATUS.md`; sweep homm/dnd5e на `prodcopy_w4` (після «так»), повний `test:run` (відомий не наш червоний: `assistant-cleanup-cron`).


### P4 revision and result

- Revision: the move budget is `baseMovement(p, rules)` (speed in feet, wfrp = walk yards x 3) + `battleData.extraMovement`, minus `movementUsed`; `extraMovement` is core state, reset every turn in `resetTurnState`, so a system can raise the turn budget by writing it from its own mutation (the d20 Dash does the same). Core move code reads it in `moveBudget`/`searchPaths`.
- With `actions.enabled=false` (wfrp) `walkMove` skips `onMove` hooks and `actions.move`, so a wfrp system cannot observe a completed move (path, distance); it only sees `movementUsed` and `turnStartPosition` afterwards. A system op plugs in via `server/index.ts` ops + `api/battle.ts` op + `useMomentumPanel` + `MomentumPanel`.
- Implemented (canon5e only, `movement-mutation.ts`, op `movement`, kinds run|sprint|charge): Run = `extraMovement += baseMovement`; Sprint = Action + Athletics Average (+2 SL), `extraMovement += (Run yards + SL) x 3`; Charge = not Engaged, nothing moved yet, target within Run range, Momentum at declaration when the target is >= Move yards away, budget doubled like Run, and `moveMode: 'charge'` makes `wfrpAttackBlocked` close non-melee attacks. One mode per turn (`moveMode` in the wfrp slot, reset at turn start). Tests: `systems/wfrp/__tests__/canon/movement.test.ts`.
- P4 result / open tail: Charge Momentum is granted at declaration from the distance to the target (not from the actual move), the melee-attack obligation is enforced only on attack choice (spells/other actions are not blocked, a charger who never attacks keeps the Momentum); the actual move is not checked to end adjacent to the target. Needed core hook for exact rules: `onMove` hooks (or a new `onMoveEnd` system hook) must run in the `!actions.enabled(rules)` branch of `walkMove` (lib/server/battles/mutations/move/move-mutation.ts) with `{ mover, start, path, cost, participants }` and may return updated participants; then Charge could grant Momentum and enforce adjacency from the real path, and Run/Sprint could be spent lazily.
