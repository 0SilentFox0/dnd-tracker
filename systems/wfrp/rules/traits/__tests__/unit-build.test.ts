import { describe, expect, it } from "vitest";

import { wfrpAttackFromProfile } from "../../combat/extract-attacks";
import { wfrpParticipantFields } from "../../combat/participant";
import { ATTACK_SLOT } from "../../slots";
import { wfrpUnitBuild } from "../unit-build";
import { trait } from "./fixtures";

const row = { id: "u1", characteristics: { base: { s: 40, t: 40 } } };

const armour = (n: number | Partial<Record<"head" | "body" | "arm" | "leg", number>>) => ({ kind: "wfrpArmour", head: 0, body: 0, arm: 0, leg: 0, ...(typeof n === "number" ? { head: n, body: n, arm: n, leg: n } : n) });

describe("wfrpUnitBuild", () => {
  it("returns exactly the base fields when there are no traits", () => {
    const { fields, attacks } = wfrpUnitBuild(row, [trait([{ kind: "note", text: "x" }])]);

    expect(fields).toEqual(wfrpParticipantFields(row));
    expect(fields.wfrp).not.toHaveProperty("size");
    expect(fields.wfrp).not.toHaveProperty("ward");
    expect(attacks).toEqual([]);
  });

  it("takes the best AP per location, capped", () => {
    const { fields } = wfrpUnitBuild(row, [trait([armour(2)], { key: "a" }), trait([armour({ head: 4 })], { key: "b" })]);

    expect(fields.wfrp.ap).toEqual({ head: 4, body: 2, arm: 2, leg: 2 });
    expect(wfrpUnitBuild(row, [trait([armour(12)]), trait([armour(12)])]).fields.wfrp.ap.body).toBe(12);
  });

  it("takes the lowest Ward and the largest Size", () => {
    const { fields } = wfrpUnitBuild(row, [
      trait([{ kind: "wfrpWard", value: 8 }]),
      trait([{ kind: "wfrpWard", value: 6 }]),
      trait([{ kind: "wfrpSize", size: "large" }]),
      trait([{ kind: "wfrpSize", size: "small" }]),
    ]);

    expect(fields.wfrp.ward).toBe(6);
    expect(fields.wfrp.size).toBe("large");
  });

  it("builds melee attacks from Bite", () => {
    const { attacks } = wfrpUnitBuild(row, [trait([{ kind: "wfrpAttack", attack: "bite", damage: 3 }], { name: "Bite +3", key: "k1" })]);

    expect(attacks).toEqual([wfrpAttackFromProfile("u1-trait-k1-0", "Bite +3", { range: "melee", cells: 1, damageFlat: 3, addSb: true, qualities: [], flaws: [], twoHanded: false })]);
    expect(attacks[0]).toMatchObject({ reachCells: 1, damageBonus: 3 });
  });

  it("builds a ranged Blast profile from Breath", () => {
    const { attacks } = wfrpUnitBuild(row, [trait([{ kind: "wfrpAttack", attack: "breath", damage: 5 }])]);

    expect(attacks[0]).toEqual(wfrpAttackFromProfile(attacks[0].id, attacks[0].name, { range: "ranged", rangeFt: 36, damageFlat: 5, addSb: false, qualities: [{ key: "blast", value: 2 }], flaws: [], twoHanded: false }));
    expect(wfrpUnitBuild(row, [trait([{ kind: "wfrpAttack", attack: "breath", damage: 5, rangeFt: 60 }])]).attacks[0].range).toBe("60 ft");
  });

  it("builds a ranged profile that adds SB, defaulting the range", () => {
    const [a] = wfrpUnitBuild(row, [trait([{ kind: "wfrpAttack", attack: "ranged", damage: 4, rangeFt: 150 }])]).attacks;

    expect(a).toMatchObject({ range: "150 ft", damageBonus: 4 });
    expect(ATTACK_SLOT.read(a.system)?.noSb).toBeUndefined();
    expect(wfrpUnitBuild(row, [trait([{ kind: "wfrpAttack", attack: "ranged", damage: 4 }])]).attacks[0].range).toBe("72 ft");
  });

  it("flags magical attacks and gives duplicate Bites distinct ids", () => {
    const bite = { kind: "wfrpAttack", attack: "bite", damage: 3, magical: true };

    const { attacks } = wfrpUnitBuild(row, [trait([bite, bite])]);

    expect(attacks.map((a) => ATTACK_SLOT.read(a.system)?.magical)).toEqual([true, true]);
    expect(new Set(attacks.map((a) => a.id)).size).toBe(2);
  });
});
