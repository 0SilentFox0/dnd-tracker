import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { cleanupBattleSnapshots } from "../cleanup";

const NOW = new Date("2026-11-30T00:00:00Z");

describe("cleanupBattleSnapshots", () => {
  it("deletes snapshots only of battles completed more than 90 days ago", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "b1" }, { id: "b2" }]);

    const deleteMany = vi.fn().mockResolvedValue({ count: 17 });

    const result = await cleanupBattleSnapshots(NOW, { battleScene: { findMany }, battleSnapshot: { deleteMany } } as never);

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { status: "completed", completedAt: { lt: new Date("2026-09-01T00:00:00Z") } },
      select: { id: true },
    });
    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { battleId: { in: ["b1", "b2"] } } });
    expect(result).toEqual({ battles: 2, snapshots: 17 });
  });

  it("skips the delete when no battle qualifies", async () => {
    const deleteMany = vi.fn();

    const result = await cleanupBattleSnapshots(NOW, {
      battleScene: { findMany: vi.fn().mockResolvedValue([]) },
      battleSnapshot: { deleteMany },
    } as never);

    expect(deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ battles: 0, snapshots: 0 });
  });
});
