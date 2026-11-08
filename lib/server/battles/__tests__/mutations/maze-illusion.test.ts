import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { BattleStatus, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { mazeMutation } from "@/lib/server/battles/mutations/maze/maze-mutation";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import { at, expectRejected, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { pruneIllusion } from "@/lib/utils/battle/modes/maze/illusion";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { NewBattleEvent, ScenePatch } from "@/lib/utils/battle/store/types";
import type { IllusionPair, MazeConfig } from "@/types/battle";

const hero2 = participant("hero2", { controlledBy: "user-2" });

const pair: IllusionPair = { a: "hero", b: "hero2", aSees: { name: "Wolf" }, bSees: { name: "Rogue" } };

const mapOf = (over: Partial<MazeConfig> = {}) => mazeMap({ exit: { x: 7, y: 0 }, ...over });

const ctx = (over: Partial<BattleMutationContext> = {}, mazeOver: Partial<MazeConfig> = {}): BattleMutationContext =>
  withMap(context({ participants: [at(hero, { x: 0, y: 2 }), at(hero2, { x: 0, y: 5 }), at(goblin, { x: 6, y: 6 })], isDM: true, ...over }), mapOf(mazeOver));

const illusion = (loaded: BattleMutationContext, pairs: IllusionPair[]) => mazeMutation(loaded, { op: "illusion", pairs });

describe("maze illusion op", () => {
  it("DM sets a pair and the event is a maze op", () => {
    const out = illusion(ctx(), [pair]);

    expect(out.scene?.map?.maze?.illusionSwap?.pairs).toEqual([pair]);
    expect(out.events[0].details).toMatchObject({ actionDetails: { mazeEvent: "op" } });
  });

  it("empty list resets the pairs without touching participants", () => {
    const loaded = ctx({}, { illusionSwap: { pairs: [pair] } });

    const out = illusion(loaded, []);

    expect(out.scene?.map?.maze?.illusionSwap?.pairs).toEqual([]);
    expect(out.participants).toBe(loaded.participants);
  });

  it("rejects units, dead, off-field and unknown participants", () => {
    const unit = at(participant("unit1", { sourceType: "unit" }), { x: 1, y: 1 });

    const dead = at({ ...hero2, combatStats: { ...hero2.combatStats, status: CombatStatus.DEAD } }, { x: 0, y: 5 });

    const bad = (participants: BattleMutationContext["participants"], b: string) =>
      expectRejected(() => illusion(ctx({ participants }), [{ ...pair, b }]), MAZE_TEXTS.illusionInvalid);

    bad([at(hero, { x: 0, y: 2 }), unit], "unit1");
    bad([at(hero, { x: 0, y: 2 }), dead], "hero2");
    bad([at(hero, { x: 0, y: 2 }), hero2], "hero2");
    bad([at(hero, { x: 0, y: 2 })], "ghost");
  });

  it("rejects the swap before the battle is active", () => {
    const loaded = ctx();

    expectRejected(() => illusion({ ...loaded, scene: { ...loaded.scene, status: BattleStatus.PREPARED } }, [pair]), MAZE_TEXTS.illusionNotActive);
  });

  it("clearing is allowed outside an active battle", () => {
    const loaded = ctx({}, { illusionSwap: { pairs: [pair] } });

    expect(illusion({ ...loaded, scene: { ...loaded.scene, status: BattleStatus.PREPARED } }, []).scene?.map?.maze?.illusionSwap?.pairs).toEqual([]);
  });

  it("rejects an enemy-side character", () => {
    const foe = at(participant("hero2", { controlledBy: "user-2", side: ParticipantSide.ENEMY }), { x: 0, y: 5 });

    expectRejected(() => illusion(ctx({ participants: [at(hero, { x: 0, y: 2 }), foe] }), [pair]), MAZE_TEXTS.illusionInvalid);
  });
});

describe("illusion auto-clear through the pipeline", () => {
  it("a victory that completes the battle leaves no pairs", async () => {
    const loaded = ctx({ isDM: true }, { illusionSwap: { pairs: [pair] } });

    const killed = loaded.participants.map((p) => (p.basicInfo.id === "gob" ? { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD, currentHp: 0 } } : p));

    const saveBattle = vi.fn(async () => ({ battleId: "b1", version: 3, scene: { status: BattleStatus.COMPLETED, round: 1, turnIndex: 0, pendingMoraleCheck: null, pendingCritChoice: null }, upserted: [], fullIds: [], removed: [], events: [] }));

    const deps: PipelineDeps = {
      getUserId: async () => loaded.userId,
      rateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })),
      loadBattle: async () => ({ scene: loaded.scene, meta: loaded.meta, participants: loaded.participants, pending: [], isDM: true, isMember: true }),
      saveBattle,
      publish: vi.fn(),
      loadRecentEvents: async () => [],
    };

    const res = await runBattleMutation(
      new Request("http://x/api", { method: "POST", body: JSON.stringify({}) }),
      { params: { id: "c1", battleId: "b1" }, access: BattleAccess.DM, mutate: async () => ({ participants: killed, pending: [], events: [] }) } as never,
      deps,
    );

    expect(res.status).toBe(200);

    const saved = (saveBattle.mock.calls as unknown as Array<[unknown, { scene?: ScenePatch }]>)[0][1];

    expect(saved.scene?.status).toBe(BattleStatus.COMPLETED);
    expect(saved.scene?.map?.maze?.illusionSwap?.pairs).toEqual([]);
  });
});

describe("pruneIllusion", () => {
  const withPair = () => ctx({}, { illusionSwap: { pairs: [pair] } });

  const run = (loaded: BattleMutationContext, participants = loaded.participants, scene?: ScenePatch) =>
    pruneIllusion(loaded.meta.map, loaded.scene, { participants, events: [] as NewBattleEvent[], ...(scene && { scene }) });

  it("keeps a valid pair untouched", () => {
    const loaded = withPair();

    const result = { participants: loaded.participants, events: [] };

    expect(pruneIllusion(loaded.meta.map, loaded.scene, result)).toBe(result);
  });

  it("clears the pair with a DM event once one of them dies", () => {
    const loaded = withPair();

    const participants = loaded.participants.map((p) => (p.basicInfo.id === "hero2" ? { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD } } : p));

    const out = run(loaded, participants);

    expect(out.scene?.map?.maze?.illusionSwap?.pairs).toEqual([]);
    expect(out.events).toHaveLength(1);
    expect(out.events[0].details).toMatchObject({ actionDetails: { mazeEvent: "op" } });
  });

  it("clears the pair when the battle is no longer active", () => {
    const out = run(withPair(), undefined, { status: BattleStatus.COMPLETED });

    expect(out.scene?.map?.maze?.illusionSwap?.pairs).toEqual([]);
  });

  it("does nothing without pairs", () => {
    const loaded = ctx();

    const result = { participants: loaded.participants, events: [] };

    expect(pruneIllusion(loaded.meta.map, loaded.scene, result)).toBe(result);
  });
});
