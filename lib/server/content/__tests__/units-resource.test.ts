import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn() },
  spell: { count: vi.fn() },
  unit: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => []) }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { unitsResource } from "@/lib/server/content/resources/units";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session" };

describe("unitsResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.unit.deleteMany.mockResolvedValue({ count: 2 });
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
