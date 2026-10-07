import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { initialSpellFlow, rollsComplete, spellFlow, type SpellFlowAction, type SpellFlowState, spellPayload, type SpellPick } from "@/lib/utils/battle/flows";
import { expandSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";

const run = (...a: SpellFlowAction[]) => a.reduce<SpellFlowState>(spellFlow, initialSpellFlow);

const ray: SpellPick = { spellId: "ray", level: 2, targetMode: "single", needsHit: true, needsSaves: false, diceSlots: [6, 6] };

const cloud: SpellPick = { spellId: "cloud", level: 1, targetMode: "multi", needsHit: false, needsSaves: true, diceSlots: [8] };

const aura: SpellPick = { spellId: "aura", level: 3, targetMode: "none", needsHit: false, needsSaves: false, diceSlots: [] };

describe("spellFlow", () => {
  it("відкривається на сторінці кола; вибір спела → сторінка спела; TO_TARGETS → цілі", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray });

    expect(s).toMatchObject({ step: "spell", level: 2 });
    expect(spellFlow(s, { type: "TO_TARGETS" }).step).toBe("targets");
  });

  it("без цілей (aura) — одразу кидки, а без кубиків — підсумок", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 3 }, { type: "PICK", pick: aura }, { type: "TO_TARGETS" });

    expect(s.step).toBe("summary");
  });

  it("одна ціль — заміна, кілька — перемикання; підтвердження без цілі не проходить", () => {
    const one = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" });

    expect(one.targetIds).toEqual(["b"]);

    const many = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" });

    expect(many.targetIds).toEqual(["a", "b"]);
    expect(run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "CONFIRM_TARGETS" }).step).toBe("targets");
  });

  it("кидки: потрібні влучання й усі кубики; рятівні — необов'язкові", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" });

    expect(s.step).toBe("rolls");
    expect(rollsComplete(s)).toBe(false);

    const filled = [{ type: "SET_HIT", value: 15 }, { type: "SET_DAMAGE", index: 0, value: 4 }, { type: "SET_DAMAGE", index: 1, value: 6 }] as SpellFlowAction[];

    const done = filled.reduce(spellFlow, s);

    expect(rollsComplete(done)).toBe(true);
    expect(spellFlow(s, { type: "TO_SUMMARY" }).step).toBe("rolls");
    expect(spellFlow(done, { type: "TO_SUMMARY" }).step).toBe("summary");
    expect(spellPayload(done, "character")).toEqual({ casterId: "me", casterType: "character", spellId: "ray", targetIds: ["a"], damageRolls: [4, 6], hitRoll: 15 });
  });

  it("рятівні кидки потрапляють у payload; зняття цілі прибирає її кидок", () => {
    let s = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "CONFIRM_TARGETS" });

    s = ([{ type: "SET_SAVE", id: "a", value: 12 }, { type: "SET_SAVE", id: "b", value: 7 }, { type: "SET_DAMAGE", index: 0, value: 5 }] as SpellFlowAction[]).reduce(spellFlow, s);

    expect(spellPayload(s, "unit").savingThrows).toEqual([{ participantId: "a", roll: 12 }, { participantId: "b", roll: 7 }]);

    const back = spellFlow(spellFlow(s, { type: "BACK" }), { type: "TOGGLE_TARGET", id: "b" });

    expect(back.saves).toEqual({ a: 12 });
  });

  it("FAIL — на підсумок із помилкою; SET_LEVEL гортає книгу й скидає вибір", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 3 }, { type: "PICK", pick: aura }, { type: "TO_TARGETS" }, { type: "SUBMIT" }, { type: "FAIL", error: "x" });

    expect(s).toMatchObject({ step: "summary", error: "x" });

    const turned = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "SET_LEVEL", level: 4 });

    expect(turned).toMatchObject({ step: "book", level: 4 });
    expect(turned.pick).toBeUndefined();
  });

  it("all: перша ціль обирає сторону, мертві не потрапляють у цілі", () => {
    const caster = makeParticipant({ id: "me", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "all" }] })] });

    const dead = { ...makeParticipant({ id: "a3" }), combatStats: { ...makeParticipant({ id: "a3" }).combatStats, status: "dead" } } as ReturnType<typeof makeParticipant>;

    const ps = [caster, makeParticipant({ id: "a1" }), makeParticipant({ id: "a2" }), dead, makeParticipant({ id: "e1", side: ParticipantSide.ENEMY })];

    const expanded = expandSpellTargets(ps, "me", { id: "bless", groupId: null, level: 1 }, ["a1"]);

    const pick: SpellPick = { ...cloud, targetMode: "all" };

    const s = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a1", expanded });

    expect([...s.targetIds].sort()).toEqual(["a1", "a2", "me"]);
    expect(spellFlow(s, { type: "CONFIRM_TARGETS" }).step).toBe("rolls");
  });
});
