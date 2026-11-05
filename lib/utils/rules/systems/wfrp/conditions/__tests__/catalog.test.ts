import { describe, expect, it } from "vitest";

import { applyWfrpCondition, reduceWfrpConditionIn } from "../apply";
import { BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL, WFRP_CONDITION_MAX_LEVEL, WFRP_CONDITION_REGISTRY as R } from "../catalog";
import { conditionLevel, wfrpConditions } from "../levels";

import { CombatStatus, EffectMarker } from "@/lib/constants/battle";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { conditionEffects, hasAnyCondition5e, hasCondition } from "@/lib/utils/battle/conditions/query";
import type { BattleParticipant } from "@/types/battle";

const src = textRef("battleWfrp.log.removed", { target: "x", condition: "y" });

const add = (ps: BattleParticipant[], key: string, levels?: number) => applyWfrpCondition(ps, "a", { key, levels, round: 1, sourceName: src }).participants;

const me = (ps: BattleParticipant[]) => ps[0];

const effectsOf = (p: BattleParticipant, key: string) => p.battleData.activeEffects.filter((e) => e.abilityKey === `wfrp:cond:${key}`);

describe("catalog values", () => {
  it("pins numbers", () => {
    expect(WFRP_CONDITION_MAX_LEVEL).toBe(10);
    expect(BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL).toBe(0.1);
    expect(R.fatigued.testMod?.self?.(2)).toBe(-20);
    expect(R.prone.testMod?.against?.melee).toBe(20);
    expect(R.blinded.testMod?.selfAttack).toBe(-20);
    expect(R.surprised.rounds).toBe(1);
  });

  it("pins end tests", () => {
    expect(R.entangled.endTest).toEqual({ characteristic: "s" });
    expect(R.ablaze.endTest).toEqual({ skill: "athletics" });
    for (const k of ["bleeding", "poisoned", "stunned"] as const) expect(R[k].endTest).toEqual({ skill: "endurance" });

    expect(R.broken.endTest).toEqual({ skill: "cool" });

    for (const k of ["fatigued", "surprised", "blinded", "deafened", "unconscious"] as const) expect(R[k].endTest).toBeNull();

    expect(R.prone.endTest).toBe("stand");
  });

  it("pins markers", () => {
    expect(R.stunned.markers).toContain(EffectMarker.SKIP_ACTION);
    expect(R.surprised.markers).toContain(EffectMarker.SKIP_ACTION);
    expect(R.entangled.markers).toContain(EffectMarker.IMMOBILIZED);
    expect(R.prone.markers).toContain(EffectMarker.IMMOBILIZED);
    expect(R.unconscious.markers).toEqual([EffectMarker.SKIP_ACTION, EffectMarker.IMMOBILIZED]);
  });
});

describe("stacking", () => {
  it("sums levels from two sources", () => {
    const p = me(add(add([makeParticipant({ id: "a" })], "bleeding", 1), "bleeding", 2));

    expect(conditionLevel(p, "bleeding")).toBe(3);

    const effects = effectsOf(p, "bleeding");

    expect(effects).toHaveLength(2);
    expect(effects.every((e) => e.type === "condition" && e.permanent === true)).toBe(true);
  });

  it("clamps at max and stops adding effects", () => {
    const p = me(add(add([makeParticipant({ id: "a" })], "bleeding", 6), "bleeding", 6));

    expect(conditionLevel(p, "bleeding")).toBe(10);

    const more = me(add([p], "bleeding", 1));

    expect(effectsOf(more, "bleeding")).toHaveLength(2);
  });

  it("does not duplicate a flat condition", () => {
    const p = me(add(add([makeParticipant({ id: "a" })], "prone"), "prone"));

    expect(effectsOf(p, "prone")).toHaveLength(1);
    expect(conditionLevel(p, "prone")).toBe(1);
  });
});

describe("reduce", () => {
  it("lowers the newest effect first", () => {
    let ps = add(add([makeParticipant({ id: "a" })], "bleeding", 1), "bleeding", 2);

    const levels = () => effectsOf(me(ps), "bleeding").map((e) => e.effects[0].value);

    expect(levels()).toEqual([1, 2]);

    ps = reduceWfrpConditionIn(ps, "a", "bleeding", 1).participants;
    expect(levels()).toEqual([1, 1]);

    ps = reduceWfrpConditionIn(ps, "a", "bleeding", 1).participants;
    expect(levels()).toEqual([1]);

    const last = reduceWfrpConditionIn(ps, "a", "bleeding", 1);

    expect(effectsOf(me(last.participants), "bleeding")).toHaveLength(0);
    expect(last.removed).toBe(true);
  });

  it("all removes every effect of the key", () => {
    const ps = reduceWfrpConditionIn(add(add([makeParticipant({ id: "a" })], "bleeding", 1), "bleeding", 2), "a", "bleeding", "all").participants;

    expect(effectsOf(me(ps), "bleeding")).toHaveLength(0);
  });
});

describe("unconscious", () => {
  it("sets status and restores it only with hp above 0", () => {
    const base = makeParticipant({ id: "a", hp: 5 });

    const down = add([base], "unconscious");

    expect(me(down).combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(me(reduceWfrpConditionIn(down, "a", "unconscious", 1).participants).combatStats.status).toBe(CombatStatus.ACTIVE);

    const zero = add([makeParticipant({ id: "a", hp: 0 })], "unconscious");

    expect(me(reduceWfrpConditionIn(zero, "a", "unconscious", 1).participants).combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
  });

  it("keeps dead status", () => {
    const dead = makeParticipant({ id: "a" });

    const ps = add([{ ...dead, combatStats: { ...dead.combatStats, status: CombatStatus.DEAD } }], "unconscious");

    expect(me(ps).combatStats.status).toBe(CombatStatus.DEAD);
  });
});

describe("isolation from 5e and display", () => {
  it("5e queries do not see wfrp markers", () => {
    const p = me(add([makeParticipant({ id: "a" })], "prone"));

    expect(hasCondition(p, "prone")).toBe(false);
    expect(conditionEffects(p)).toHaveLength(0);
    expect(hasAnyCondition5e(p)).toBe(false);
  });

  it("effect carries label, description and skip_action 100", () => {
    const p = me(add([makeParticipant({ id: "a" })], "bleeding"));

    const e = effectsOf(p, "bleeding")[0];

    expect(e.label).toEqual(dynamicTextRef("battleWfrp.conditions.bleeding.label"));
    expect(e.description).toEqual(dynamicTextRef("battleWfrp.conditions.bleeding.description"));
    expect(effectsOf(me(add([makeParticipant({ id: "a" })], "stunned")), "stunned")[0].effects).toContainEqual({ type: "skip_action", value: 100 });
  });

  it("lists levels in catalog order", () => {
    const p = me(add(add([makeParticipant({ id: "a" })], "prone"), "bleeding", 3));

    expect(wfrpConditions(p)).toEqual([
      { key: "bleeding", level: 3, effectKey: "wfrp:cond:bleeding" },
      { key: "prone", level: 1, effectKey: "wfrp:cond:prone" },
    ]);
  });

  it("ignores unknown targets and keys", () => {
    const ps = [makeParticipant({ id: "a" })];

    const r = applyWfrpCondition(ps, "missing", { key: "bleeding", round: 1, sourceName: src });

    expect(r.participants).toBe(ps);
    expect(r.messages).toEqual([]);
    expect(reduceWfrpConditionIn(ps, "a", "frenzy", 1).removed).toBe(false);
  });
});
