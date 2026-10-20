import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { pruneVersions, readContent, snapshotIfDue, toSummary } from "@/lib/server/scenario/page-store";

vi.mock("@/lib/db", () => ({
  prisma: {
    scenarioPage: { findUnique: vi.fn(async () => ({ content: { legend: [], sections: [] } })) },
    scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

const now = new Date("2026-10-21T12:00:00Z");

describe("page-store", () => {
  beforeEach(() => vi.clearAllMocks());

  it("readContent: битий JSON → порожній контент", () => {
    expect(readContent({ sections: "nope" })).toEqual({ legend: [], sections: [] });
    expect(readContent({ legend: [], sections: [] })).toEqual({ legend: [], sections: [] });
  });

  it("toSummary серіалізує дату і не пропускає content/searchText", () => {
    const summary = toSummary({ id: "p", kind: "scene", arc: null, title: "t", subtitle: null, status: "ready", sortOrder: 1, characterId: null, version: 3, updatedAt: now, content: {}, searchText: "x" } as never);

    expect(summary.updatedAt).toBe("2026-10-21T12:00:00.000Z");
    expect(summary).not.toHaveProperty("content");
    expect(summary).not.toHaveProperty("searchText");
  });

  it("знімок, якщо останній старший за 10 хв; ні — якщо свіжий", async () => {
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValueOnce({ createdAt: new Date("2026-10-21T11:40:00Z") } as never);
    expect(await snapshotIfDue("p", "dm", { now })).toBe(true);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalledWith({ data: { pageId: "p", content: { legend: [], sections: [] }, createdBy: "dm" } });

    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValueOnce({ createdAt: new Date("2026-10-21T11:55:00Z") } as never);
    expect(await snapshotIfDue("p", "dm", { now })).toBe(false);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalledTimes(1);
    expect(prisma.scenarioPage.findUnique).toHaveBeenCalledTimes(1);
  });

  it("force пише знімок завжди", async () => {
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValueOnce({ createdAt: now } as never);
    expect(await snapshotIfDue("p", "dm", { now, force: true })).toBe(true);
  });

  it("pruneVersions лишає 50 найновіших", async () => {
    vi.mocked(prisma.scenarioPageVersion.findMany).mockResolvedValueOnce([{ id: "old1" }, { id: "old2" }] as never);
    await pruneVersions("p");
    expect(prisma.scenarioPageVersion.findMany).toHaveBeenCalledWith({ where: { pageId: "p" }, orderBy: { createdAt: "desc" }, skip: 50, select: { id: true } });
    expect(prisma.scenarioPageVersion.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1", "old2"] } } });
  });
});
