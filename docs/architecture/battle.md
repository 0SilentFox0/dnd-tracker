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

## Changing battle behavior

Expect to touch the mutation, the engine util, and possibly the hook and UI under `components/battle/`.
