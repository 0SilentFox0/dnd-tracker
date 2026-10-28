import { describe, expect, it } from "vitest";

import { contest, releaseInvalidGrapples } from "../grapple";
import { runCoreAction } from "../run";

import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { moveMutation } from "@/lib/server/battles/mutations/move/move-mutation";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyCondition5e, hasCondition } from "@/lib/utils/battle/conditions";
import { grappledBy, releaseGrapples } from "@/lib/utils/battle/conditions/grapple-links";
import { pathTo, reachable } from "@/lib/utils/battle/grid/path";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const mk = (id: string, side: "ally" | "enemy", x: number, y = 0, str = 2): BattleParticipant => {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, side: side as never, controlledBy: side === "ally" ? "user-1" : "dm" },
    abilities: { ...base.abilities, modifiers: { ...base.abilities.modifiers, strength: str } },
    combatStats: { ...base.combatStats, speed: 30 },
    battleData: { ...base.battleData, position: { x, y } },
  };
};

const on = (variant: "2014" | "2024" = "2014") => ({ ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true, variant } });

const run = (ps: BattleParticipant[], body: Parameters<typeof runCoreAction>[0]["body"], rules = on(), rng = () => 0.5) =>
  runCoreAction({ participants: ps, body, map, rules, round: 1, rng, battleId: "b1" });

const get = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)!;

const grappled = (a: BattleParticipant, b: BattleParticipant, ps: BattleParticipant[] = [a, b]) =>
  applyCondition5e(ps, b.basicInfo.id, {
    key: "grappled",
    rounds: 99,
    permanent: true,
    source: { participantId: a.basicInfo.id, name: a.basicInfo.name },
    sourceName: a.basicInfo.name,
    timedKey: `core:grapple:${a.basicInfo.id}`,
    round: 1,
  }).participants;

describe("contest", () => {
  const a = mk("a", "ally", 0);

  const t = mk("t", "enemy", 1);

  it("2014: нічия на користь цілі, перевага атакувальника виграє", () => {
    expect(contest({ attacker: a, target: t, participants: [a, t], rules: on(), rng: () => 0.5 }).success).toBe(false);

    const strong = mk("a", "ally", 0, 0, 5);

    expect(contest({ attacker: strong, target: t, participants: [strong, t], rules: on(), rng: () => 0.5 }).success).toBe(true);
  });

  it("2024: рятівний кидок цілі проти СК", () => {
    const strong = mk("a", "ally", 0, 0, 5);

    const weak = mk("t", "enemy", 1, 0, -1);

    // СК = 8 + 5 + 2 = 15; d20 при rng 0.5 = 11, мод. −1 → 10
    expect(contest({ attacker: strong, target: weak, participants: [strong, weak], rules: on("2024"), rng: () => 0.5 }).success).toBe(true);
    expect(contest({ attacker: a, target: t, participants: [a, t], rules: on("2024"), rng: () => 0.5 }).success).toBe(false);
  });
});

describe("СК захоплення з базою кампанії", () => {
  const strong = mk("a", "ally", 0, 0, 5);

  const weak = mk("t", "enemy", 1, 0, -1);

  const dcOf = (saveDcBase: number) => {
    const rules = { ...on("2024"), formulas: { ...DEFAULT_RULES.formulas, saveDcBase } };

    return contest({ attacker: strong, target: weak, participants: [strong, weak], rules, rng: () => 0.5 }).message;
  };

  it("база 10 піднімає СК на 2, дефолт 8 без змін", () => {
    const prof = strong.abilities.proficiencyBonus;

    expect(dcOf(8)).toContain(`СК ${8 + prof + 5}`);
    expect(dcOf(10)).toContain(`СК ${10 + prof + 5}`);
  });
});

describe("grapple / shove / escape", () => {
  it("grapple суміжного ворога ставить grappled з джерелом", () => {
    const a = mk("a", "ally", 0, 0, 5);

    const t = mk("t", "enemy", 1);

    const out = run([a, t], { action: "grapple", participantId: "a", targetId: "t" });

    const target = get(out.participants, "t");

    expect(hasCondition(target, "grappled")).toBe(true);
    expect(target.battleData.activeEffects[0]).toMatchObject({ abilityKey: "core:grapple:a", source: { participantId: "a" }, permanent: true });
    expect(get(out.participants, "a").actionFlags.hasUsedAction).toBe(true);
  });

  it("grapple несуміжного — відмова; невдача витрачає дію без стану", () => {
    expect(() => run([mk("a", "ally", 0), mk("t", "enemy", 3)], { action: "grapple", participantId: "a", targetId: "t" })).toThrow(expect.objectContaining({ message: "Немає суміжного ворога" }));

    const out = run([mk("a", "ally", 0), mk("t", "enemy", 1)], { action: "grapple", participantId: "a", targetId: "t" });

    expect(hasCondition(get(out.participants, "t"), "grappled")).toBe(false);
    expect(get(out.participants, "a").actionFlags.hasUsedAction).toBe(true);
  });

  it("shove prone валить ціль", () => {
    const out = run([mk("a", "ally", 0, 0, 5), mk("t", "enemy", 1)], { action: "shove", participantId: "a", targetId: "t", mode: "prone" });

    expect(hasCondition(get(out.participants, "t"), "prone")).toBe(true);
  });

  it("shove push відштовхує на клітинку по прямій; зайнято — лише prone", () => {
    const a = mk("a", "ally", 0, 1, 5);

    const free = run([a, mk("t", "enemy", 1, 1)], { action: "shove", participantId: "a", targetId: "t", mode: "push" });

    expect(get(free.participants, "t").battleData.position).toEqual({ x: 2, y: 1 });
    expect(hasCondition(get(free.participants, "t"), "prone")).toBe(false);

    const blocked = run([a, mk("t", "enemy", 1, 1), mk("w", "enemy", 2, 1)], { action: "shove", participantId: "a", targetId: "t", mode: "push" });

    expect(get(blocked.participants, "t").battleData.position).toEqual({ x: 1, y: 1 });
    expect(hasCondition(get(blocked.participants, "t"), "prone")).toBe(true);
    expect(blocked.messages[0]).toContain("лише повалено");
  });

  it("escape знімає grappled від схоплювача (2014 і 2024)", () => {
    const g = mk("g", "enemy", 1);

    const e = mk("e", "ally", 0, 0, 5);

    const ps = grappled(g, e);

    expect(hasCondition(get(run(ps, { action: "escape", participantId: "e" }).participants, "e"), "grappled")).toBe(false);

    const weak = mk("e", "ally", 0, 0, -2);

    weak.abilities.modifiers.dexterity = -2;

    const stuck = grappled(g, weak);

    expect(hasCondition(get(run(stuck, { action: "escape", participantId: "e" }, on("2024")).participants, "e"), "grappled")).toBe(true);
    expect(() => run([g, mk("x", "ally", 0, 3)], { action: "escape", participantId: "x" })).toThrow(expect.objectContaining({ message: "Ви не схоплені" }));
  });

  it("недієздатний схоплювач відпускає цілі", () => {
    const g = mk("g", "enemy", 1);

    const e = mk("e", "ally", 0);

    const ps = grappled(g, e);

    expect(grappledBy(ps, "g")).toHaveLength(1);

    const out = applyCondition5e(ps, "g", { key: "incapacitated", rounds: 2, source: undefined, sourceName: "ДМ", timedKey: "dm:incapacitated@1", round: 1 });

    expect(grappledBy(out.participants, "g")).toHaveLength(0);
    expect(out.messages.join(";")).toContain("відпускає");
    expect(releaseGrapples(ps, "g", "x").messages).toHaveLength(1);
  });
});

describe("pathTo", () => {
  const mover = mk("m", "ally", 0, 0);

  it("довжина збігається з reachable, обходить ворогів, проходить крізь союзників, null для недосяжної", () => {
    const wall = [mk("w1", "enemy", 1, 0), mk("w2", "enemy", 1, 1), mk("w3", "enemy", 1, 2)];

    const ps = [mover, ...wall, mk("ally", "ally", 3, 3)];

    const cost = reachable(map, ps, mover, 8).get("4:3");

    const path = pathTo(map, ps, mover, { x: 4, y: 3 }, 8);

    expect(path).toHaveLength(cost!);
    expect(path!.at(-1)).toEqual({ x: 4, y: 3 });
    expect(path!.some((c) => wall.some((w) => w.battleData.position!.x === c.x && w.battleData.position!.y === c.y))).toBe(false);
    expect(pathTo(map, ps, mover, { x: 9, y: 4 }, 3)).toBeNull();
    expect(pathTo(map, ps, mover, { x: 3, y: 3 }, 8)).toBeNull();
  });
});

describe("тягнення при русі", () => {
  const ctxWith = (ps: BattleParticipant[], enabled = true) => {
    const base = context({ participants: ps });

    return { ...base, meta: { ...base.meta, map, rules: enabled ? on() : DEFAULT_RULES } };
  };

  const g0 = mk("hero", "ally", 2, 2);

  const t0 = mk("gob", "enemy", 3, 2);

  it("схоплена ціль іде за схоплювачем у попередню клітинку, рух коштує вдвічі", () => {
    const out = moveMutation(ctxWith(grappled(g0, t0)), { participantId: "hero", to: { x: 0, y: 2 } });

    expect(get(out.participants, "hero").battleData).toMatchObject({ position: { x: 0, y: 2 }, movementUsed: 4 });
    expect(get(out.participants, "gob").battleData.position).toEqual({ x: 1, y: 1 });
    expect(hasCondition(get(out.participants, "gob"), "grappled")).toBe(true);
  });

  it("бюджет з подвоєною вартістю: швидкість 6 клітинок дозволяє лише 3 клітинки тягнення", () => {
    const far = mk("hero", "ally", 0, 0);

    expect(() => moveMutation(ctxWith(grappled(far, mk("gob", "enemy", 1, 0))), { participantId: "hero", to: { x: 0, y: 3 } })).not.toThrow();
    expect(() => moveMutation(ctxWith(grappled(far, mk("gob", "enemy", 1, 0))), { participantId: "hero", to: { x: 0, y: 4 } })).toThrow(expect.objectContaining({ message: expect.stringContaining("тягнути") }));
  });

  it("клітинка зайнята — схоплення розривається, рух за звичайною вартістю", () => {
    const blocker = mk("blk", "ally", 1, 1);

    const ps = grappled(g0, t0, [g0, t0, blocker]);

    const out = moveMutation(ctxWith(ps), { participantId: "hero", to: { x: 0, y: 2 } });

    expect(hasCondition(get(out.participants, "gob"), "grappled")).toBe(false);
    expect(get(out.participants, "hero").battleData.movementUsed).toBe(2);
    expect(out.events).toHaveLength(1);
  });

  it("несуміжні після руху — схоплення розривається", () => {
    const out = moveMutation({ ...ctxWith(grappled(g0, t0)), userId: "dm", isDM: true }, { participantId: "gob", to: { x: 8, y: 2 } });

    expect(hasCondition(get(out.participants, "gob"), "grappled")).toBe(false);
    expect(out.events).toHaveLength(1);
  });

  it("без actions.enabled рух не чіпає схоплення", () => {
    const out = moveMutation(ctxWith(grappled(g0, t0), false), { participantId: "hero", to: { x: 0, y: 2 } });

    expect(get(out.participants, "hero").battleData.movementUsed).toBe(2);
    expect(get(out.participants, "gob").battleData.position).toEqual({ x: 3, y: 2 });
    expect(out.events).toEqual([]);
  });
});

describe("releaseInvalidGrapples", () => {
  const g = mk("g", "enemy", 1);

  const e = mk("e", "ally", 0);

  it("без захоплень повертає той самий масив", () => {
    const ps = [g, e];

    expect(releaseInvalidGrapples(ps, map).participants).toBe(ps);
  });

  it("живий суміжний схоплювач тримає ціль", () => {
    const ps = grappled(g, e);

    expect(releaseInvalidGrapples(ps, map).participants).toBe(ps);
  });

  it.each([
    ["мертвий", { combatStats: { ...g.combatStats, currentHp: 0, status: "dead" as const } }],
    ["непритомний", { combatStats: { ...g.combatStats, currentHp: 0, status: "unconscious" as const } }],
  ])("%s схоплювач — ціль вільна", (_n, over) => {
    const ps = grappled(g, e).map((p) => (p.basicInfo.id === "g" ? { ...p, ...over } : p));

    const out = releaseInvalidGrapples(ps, map);

    expect(hasCondition(get(out.participants, "e"), "grappled")).toBe(false);
    expect(out.messages).toHaveLength(1);
  });

  it("схоплювача немає в бою — ціль вільна", () => {
    const out = releaseInvalidGrapples(grappled(g, e).filter((p) => p.basicInfo.id !== "g"), map);

    expect(hasCondition(get(out.participants, "e"), "grappled")).toBe(false);
  });

  it("недієздатний схоплювач без applyCondition5e (маркер на ефекті) — ціль вільна", () => {
    const stunned = applyCondition5e(grappled(g, e), "g", { key: "incapacitated", rounds: 2, source: undefined, sourceName: "ДМ", timedKey: "dm:inc", round: 1 }).participants;

    const reGrappled = grappled(get(stunned, "g"), get(stunned, "e"), stunned);

    expect(hasCondition(get(releaseInvalidGrapples(reGrappled, map).participants, "e"), "grappled")).toBe(false);
  });

  it("несуміжні на карті — розрив; без карти — лишається", () => {
    const far = grappled(g, mk("e", "ally", 5));

    expect(hasCondition(get(releaseInvalidGrapples(far, map).participants, "e"), "grappled")).toBe(false);
    expect(releaseInvalidGrapples(far, null).participants).toBe(far);
  });
});

