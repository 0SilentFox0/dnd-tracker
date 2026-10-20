import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { mazeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import { mazeActionSchema } from "@/lib/schemas/battles";
import { at, expectRejected, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleMapConfig, GridPoint, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => mazeMap({ exit: { x: 7, y: 0 }, ...over });

const hero2 = participant("hero2", { controlledBy: "user-2", name: "Друга" });

const ctx = (mazeOver: Partial<MazeConfig> = {}, over: Partial<BattleMutationContext> = {}): BattleMutationContext => {
  const base = context({
    participants: [at(hero, { x: 0, y: 2 }, { facing: "e" }), at(hero2, { x: 0, y: 5 }), at(goblin, { x: 6, y: 6 })],
    isDM: true,
    ...over,
  });

  return withMap(base, mapOf(mazeOver));
};

const features = { teleportPairs: 1, fogPatches: 1 };

describe("DM maze route", () => {
  it("гравець → 403 «Лише DM»", async () => {
    const loaded = ctx({}, { isDM: false });

    const deps: PipelineDeps = {
      getUserId: async () => loaded.userId,
      rateLimit: vi.fn(),
      loadBattle: async () => ({ scene: loaded.scene, meta: loaded.meta, participants: loaded.participants, pending: [], isDM: false, isMember: true }),
      saveBattle: vi.fn(),
      publish: vi.fn(),
      loadRecentEvents: async () => [],
    };

    const mutate = vi.fn();

    const res = await runBattleMutation(
      new Request("http://x/api", { method: "POST", body: JSON.stringify({ op: "dark", on: true }) }),
      { params: { id: "c1", battleId: "b1" }, access: BattleAccess.DM, schema: mazeActionSchema, mutate } as never,
      deps,
    );

    expect(res.status).toBe(403);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("бій без лабіринту — відмова", () => {
    const base = ctx();

    expectRejected(() => mazeMutation({ ...base, meta: { ...base.meta, map: { ...mapOf(), maze: null } } }, { op: "dark", on: true }), "Цей бій не лабіринт");
  });

  it("generate: нові стіни, вихід на краю, герої на краях, вороги не прокидаються, dark зберігається", () => {
    const out = mazeMutation(ctx({ dark: true }), { op: "generate", difficulty: "hard", ...features, exit: null });

    const m = out.scene?.map?.maze as MazeConfig;

    expect(m.walls.length).toBeGreaterThan(0);
    expect(m.difficulty).toBe("hard");
    expect(m.dark).toBe(true);
    expect(m.exit && (m.exit.x === 0 || m.exit.y === 0 || m.exit.x === 7 || m.exit.y === 7)).toBe(true);
    expect(out.participants[2].battleData.dormant).toBeUndefined();
  });

  it("generate: герой без крайньої позиції → розкидується на край; вихід не на краю → відмова; після moved → відмова", () => {
    const inner = ctx({}, { participants: [at(hero, { x: 3, y: 3 }), at(goblin, { x: 6, y: 6 })] });

    const out = mazeMutation(inner, { op: "generate", difficulty: "easy", ...features, exit: { x: 7, y: 7 } });

    const pos = out.participants[0].battleData.position as GridPoint;

    expect(pos.x === 0 || pos.y === 0 || pos.x === 7 || pos.y === 7).toBe(true);

    expectRejected(() => mazeMutation(ctx(), { op: "generate", difficulty: "easy", ...features, exit: { x: 3, y: 3 } }), MAZE_TEXTS.exitOnEdge);
    expectRejected(() => mazeMutation(ctx({ moved: true }), { op: "generate", difficulty: "easy", ...features, exit: null }), "Лабіринт уже пройдено частково — використайте «Перетасувати»");
  });

  it("generate: герой без позиції не стає на зайняту крайню клітинку, ніхто не ділить клітинку", () => {
    const enemies = [0, 1, 2, 3, 4, 5].map((i) => at(participant(`g${i}`, { side: ParticipantSide.ENEMY }), { x: i, y: 0 }, { dormant: true }));

    for (let i = 0; i < 20; i++) {
      const base = ctx({}, { participants: [{ ...hero, battleData: { ...hero.battleData, position: undefined } }, ...enemies] });

      const out = mazeMutation(base, { op: "generate", difficulty: "easy", ...features, exit: null });

      const keys = out.participants.map((p) => `${p.battleData.position?.x}:${p.battleData.position?.y}`);

      expect(new Set(keys).size).toBe(keys.length);
      expect(out.participants[0].battleData.position).toBeDefined();
    }
  });

  it("reshuffle walls: позиції сталі, вихід і dark збережені, мітки стерті; невидимий ворог засинає", () => {
    const awake = ctx({ moved: true, marks: { "0:2": { symbol: "star", color: "#ef4444", by: "hero" } } }, { participants: [at(hero, { x: 0, y: 2 }, { facing: "e" }), at(goblin, { x: 6, y: 6 })] });

    const out = mazeMutation(awake, { op: "reshuffle", mode: "walls", ...features });

    const m = out.scene?.map?.maze as MazeConfig;

    expect(m.exit).toEqual({ x: 7, y: 0 });
    expect(m.marks).toEqual({});
    expect(out.participants[0].battleData.position).toEqual({ x: 0, y: 2 });
    expect(out.participants[1].battleData.dormant).toBe(true);
  });

  it("reshuffle scatter: нові позиції записані учасникам", () => {
    const out = mazeMutation(ctx(), { op: "reshuffle", mode: "scatter", ...features });

    expect(out.participants.every((p) => p.battleData.position)).toBe(true);
    expect(out.scene?.map?.maze).toBeDefined();
  });

  it("walls: додає й прибирає ребра; замуровування героя → відмова; ребро поза картою → відмова", () => {
    const out = mazeMutation(ctx({ walls: ["1:1:e"] }), { op: "walls", add: ["2:2:s"], remove: ["1:1:e"] });

    expect(out.scene?.map?.maze?.walls).toEqual(["2:2:s"]);

    expectRejected(() => mazeMutation(ctx(), { op: "walls", add: ["0:2:e", "0:1:s", "0:2:s"], remove: [] }), "Ці стіни замурують учасника — шляху до виходу не залишиться");
    expectRejected(() => mazeMutation(ctx(), { op: "walls", add: ["7:0:e"], remove: [] }));
  });

  it("exit: лише край; не замуровує", () => {
    expect(mazeMutation(ctx(), { op: "exit", cell: { x: 7, y: 3 } }).scene?.map?.maze?.exit).toEqual({ x: 7, y: 3 });

    expectRejected(() => mazeMutation(ctx(), { op: "exit", cell: { x: 3, y: 3 } }), MAZE_TEXTS.exitOnEdge);
  });

  it("teleport: додає пару, прибирає за клітинкою; зайнята клітинка пари → відмова", () => {
    const pair: [GridPoint, GridPoint] = [{ x: 2, y: 2 }, { x: 5, y: 5 }];

    const added = mazeMutation(ctx(), { op: "teleport", pair });

    expect(added.scene?.map?.maze?.teleports).toEqual([pair]);

    const removed = mazeMutation(ctx({ teleports: [pair] }), { op: "teleport", pair: null, removeAt: { x: 5, y: 5 } });

    expect(removed.scene?.map?.maze?.teleports).toEqual([]);

    expectRejected(() => mazeMutation(ctx({ teleports: [pair] }), { op: "teleport", pair: [{ x: 2, y: 2 }, { x: 3, y: 3 }] }));
    expectRejected(() => mazeMutation(ctx(), { op: "teleport", pair: null }));
  });

  it("fog: вмикає й вимикає клітинки; поза картою → відмова", () => {
    const on = mazeMutation(ctx(), { op: "fog", cells: ["2:2", "3:3"], on: true });

    expect(on.scene?.map?.maze?.fog).toEqual(["2:2", "3:3"]);

    const off = mazeMutation(ctx({ fog: ["2:2", "3:3"] }), { op: "fog", cells: ["2:2"], on: false });

    expect(off.scene?.map?.maze?.fog).toEqual(["3:3"]);
    expectRejected(() => mazeMutation(ctx(), { op: "fog", cells: ["9:9"], on: true }));
  });

  it("dark перемикає темряву", () => {
    expect(mazeMutation(ctx(), { op: "dark", on: true }).scene?.map?.maze?.dark).toBe(true);
  });

  it("scatterStarts: герої на краях, вороги на місці; після moved → відмова", () => {
    const inner = ctx({}, { participants: [at(hero, { x: 3, y: 3 }), at(hero2, { x: 4, y: 4 }), at(goblin, { x: 6, y: 6 })] });

    const out = mazeMutation(inner, { op: "scatterStarts" });

    for (const p of out.participants.slice(0, 2)) {
      const { x, y } = p.battleData.position as GridPoint;

      expect(x === 0 || y === 0 || x === 7 || y === 7).toBe(true);
    }

    expect(out.participants[2].battleData.position).toEqual({ x: 6, y: 6 });
    expectRejected(() => mazeMutation(ctx({ moved: true }), { op: "scatterStarts" }));
  });
});
