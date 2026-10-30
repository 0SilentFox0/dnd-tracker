import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { exhaustionLevel, restoreExhaustionHp, syncExhaustion } from "@/lib/utils/battle/conditions";
import { movementBudget } from "@/lib/utils/battle/grid/path";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import { effectTitle } from "@/lib/utils/battle/view/effect-summary";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const immune = (flag: Effect) => resolved({ trigger: { event: "passive" }, effects: [flag] }, { id: "imm" });

function apply(effect: Effect, opts: { target?: BattleParticipant; ps?: BattleParticipant[]; variant?: "2014" | "2024" } = {}) {
  const target = opts.target ?? makeParticipant({ id: "t", side: ParticipantSide.ENEMY });

  const ps = opts.ps ?? [makeParticipant({ id: "o" }), target];

  const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] });

  const rules = { ...DEFAULT_RULES, conditions: { ...DEFAULT_RULES.conditions, exhaustion: opts.variant ?? "2014" } };

  return applyEffect({
    participants: ps,
    ability,
    effectIndex: 0,
    ownerId: "o",
    effect,
    targetIds: ["t"],
    event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 5 },
    ctx: { round: 1, rng: seq(0.5), rules },
  });
}

const cond = (condition: string, extra: Record<string, unknown> = {}) => ({ kind: "applyCondition", condition, duration: { rounds: 2 }, target: "eventTarget", ...extra }) as Effect;

const target = (r: ReturnType<typeof apply>): BattleParticipant => r.participants.filter((p) => p.basicInfo.id === "t")[0];

describe("applyCondition 5e", () => {
  it("stunned adds one effect with markers and flags, spends the reaction", () => {
    const t = target(apply(cond("stunned")));

    expect(t.battleData.activeEffects).toHaveLength(1);

    const e = t.battleData.activeEffects[0];

    expect(e.type).toBe("condition");
    expect(e.name).toBe("stunned");
    expect(textOf(effectTitle(e))).toBe("Приголомшений");
    expect(e.effects.map((m) => m.type)).toEqual(expect.arrayContaining(["stunned", "incapacitated", "no_reaction", "immobilized"]));
    expect(e.abilityEffects).toEqual(expect.arrayContaining([expect.objectContaining({ flag: "autoFailSave" })]));
    expect(t.actionFlags.hasUsedReaction).toBe(true);
  });

  it("legacy skip_action is unchanged", () => {
    const e = target(apply(cond("skip_action", { percent: 40 }))).battleData.activeEffects[0];

    expect(e.effects).toEqual([{ type: "skip_action", value: 40 }]);
    expect(e.abilityEffects).toBeUndefined();
  });

  it("conditionImmunity blocks listed 5e conditions only", () => {
    const some = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "conditionImmunity", conditions: ["paralyzed"] })] });

    const all = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "conditionImmunity", conditions: "all" })] });

    expect(target(apply(cond("paralyzed"), { target: some })).battleData.activeEffects).toHaveLength(0);
    expect(target(apply(cond("stunned"), { target: some })).battleData.activeEffects).toHaveLength(1);
    expect(target(apply(cond("stunned"), { target: all })).battleData.activeEffects).toHaveLength(0);
  });

  it("exhaustion stacks levels; 2014 level 4 halves max HP, level 6 kills", () => {
    const first = apply(cond("exhaustion", { levels: 2 }));

    expect(exhaustionLevel(target(first))).toBe(2);

    const second = apply(cond("exhaustion", { levels: 2 }), { target: target(first), ps: first.participants });

    const t = target(second);

    expect(exhaustionLevel(t)).toBe(4);
    expect(t.combatStats.maxHp).toBe(10);
    expect(t.combatStats.currentHp).toBe(10);
    expect(t.battleData.activeEffects.find((e) => e.exhaustionHpHalved)?.exhaustionHpHalved).toBe(10);

    const dead = apply(cond("exhaustion", { levels: 2 }), { target: t, ps: second.participants });

    expect(target(dead).combatStats.status).toBe(CombatStatus.DEAD);
    expect(dead.messages.map((m) => textOf(m)).join(" ")).toContain("помирає від виснаження");
  });

  it("2024 exhaustion does not halve max HP", () => {
    const r = apply(cond("exhaustion", { levels: 4 }), { variant: "2024" });

    expect(target(r).combatStats.maxHp).toBe(20);
  });

  it("saveEnds records the owner's spell save DC", () => {
    const owner = makeParticipant({ id: "o" });

    const e = target(apply(cond("stunned", { saveEnds: { ability: "wisdom" } }))).battleData.activeEffects[0];

    expect(e.saveEnds).toEqual({ ability: "wisdom", dc: spellSaveDc(owner, undefined, 8) });
  });

  it("two different abilities applying prone give two effects", () => {
    const first = apply(cond("prone"));

    const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [] }, { id: "other" });

    const second = applyEffect({
      participants: first.participants,
      ability,
      effectIndex: 0,
      ownerId: "o",
      effect: cond("prone"),
      targetIds: ["t"],
      event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 5 },
      ctx: { round: 1, rng: seq(0.5) },
    });

    expect(target(second).battleData.activeEffects).toHaveLength(2);
  });

  it("the same ability from two owners keeps one effect per owner (own source and save DC)", () => {
    const effect = cond("prone");

    const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] });

    const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "o2" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY })];

    const run = (participants: BattleParticipant[], ownerId: string) =>
      applyEffect({ participants, ability, effectIndex: 0, ownerId, effect, targetIds: ["t"], event: { type: "hit", actorId: ownerId, targetId: "t", attackKind: "melee", damage: 5 }, ctx: { round: 1, rng: seq(0.5) } });

    const both = run(run(ps, "o").participants, "o2");

    const refreshed = run(both.participants, "o");

    expect(target(both).battleData.activeEffects).toHaveLength(2);
    expect(target(refreshed).battleData.activeEffects).toHaveLength(2);
  });

  it("cleanse of conditions restores max HP taken by exhaustion", () => {
    const r = apply(cond("exhaustion", { levels: 4 }));

    const cleansed = applyEffect({
      participants: r.participants,
      ability: resolved({ trigger: { event: "hit", role: "attacker" }, effects: [] }),
      effectIndex: 0,
      ownerId: "o",
      effect: { kind: "cleanse", includeConditions: true, target: "eventTarget" },
      targetIds: ["t"],
      event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 5 },
      ctx: { round: 1, rng: seq(0.5) },
    });

    expect(target(cleansed).combatStats.maxHp).toBe(20);
  });
});

describe("exhaustion speed", () => {
  it("2014 level 2 halves the movement budget", () => {
    const base = makeParticipant({ id: "t", side: ParticipantSide.ENEMY });

    const r = apply(cond("exhaustion", { levels: 2 }), { target: base });

    expect(movementBudget(target(r))).toBeLessThan(movementBudget(base));
  });
});

describe("exhaustion from total level", () => {
  const flagsOf = (p: BattleParticipant) => p.battleData.activeEffects.flatMap((e) => e.abilityEffects ?? []);

  const twoStacks = (variant: "2014" | "2024") => {
    const first = apply(cond("exhaustion", { levels: 2 }), { variant });

    return apply(cond("exhaustion", { levels: 2 }), { target: target(first), ps: first.participants, variant });
  };

  const cleanseOne = (r: ReturnType<typeof apply>) => {
    const t = target(r);

    const removed = t.battleData.activeEffects[1];

    const ps = r.participants.map((p) => (p.basicInfo.id === "t" ? { ...p, battleData: { ...p.battleData, activeEffects: [t.battleData.activeEffects[0]] } } : p));

    return syncExhaustion(restoreExhaustionHp(target({ ...r, participants: ps }), [removed]));
  };

  it("2014: level 4 gives speed -50% once, disadvantage, halved max HP; removing a stack recomputes", () => {
    const t = target(twoStacks("2014"));

    expect(flagsOf(t).filter((f) => f.kind === "modifyStat" && f.stat === "speed")).toEqual([expect.objectContaining({ percent: -50 })]);
    expect(flagsOf(t).map((f) => ("flag" in f ? f.flag : f.kind))).toEqual(expect.arrayContaining(["disadvantage", "saveDisadvantage"]));
    expect(t.combatStats.maxHp).toBe(10);

    const back = cleanseOne(twoStacks("2014"));

    expect(exhaustionLevel(back)).toBe(2);
    expect(flagsOf(back)).toEqual([expect.objectContaining({ stat: "speed", percent: -50 })]);
    expect(back.combatStats.maxHp).toBe(20);
  });

  it("2024: flat penalties appear once from total level", () => {
    const t = target(twoStacks("2024"));

    expect(flagsOf(t).filter((f) => f.kind === "modifyStat" && f.stat === "attackBonus")).toEqual([expect.objectContaining({ flat: -8 })]);
    expect(flagsOf(t).filter((f) => f.kind === "modifyStat" && f.stat === "speed")).toEqual([expect.objectContaining({ flat: -20 })]);
    expect(flagsOf(cleanseOne(twoStacks("2024"))).filter((f) => f.kind === "modifyStat" && f.stat === "savingThrow")).toEqual([expect.objectContaining({ flat: -4 })]);
  });
});
