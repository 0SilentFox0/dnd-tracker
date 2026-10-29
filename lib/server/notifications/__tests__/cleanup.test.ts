import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { cleanupReadNotifications } from "../cleanup";

describe("cleanupReadNotifications", () => {
  it("deletes only notifications read more than 30 days ago", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 4 });

    const result = await cleanupReadNotifications(new Date("2026-11-30T00:00:00Z"), { playerNotification: { deleteMany } } as never);

    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { readAt: { lt: new Date("2026-10-31T00:00:00Z") } } });
    expect(result).toEqual({ notificationsDeleted: 4 });
  });
});
