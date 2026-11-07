import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn() },
  spell: { count: vi.fn(), updateMany: vi.fn() },
  campaign: { findUnique: vi.fn(async () => ({ rules: {} })) },
  unit: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => []) }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createUnitSchema } from "@/lib/schemas/units";
import { ContentError } from "@/lib/server/content/errors";
import { unitsResource } from "@/lib/server/content/resources/units";
import type { Actor } from "@/lib/utils/api/actor";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("unitsResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.unit.deleteMany.mockResolvedValue({ count: 2 });
  });

  it("drops characteristics for d20 campaigns, keeps them for wfrp", async () => {
    db.unit.create.mockResolvedValue({ id: "u1" });
    db.unit.update.mockResolvedValue({ id: "u1" });

    const input = createUnitSchema.parse({ name: "X", characteristics: DEFAULT_CHARACTERISTICS }) as never;

    await unitsResource.create(actor, input);
    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, input);
    expect(db.unit.create.mock.calls[0][0].data).not.toHaveProperty("characteristics");
    expect(db.unit.update.mock.calls[0][0].data.characteristics).toBeUndefined();

    db.campaign.findUnique.mockResolvedValue({ rules: WFRP_RULES });
    await unitsResource.create(actor, input);
    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, input);
    expect(db.unit.create.mock.calls[1][0].data.characteristics).toEqual(DEFAULT_CHARACTERISTICS);
    expect(db.unit.update.mock.calls[1][0].data.characteristics).toEqual(DEFAULT_CHARACTERISTICS);
  });

  it("rejects trait effects outside wfrp before writing, accepts them in wfrp", async () => {
    db.unit.create.mockResolvedValue({ id: "u1" });
    db.unit.update.mockResolvedValue({ id: "u1" });

    const abilities = [{ id: "a1", name: "Ward", trigger: { event: "passive" }, effects: [{ kind: "wfrpWard", value: 9 }] }];

    const input = createUnitSchema.parse({ name: "X", abilities }) as never;

    db.campaign.findUnique.mockResolvedValue({ rules: {} });
    await expect(unitsResource.create(actor, input)).rejects.toMatchObject({ message: API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED, status: 400 });
    await expect(unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, input)).rejects.toMatchObject({ message: API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED, status: 400 });
    expect(db.unit.create).not.toHaveBeenCalled();
    expect(db.unit.update).not.toHaveBeenCalled();

    await unitsResource.create(actor, createUnitSchema.parse({ name: "X" }) as never);
    expect(db.unit.create).toHaveBeenCalledTimes(1);

    db.campaign.findUnique.mockResolvedValue({ rules: WFRP_RULES });
    await unitsResource.create(actor, input);
    expect(db.unit.create).toHaveBeenCalledTimes(2);
  });

  it("find scopes to the actor campaign", async () => {
    await unitsResource.find(actor, "u1", "read");

    expect(db.unit.findFirst).toHaveBeenCalledWith({ where: { id: "u1", campaignId: "c1" } });
  });

  it("foreign race → ContentError 400 before create", async () => {
    db.race.count.mockResolvedValue(0);

    await expect(unitsResource.create(actor, { name: "X", raceId: "r9" } as never)).rejects.toBeInstanceOf(ContentError);
    expect(db.unit.create).not.toHaveBeenCalled();
  });

  it("foreign knownSpells → 400 FOREIGN_SPELL before create", async () => {
    db.spell.count.mockResolvedValue(0);

    await expect(unitsResource.create(actor, { name: "X", knownSpells: ["foreign"] } as never)).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_SPELL, status: 400 });
    expect(db.unit.create).not.toHaveBeenCalled();
  });

  it("update keeping a stale stored spell id checks nothing", async () => {
    db.unit.update.mockResolvedValue({ id: "u1" });

    await unitsResource.update(actor, { id: "u1", knownSpells: ["gone"] } as never, { knownSpells: ["gone"] } as never);

    expect(db.spell.count).not.toHaveBeenCalled();
    expect(db.unit.update).toHaveBeenCalled();
  });

  it("update with spellcasting but no spell grants does not treat it as an iterable", async () => {
    db.unit.update.mockResolvedValue({ id: "u1" });

    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, { spellcasting: {} } as never);

    expect(db.spell.count).not.toHaveBeenCalled();
    expect(db.unit.update).toHaveBeenCalled();
  });

  it("update checks only the newly added spell ids", async () => {
    db.spell.count.mockResolvedValue(1);
    db.unit.update.mockResolvedValue({ id: "u1" });

    await unitsResource.update(actor, { id: "u1", knownSpells: ["gone"] } as never, { knownSpells: ["gone", "new"] } as never);

    expect(db.spell.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["new"] } } });
  });

  it("remove and removeAll are campaign-scoped; removeAll returns the count", async () => {
    await unitsResource.remove(actor, { id: "u1" } as never);

    expect(db.unit.deleteMany).toHaveBeenCalledWith({ where: { id: "u1", campaignId: "c1" } });
    expect(await unitsResource.removeAll?.(actor)).toBe(2);
  });
});
