import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { buildSpellPick, canGoBack, initialSpellFlow, rollsComplete, spellAimTargets, spellFlow, type SpellFlowAction, type SpellFlowState, spellPayload, type SpellPick,spellSaveTargets, spellSlotCostLabel, spellSlotsLeft, spellTargetCandidates, spellTargetInRange, spellTargetSide, withAllTargets, withChainTargets, withLiveAimTargets } from "@/lib/utils/battle/flows";
import { castSpell } from "@/lib/utils/battle/spell/cast";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleMapConfig, GridPoint } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

const run = (...a: SpellFlowAction[]) => a.reduce<SpellFlowState>(spellFlow, initialSpellFlow);

const ray: SpellPick = { spellId: "ray", level: 2, targetMode: "single", needsSaves: false, diceSlots: [6, 6] };

const cloud: SpellPick = { spellId: "cloud", level: 1, targetMode: "multi", needsSaves: true, diceSlots: [8] };

const aura: SpellPick = { spellId: "aura", level: 3, targetMode: "none", needsSaves: false, diceSlots: [] };

describe("spellFlow", () => {
  it("reconciles dice when item cast level or grant changes", () => {
    const start = run({ type: "OPEN", casterId: "me", level: 2 }, { type: "PICK", pick: ray, grantKey: "wand" });

    const up = spellFlow(start, { type: "SET_CAST_LEVEL", castLevel: 3, pick: { ...ray, diceSlots: [6, 6, 6] } });

    const filled = [0, 1, 2].reduce((s, index) => spellFlow(s, { type: "SET_DAMAGE", index, value: 4 }), up);

    expect(filled.damage).toEqual([4, 4, 4]);

    const down = spellFlow(filled, { type: "SET_GRANT", grantKey: "other", pick: { ...ray, diceSlots: [6] } });

    expect(down.damage).toEqual([undefined]);
  });
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

  it("all: без кроку цілей — одразу кидки; цілі — уся сторона наживо, назад веде на сторінку спела", () => {
    const pick: SpellPick = { ...cloud, targetMode: "all" };

    const s = run({ type: "OPEN", casterId: "me", level: 1 }, { type: "PICK", pick }, { type: "TO_TARGETS" });

    expect(s.step).toBe("rolls");
    expect(withAllTargets(s, ["a1", "a2"]).targetIds).toEqual(["a1", "a2"]);
    expect(withAllTargets({ ...s, pick: cloud }, ["a1"]).targetIds).toEqual([]);
    expect(spellFlow(s, { type: "BACK" }).step).toBe("spell");
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

describe("шаблон і дальність", () => {
  const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

  const placed = (id: string, side: ParticipantSide, position?: GridPoint) => {
    const p = makeParticipant({ id, side });

    return { ...p, battleData: { ...p.battleData, ...(position && { position }) } };
  };

  const hero = placed("h", ParticipantSide.ALLY, { x: 0, y: 0 });

  const foe = placed("f", ParticipantSide.ENEMY, { x: 6, y: 0 });

  const order = [hero, foe];

  const fireball = { id: "fb", name: "Вогняна куля", level: 3, dice: 8, targeting: { kind: "template", shape: "circle", size: 20, side: "enemy", maxTargets: 4, range: 150 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } } as unknown as BookSpell;

  const ball: SpellPick = { spellId: "fb", level: 3, targetMode: "template", template: { shape: "circle", size: 20 }, range: 150, needsSaves: true, diceSlots: [6] };

  it("preview preserves exact circle geometry", () => {
    const exact = { ...fireball, targeting: { ...fireball.targeting, exact: true } } as BookSpell;

    const wideMap = { ...map, cols: 20, rows: 20 };

    const corner = placed("corner", ParticipantSide.ENEMY, { x: 8, y: 8 });

    const edge = placed("edge", ParticipantSide.ENEMY, { x: 10, y: 6 });

    const outside = placed("outside", ParticipantSide.ENEMY, { x: 9, y: 9 });

    const pick = buildSpellPick([hero, corner, edge, outside], hero, exact, wideMap);

    expect(pick.template).toMatchObject({ exact: true });
    expect(spellAimTargets({ map: wideMap, participants: [hero, corner, edge, outside], caster: hero }, pick, { x: 6, y: 6 }).map(p => p.basicInfo.id)).toEqual(["corner", "edge"]);
  });

  it("fixed monster cantrip preview keeps its base dice", () => {
    const monster = { ...hero, abilities: { ...hero.abilities, level: 17, damageModel: "5e" as const } };

    expect(buildSpellPick(order, monster, { ...fireball, level: 0, dice: 1, dieSides: 10, fixedDice: true }, map).diceSlots).toEqual([10]);
  });

  it("emanation skips aim and refreshes its live targets without targetCell", () => {
    const pick: SpellPick = { ...ball, template: { shape: "emanation", size: 5 } };

    const s = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick }, { type: "TO_TARGETS" });

    expect(s.step).toBe("rolls");

    const live = withLiveAimTargets(s, ["f"]);

    expect(live.targetIds).toEqual(["f"]);
    expect(spellPayload(live)).not.toHaveProperty("targetCell");
    expect(spellFlow(s, { type: "BACK" }).step).toBe("spell");
  });

  it("buildSpellPick: template на карті з позицією заклинателя; без карти чи позиції — multi", () => {
    expect(buildSpellPick(order, hero, fireball, map)).toMatchObject({ targetMode: "template", template: { shape: "circle", size: 20 }, range: 150 });
    expect(buildSpellPick(order, hero, fireball, null)).toMatchObject({ targetMode: "multi", maxTargets: 4, targetSide: "enemy" });
    expect(buildSpellPick(order, placed("h", ParticipantSide.ALLY), fireball, map).targetMode).toBe("multi");
  });

  it("buildSpellPick: дальність одиночного заклинання з targeting.range", () => {
    const bolt = { id: "b", name: "B", level: 1, dice: 1, targeting: { kind: "enemy", range: 30 } } as unknown as BookSpell;

    expect(buildSpellPick(order, hero, bolt, map)).toMatchObject({ targetMode: "single", range: 30 });
  });

  it("SET_AIM ставить точку й превʼю цілей; підтвердження лише з точкою; payload з targetCell", () => {
    const s = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball }, { type: "TO_TARGETS" });

    expect(s.step).toBe("targets");
    expect(spellFlow(s, { type: "CONFIRM_TARGETS" }).step).toBe("targets");

    const aimed = spellFlow(s, { type: "SET_AIM", aim: { x: 6, y: 1 }, targetIds: ["f"] });

    expect(aimed).toMatchObject({ aim: { x: 6, y: 1 }, targetIds: ["f"] });

    const rolled = [{ type: "CONFIRM_TARGETS" }, { type: "SET_DAMAGE", index: 0, value: 3 }, { type: "TO_SUMMARY" }] as SpellFlowAction[];

    const done = rolled.reduce(spellFlow, aimed);

    expect(done.step).toBe("summary");
    expect(spellPayload(done)).toEqual({ casterId: "h", spellId: "fb", targetIds: ["f"], targetCell: { x: 6, y: 1 }, diceRolls: [3] });
  });

  it("порожній шаблон підтверджується (каст у порожнечу), без точки — ні; SET_AIM поза template-режимом ігнорується", () => {
    const aiming = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball }, { type: "TO_TARGETS" });

    expect(spellFlow(aiming, { type: "CONFIRM_TARGETS" }).step).toBe("targets");

    const s = spellFlow(aiming, { type: "SET_AIM", aim: { x: 1, y: 4 }, targetIds: [] });

    expect(spellFlow(s, { type: "CONFIRM_TARGETS" }).step).toBe("rolls");

    const wall = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: { ...ball, zone: true } }, { type: "TO_TARGETS" }, { type: "SET_AIM", aim: { x: 1, y: 4 }, targetIds: [] });

    expect(spellFlow(wall, { type: "CONFIRM_TARGETS" }).step).toBe("rolls");

    const single = run({ type: "OPEN", casterId: "h", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" });

    expect(spellFlow(single, { type: "SET_AIM", aim: { x: 1, y: 1 }, targetIds: ["f"] })).toBe(single);
  });

  it("buildSpellPick: zone шаблону переходить у pick", () => {
    const wallSpell = { ...fireball, targeting: { kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 6, zone: { rounds: 2 } } } as unknown as BookSpell;

    expect(buildSpellPick(order, hero, wallSpell, map).zone).toBe(true);
    expect(buildSpellPick(order, hero, fireball, map).zone).toBeUndefined();
  });

  it("withLiveAimTargets: цілі шаблону — ті, кого точка зачіпає зараз; рятунки тих, хто вийшов, відкидаються", () => {
    const s = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball }, { type: "TO_TARGETS" }, { type: "SET_AIM", aim: { x: 6, y: 0 }, targetIds: ["f", "g"] }, { type: "SET_SAVE", id: "f", value: 10 }, { type: "SET_SAVE", id: "g", value: 4 });

    expect(withLiveAimTargets(s, ["g", "k"])).toMatchObject({ targetIds: ["g", "k"], saves: { g: 4 } });
    expect(withLiveAimTargets(s, ["f", "g"])).toBe(s);

    const single = run({ type: "OPEN", casterId: "h", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" });

    expect(withLiveAimTargets(single, [])).toBe(single);
  });

  it("«Назад» із кидків вертає до цілей (карта), із цілей — до книги; без цілей — з кидків до книги", () => {
    const rolls = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball }, { type: "TO_TARGETS" }, { type: "SET_AIM", aim: { x: 6, y: 1 }, targetIds: ["f"] }, { type: "CONFIRM_TARGETS" });

    expect(rolls.step).toBe("rolls");
    expect(canGoBack(rolls)).toBe(true);

    const targets = spellFlow(rolls, { type: "BACK" });

    expect(targets.step).toBe("targets");
    expect(spellFlow(targets, { type: "SET_AIM", aim: { x: 2, y: 2 }, targetIds: [] }).aim).toEqual({ x: 2, y: 2 });
    expect(spellFlow(targets, { type: "BACK" }).step).toBe("spell");

    const summary = [{ type: "SET_DAMAGE", index: 0, value: 3 }, { type: "TO_SUMMARY" }].reduce<SpellFlowState>((s, a) => spellFlow(s, a as SpellFlowAction), rolls);

    expect(spellFlow(summary, { type: "BACK" }).step).toBe("rolls");

    const auto = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: { ...aura, diceSlots: [6] } }, { type: "TO_TARGETS" });

    expect(auto.step).toBe("rolls");
    expect(spellFlow(auto, { type: "BACK" }).step).toBe("spell");
  });

  describe("PICK_TARGET (клік по токену на карті)", () => {
    const start = (pick: SpellPick) => run({ type: "OPEN", casterId: "h", level: 2 }, { type: "PICK", pick }, { type: "TO_TARGETS" });

    it("одиночне: клік обирає ціль і одразу веде до кидків", () => {
      const s = spellFlow(start(ray), { type: "PICK_TARGET", id: "f" });

      expect(s).toMatchObject({ step: "rolls", targetIds: ["f"] });
    });

    it("одиночне без кидків — одразу підсумок", () => {
      const s = spellFlow(start({ ...ray, diceSlots: [] }), { type: "PICK_TARGET", id: "f" });

      expect(s.step).toBe("summary");
    });

    it("ланцюг: клік лише обирає першу ціль, підтвердження окреме", () => {
      const s = spellFlow(start({ ...ray, chain: { side: "enemy", maxTargets: 3 } }), { type: "PICK_TARGET", id: "f" });

      expect(s).toMatchObject({ step: "targets", targetIds: ["f"] });
      expect(spellFlow(s, { type: "CONFIRM_TARGETS" }).step).toBe("rolls");
    });

    it("кілька цілей: перемикання з ліміту maxTargets, підтвердження окреме", () => {
      const capped = { ...cloud, maxTargets: 2 };

      const s = ["a", "b", "c"].reduce((acc, id) => spellFlow(acc, { type: "PICK_TARGET", id }), start(capped));

      expect(s).toMatchObject({ step: "targets", targetIds: ["a", "b"] });
      expect(spellFlow(s, { type: "PICK_TARGET", id: "a" }).targetIds).toEqual(["b"]);
    });

    it("поза кроком цілей клік по токену не підтверджує", () => {
      const rolls = spellFlow(start(ray), { type: "PICK_TARGET", id: "f" });

      expect(spellFlow(rolls, { type: "PICK_TARGET", id: "g" })).toBe(rolls);
    });
  });

  it("SET_AIM і CONFIRM_TARGETS діють лише на кроці цілей: застарілий onAim на кидках нічого не змінює", () => {
    const rolls = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball }, { type: "TO_TARGETS" }, { type: "SET_AIM", aim: { x: 6, y: 1 }, targetIds: ["f"] }, { type: "CONFIRM_TARGETS" }, { type: "SET_DAMAGE", index: 0, value: 3 });

    expect(spellFlow(rolls, { type: "SET_AIM", aim: { x: 2, y: 2 }, targetIds: [] })).toBe(rolls);
    expect(spellFlow(rolls, { type: "CONFIRM_TARGETS" })).toBe(rolls);

    const spell = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball });

    expect(spellFlow(spell, { type: "SET_AIM", aim: { x: 6, y: 1 }, targetIds: ["f"] })).toBe(spell);
  });

  it("SET_AIM прибирає рятунки тих, хто випав із шаблону", () => {
    const s = run({ type: "OPEN", casterId: "h", level: 3 }, { type: "PICK", pick: ball }, { type: "TO_TARGETS" }, { type: "SET_AIM", aim: { x: 6, y: 0 }, targetIds: ["f", "g"] }, { type: "SET_SAVE", id: "f", value: 10 }, { type: "SET_SAVE", id: "g", value: 4 });

    expect(spellFlow(s, { type: "SET_AIM", aim: { x: 7, y: 0 }, targetIds: ["f"] }).saves).toEqual({ f: 10 });
  });

  describe("розширене вмінням одиночне заклинання", () => {
    const widened = (mode: "area" | "all") => {
      const flag: Effect = { kind: "flag", flag: "spellTargeting", mode, ...(mode === "area" && { maxTargets: 1 }) };

      const p = makeParticipant({ id: "h", side: ParticipantSide.ALLY, abilities: [resolved({ trigger: { event: "passive" }, effects: [flag] })] });

      return { ...p, battleData: { ...p.battleData, position: { x: 0, y: 0 } } };
    };

    const bolt = { id: "b", name: "B", level: 1, dice: 1, targeting: { kind: "enemy", range: 30 } } as unknown as BookSpell;

    const near = placed("f2", ParticipantSide.ENEMY, { x: 5, y: 0 });

    const friend = placed("a", ParticipantSide.ALLY, { x: 6, y: 1 });

    it("на карті area → коло 10 футів з лімітом; all → без наведення, уся сторона", () => {
      const area = widened("area");

      expect(buildSpellPick([area, foe], area, bolt, map)).toMatchObject({ targetMode: "template", template: { shape: "circle", size: 10 }, targetSide: "enemy", range: 30, skillRadius: { side: "enemy", maxTargets: 1 } });

      const all = widened("all");

      const pick = buildSpellPick([all, foe], all, bolt, map);

      expect(pick).toMatchObject({ targetMode: "all", targetSide: "enemy" });
      expect(pick.template).toBeUndefined();
      expect(pick.skillRadius).toBeUndefined();
    });

    it("без карти чи позиції — список, як раніше", () => {
      const area = widened("area");

      expect(buildSpellPick([area, foe], area, bolt, null)).toMatchObject({ targetMode: "multi", maxTargets: 1 });
      expect(buildSpellPick([area, foe], area, bolt, null).skillRadius).toBeUndefined();

      const all = widened("all");

      const unplaced = { ...all, battleData: { ...all.battleData, position: undefined } };

      expect(buildSpellPick([unplaced, foe], unplaced, bolt, map).targetMode).toBe("all");
    });

    it("spellAimTargets: радіус бере лише сторону заклинання, найближчих до точки, до ліміту; шаблон — усіх", () => {
      const area = widened("area");

      const invisible = { ...friend, battleData: { ...friend.battleData, activeEffects: [{ id: "inv", name: "Невидимий", type: "condition" as const, duration: 3, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "invisible", value: 1 }] }] } };

      const participants = [area, foe, near, invisible];

      const pick = buildSpellPick(participants, area, bolt, map);

      expect(spellAimTargets({ map, participants, caster: area }, pick, { x: 6, y: 0 }).map((p) => p.basicInfo.id)).toEqual(["f"]);
      expect(spellAimTargets({ map, participants, caster: area }, ball, { x: 6, y: 0 }).map((p) => p.basicInfo.id)).toEqual(["f", "f2", "a"]);
      expect(spellAimTargets({ map, participants, caster: area }, ray, { x: 6, y: 0 })).toEqual([]);
    });

    it("reducer: радіус проходить шлях шаблону — точка, превʼю, targetCell у payload", () => {
      const area = widened("area");

      const pick = buildSpellPick([area, foe], area, bolt, map);

      const aimed = run({ type: "OPEN", casterId: "h", level: 1 }, { type: "PICK", pick }, { type: "TO_TARGETS" }, { type: "SET_AIM", aim: { x: 6, y: 0 }, targetIds: ["f"] }, { type: "CONFIRM_TARGETS" });

      expect(aimed.step).toBe("rolls");
      expect(spellPayload(aimed)).toMatchObject({ targetIds: ["f"], targetCell: { x: 6, y: 0 } });
    });
  });

  describe("ланцюг", () => {
    const chainSpell = { id: "cl", name: "Ланцюгова блискавка", level: 4, dice: 2, targeting: { kind: "area", side: "enemy", maxTargets: 4, range: 60, chain: true } } as unknown as BookSpell;

    it("buildSpellPick: на карті — одна перша ціль зі списку і ланцюг; без карти — ручний вибір до maxTargets", () => {
      const onMapPick = buildSpellPick(order, hero, chainSpell, map);

      expect(onMapPick).toMatchObject({ targetMode: "single", targetSide: "enemy", range: 60, chain: { side: "enemy", maxTargets: 4 } });
      expect(onMapPick.maxTargets).toBeUndefined();

      const listPick = buildSpellPick(order, hero, chainSpell, null);

      expect(listPick).toMatchObject({ targetMode: "multi", maxTargets: 4 });
      expect(listPick.chain).toBeUndefined();
    });

    it("withChainTargets: цілі — ланцюг від першої; payload несе лише першу", () => {
      const pick = buildSpellPick(order, hero, chainSpell, map);

      const s = run({ type: "OPEN", casterId: "h", level: 4 }, { type: "PICK", pick }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "f" }, { type: "SET_SAVE", id: "x", value: 3 });

      const chained = withChainTargets(s, ["f", "g", "k"]);

      expect(chained.targetIds).toEqual(["f", "g", "k"]);
      expect(chained.saves).toEqual({});
      expect(withChainTargets(chained, ["f", "g", "k"])).toBe(chained);
      expect(spellPayload(chained).targetIds).toEqual(["f"]);

      const plain = run({ type: "OPEN", casterId: "h", level: 2 }, { type: "PICK", pick: ray }, { type: "TO_TARGETS" }, { type: "TOGGLE_TARGET", id: "a" });

      expect(withChainTargets(plain, ["a", "b"])).toBe(plain);
    });
  });

  it("spellTargetInRange: без карти, дальності чи позиції — у дальності", () => {
    expect(spellTargetInRange(map, hero, foe, 30)).toBe(true);
    expect(spellTargetInRange(map, hero, foe, 25)).toBe(false);
    expect(spellTargetInRange(null, hero, foe, 5)).toBe(true);
    expect(spellTargetInRange(map, hero, foe, undefined)).toBe(true);
    expect(spellTargetInRange(map, hero, placed("x", ParticipantSide.ENEMY), 5)).toBe(true);
  });
});

describe("SET_SLOT", () => {
  it("prunes save and attack rolls of targets that no longer fit", () => {
    const wide: SpellPick = { spellId: "x", level: 1, targetMode: "multi", needsSaves: true, needsAttackRolls: true, diceSlots: [8], maxTargets: 3 };

    const s = run(
      { type: "OPEN", casterId: "me", level: 1 },
      { type: "PICK", pick: wide },
      { type: "TO_TARGETS" },
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "TOGGLE_TARGET", id: "b" },
      { type: "TOGGLE_TARGET", id: "c" },
      { type: "SET_SAVE", id: "a", value: 5 },
      { type: "SET_SAVE", id: "c", value: 7 },
      { type: "SET_ATTACK", id: "a", value: 11 },
      { type: "SET_ATTACK", id: "c", value: 13 },
      { type: "SET_SLOT", slotKey: "1", pick: { ...wide, maxTargets: 1 } },
    );

    expect(s.targetIds).toEqual(["a"]);
    expect(s.saves).toEqual({ a: 5 });
    expect(s.attacks).toEqual({ a: 11 });
  });
});

it("AoE preview і server cast вражають невидимого учасника в геометрії шаблону", () => {
  const map: BattleMapConfig = { cols: 20, rows: 20, background: null, opacity: 0.3 };

  const base = makeParticipant({ id: "caster" });

  const caster = { ...base, spellcasting: { ...base.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } }, battleData: { ...base.battleData, position: { x: 1, y: 1 } } };

  const enemy = makeParticipant({ id: "invisible", side: ParticipantSide.ENEMY });

  const invisible = { ...enemy, battleData: { ...enemy.battleData, position: { x: 5, y: 5 }, activeEffects: [makeEffect("invisible", { effects: [{ type: "invisible", value: 1 }] })] } };

  const participants = [caster, invisible];

  const spell: CastableSpell = {
    id: "aoe", name: "Вогонь", groupId: null, level: 1,
    definition: {
      dice: 1, cost: "action", targeting: { kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 10, range: 60 },
      resolution: { kind: "auto" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [],
    },
  };

  const pick = buildSpellPick(participants, caster, { id: spell.id, name: spell.name, level: spell.level, ...spell.definition } as BookSpell, map);

  const aim = { x: 5, y: 5 };

  const preview = spellAimTargets({ map, participants, caster }, pick, aim).map((p) => p.basicInfo.id);

  const resolution = resolveSpellTargets(participants, caster, spell, spell.definition.targeting, [], { map, targetCell: aim });

  expect(preview).toEqual(["invisible"]);
  expect(resolution).toMatchObject({ ok: true, targetIds: preview });

  if (!resolution.ok) throw new Error(resolution.error);

  const result = castSpell({ caster, spell, targetIds: resolution.targetIds, allParticipants: participants, currentRound: 1, battleId: "b", diceRolls: [4], map, rng: () => 0.5 });

  expect(result.success).toBe(true);
  expect(result.allParticipantsUpdated.find((p) => p.basicInfo.id === "invisible")?.combatStats.currentHp).toBe(16);
  expect(invisible.combatStats.currentHp).toBe(20);
});
