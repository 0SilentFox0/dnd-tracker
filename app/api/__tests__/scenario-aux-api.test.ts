import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { notifyRevealForContentChange } from "@/lib/server/acquaintances/reveal";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/server/acquaintances/reveal", () => ({ notifyRevealForContentChange: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "camp1" }] }),
    $queryRaw: vi.fn(),
    scenarioPage: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    scenarioPageVersion: { findFirst: vi.fn(), findMany: vi.fn(async () => []), create: vi.fn(), deleteMany: vi.fn() },
    unit: { findMany: vi.fn(async () => [{ id: "u1", name: "Біс" }]) },
    artifact: { findMany: vi.fn(async () => []) },
    character: { findMany: vi.fn(async () => [{ id: "c1", name: "Біара" }]) },
    spell: { findMany: vi.fn(async () => []) },
    battleScene: { findMany: vi.fn(async () => []) },
    worldMarker: { findMany: vi.fn(async () => [{ id: "m1", name: "Біла вежа" }]) },
    acquaintance: { findMany: vi.fn(async () => [{ id: "a1", name: "Ярема" }]) },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const content = { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [] }] };

const row = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "camp1", kind: "scene", arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 4, updatedAt: new Date(), content, ...over });

const req = (method: string, body?: unknown, url = "http://x") => new Request(url, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

describe("scenario aux API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockImplementation((args) => prisma.scenarioPage.findUnique({ where: { id: String(args?.where?.id) } }) as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("section PATCH played → version+1, розділ у відповіді, searchText не чіпає", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route");

    const res = await PATCH(req("PATCH", { played: true }), params({ pageId: "p1", sectionId: "s1" }));

    expect(await res.json()).toEqual({ version: 5, section: { ...content.sections[0], played: true } });

    const call = vi.mocked(prisma.scenarioPage.updateMany).mock.calls[0][0];

    expect(call.where).toEqual({ id: "p1", version: 4 });
    expect(call.data).not.toHaveProperty("searchText");
  });

  it("section PATCH revealed ставить і знімає revealedAt", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route");

    const on = await (await PATCH(req("PATCH", { revealed: true }), params({ pageId: "p1", sectionId: "s1" }))).json();

    expect(typeof on.section.revealedAt).toBe("string");

    const off = await (await PATCH(req("PATCH", { revealed: false }), params({ pageId: "p1", sectionId: "s1" }))).json();

    expect(off.section.revealedAt).toBeNull();
  });

  it("section PATCH невідомий розділ — 404; гонка — 409", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route");

    expect((await PATCH(req("PATCH", { played: true }), params({ pageId: "p1", sectionId: "nope" }))).status).toBe(404);

    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 0 } as never);
    expect((await PATCH(req("PATCH", { played: true }), params({ pageId: "p1", sectionId: "s1" }))).status).toBe(409);
  });

  it("відкат: примусовий знімок поточного, контент з версії, version+1", async () => {
    const old = { legend: [], sections: [] };

    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValue({ id: "v1", pageId: "p1", content: old } as never);
    vi.mocked(prisma.scenarioPage.update).mockResolvedValue(row({ content: old, version: 5 }) as never);

    const { POST } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/versions/route");

    const res = await POST(req("POST", { versionId: "v1" }), params({ pageId: "p1" }));

    expect(res.status).toBe(200);
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalledWith({ data: { pageId: "p1", content, createdBy: "dm" } });
    expect(vi.mocked(prisma.scenarioPage.updateMany).mock.calls[0][0].data).toMatchObject({ content: old, version: { increment: 1 } });
  });

  it("відкат версії іншої сторінки — 404", async () => {
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValue(null);

    const { POST } = await import("@/app/api/campaigns/[id]/scenario/[pageId]/versions/route");

    expect((await POST(req("POST", { versionId: "foreign" }), params({ pageId: "p1" }))).status).toBe(404);
  });

  it("пошук: короткий запит — []; інакше хіти з розділом", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "p1", title: "Монастир", sectionId: "s1", win: "Собор Дзвони обриваються\n§s2\tІнше", at: 6, cutBefore: false }] as never);

    const { GET } = await import("@/app/api/campaigns/[id]/scenario/search/route");

    expect(await (await GET(req("GET", undefined, "http://x?q=д"), params())).json()).toEqual([]);

    const hits = await (await GET(req("GET", undefined, "http://x?q=дзвони"), params())).json();

    expect(hits).toEqual([{ pageId: "p1", pageTitle: "Монастир", sectionId: "s1", snippet: "Собор Дзвони обриваються" }]);

    const [strings, ...values] = vi.mocked(prisma.$queryRaw).mock.calls[0] as unknown as [string[], ...unknown[]];

    expect(values).toContain("camp1");
    expect(values).toContain("дзвони");
    expect(strings.join("")).not.toContain("дзвони");
    expect(vi.mocked(prisma.$queryRaw)).toHaveBeenCalledTimes(1);
  });

  it("mentions: збирає типи, фільтр за кампанією", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/scenario/mentions/route");

    const options = await (await GET(req("GET", undefined, "http://x?q=бі"), params())).json();

    expect(options).toEqual([{ type: "unit", id: "u1", label: "Біс" }, { type: "character", id: "c1", label: "Біара" }, { type: "marker", id: "m1", label: "Біла вежа" }, { type: "acquaintance", id: "a1", label: "Ярема" }]);
    expect(vi.mocked(prisma.acquaintance.findMany).mock.calls[0][0]?.where).toEqual({ campaignId: "camp1", name: { contains: "бі", mode: "insensitive" } });
    expect(vi.mocked(prisma.worldMarker.findMany).mock.calls[0][0]?.where).toEqual({ map: { campaignId: "camp1" }, name: { contains: "бі", mode: "insensitive" } });
    expect(vi.mocked(prisma.unit.findMany).mock.calls[0][0]?.where).toEqual({ campaignId: "camp1", name: { contains: "бі", mode: "insensitive" } });
  });
});

describe("scenario section PATCH → acquaintance reveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  const patch = async (body: unknown) => (await import("@/app/api/campaigns/[id]/scenario/[pageId]/sections/[sectionId]/route")).PATCH(req("PATCH", body), params({ pageId: "p1", sectionId: "s1" }));

  it("passes the before/after content to the reveal notifier after a successful write", async () => {
    await patch({ played: true });

    expect(notifyRevealForContentChange).toHaveBeenCalledTimes(1);

    const [campaignId, pageId, before, after] = vi.mocked(notifyRevealForContentChange).mock.calls[0];

    expect([campaignId, pageId]).toEqual(["camp1", "p1"]);
    expect(before.sections[0].played).toBe(false);
    expect(after.sections[0].played).toBe(true);
  });

  it("does not notify on a version conflict", async () => {
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 0 } as never);

    expect((await patch({ played: true })).status).toBe(409);
    expect(notifyRevealForContentChange).not.toHaveBeenCalled();
  });
});
