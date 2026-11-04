import { describe, expect, it } from "vitest";

import { initiativeReorderMutation, initiativeReorderSchema } from "../initiative-reorder-mutation";
import { initiativeRollMutation, initiativeRollSchema } from "../initiative-roll-mutation";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { context, hero, participant } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { guardTurnOrder } from "@/lib/utils/battle/pipeline/turn-order-guard";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const three = [participant("a"), participant("b"), participant("c")];

const ids = (ps: { basicInfo: { id: string } }[]) => ps.map((p) => p.basicInfo.id);

describe("initiativeRollMutation", () => {
  it("rolls for everyone, resets turnIndex and logs one dice group each", () => {
    const out = initiativeRollMutation(context({ participants: three, isDM: true, scene: { ...context().scene, turnIndex: 2 } }), initiativeRollSchema.parse({}));

    expect(out.scene).toEqual({ turnIndex: 0 });
    expect(out.reordered).toBe(true);
    expect(out.participants).toHaveLength(3);
    expect(out.events).toHaveLength(1);

    const rolls = (out.events[0].details as { actionDetails: { diceRolls: { kind: string; dice: { sides: number }[] }[] } }).actionDetails.diceRolls;

    expect(rolls).toHaveLength(3);
    expect(rolls[0]).toMatchObject({ kind: "initiative", dice: [{ sides: 20 }] });
  });

  it("works in static mode and with one participant", () => {
    const rules = { ...DEFAULT_RULES, initiative: { ...DEFAULT_RULES.initiative, mode: "static" as const } };

    const out = initiativeRollMutation(context({ participants: [hero], isDM: true, meta: { ...context().meta, rules } }), {});

    expect(ids(out.participants)).toEqual(["hero"]);
    expect(out.scene).toEqual({ turnIndex: 0 });
  });

  it("is not reverted by the turn-order guard", () => {
    const ctx = context({ participants: three, isDM: true });

    const out = initiativeRollMutation(ctx, {});

    expect(guardTurnOrder(ctx.scene, ctx.participants, out, "initiative-roll")).toBe(out);
  });
});

describe("initiativeReorderMutation", () => {
  const run = (order: string[], turnIndex = 1) => initiativeReorderMutation(context({ participants: three, isDM: true, scene: { ...context().scene, turnIndex } }), initiativeReorderSchema.parse({ order }));

  it("reorders, keeps turnIndex and logs", () => {
    const out = run(["c", "a", "b"]);

    expect(ids(out.participants)).toEqual(["c", "a", "b"]);
    expect(out.scene).toBeUndefined();
    expect(out.reordered).toBe(true);
    expect(out.events).toHaveLength(1);
  });

  it("identical order changes nothing", () => {
    const out = run(["a", "b", "c"]);

    expect(out.events).toEqual([]);
    expect(out.reordered).toBeFalsy();
  });

  it.each([[["a", "a", "b"]], [["a", "b", "zzz"]], [["a", "b"]], [["a", "b", "c", "d"]]])("rejects invalid order %j", (order) => {
    expect(() => run(order)).toThrow(API_ERRORS.BATTLE_INITIATIVE_ORDER_INVALID);
  });

  it("schema rejects empty order", () => {
    expect(initiativeReorderSchema.safeParse({ order: [] }).success).toBe(false);
  });
});

describe("mid-battle turn entry", () => {
  const spent = (id: string, battleData: Record<string, unknown> = {}) => participant(id, {}, { actionFlags: { hasUsedAction: true, hasUsedBonusAction: true, hasUsedReaction: false, hasExtraTurn: false } , battleData: { ...participant(id).battleData, ...battleData } });

  const scene = (turnIndex: number, round = 2) => ({ ...context().scene, round, turnIndex });

  it("roll: the new current actor gets a fresh turn", () => {
    const ps = [spent("a"), spent("b"), spent("c")];

    const out = initiativeRollMutation(context({ participants: ps, isDM: true, scene: scene(2) }), {});

    const fresh = out.participants.filter((p) => !p.actionFlags.hasUsedAction);

    expect(fresh.map((p) => p.basicInfo.id)).toEqual([out.participants[out.scene?.turnIndex ?? 0].basicInfo.id]);
    expect(out.events.length).toBeGreaterThan(0);
  });

  it("reorder: the actor swapped into the current slot gets a fresh turn, the rest keep their state", () => {
    const out = initiativeReorderMutation(context({ participants: [spent("a"), spent("b"), spent("c")], isDM: true, scene: scene(1) }), { order: ["c", "a", "b"] });

    expect(out.participants.map((p) => p.actionFlags.hasUsedAction)).toEqual([true, false, true]);
    expect(out.scene).toBeUndefined();
  });

  it("reorder: a dormant actor in the current slot is skipped", () => {
    const out = initiativeReorderMutation(context({ participants: [spent("a"), spent("b"), spent("c")], isDM: true, scene: scene(1) }), { order: ["a", "b", "c"].reverse() });

    const dormant = initiativeReorderMutation(context({ participants: [spent("a"), spent("b"), spent("c", { dormant: true })], isDM: true, scene: scene(1) }), { order: ["a", "c", "b"] });

    expect(out.scene).toBeUndefined();
    expect(dormant.scene).toEqual({ turnIndex: 2 });
    expect(dormant.participants.map((p) => p.actionFlags.hasUsedAction)).toEqual([true, true, false]);
  });

  it("reorder before the first turn does not run start-of-turn", () => {
    const out = initiativeReorderMutation(context({ participants: [spent("a"), spent("b")], isDM: true, scene: scene(0, 1) }), { order: ["b", "a"] });

    expect(out.participants.map((p) => p.actionFlags.hasUsedAction)).toEqual([true, true]);
    expect(out.events).toHaveLength(1);
  });
});
