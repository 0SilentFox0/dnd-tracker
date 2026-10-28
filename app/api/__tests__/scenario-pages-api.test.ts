import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { discardSlideFiles } from "@/lib/ai/proposal-media";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/ai/proposal-media", () => ({ pendingSlideUrls: vi.fn(async () => ["https://x/orphan.webp"]), discardSlideFiles: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "camp1" }] }),
    scenarioPage: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), aggregate: vi.fn(), updateMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    scenarioPageVersion: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(async () => []), deleteMany: vi.fn() },
    character: { findFirst: vi.fn() },
    compendiumEntry: { deleteMany: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1" } } as never;

const updatedAt = new Date("2026-10-21T00:00:00Z");

const content = { legend: [], sections: [{ id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони" }] }] }, notes: { type: "doc", content: [] } }] }] };

const row = (over: Record<string, unknown> = {}) => ({ id: "p1", campaignId: "camp1", kind: "scene", arc: null, title: "Монастир", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 2, updatedAt, content, ...over });

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

const listRoute = () => import("@/app/api/campaigns/[id]/scenario/route");

const pageRoute = () => import("@/app/api/campaigns/[id]/scenario/[pageId]/route");

describe("scenario pages API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockImplementation((args) => prisma.scenarioPage.findUnique({ where: { id: String(args?.where?.id) } }) as never);
    vi.mocked(prisma.scenarioPage.aggregate).mockResolvedValue({ _max: { sortOrder: 4 } } as never);
    vi.mocked(prisma.scenarioPage.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => row({ ...data, id: "new", version: 0 })) as never);
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.scenarioPageVersion.findFirst).mockResolvedValue(null);
  });

  it("не DM — 403 на список", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const { GET } = await listRoute();

    expect((await GET(req("GET"), params())).status).toBe(403);
  });

  it("POST сцени: sortOrder у кінець, дефолтна легенда, один розділ, searchText", async () => {
    const { POST } = await listRoute();

    const res = await POST(req("POST", { kind: "scene", title: " Погоня " }), params());

    expect(res.status).toBe(201);

    const data = vi.mocked(prisma.scenarioPage.create).mock.calls[0][0].data as unknown as Record<string, unknown> & { content: { legend: unknown[]; sections: unknown[] } };

    expect(data).toMatchObject({ campaignId: "camp1", kind: "scene", title: "Погоня", sortOrder: 5 });
    expect(data.content.legend).toHaveLength(7);
    expect(data.content.sections).toHaveLength(1);
    expect(data.searchText).toContain("Погоня");
  });

  it("POST героя з персонажем іншої кампанії — 400", async () => {
    vi.mocked(prisma.character.findFirst).mockResolvedValue(null);

    const { POST } = await listRoute();

    expect((await POST(req("POST", { kind: "hero", title: "Годрик", characterId: "foreign" }), params())).status).toBe(400);
    expect(prisma.scenarioPage.create).not.toHaveBeenCalled();
  });

  it("GET сторінки іншої кампанії — 403", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row({ campaignId: "camp2" }) as never);

    const { GET } = await pageRoute();

    expect((await GET(req("GET"), params({ pageId: "p1" }))).status).toBe(403);
  });

  it("GET з пошкодженим вмістом — 500 з українським текстом, а не порожня сторінка", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(row({ content: { legend: [], sections: [{ id: "s1", rows: "bad" }] } }) as never);

    const { GET } = await pageRoute();

    const res = await GET(req("GET"), params({ pageId: "p1" }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/пошкоджено/);
  });

  it("PUT з правильною версією: знімок, version+1, searchText перераховано", async () => {
    const { PUT } = await pageRoute();

    const res = await PUT(req("PUT", { expectedVersion: 2, content }), params({ pageId: "p1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 3 });
    expect(prisma.scenarioPageVersion.create).toHaveBeenCalled();
    expect(prisma.scenarioPage.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", campaignId: "camp1", version: 2 },
      data: expect.objectContaining({ content, version: { increment: 1 }, searchText: expect.stringContaining("Дзвони") }),
    });
  });

  it("PUT зі старою версією — 409 без запису", async () => {
    const { PUT } = await pageRoute();

    expect((await PUT(req("PUT", { expectedVersion: 1, content }), params({ pageId: "p1" }))).status).toBe(409);
    expect(prisma.scenarioPage.updateMany).not.toHaveBeenCalled();
  });

  it("PUT програв гонку (updateMany count 0) — 409", async () => {
    vi.mocked(prisma.scenarioPage.updateMany).mockResolvedValue({ count: 0 } as never);

    const { PUT } = await pageRoute();

    expect((await PUT(req("PUT", { expectedVersion: 2, content }), params({ pageId: "p1" }))).status).toBe(409);
  });

  it("PUT з невідомим вузлом — 400", async () => {
    const { PUT } = await pageRoute();

    const bad = { ...content, sections: [{ ...content.sections[0], rows: [{ id: "r1", story: { type: "doc", content: [{ type: "script" }] }, notes: { type: "doc", content: [] } }] }] };

    expect((await PUT(req("PUT", { expectedVersion: 2, content: bad }), params({ pageId: "p1" }))).status).toBe(400);
  });

  it("PUT понад 512 KB — 413", async () => {
    const { PUT } = await pageRoute();

    const huge = { ...content, sections: [{ ...content.sections[0], rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "я".repeat(300_000) }] }] }, notes: { type: "doc", content: [] } }] }] };

    expect((await PUT(req("PUT", { expectedVersion: 2, content: huge }), params({ pageId: "p1" }))).status).toBe(413);
  });

  it("PATCH назви перераховує searchText і не чіпає version", async () => {
    vi.mocked(prisma.scenarioPage.update).mockResolvedValue(row({ title: "Новий" }) as never);

    const { PATCH } = await pageRoute();

    const res = await PATCH(req("PATCH", { title: "Новий", status: "ready" }), params({ pageId: "p1" }));

    expect(res.status).toBe(200);

    const data = vi.mocked(prisma.scenarioPage.update).mock.calls[0][0].data as Record<string, unknown>;

    expect(data).toMatchObject({ title: "Новий", status: "ready" });
    expect(String(data.searchText).split("\n")[0]).toBe("Новий");
    expect(data).not.toHaveProperty("version");
  });

  it("DELETE — ok", async () => {
    const { DELETE } = await pageRoute();

    expect(await (await DELETE(req("DELETE"), params({ pageId: "p1" }))).json()).toEqual({ ok: true });
    expect(prisma.scenarioPage.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(discardSlideFiles).toHaveBeenCalledWith("camp1", ["https://x/orphan.webp"]);
  });
});
