import { beforeEach, describe, expect, it, vi } from "vitest";

import { pruneVersions, snapshotIfDue } from "@/lib/server/scenario/versions";

const db = {
  scenarioPage: { findUnique: vi.fn() },
  scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
};

const client = db as never;

const now = new Date("2026-10-21T12:00:00Z");

describe("versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.scenarioPage.findUnique.mockResolvedValue({ content: { legend: [], sections: [] } });
  });

  it("знімок, якщо останній старший за 10 хв; ні — якщо свіжий", async () => {
    db.scenarioPageVersion.findFirst.mockResolvedValueOnce({ createdAt: new Date("2026-10-21T11:40:00Z") });
    expect(await snapshotIfDue(client, "p", "dm", { now })).toBe(true);
    expect(db.scenarioPageVersion.create).toHaveBeenCalledWith({ data: { pageId: "p", content: { legend: [], sections: [] }, createdBy: "dm" } });

    db.scenarioPageVersion.findFirst.mockResolvedValueOnce({ createdAt: new Date("2026-10-21T11:55:00Z") });
    expect(await snapshotIfDue(client, "p", "dm", { now })).toBe(false);
    expect(db.scenarioPageVersion.create).toHaveBeenCalledTimes(1);
    expect(db.scenarioPage.findUnique).toHaveBeenCalledTimes(1);
  });

  it("force пише знімок завжди", async () => {
    db.scenarioPageVersion.findFirst.mockResolvedValueOnce({ createdAt: now });
    expect(await snapshotIfDue(client, "p", "dm", { now, force: true })).toBe(true);
  });

  it("pruneVersions лишає 50 найновіших", async () => {
    db.scenarioPageVersion.findMany.mockResolvedValueOnce([{ id: "old1" }, { id: "old2" }]);
    await pruneVersions(client, "p");
    expect(db.scenarioPageVersion.findMany).toHaveBeenCalledWith({ where: { pageId: "p" }, orderBy: { createdAt: "desc" }, skip: 50, select: { id: true } });
    expect(db.scenarioPageVersion.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1", "old2"] } } });
  });
});
