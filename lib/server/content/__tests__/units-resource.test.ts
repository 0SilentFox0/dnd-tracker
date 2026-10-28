import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn() },
  unit: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => []) }));

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

  it("remove and removeAll are campaign-scoped; removeAll returns the count", async () => {
    await unitsResource.remove(actor, { id: "u1" } as never);

    expect(db.unit.deleteMany).toHaveBeenCalledWith({ where: { id: "u1", campaignId: "c1" } });
    expect(await unitsResource.removeAll?.(actor)).toBe(2);
  });
});
