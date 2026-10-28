import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn() },
  spell: { count: vi.fn() },
  unit: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => []) }));

import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import { unitsResource } from "@/lib/server/content/resources/units";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("unitsResource 5e", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.unit.create.mockResolvedValue({ id: "u1" });
    db.unit.update.mockResolvedValue({ id: "u1" });
  });

  it("create пише поля 5e; майстерність 0 → з таблиці CR", async () => {
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Огр", cr: 5, proficiencyBonus: 0, multiattack: 2, legendaryResistances: 1, saveProficiencies: ["strength"] }));

    expect(db.unit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cr: 5, xp: null, multiattack: 2, legendaryActions: 0, legendaryResistances: 1, saveProficiencies: ["strength"], proficiencyBonus: 3 }) });
  });

  it("create без CR — HOMM: cr null, майстерність за рівнем", async () => {
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Гоблін", level: 5, proficiencyBonus: 0 }));

    expect(db.unit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cr: null, multiattack: 1, proficiencyBonus: 3 }) });
  });

  it("create з CR без майстерності → таблиця CR; без CR → 2 як раніше; явне значення зберігається", async () => {
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Дракон", cr: 10 }));
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Гоблін", level: 8 }));
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Огр", cr: 10, proficiencyBonus: 6 }));

    expect(db.unit.create.mock.calls.map((c) => c[0].data.proficiencyBonus)).toEqual([4, 2, 6]);
  });

  it("PATCH cr: null скидає колонку; PATCH без cr її не чіпає", async () => {
    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, updateUnitSchema.parse({ cr: null }));

    expect(db.unit.update.mock.calls[0][0].data.cr).toBeNull();

    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, updateUnitSchema.parse({ name: "Інший" }));

    expect(db.unit.update.mock.calls[1][0].data.cr).toBeUndefined();
  });
});
