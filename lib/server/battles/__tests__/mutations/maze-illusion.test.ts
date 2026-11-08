import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { BattleStatus, CombatStatus } from "@/lib/constants/battle";
import { mazeActionSchema } from "@/lib/schemas/battles";
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

  it("is DM-only", async () => {
    const loaded = ctx({ isDM: false });

    const deps: PipelineDeps = {
      getUserId: async () => loaded.userId,
      rateLimit: vi.fn(),
      loadBattle: async () => ({ scene: loaded.scene, meta: loaded.meta, participants: loaded.participants, pending: [], isDM: false, isMember: true }),
      saveBattle: vi.fn(),
      publish: vi.fn(),
      loadRecentEvents: async () => [],
    };

    const res = await runBattleMutation(
      new Request("http://x/api", { method: "POST", body: JSON.stringify({ op: "illusion", pairs: [pair] }) }),
      { params: { id: "c1", battleId: "b1" }, access: BattleAccess.DM, schema: mazeActionSchema, mutate: vi.fn() } as never,
      deps,
    );

    expect(res.status).toBe(403);
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
