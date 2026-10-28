# Battle data flow

The most complex part of the app. Related: [balance.md](balance.md), [map-modes.md](map-modes.md), [abilities.md](abilities.md).

## Page → mutation

Page `app/campaigns/[id]/battles/[battleId]/page.tsx` (server: `userId` from `getClaims`, the scene from `readBattleScene` — the same code as `GET /` — seeded into the query cache with `PrefetchedQuery`, so the first HTML has the battle and the client does not GET on mount) → `BattlePageClient` → `useBattleSceneValue` + `BattleSceneProvider` (`lib/hooks/battle`, read with `useBattleScene()`) → `BattleScreen` (`components/battle/scene`: mobile layout < 1024 px, desktop three columns ≥ 1024 px) → mutations in `lib/hooks/battles/useBattles.ts` (all through `useBattleAction`) → `lib/api/battles.ts` → route in `app/api/campaigns/[id]/battles/[battleId]/<action>/route.ts`.

## Mutation pipeline

Every battle route is a Zod schema + `runBattleMutation` (`lib/utils/battle/pipeline/`) with a sibling `<action>-mutation.ts`. The pipeline:

- does auth (`getClaims`);
- loads the battle in one query (`lib/utils/battle/store/loadBattle`). Participant snapshots — ~75 % of the bytes — come from a per-instance content-addressed cache keyed by `snapshotHash`, and only misses are read, so **anything writing `battle_participants.snapshot` must write its `snapshotHash` too**, as `saveBattle` does;
- checks access (`dm` / `turnController` / `currentController` / `member`) and status;
- runs `mutate` (pure engine code from `lib/utils/battle/*`, `lib/utils/abilities/*`), checks victory once;
- saves with an optimistic `version` lock (`saveBattle`: changed `battle_participants` rows in one `UPDATE … FROM (VALUES …)` without reading rows back, append-only `battle_events`, `battle_snapshots` for rollback — pruned to the last 20 when the battle completes);
- answers `{ delta, response? }` (`ClientBattleDelta` from `pipeline/client-delta.ts`: new participants and those whose snapshot changed go in `upserted`, the rest as `patched` with only the column/state fields from `PATCHABLE_PARTICIPANT_FIELDS`);
- sends Pusher `battle-delta` (or `{ refetch: true }` above 9 500 bytes) after the response (`after()`).

`GET /` and `dryRun` still return the full `BattleScene` with the last 30 events; older ones come from `GET /events?before=<seq>` («Показати раніші», `useBattleLogHistory`), and `GET /?versionOnly=1` answers `{ version }`.

## Turn advance

One engine: `lib/utils/battle/turn/advanceTurn` (used by next-turn and attack with `endTurn`).

## Client cache

`applyBattleDelta` (`lib/utils/battle/client`) patches the cached `BattleScene` (old version ignored, gap or patch for an unknown id → one GET). After a Pusher gap or a tab hidden > 15 s, `usePusherBattleSync` asks for the version and refetches only when it is newer. `useBattleAction` sends `expectedVersion`; 409 → refetch + battle toast. `actionIndex` in the client log is the event `seq` (rollback target).

## Player UI logic

Wizards (attack, spellbook, player turn) are reducers in `lib/utils/battle/flows` driven by hooks in `lib/hooks/battle`. What a player may see (health states instead of enemy HP, AC known from attacks, observed traits from `actionDetails.damageSteps`, turn queue with morale extra turns) is `lib/utils/battle/view`. Hiding is client-side.

## Attack: cover, chain shot, cleave

- **Cover** is computed by the server (`grid/line-of-fire.ts`) per target of a ranged attack: a living, non-airborne participant, `wall`/`barrier`, `blocked` cells, or a mode wall (`lineBlocked`) on the line. Not applied to melee, chain jumps or secondary targets of piercing shots. The wizard and the map show the same result.
- **Target limit**: `attack/max-targets.ts`, shared by client and server; auto-targets (chain, cleave, piercing, hits-all) are outside it.
- **Chain shot**: ability flag `chainShot` (`attack/process/chain.ts`) — the player picks one target, the server jumps to the nearest enemy in range (`grid/nearest.ts`) from the previous target's cell.
- **Cleave**: a melee attack with `maxTargets > 1` (`attack/process/cleave.ts`) also hits enemies adjacent to both attacker and target; the server rolls d20/damage for them (`attack-phase/targets.ts`).
- **FX**: `originId` on a spec is where the projectile starts (chain jumps); secondary victims get a splash spec (`fx/impact.ts`); the queue is trimmed by whole actions. The result card lists every target (`view/volley-results.ts`).

## Crit choice (DM-chosen critical effects)

Campaign setting `critChoiceByDm` (off by default). Triggers: natural 20/1 on an attack and on a **target's saving throw** of a spell (`SAVE_SUCCESS_EFFECTS` / `SAVE_FAIL_EFFECTS` in `lib/constants/save-critical-effects.ts`; spells have no to-hit roll). With the setting off, every trigger gets a random effect (also for saves).

- **Gate:** `attack-mutation` / `spell-mutation` run inside `runWithCritChoice` (`lib/utils/battle/crit-choice/`). All server rolls go through a seeded `rng` (`mulberry32`, `lib/utils/common/rng.ts`) and `CritPicker`; each trigger gets a stable `key` (`source:actor:target:n`) and always consumes exactly one `rng()`, so a replay with the same seed gives the same dice. **Limitation:** the stream stays aligned only until outcomes diverge — if the chosen effect changes who dies (`double_damage`/`max_damage`), retaliation, cleave/chain shot, morale and downed handling take other branches that consume other rolls, and triggers the DM never saw (not in `choices`) resolve randomly without a pause. A scripted `ctx.rng` (tests, sweep/sim scripts) is used directly on the first run, so such a run is not replayable by seed.
- **Not gated:** saving throws of on-hit spells (`attack/process/hit-spell.ts` casts without `crit`) and berserk attacks during `advanceTurn` (`turn/berserk.ts`) — their crits are never offered to the DM (berserk gets a random effect).
- **Pending:** setting on and triggers found → nothing is applied; `battle_scenes.pendingCritChoice` stores `{ action, actorId, triggers, request, seed, userId, isDM }` (the requester: the replay runs as them, so a player's `free: true` stays ignored), `version` grows, the response is `{ pendingCritChoice: true }` with no events. Previews / `dryRun` never create it. The same path serves the DM's own attacks.
- **Projection:** clients only get `PendingCritChoice` (`toPublicPendingCrit`: no `request`/`seed`) on `BattleScene.pendingCritChoice` and in the delta scene.
- **Resolve:** `POST …/crit-choice` (DM only, body `{ choices: Record<key, effectId | "random"> }`) replays the stored request as its original requester with the stored seed and the choices, then clears pending. Body `{ cancel: true }` drops the action without any state change (one log line «ДМ скасував дію»); the dialog offers it as «Скасувати дію».
- **Guard:** while pending, every other mutation answers 422 `crit_pending` (`run-battle-mutation.ts`; only `crit-choice`, rollback, reset and `complete` opt out). Rollback, reset, start and complete clear it. A DM who is offline stalls the battle — roll back or reset.
- **Client:** `useCritChoiceDialog` + `CritChoiceDialog` (DM, `ResponsiveDialog hud`, not dismissible) and `CritChoiceWaitingBanner` (everyone else) are mounted in `BattleScreen`. The attack/spell wizards stay in `submitting` with `waitingCrit` (`WAIT_CRIT` in `attack-flow`/`spell-flow`) when the response is `pendingCritChoice`, and finish through the usual result path once `scene.pendingCritChoice` becomes null (new log entries by the actor since the pause are read via `readBattle`; `useCritPause`). If the pending clears with no such entries (cancel, rollback, reset) the wizard shows «Дію скасовано ДМом» instead of a result.
- **Save crits:** on a save, nat 20 forces success and nat 1 forces failure (when a picker is present), so log, damage factor and effect table agree. «Контратака» / «Другий вдих» grant `extra_action`: a one-turn `actionsPerTurn +1` effect that lives through the target's next turn.

## Changing battle behavior

Expect to touch the mutation, the engine util, and possibly the hook and UI under `components/battle/`.
