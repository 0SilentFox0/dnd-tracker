import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { buildSpellPick, initialSpellFlow, rollsComplete, spellFlow, type SpellFlowAction, type SpellFlowState, spellPayload, type SpellPick,spellSaveTargets, spellSlotCostLabel, spellSlotsLeft, spellTargetCandidates, spellTargetSide } from "@/lib/utils/battle/flows";
import { expandSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { BookSpell } from "@/types/spells";

const run = (...a: SpellFlowAction[]) => a.reduce<SpellFlowState>(spellFlow, initialSpellFlow);

const ray: SpellPick = { spellId: "ray", level: 2, targetMode: "single", needsSaves: false, diceSlots: [6, 6] };

const cloud: SpellPick = { spellId: "cloud", level: 1, targetMode: "multi", needsSaves: true, diceSlots: [8] };

const aura: SpellPick = { spellId: "aura", level: 3, targetMode: "none", needsSaves: false, diceSlots: [] };

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

  it("кидки: потрібні всі кубики; рятівні — необов'язкові", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" });

    expect(s.step).toBe("rolls");
    expect(rollsComplete(s)).toBe(false);

    const filled = [{ type: "SET_DAMAGE", index: 0, value: 4 }, { type: "SET_DAMAGE", index: 1, value: 6 }] as SpellFlowAction[];

    const done = filled.reduce(spellFlow, s);

    expect(rollsComplete(done)).toBe(true);
    expect(spellFlow(s, { type: "TO_SUMMARY" }).step).toBe("rolls");
    expect(spellFlow(done, { type: "TO_SUMMARY" }).step).toBe("summary");
    expect(spellPayload(done)).toEqual({ casterId: "me", spellId: "ray", targetIds: ["a"], diceRolls: [4, 6] });
  });

  it("рятівні кидки потрапляють у payload; зняття цілі прибирає її кидок", () => {
    let s = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: cloud }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "CONFIRM_TARGETS" });

    s = ([{ type: "SET_SAVE", id: "a", value: 12 }, { type: "SET_SAVE", id: "b", value: 7 }, { type: "SET_DAMAGE", index: 0, value: 5 }] as SpellFlowAction[]).reduce(spellFlow, s);

    expect(spellPayload(s).saveRolls).toEqual([{ participantId: "a", roll: 12 }, { participantId: "b", roll: 7 }]);

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

  it("самі кубики без цілей: заклинання без цілей з кубиками йде на кидки", () => {
    const self: SpellPick = { ...aura, diceSlots: [6, 6, 6] };

    const s = run({ type: "OPEN", casterId: "me", level: 3 }, { type: "PICK", pick: self }, { type: "TO_TARGETS" });

    expect(s.step).toBe("rolls");
    expect(s.damage).toHaveLength(3);
  });

  it("область: вибір понад maxTargets ігнорується", () => {
    const s = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick: { ...cloud, maxTargets: 2 } }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "TOGGLE_TARGET", id: "c" });

    expect(s.targetIds).toEqual(["a", "b"]);
  });
});

describe("вибір кола книги", () => {
  it("OPEN на порожньому колі переходить на перше коло з закляттями", () => {
    expect(spellFlow(initialSpellFlow, { type: "OPEN", casterId: "me", level: 0, levels: [2, 3] }).level).toBe(2);
    expect(spellFlow(initialSpellFlow, { type: "OPEN", casterId: "me", level: 3, levels: [2, 3] }).level).toBe(3);
  });

  it("SPELLS_LOADED переходить лише поки гравець сам не обрав коло", () => {
    const open = run({ type: "OPEN", casterId: "me", level: 0 });

    expect(spellFlow(open, { type: "SPELLS_LOADED", levels: [1, 4] }).level).toBe(1);

    const pinned = spellFlow(open, { type: "SET_LEVEL", level: 0 });

    expect(spellFlow(pinned, { type: "SPELLS_LOADED", levels: [1, 4] }).level).toBe(0);
  });

  it("SPELLS_LOADED не чіпає закриту книгу та порожній список", () => {
    expect(spellFlow(initialSpellFlow, { type: "SPELLS_LOADED", levels: [2] })).toBe(initialSpellFlow);
    expect(spellFlow(run({ type: "OPEN", casterId: "me", level: 3 }), { type: "SPELLS_LOADED", levels: [] }).level).toBe(3);
  });
});

describe("цілі й слоти закляття", () => {
  const hero = makeParticipant({ id: "h", side: ParticipantSide.ALLY });

  const ally = makeParticipant({ id: "a", side: ParticipantSide.ALLY });

  const foe = makeParticipant({ id: "f", side: ParticipantSide.ENEMY });

  const order = [hero, ally, foe];

  const spell = (targeting: unknown, extra: object = {}) => ({ id: "s", name: "S", level: 1, dice: 2, targeting, ...extra }) as unknown as BookSpell;

  it("сторона цілей за типом націлювання", () => {
    expect(spellTargetSide(spell({ kind: "allyDead" }))).toBe("dead");
    expect(spellTargetSide(spell({ kind: "ally" }))).toBe("ally");
    expect(spellTargetSide(spell({ kind: "area", side: "enemy", maxTargets: 2 }))).toBe("enemy");
    expect(spellTargetSide(spell({ kind: "self" }))).toBeUndefined();
    expect(spellTargetSide(null)).toBeUndefined();
  });

  it("кандидати: союзники або вороги відносно кастера", () => {
    expect(spellTargetCandidates(order, hero, "enemy").map((p) => p.basicInfo.id)).toEqual(["f"]);
    expect(spellTargetCandidates(order, hero, "ally").map((p) => p.basicInfo.id)).toEqual(["h", "a"]);
  });

  it("buildSpellPick: автоціль без вибору, область з maxTargets, рятунок", () => {
    expect(buildSpellPick(order, hero, spell({ kind: "allEnemies" })).targetMode).toBe("none");

    const area = buildSpellPick(order, hero, spell({ kind: "area", side: "enemy", maxTargets: 3 }, { resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } }));

    expect(area).toMatchObject({ targetMode: "multi", maxTargets: 3, needsSaves: true, targetSide: "enemy" });
  });

  it("рятівні кидки: DM за всіх, гравець лише за своїх", () => {
    const s: SpellFlowState = { ...initialSpellFlow, pick: { ...cloud }, targetIds: ["a", "f"] };

    const mine = { ...ally, basicInfo: { ...ally.basicInfo, controlledBy: "u" } };

    expect(spellSaveTargets([mine, foe], s, { isDM: true, userId: "u" })).toHaveLength(2);
    expect(spellSaveTargets([mine, foe], s, { isDM: false, userId: "u" })).toEqual([mine]);
    expect(spellSaveTargets([mine], { ...s, pick: ray }, { isDM: true, userId: "u" })).toEqual([]);
  });

  it("слоти: кантрип і вільний каст безлімітні; герой зі слота кола, юніт з універсального", () => {
    const withSlots = (sourceType: string, slots: Record<string, { max: number; current: number }>) =>
      ({ ...hero, basicInfo: { ...hero.basicInfo, sourceType }, spellcasting: { ...hero.spellcasting, spellSlots: slots } }) as never;

    const heroC = withSlots("character", { "1": { max: 2, current: 0 }, universal: { max: 3, current: 3 } });

    expect(spellSlotsLeft(heroC, 1, false)).toBe(0);
    expect(spellSlotsLeft(heroC, 1, true)).toBe(Infinity);
    expect(spellSlotsLeft(heroC, 0, false)).toBe(Infinity);
    expect(spellSlotsLeft(withSlots("unit", { universal: { max: 3, current: 2 } }), 1, false)).toBe(2);
  });

  it("підпис вартості слота", () => {
    const s = spell({ kind: "enemy" });

    expect(spellSlotCostLabel(s, { free: true, universal: false })).toMatch(/Вільний каст/);
    expect(spellSlotCostLabel(s, { free: false, universal: true })).toMatch(/універсальний/);
    expect(spellSlotCostLabel(s, { free: false, universal: false })).toBe("Витратить слот I кола.");
    expect(spellSlotCostLabel({ ...s, level: 0 }, { free: false, universal: false })).toBeNull();
  });
});
