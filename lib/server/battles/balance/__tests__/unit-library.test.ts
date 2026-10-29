import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  unitFindMany: vi.fn(),
  spellFindMany: vi.fn(),
  raceFindMany: vi.fn(async () => []),
}));

vi.mock("@/lib/db", () => ({ prisma: { unit: { findMany: db.unitFindMany }, spell: { findMany: db.spellFindMany }, race: { findMany: db.raceFindMany } } }));

import { loadUnitLibraryStats } from "@/lib/server/battles/balance/unit-library";
import { computeFairScaling } from "@/lib/utils/battle/balance/fair";

const row = (id: string, level: number, maxHp: number, attacks: unknown, knownSpells: string[] = []) => ({
  id, name: id, maxHp, level, raceId: null, strength: 10, dexterity: 10, maxTargets: 1, attacks, knownSpells,
});

type SpellQuery = { where: { id?: { in: string[] } }; select: Record<string, boolean> };

const spellQueries = () => db.spellFindMany.mock.calls.map((c) => c[0] as SpellQuery);

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
    db.spellFindMany.mockImplementation(async (args: { where: { id?: unknown } }) => (args.where.id ? [{ id: "fireball", dice: 7, targeting: { kind: "allEnemies" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }] }] : []));

    const library = await loadUnitLibraryStats("camp");

    const known = spellQueries().filter((c) => c.where.id);

    expect(known).toHaveLength(1);
    expect(known[0].select).toEqual(expect.objectContaining({ dice: true, targeting: true, resolution: true, spellEffects: true }));
    expect(known[0].where.id?.in).toEqual(["fireball"]);

    const mage = library.find((u) => u.unitId === "mage");

    expect(mage?.dpr).toBe(8 * 3.5 * 2);

    const party = { dpr: 4 * 12, hp: 4 * 40, heroCount: 4 };

    const scaling = computeFairScaling(party, [{ unitId: "mage", quantity: 1 }, { unitId: "orc", quantity: 1 }], library);

    expect(scaling.units.mage.dmgMult).toBeLessThanOrEqual(1.1);
  });

  it("без заклинань запиту відомих заклинань немає — лише вузький запит прикликань", async () => {
    db.unitFindMany.mockResolvedValue([row("orc", 1, 10, [{ damageDice: "1d6", type: "melee" }])]);
    db.spellFindMany.mockResolvedValue([]);

    await loadUnitLibraryStats("camp");

    expect(spellQueries().filter((c) => c.where.id)).toHaveLength(0);
    expect(spellQueries()[0].select).toEqual({ spellEffects: true });
  });

  it("ціль прикликання позначена summon: заклинанням або вмінням юніта", async () => {
    db.unitFindMany.mockResolvedValue([
      { ...row("phoenix", 7, 40, [{ damageDice: "2d10", type: "melee" }]), abilities: [] },
      { ...row("imp", 1, 6, [{ damageDice: "1d4", type: "melee" }]), abilities: [] },
      { ...row("lord", 5, 80, [{ damageDice: "2d8", type: "melee" }]), abilities: [{ effects: [{ kind: "summon", unitId: "imp" }] }] },
    ]);
    db.spellFindMany.mockResolvedValue([{ spellEffects: [{ kind: "summon", unitId: "phoenix" }] }]);

    const library = await loadUnitLibraryStats("camp");

    expect(library.filter((u) => u.summon).map((u) => u.unitId).sort()).toEqual(["imp", "phoenix"]);
  });
});
