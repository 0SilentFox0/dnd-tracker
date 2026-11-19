# Counterspell Reaction Window — Implementation Plan

> **For agentic workers:** use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. Design only; nothing here is implemented yet.

**Goal:** when a spell is cast and another creature can counter it (knows an interrupt spell, has the slot/charge, has its reaction, is within range and can see the caster), the cast pauses **before it resolves**. The reactor's controller (player or DM) counters (picks a slot) or passes. No answer within 10 s = pass. Countered spell: no effect, the caster's action is wasted, the slot is **not** spent (SRD 5.2).

**Architecture:** reuse the existing opaque pause `scene.pendingChoice { shown, hidden }` (`lib/utils/battle/store/types.ts`), the same mechanism as the crit gate. While it is set, every other mutation is already rejected (`crit_pending` guard in `run-battle-mutation.ts`). `spell-mutation` opens the window after preflight and before `runWithCritChoice`. It stores the original request and requester in `hidden`, the same way the crit gate does. A new core operation `counter-window` handles counter/pass/expire. A counter attempt is a real reaction cast of the interrupt spell, run by the same spell mutation (depth 1). Closing the window either applies a "countered" result to the caster or replays the stored request with the window skipped. The replay may then hit a crit pause as usual. The 10 s deadline is a server timestamp in `shown`. Expiry is server-checked and nudged by one designated client, so no server timer and no polling.

**Spec:** this file (owner decisions 2026-11-19: feature wanted; auto-pass after 10 s).

## Global Constraints

- Core names no system: the trigger is data (`SpellEffect kind: 'interruptCast'`) plus `reactionsOf(rules).blocker`. Systems without reactions (`noReactions` blocks everyone: wfrp, d6pool, homm without the spell) never open a window. No `rules` flag, no `=== 'dnd5e'`.
- Battle rules: all writes go through `runBattleMutation`. Opening the window writes no participants, so it changes no `snapshotHash`. The counter attempt and the countered result write `actionFlags`/`spellSlots` through the normal participant path (`snapshotHash` follows the existing patch path). Responses are deltas.
- Egress: one delta when the window opens, one per answer, one on close. No polling. The client never refetches the scene on its own because of the window. Expiry is a single POST from one designated client.
- i18n: all texts are keys in `messages/{uk,en}/battle.json` (+ `errors.json`, `whatsNew.json`). No Cyrillic in code.
- Agents write tests but do not run the full suite. Use `pnpm test:related <files>` / single files. One full `pnpm test:run` at the end (Task 5). Lint per folder.
- English one-line comments only where non-obvious.

## Decisions

| # | Decision |
|---|----------|
| D1 | **Rules = SRD 5.2 (2024) only.** The target (original caster) makes a **CON save** against the reactor's spell save DC (`spellSaveDc`, grant `dc` if from a grant). There is no ability check and no "auto-counter if slot ≥ level" (that is 2014 text, absent from SRD 5.2). The slot level choice has no mechanical effect; the reactor only picks *which* slot to burn (≥ spell level; default lowest available). The save goes through the normal cast pipeline, so legendary resistance, `saveAdvantage vsSpells`, `autoFailSave` etc. apply for free. |
| D2 | **Countered:** the spell dissipates. The caster's action / bonus action / reaction is spent (same economy branch as `finish.ts`, extracted as `spendCastEconomy`); a legendary-action cast spends the legendary point; a DM free cast spends nothing. **Not spent:** spell slot, grant/item charges, scroll stack, ingredients. **Concentration:** the countered spell never starts concentration; an existing concentration of the caster **is kept** (the casting was interrupted "in the process", it was never cast). One log line `battleLog.counter.countered`. |
| D3 | **Countering costs the reactor** its reaction plus the chosen slot (or 1 grant charge), even when the target saves (the counter spell was cast). |
| D4 | **Eligibility** (`counterReactors`): every participant P with: different `side` from the caster; `isActive`; `reactionsOf(rules).blocker(P) === null`; knows an interrupt spell (`knownSpells` with a free slot ≥ its level via `spellSlotLeft`, or a live `SpellGrant` of that spell with a charge/`cost: reaction`); distance `footprintDistance × cellFeetOf ≤ targeting.range` (60) and `wallsAllowSight` when there is a map (no map = in range, same as `auto-reaction.ts`); the countered spell has a component (`componentFlags` v/s/m). Missing `componentFlags` counts as having components. Not hidden in reserve (`ctx.pending` is excluded by construction). |
| D5 | **Where windows open:** only top-level casts through `spell-mutation` (incl. DM free cast, legendary, grant, reaction casts, completion of a long cast). **No window for:** `preview`/`dryRun`, crit-choice replay (`resume` set), the counter cast itself (depth 1, no counter-counterspell), on-hit spells, auto-reactions, zone/aura triggers, berserk. |
| D6 | **Multiple reactors:** everyone is offered at once. **The first `counter` wins the floor.** If the caster fails the save, the window closes as countered. If the caster saves, the window stays open for the reactors who have not answered yet, with a **fresh 10 s deadline** (RAW: each eligible creature may react). A `pass` only marks that reactor. When every offer is answered (passed / attempted), the window closes and the cast resolves. |
| D7 | **Deadline:** `deadline = now + COUNTER_WINDOW_MS` (10 000, `lib/constants/battle.ts`), ISO in `shown`, server clock. `expire` succeeds only if `Date.now() >= deadline − 250 ms` (small skew allowance); otherwise 422 `counter_window_open` with `retryAfterMs`. Designated nudger: the requester (original caster's user) at the deadline, the DM client at +2 s, any member at +5 s. A late or duplicate expire on an already-closed window → 409 `counter_window_stale` (no write). A page loaded after the deadline nudges once. |
| D8 | **DM powers:** the DM may counter/pass for DM-controlled reactors and may pass for **any** offer (AFK player). `{ action: 'closeAll' }` (DM) passes all open offers and resolves the cast immediately. Players act only for offers whose reactor has `controlledBy === userId`. |
| D9 | **Visibility:** the DM and the DM channel get the full `shown`. Players (public channel and HTTP responses) get the redacted `shown`: offers of DM-controlled reactors are removed and replaced by `dmDeciding: true`. If the caster is DM-controlled, the spell name/level are dropped (players see "X is casting a spell", as with an unidentified spell). Player-controlled reactors and their offers stay visible to all players (party knowledge). |
| D10 | **Idempotency:** `shown.windowId` (random, fixed for the life of the window). Every `counter-window` body carries `windowId`. A mismatch, a reactor already answered, or no window → 409 `counter_window_stale`, no write. Writes are already serialized per campaign (`withWrite`) with `version`. The counter save uses `mulberry32(hidden.seed + 1 + attemptIndex)`, never the stream the cast replay uses (`mulberry32(hidden.seed)`), so the replayed cast dice match the window-open run. |
| D11 | **Close failure:** if the replayed cast now throws `BattleRuleError` (state changed, e.g. a slot was spent elsewhere — should not happen while paused), the window closes with log `battleLog.counter.castFailed` and no state change. The battle never stays wedged. Rollback/reset/start/complete already clear `pendingChoice`. |
| D12 | **Data:** the SRD override `counterspell` becomes `save('constitution')` + effects `[{ kind: 'interruptCast' }]`. The old `disable_spell_casting` effect and note go away. Existing campaigns get it through the template re-publish (`constructor:srd-template`, prod tail). Rows with the old definition simply never open a window. Mage/Archmage/Lich "Protective Magic" notes → a `SpellGrant` of Counterspell only if the unit import already supports reaction grants (check `scripts/srd/overrides`); otherwise record as a STATUS tail. |
| D13 | **Old clients:** `asShownCrit` requires `triggers[]`, and the counter `shown` has none, so old tabs show no crit dialog. The wizard stays in `waitingCrit` until `pendingChoice` clears (same as today). |

## State shape

```ts
// lib/utils/battle/counter/types.ts
export interface CounterOffer {
    reactorId: string;
    spellId: string;          // the interrupt spell
    grantKey?: string;        // when offered via a SpellGrant
    slotLevels: number[];     // free slot levels >= spell level; [] for grants
    dm: boolean;              // reactor not player-controlled
    answer?: 'pass' | 'failed'; // 'failed' = attempted, caster saved
}
export interface ShownCounter {
    kind: 'counter';
    windowId: string;
    actorId: string;          // caster being countered
    spell?: { name: string; level: number }; // dropped for players when caster is DM-controlled
    deadline: string;         // ISO, server clock
    offers: CounterOffer[];   // players: DM offers removed
    dmDeciding?: boolean;     // players only
}
export interface HiddenCounter {
    request: SpellRequestData; // original body incl. client dice
    seed: number;
    serverRolls?: boolean;
    userId: string;
    isDM: boolean;
    attempts: number;          // feeds the counter-save seed
}
export const counterPendingOf = (p: PendingChoice | null | undefined): { shown: ShownCounter; hidden: HiddenCounter } | null;
```

Body (`lib/schemas/battles` → `counterWindowSchema`, discriminated union on `action`):

```ts
| { action: 'counter'; windowId; reactorId; slotLevel?: number; grantKey?: string }
| { action: 'pass'; windowId; reactorId }
| { action: 'expire'; windowId }
| { action: 'closeAll'; windowId }            // DM
```

Response: the usual delta. On `counter`: `response: { countered: boolean }`.

## Flow

```
POST spell (not preview, resume undefined, !opts.skipCounter)
  preflight (validate source/slot/targets/dice) ── reject → 4xx, nothing paused
  offers = counterReactors(ctx, caster, spell, deps)          // [] → normal path
  offers.length > 0 → MutationResult { participants unchanged, events [],
        scene.pendingChoice = { shown: ShownCounter, hidden: HiddenCounter },
        response { pendingChoice: true } }                    // wizard: WAIT_CRIT
        │
        ▼  publish: DM channel full shown, public channel redacted
POST counter-window
  ├─ pass     → mark offer.answer='pass'; all answered? → CLOSE(resolve) : write pending
  ├─ counter  → access check; offer open; slot/grant still valid
  │            reactorCast = createSpellMutation({ critPause:false, skipCounter:true,
  │                serverRolls:true, rng: mulberry32(seed+1+attempts) })(
  │                reactorCtx, { casterId: reactorId, spellId, targetIds:[actorId], slotKey|grantKey })
  │            interrupted = result.interruptedIds?.includes(actorId)
  │            interrupted → CLOSE(countered) merged on top of reactorCast participants/events
  │            else       → offer.answer='failed', attempts++, deadline = now+10s;
  │                          all answered? → CLOSE(resolve) on top of reactorCast
  ├─ expire   → now >= deadline-250ms ? pass all open offers → CLOSE(resolve) : 422 retryAfterMs
  └─ closeAll → DM only → CLOSE(resolve)

CLOSE(countered): participants = spendCastEconomy(caster, cost, source) ; event battleLog.counter.countered ;
                  scene.pendingChoice = null
CLOSE(resolve):   r = createSpellMutation()(requesterCtx, hidden.request, undefined, { skipCounter:true, seed })
                  (requesterCtx = { ...ctx, userId: hidden.userId, isDM: hidden.isDM }, participants = current)
                  → may itself return a crit pause (pendingChoice replaced) ; else pendingChoice = null
                  BattleRuleError → pendingChoice=null + battleLog.counter.castFailed (D11)
```

## Signatures

```ts
// lib/utils/battle/counter/eligibility.ts  (pure, core)
export interface InterruptSpell { id: string; name: string; level: number; range: number }
export function counterReactors(args: {
    caster: BattleParticipant;
    castSpell: { level: number; components?: { v: boolean; s: boolean; m: boolean } };
    participants: BattleParticipant[];
    interruptSpells: InterruptSpell[];   // loaded once per cast, see deps
    rules: Ruleset;
    map: BattleMapConfig | null | undefined;
    round: number;
}): CounterOffer[];

// lib/utils/battle/counter/pending.ts
export function openCounterWindow(ctx: BattleMutationContext, args: {
    caster: BattleParticipant; spell: { name: string; level: number };
    offers: CounterOffer[]; request: SpellRequestData; serverRolls: boolean;
    now: number; seed: number;
}): MutationResult;
export const counterPendingOf: (p: PendingChoice | null | undefined) => CounterPending | null;
export function redactCounterForPlayers(shown: ShownCounter, participants: BattleParticipant[]): ShownCounter;
export const allAnswered = (s: ShownCounter) => boolean;

// lib/utils/battle/spell/cast/finish.ts  (extract, reused by CLOSE(countered))
export function spendCastEconomy(p: BattleParticipant, cost: SpellCost, src: { isDMCast; isLegendaryCast; grant? }): BattleParticipant;

// lib/server/battles/mutations/spell/spell-mutation.ts
export function createSpellMutation(deps?, options?: { serverRolls?: boolean; critPause?: boolean; skipCounter?: boolean; rng?: Rng }):
    (ctx, data, resume?: CritResume) => Promise<MutationResult>;
// SpellMutationDeps += loadInterruptSpells(campaignId: string, ids: string[]): Promise<InterruptSpell[]>
//   prisma.spell.findMany({ where: { campaignId, id: { in: ids }, definition: { path: ['effects'], array_contains: [{ kind: 'interruptCast' }] } }, select: { id, name, level, definition } })
//   called only when a pre-filter (other side, canReact, has knownSpells/grants) leaves candidates → most casts do 0 extra queries.

// lib/server/battles/mutations/counter-window/counter-window-mutation.ts
export function createCounterWindowMutation(deps: { spell: typeof createSpellMutation; now?: () => number }):
    (ctx: BattleMutationContext, body: CounterWindowBody) => Promise<MutationResult>;
// operations.ts: 'counter-window': operation({ access: MEMBER, allowWhileCritPending: true, rateLimitScope: 'spell', … })
// route: app/api/campaigns/[id]/battles/[battleId]/counter-window/route.ts (thin, like spell/route.ts)

// castSpell: effect handler 'interruptCast' records failed-save targets → CastSpellResult.interruptedIds?: string[]
```

Projection: `publicPending` stays for the DM. `battle-response.ts` (full scene for a non-DM viewer) and `redactDeltaForPlayers` map `pendingChoice` through `redactPendingForPlayers(p, participants)`, which delegates to `redactCounterForPlayers` when `p.kind === 'counter'` (crit `shown` unchanged). Then `buildPusherMessages` already emits a DM twin when the redacted payload differs.

## Client

- `lib/api/battles.ts` → `counterWindow(campaignId, battleId, body)`. Hook `useCounterWindow()` in `lib/hooks/battle/` reads `scene.pendingChoice` via `asShownCounter`. It returns `{ window, myOffers, secondsLeft, counter(offer, slotLevel), pass(offer), closeAll }` and owns the nudge timer (D7 roles; one `setTimeout`, cleared on change; on 422 `retryAfterMs` retry once).
- `components/battle/counter/CounterWindowDialog.tsx` (`ResponsiveDialog hud`, not dismissible). Shown to a user with ≥1 open offer they control (DM: DM offers + "pass for player" + "close window"). Content: caster, spell (if visible), countdown bar, per offer a slot `HudSelect` + «Контрзаклинання» / «Пропустити».
- `CounterWindowBanner` for everyone else («Хтось може відповісти реакцією… 7 с» / players: «ДМ вирішує»). It reuses the `CritChoiceWaitingBanner` layout (extend it with a `variant` rather than copying).
- Spell/attack wizards: `useCritPause` already waits on any `pendingChoice` → no change. Check that a countered cast (log has `counter.countered` by the actor) shows a result card "Countered", not «Дію скасовано ДМом».
- Onboarding: `lib/onboarding/whats-new.ts` entry `counterspellWindow` + `whatsNew.counterspellWindow.*` in both locales.

## Test cases

Pure (`lib/utils/battle/counter/__tests__/eligibility.test.ts`):
1. Enemy wizard with Counterspell known + level-3 slot, 30 ft, LOS → 1 offer, `slotLevels [3,4…]`.
2. No slot ≥ 3 / reaction used / incapacitated (`blocker`) / 65 ft / wall blocks sight / same side → no offer.
3. Spell with `componentFlags {v:false,s:false,m:false}` → no offer. Missing flags → offer.
4. Live grant with a charge → offer with `grantKey`, `slotLevels []`; exhausted grant → none.
5. Ruleset whose system has no `combat.reactions` (`noReactions`) → [] (d6pool/wfrp fixture).
6. No map → range/LOS ignored.

Mutation (`lib/server/battles/mutations/counter-window/__tests__/counter-window-mutation.test.ts`, existing spell-mutation test harness):
7. Cast with an eligible reactor → `pendingChoice.shown.kind === 'counter'`, participants/hash unchanged, no events, `response.pendingChoice`.
8. `preview: true`, crit `resume`, `skipCounter` → no window.
9. Counter, caster fails the CON save → caster `hasUsedAction` true, slot **unchanged**, no concentration started, existing concentration kept; reactor reaction + slot spent; pending null; one counter log + one countered log.
10. Counter on a bonus-action / reaction / legendary / DM free cast → right economy flag / legendary point / nothing.
11. Counter, caster saves (legendary resistance or high CON) → offer `failed`, window open, new deadline, `attempts` 1; second reactor counters → countered.
12. Pass by all → cast resolves with the **same dice** as the window-open run (seed replay). With `critChoiceByDm` + nat 20 save → the result is a crit pause (`triggers`), not a resolved cast.
13. `expire` before the deadline → 422 + `retryAfterMs`; after → resolves; second `expire` → 409 stale, no write.
14. Player answering for a DM reactor → 403. DM `pass` for a player offer → ok. `closeAll` by a player → 403.
15. Wrong `windowId` / same reactor twice → 409.
16. Any other mutation while the window is open → 422 `crit_pending` (guard reused). Rollback clears the window.
17. Replay throws (stubbed) → window closed, `castFailed` log, no state change.
18. Redaction: player projection of a window whose only offer is a DM unit → `offers []`, `dmDeciding true`. DM-controlled caster → no `spell`. DM projection unchanged.

Contract / cross-system:
19. `lib/__tests__/d6pool-battle.test.ts` and wfrp e2e stay green (no window, no extra query).
20. `lib/__tests__/system-contract.test.ts` and the system-literals ratchet stay green (no system names added).

Hook (`happy-dom`): 21. nudge timer fires `expire` only for the requester at the deadline, DM at +2 s; unmount clears it.

SRD: 22. `scripts/srd` override test: Counterspell definition = CON save + `interruptCast`, no `disable_spell_casting`.

## Tasks (ordered, one Sonnet dispatch each)

### Task 1 — Model + pure eligibility
Files: `lib/utils/spells/model/schema.ts` (`InterruptCastSchema`, add to the effect union + any exhaustive switch/labels), `lib/utils/battle/spell/cast/effects.ts` (`interruptCast` handler: on failed save push target to `interruptedIds`; nothing else), `lib/utils/battle/types/spell-process.ts` (`interruptedIds?`), `lib/utils/battle/spell/cast/finish.ts` (extract `spendCastEconomy`, no behavior change), `lib/utils/battle/counter/{types,eligibility,pending}.ts` + `__tests__` (cases 1–6, 18), `lib/constants/battle.ts` (`COUNTER_WINDOW_MS`), `scripts/srd/overrides/spells-utility.ts` (D12) + test 22; check the unit "Protective Magic" grant feasibility and only note it.
- [ ] effect schema + handler + `spendCastEconomy` extraction
- [ ] `counterReactors`, `openCounterWindow`, `counterPendingOf`, `redactCounterForPlayers`, `allAnswered`
- [ ] SRD override + tests

### Task 2 — Server: open the window in spell-mutation
Files: `lib/server/battles/mutations/spell/{spell-mutation,cast-types}.ts` (options `critPause`, `skipCounter`, `rng`; dep `loadInterruptSpells`; open the window after `prepareCastDice`, before `runWithCritChoice`, only when `!data.preview && !resume && !skipCounter`), `lib/utils/battle/crit-choice/run-with-crit-choice.ts` (accept an explicit `seed` without `resume` so CLOSE(resolve) replays the stored seed while crit pause stays possible), `lib/utils/battle/pipeline/{public-pending,battle-response,client-delta}.ts` (`redactPendingForPlayers` in the player projections), tests 7, 8, 18 (projection), 19.
- [ ] options + deps + cheap pre-filter (no query when no candidate)
- [ ] seed passthrough in `runWithCritChoice` (crit replay unchanged)
- [ ] player redaction in HTTP + Pusher paths

### Task 3 — Server: counter-window operation
Files: `lib/schemas/battles/*` (`counterWindowSchema`), `lib/server/battles/mutations/counter-window/counter-window-mutation.ts` + `__tests__` (cases 9–17), `lib/server/battles/operations.ts` (`counter-window`, `MEMBER`, `allowWhileCritPending`), `app/api/campaigns/[id]/battles/[battleId]/counter-window/route.ts`, `lib/constants/api-errors.ts` + `messages/{uk,en}/errors.json` (`COUNTER_WINDOW_OPEN`, `COUNTER_WINDOW_STALE`), `messages/{uk,en}/battle.json` (`battleLog.counter.{attempt,countered,saved,passed,expired,castFailed}`).
- [ ] counter / pass / expire / closeAll with D6–D11
- [ ] CLOSE(countered) via `spendCastEconomy`; CLOSE(resolve) via requester replay; failure fallback
- [ ] route + operation + error keys

### Task 4 — Client: hook, dialog, banner, wizard result
Files: `lib/api/battles.ts`, `lib/hooks/battle/use-counter-window.ts` (+ barrel), `components/battle/counter/{CounterWindowDialog,CounterWindowBanner}.tsx` (or a `variant` on the crit waiting banner), mount in `BattleScreen`, `useCritPause`/spell-flow result for "countered", `messages/{uk,en}/battle.json` UI keys, `lib/onboarding/whats-new.ts` + `messages/*/whatsNew.json`, hook test 21.
- [ ] hook with the server-deadline countdown and the D7 nudge roles
- [ ] dialog (player + DM variants), banner, countered result card
- [ ] whats-new entry

### Task 5 — Docs, gates, live run
Files: `docs/architecture/battle.md` (new section "Counterspell window", update the 4f-5b "reactions" bullet), `docs/architecture/abilities.md` (remove "реакція-переривання (Counterspell: каститься заздалегідь)" from the gaps), `docs/STATUS.md` (prod tail: re-publish the SRD template; Protective Magic grant if deferred).
- [ ] full `pnpm test:run` once, `pnpm cycles`, `pnpm lint:dirs --changed`, `tsc`
- [ ] live run on the preview stage: player wizard casts at an enemy Mage with Counterspell (DM counters → countered; pass → resolves; idle 10 s → auto-pass), and a DM cast countered by a player hero; check that the player tab shows no DM reactor info
- [ ] `/simplify` on the branch diff (1 agent)

## Review Focus

- Dice determinism: the window-open run and CLOSE(resolve) must give identical cast dice. The counter save stream must never touch `mulberry32(seed)`.
- The window never writes participants (no hash churn), and no extra Prisma query when nobody can react.
- Player projection leaks no DM reactor id or name through any of: HTTP delta, full scene, Pusher public channel, log lines before the reactor acts.
- Window + crit pause chain: counter save nat 1/20 is **not** crit-gated (`critPause: false`); the replayed cast may still crit-pause.
