import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers, findFlags, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";

const unit = { type: "unit" as const, id: "zealot" };

const spellAura = resolved({ id: "unit-allies-aura-resistance-spell", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 20, target: "allAllies" }] }, unit);

const rotAura = resolved({ id: "unit-rot-aura", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: -1, target: "allEnemies" }] }, unit);

const warlord = resolved({ id: "unit-allies-aura-damageBonus", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 15, target: "allAllies" }] }, unit);

const copies = (ability: typeof spellAura, n: number, side = ParticipantSide.ENEMY) =>
  Array.from({ length: n }, (_, i) => makeParticipant({ id: `u${i}`, side, abilities: [ability] }));

describe("аури не стакаються з копій одного юніта", () => {
  it("3 копії аури опору магії дають 20 %, а не 60 %", () => {
    const ps = copies(spellAura, 3);

    expect(findFlags(ps, "u0", "resistance").map((f) => f.percent)).toEqual([20]);
  });

  it("5 зомбі дають −1 до атаки, а не −5", () => {
    const hero = makeParticipant({ id: "h" });

    expect(statWithModifiers([hero, ...copies(rotAura, 5)], "h", "attackBonus", 5)).toBe(4);
  });

  it("damageBonus-аура з 3 копій застосовується раз", () => {
    expect(collectModifiers(copies(warlord, 3), "u1", { damage: { kind: "melee" } }).percent).toBe(15);
  });

  it("сильніша копія перемагає", () => {
    const weak = resolved({ id: "unit-rot-aura", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: -1, target: "allEnemies" }] }, unit);

    const strong = resolved({ id: "unit-rot-aura", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: -2, target: "allEnemies" }] }, { type: "unit", id: "lich" });

    const ps = [makeParticipant({ id: "h" }), makeParticipant({ id: "z", side: ParticipantSide.ENEMY, abilities: [weak] }), makeParticipant({ id: "l", side: ParticipantSide.ENEMY, abilities: [strong] })];

    expect(statWithModifiers(ps, "h", "attackBonus", 5)).toBe(3);
  });

  it("дві різні аури стакаються", () => {
    const other = resolved({ id: "unit-allies-aura-resistance-all", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "all", percent: 10, target: "allAllies" }] }, unit);

    const ps = [...copies(spellAura, 2), makeParticipant({ id: "x", side: ParticipantSide.ENEMY, abilities: [other] })];

    expect(findFlags(ps, "u0", "resistance").map((f) => f.percent).sort()).toEqual([10, 20]);
  });

  it("власна пасивка на себе не зачіпається", () => {
    const selfBuff = resolved({ id: "unit-armor", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 2 }] }, unit);

    const ps = copies(selfBuff, 3, ParticipantSide.ALLY);

    expect(statWithModifiers(ps, "u0", "attackBonus", 5)).toBe(7);
  });

  it("редакторні id (a1) з різних скілів не зливаються", () => {
    const a = resolved({ id: "a1", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1, target: "allAllies" }] }, { id: "s1" });

    const b = resolved({ id: "a1", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1, target: "allAllies" }] }, { id: "s2" });

    const ps = [makeParticipant({ id: "h1", abilities: [a] }), makeParticipant({ id: "h2", abilities: [b] })];

    expect(statWithModifiers(ps, "h1", "attackBonus", 5)).toBe(7);
  });
});
