import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  unitFindMany: vi.fn(),
  spellFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { unit: { findMany: db.unitFindMany }, spell: { findMany: db.spellFindMany } } }));

import { computeFairScaling } from "../fair";
import { loadUnitLibraryStats } from "../unit-library";

const row = (id: string, level: number, maxHp: number, attacks: unknown, knownSpells: string[] = []) => ({
  id, name: id, maxHp, level, raceId: null, strength: 10, dexterity: 10, maxTargets: 1, attacks, knownSpells,
});

describe("loadUnitLibraryStats: заклинання юнітів", () => {
  beforeEach(() => {
    db.unitFindMany.mockReset();
    db.spellFindMany.mockReset();
  });

  it("один вузький запит заклинань; DPR мага береться із заклинання, множник шкоди не завищений", async () => {
    db.unitFindMany.mockResolvedValue([
      row("mage", 3, 30, [{ damageDice: "1d4", type: "melee" }], ["fireball"]),
      row("orc", 3, 30, [{ damageDice: "1d12+3", type: "melee" }]),
    ]);
    db.spellFindMany.mockResolvedValue([{ id: "fireball", type: "aoe", damageType: "damage", target: "enemies", diceCount: 8, diceType: "d6", damageDistribution: null }]);

    const library = await loadUnitLibraryStats("camp");

    expect(db.spellFindMany).toHaveBeenCalledTimes(1);
    expect(db.spellFindMany.mock.calls[0][0].select).toEqual(expect.objectContaining({ diceCount: true, diceType: true, type: true, damageDistribution: true }));
    expect(db.spellFindMany.mock.calls[0][0].where.id.in).toEqual(["fireball"]);

    const mage = library.find((u) => u.unitId === "mage");

    expect(mage?.dpr).toBe((28 + 3) * 2);

    const party = { dpr: 4 * 12, hp: 4 * 40, heroCount: 4 };

    const scaling = computeFairScaling(party, [{ unitId: "mage", quantity: 1 }, { unitId: "orc", quantity: 1 }], library);

    expect(scaling.units.mage.dmgMult).toBeLessThanOrEqual(1.1);
  });

  it("без заклинань другий запит не робиться", async () => {
    db.unitFindMany.mockResolvedValue([row("orc", 1, 10, [{ damageDice: "1d6", type: "melee" }])]);

    await loadUnitLibraryStats("camp");

    expect(db.spellFindMany).not.toHaveBeenCalled();
  });
});
