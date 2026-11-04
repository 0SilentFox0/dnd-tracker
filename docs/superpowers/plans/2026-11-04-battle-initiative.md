# Battle initiative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Plan is lean by design: signatures, decisions and test cases; follow neighbouring code for style.

**Goal:** DM rolls initiative for everyone with one button (all clients see the dice) and can reorder the turn order manually; the order persists for the whole battle.

**Architecture:** Two new DM-only battle operations (`initiative-roll`, `initiative-reorder`) on the standard `runBattleMutation` pipeline with pure engine code in `lib/utils/battle/turn/`. Order is carried by the participants array (`orderIndex`), so `round-start` stops re-sorting. FX dice reuse `diceThrowsOf` via a new `diceRolls` kind.

**Tech Stack:** Next.js 16, TypeScript strict, Zod, Prisma (no migration), TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-battle-initiative-design.md`

Work in a worktree `../dnd-tracker-initiative` on branch `feat/battle-initiative` (superpowers:using-git-worktrees). Tests while working: `pnpm test:related <files>` / `pnpm test:run <file>`; `pnpm exec eslint --fix <touched files>`; full suite and repo lint once at the end (see CLAUDE.md Testing). Executors: Sonnet; final review: Opus.

## Global Constraints

- Every battle route = Zod schema + `runBattleMutation` + `mutations/<action>/`; responses are deltas; no change to `snapshot` writes (we touch only `abilities.initiative` via normal save, which already writes `snapshotHash`).
- Turn advance only via `lib/utils/battle/turn/advanceTurn`; we only set `scene.turnIndex`.
- Components/`app/**` never import `@/lib/api/*` or call `fetch`; hooks in `lib/hooks/battles` via `makeBattleHook`; import from folder barrels.
- Cyrillic forbidden in code (ESLint i18n): all texts are keys in `messages/{uk,en}/*.json`; log lines via `textRef`.
- No new dependencies; no new `rules` option; `rules.initiative.mode` untouched.
- Comments minimal (one compact line, only for non-obvious why).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- All participants tie on every key → order is still a valid permutation (random tiebreak, no crash). Test in Task 1.
- Pinned initiative (`baseInitiative ≥ 1000`, "always first") must stay first after a roll. Task 1.
- `reorder` body with a duplicate id, a foreign id, a reserve id, or a missing id → 422, state unchanged. Task 3.
- Roll/reorder with a single participant, and when `turnIndex` points at an extra-turn slot or a `revealPending` participant (slots removed / flag cleared; `turnIndex` valid). Tasks 1 and 3.
- Round 2 after a manual reorder keeps the order (and extra-turn slots still vanish). Task 2.
- Rollback after a roll restores the previous order (existing `history`, verify with a test). Task 3.

---

### Task 1: Pure engine — roll and reorder

**Files:**
- Create: `lib/utils/battle/turn/roll-initiative.ts`, `lib/utils/battle/turn/reorder-initiative.ts`
- Modify: `lib/utils/battle/turn/index.ts` (barrel export)
- Test: `lib/utils/battle/turn/__tests__/roll-initiative.test.ts`, `…/reorder-initiative.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface InitiativeRollEntry { id: string; d20: number; total: number }
  export function rollInitiative(participants: BattleParticipant[], rng: Rng): { participants: BattleParticipant[]; rolls: InitiativeRollEntry[] }
  export function reorderParticipants(participants: BattleParticipant[], order: string[]): BattleParticipant[] | null // null = invalid
  ```
- Consumes: `calculateInitiative`/`compareInitiative` (`initiative.ts`), `rollDie(20, rng)` (`lib/utils/common/dice`), `Rng` (`lib/utils/abilities/engine/core/types`).

Decisions:
- `rollInitiative`: drop `isExtraTurnSlot` entries; clear `battleData.revealPending`; for each participant compute `total` as `calculateInitiative(p, all, { rules: { initiative: { …, mode: "roll" } }, rng })` — i.e. call the existing function with a forced `roll` mode so DEX/`initiativeBonus`/`collectModifiers`/pinned ≥1000 logic is not duplicated; capture `d20` by wrapping `rng` so the first `rollDie` value is recorded (pinned participants have no d20: `d20: 0`, excluded from `rolls`). Set `abilities.initiative = total`. Sort with `compareInitiative`, final tiebreak by a per-participant `rng()` key drawn once.
- `reorderParticipants`: returns `null` unless `order` is a permutation of the participant ids (no dups/foreign/missing); otherwise participants reordered. Does not touch `initiative` values.

- [ ] **Step 1: Failing tests** (deterministic `rng` via a seeded sequence helper already used in `lib/utils/battle/turn/__tests__`; reuse the participant factory from neighbouring tests):
  - rolls: d20 from rng + DEX mod + `initiativeBonus` + `modifyStat initiative` flat; sorted desc.
  - pinned (`baseInitiative` 1000) stays first, not in `rolls`.
  - all tied on every key → result is a permutation, same input+seed gives same output.
  - extra-turn slots removed; `revealPending` cleared.
  - single participant works.
  - reorder: valid permutation applied; duplicate / foreign / missing / empty → `null`.
- [ ] **Step 2:** `pnpm test:run lib/utils/battle/turn/__tests__/roll-initiative.test.ts` → FAIL.
- [ ] **Step 3: Implement** both files per decisions above.
- [ ] **Step 4:** run both test files → PASS; `pnpm exec eslint --fix` on touched files.
- [ ] **Step 5: Commit** `feat(battle): pure initiative roll and reorder engine`.

---

### Task 2: Order persists across rounds

**Files:**
- Modify: `lib/utils/battle/turn/round-start.ts` (drop `calculateInitiative`/`sortByInitiative` on lines ~62–64, keep extra-slot filter, summons append, `countDownRoundEffects`, lair messages), `lib/utils/battle/store/types.ts` (add `reordered?: boolean` to `BattleMutationOutcome`), `lib/utils/battle/pipeline/turn-order-guard.ts` (early return when `result.reordered`)
- Test: `lib/utils/battle/turn/__tests__/round-start.test.ts` (update), `lib/utils/battle/pipeline/__tests__/turn-order-guard.test.ts` (extend)

**Interfaces:** Produces `BattleMutationOutcome.reordered?: boolean` used by Task 3.

- [ ] **Step 1: Failing tests:** `processStartOfRound` with participants in a non-initiative order returns the same order (and unchanged `abilities.initiative`); extra-turn slots still removed; summons are appended at the end as before; guard lets a `reordered: true` result through and still restores order otherwise.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** Grep for other callers that relied on the new-round sort: `rg "processStartOfRound|sortByInitiative" lib components app` and update/confirm each (spec "Відкрите": demo tours and morale extra-turn tests); fix any test that asserted the re-sort.
- [ ] **Step 4:** `pnpm test:related lib/utils/battle/turn/round-start.ts lib/utils/battle/pipeline/turn-order-guard.ts` → PASS.
- [ ] **Step 5: Commit** `feat(battle): initiative order persists across rounds`.

---

### Task 3: Server operations, routes, log event

**Files:**
- Create: `lib/server/battles/mutations/initiative/initiative-roll-mutation.ts`, `…/initiative-reorder-mutation.ts`, `app/api/campaigns/[id]/battles/[battleId]/initiative-roll/route.ts`, `…/initiative-reorder/route.ts` (copy `conditions/route.ts`, `operation: "initiative-roll"` / `"initiative-reorder"`)
- Modify: `lib/server/battles/operations.ts` (two rows, `access: DM`, `requireStatus: BattleStatus.ACTIVE`; follow `conditions`/`complete` rows, block while awaiting DM — default behaviour unless `allowWhileAwaitingDm`), `lib/utils/battle/store/event-mapping.ts` (`dmEvent(round, text, targets?, hpChanges?, diceRolls?: DiceRollGroup[])` puts `diceRolls` into `details.actionDetails`), `types/battle.ts` (`DiceRollGroup.kind` adds `"initiative"`), `lib/constants/api-errors.ts` (`BATTLE_INITIATIVE_ORDER_INVALID`, Ukrainian text like neighbours), `lib/api/battle-ops.ts` rows, any OpenAPI/route-registry test that enumerates operations (`rg "conditions" lib/server lib/api --glob '*test*'` to find them; the OpenAPI size budget test may need a bump)
- Test: `lib/server/battles/mutations/initiative/__tests__/*.test.ts` (follow `conditions/__tests__`)

**Interfaces:**
```ts
export const initiativeRollSchema = z.object({});
export function initiativeRollMutation(ctx: BattleMutationContext, body: z.infer<typeof initiativeRollSchema>): MutationResult
export const initiativeReorderSchema = z.object({ order: z.array(z.string().min(1)).min(1) });
export function initiativeReorderMutation(ctx: BattleMutationContext, body: InitiativeReorderBody): MutationResult
```
- `roll` result: `{ participants, pending: ctx.pending, scene: { turnIndex: 0 }, reordered: true, events: [dmEvent(round, textRef("battleLog.dm.initiativeRolled", { list }), targets, undefined, diceRolls)] }`; `list` = `name: total` joined by `; ` (names from participants); `diceRolls` = one group `{ kind: "initiative", rollerId: id, dice: [{ sides: 20, value: d20 }] }` per rolled entry.
- `reorder` result: `reorderParticipants(...)`; `null` → `BattleRuleError("invalid_target", API_ERRORS.BATTLE_INITIATIVE_ORDER_INVALID)` (422 as the other rule errors map); no `scene` change (`turnIndex` stays); no event and no change when order is identical; else `reordered: true` + `dmEvent(round, textRef("battleLog.dm.initiativeReordered"))`.
- Use `rngOf(ctx)` from `lib/utils/common/rng`.

- [ ] **Step 1: Failing tests:** roll sets `turnIndex` 0 and returns event with N `diceRolls` groups; works with `rules.initiative.mode: "static"`; reorder `1 2 3 → 3 1 2` keeps `turnIndex`; invalid bodies (dup/foreign/reserve id/missing) → 422 and no change; identical order → no event; `reordered` is set so the guard does not revert; one participant; `turnIndex` pointing at an extra-turn slot before roll ends at 0 with a valid index; rollback after roll restores the previous order (use the existing rollback test helpers in `lib/server/battles/mutations/rollback` tests).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** per interfaces; add error text; register routes and `battleOps` rows (`op<InitiativeReorderBody>({ path: "/initiative-reorder" })`, `op<InitiativeRollBody>({ path: "/initiative-roll" })`).
- [ ] **Step 4:** `pnpm test:related` on touched files + operation/openapi tests → PASS; eslint on touched files.
- [ ] **Step 5: Commit** `feat(battle): initiative-roll and initiative-reorder operations`.

---

### Task 4: Client hooks and dice FX

**Files:**
- Modify: `lib/hooks/battles/useBattles.ts` (`useInitiativeRoll = makeBattleHook(battleOps["initiative-roll"])`, `useInitiativeReorder`), the `BattleSceneActions` type and `useBattleActions` (`lib/hooks/battle/types.ts`, `useBattleActions.ts`; follow how `conditions` is wired), `lib/utils/battle/fx/dice/from-action.ts` (`PHASES` add `["initiative"]`; for `initiative` kind collect all groups' dice into one group, capped by `MAX_INITIATIVE_DICE = 12` exported from `layout.ts`), check `components/battle/fx/dice/engine.ts` / `scene.ts` handles 12 dice of d20 (adjust layout constant if the stage assumes fewer), and whatever consumes `DiceRollGroup["kind"]` exhaustively (`tsc` will flag)
- Test: `lib/utils/battle/fx/__tests__/…from-action` (extend existing dice test file), hook wiring test if neighbours have one

**Interfaces:** Produces `useInitiativeRoll()`/`useInitiativeReorder()` mutation hooks and scene actions `rollInitiative()`, `reorderInitiative(order: string[])`.

- [ ] **Step 1: Failing tests:** `diceThrowsOf` on an event with 3 `initiative` groups → one throw with one group of 3 d20; 15 groups → capped at 12; deterministic `seed`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `pnpm test:related` + `pnpm exec tsc --noEmit -p .` limited check on errors in touched files (repo `tsc` once is acceptable here, not lint) → PASS.
- [ ] **Step 5: Commit** `feat(battle): initiative dice FX and client hooks`.

---

### Task 5: DM UI (button, order mode)

**Files:**
- Create: `components/battle/dm/dialogs/InitiativeOrderDialog.tsx` (list with up/down buttons; also the mobile fallback), `lib/hooks/battle/useInitiativeOrder.ts` (draft order state, `move(id, toIndex)`, `commit`, `isChanged`; pure move helper in `lib/utils/battle/turn/` with a test if non-trivial)
- Modify: `components/battle/dm/DmQuickActionsPanel.tsx` (tile «Кинути ініціативу» with confirm, tile «Порядок»; follow how `ConditionsDialog` tile is wired, add `data-tour="battle.initiative-roll"`), `components/battle/participants/InitiativeTrack.tsx` (DM-only drag mode: pointer-event drag over portraits, drop → `reorderInitiative` via the hook, `useFlip` already animates), hook barrels
- Test: `components/battle/dm/__tests__/InitiativeOrderDialog.test.tsx` and track test (`// @vitest-environment happy-dom`), hook test for the draft/move logic

Decisions: both controls render only for `viewer.isDM` and `status === ACTIVE`; roll tile shows a confirm (existing confirm-dialog component in `components/ui` / `components/common` — grep before writing); players see no controls, only the FX and the updated track.

- [ ] **Step 1: Failing tests:** dialog lists participants in current order, moving item changes draft, commit calls `reorderInitiative` with ids, no-op commit disabled; DM sees roll tile, player does not; drag drop calls the action with the new order.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** tests PASS; eslint on touched files.
- [ ] **Step 5: Commit** `feat(battle): DM initiative roll button and order editor`.

---

### Task 6: i18n, onboarding, docs, final checks

**Files:**
- Modify: `messages/{uk,en}/battleDm.json` (or the namespace the neighbouring DM tiles use: `battleDm.initiative.{roll,rollConfirm,order,orderHint,up,down,apply}`), `messages/{uk,en}/battleLog.json` (`dm.initiativeRolled`, `dm.initiativeReordered`), `messages/{uk,en}/whatsNew.json` + `lib/onboarding/whats-new.ts` (entry `battleInitiative`), DM hint article/hint for `battle.initiative-roll` per `docs/architecture/onboarding.md`, `docs/architecture/battle.md` (rewrite the **Ініціатива** bullet and **Turn advance**: order persists, two operations, `reordered`), `docs/STATUS.md`
- Test: key-parity tests already in repo (`pnpm test:run` for i18n tests)

- [ ] **Step 1:** add keys in both locales; wire `t()` in Tasks 4–5 components if placeholders were used (none should remain: `rg "initiative" messages` parity).
- [ ] **Step 2:** `pnpm test:related` on i18n/onboarding files → PASS.
- [ ] **Step 3:** once, before merge: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`, then `pnpm test:run` (full) and repo `pnpm lint`; run `/simplify` on the branch diff.
- [ ] **Step 4:** final Opus review of the whole branch; fix findings.
- [ ] **Step 5: Commit** `docs(battle): initiative architecture, whats-new, i18n` then merge to main per the repo flow (`git mv` spec and plan to `docs/archive/superpowers/` in the merge commit; no push without the user).

## Self-Review notes

- Spec coverage: roll (T1,T3), reorder (T1,T3), persistence (T2), dice FX for all (T3 event + T4), DM UI (T5), i18n/whats-new/docs (T6), guard exception (T2), edge cases (Review Focus, T1–T3).
- Names consistent: `rollInitiative`, `reorderParticipants`, `initiativeRoll*`/`initiativeReorder*`, `reordered`, `MAX_INITIATIVE_DICE`, op keys `"initiative-roll"`/`"initiative-reorder"`.
- Open items from the spec are explicit steps: callers of `processStartOfRound` (T2 step 3), `reordered` flag location (T2), 12-dice stage check (T4).
