import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { loadPlayedSections } from "@/lib/server/scenario/page-store";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/server/scenario/page-store", async (orig) => ({ ...(await orig<typeof import("@/lib/server/scenario/page-store")>()), loadPlayedSections: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    character: { findUnique: vi.fn() },
    scenarioPage: { findUnique: vi.fn() },
    acquaintance: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true } as never;

const player = { userId: "u1", isDM: false } as never;

const collection = () => import("@/app/api/campaigns/[id]/acquaintances/route");

const single = () => import("@/app/api/campaigns/[id]/acquaintances/[acquaintanceId]/route");

const ctx = <T extends Record<string, string> = Record<never, never>>(extra?: T) => ({ params: Promise.resolve({ id: "c1", ...extra } as { id: string } & T) });

const json = (method: string, body?: unknown) => new Request("http://x", { method, body: body === undefined ? undefined : JSON.stringify(body) });

const pageRow = { id: "p1", campaignId: "c1", content: { legend: [], sections: [{ id: "s1", title: "Сцена", played: true, rows: [] }] } };

const row = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  campaignId: "c1",
  kind: "micro",
  characterId: null,
  name: "Ярема",
  avatarUrl: null,
  description: "",
  sourcePageId: "p1",
  sourceSectionId: "s1",
  character: null,
  entries: [],
  notes: [],
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(player);
  vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
  vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ acquaintancesEnabled: true } as never);
  vi.mocked(loadPlayedSections).mockResolvedValue([{ id: "p1", played: ["s1"] }]);
});

describe("GET /acquaintances", () => {
  it("returns 403 with the disabled key to players when the toggle is off", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ acquaintancesEnabled: false } as never);

    const res = await (await collection()).GET(json("GET"), ctx());

    expect(res.status).toBe(403);
    expect((await res.json()).errorKey).toBe("errors.acquaintancesDisabled");
    expect(prisma.acquaintance.findMany).not.toHaveBeenCalled();
  });

  it("returns only revealed acquaintances to players and loads played sections of unique pages", async () => {
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([
      row({ id: "a1", entries: [{ id: "e1", pageId: "p2", sectionId: "t1", text: "x", sortOrder: 0, createdAt: new Date(0) }] }),
      row({ id: "a2", sourceSectionId: "s9" }),
    ] as never);

    const res = await (await collection()).GET(json("GET"), ctx());

    const body = await res.json();

    expect(body.items.map((a: { id: string }) => a.id)).toEqual(["a1"]);
    expect(body.isDM).toBe(false);
    expect(vi.mocked(loadPlayedSections).mock.calls[0][0]).toBe("c1");
    expect([...vi.mocked(loadPlayedSections).mock.calls[0][1]].sort()).toEqual(["p1", "p2"]);
  });

  it("returns everything with hidden flags to the DM even when the toggle is off", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ acquaintancesEnabled: false } as never);
    vi.mocked(prisma.acquaintance.findMany).mockResolvedValue([row({ id: "a1" }), row({ id: "a2", sourcePageId: "gone" })] as never);

    const body = await (await (await collection()).GET(json("GET"), ctx())).json();

    expect(body.enabled).toBe(false);
    expect(body.items.map((a: { id: string; hidden: boolean }) => [a.id, a.hidden])).toEqual([["a1", false], ["a2", true]]);
  });
});

describe("POST /acquaintances", () => {
  const payload = { kind: "micro", name: " Ярема ", sourcePageId: "p1", sourceSectionId: "s1" };

  it("is forbidden for players", async () => {
    const { NextResponse } = await import("next/server");

    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await (await collection()).POST(json("POST", payload), ctx())).status).toBe(403);
    expect(prisma.acquaintance.create).not.toHaveBeenCalled();
  });

  it("404s for an unknown page", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(null);

    expect((await (await collection()).POST(json("POST", payload), ctx())).status).toBe(404);
  });

  it("404s for an unknown section", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(pageRow as never);

    expect((await (await collection()).POST(json("POST", { ...payload, sourceSectionId: "zz" }), ctx())).status).toBe(404);
  });

  it("400s for kind character without characterId", async () => {
    expect((await (await collection()).POST(json("POST", { ...payload, kind: "character" }), ctx())).status).toBe(400);
  });

  it("403s for a character of another campaign", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(pageRow as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ campaignId: "other", name: "Король" } as never);

    expect((await (await collection()).POST(json("POST", { ...payload, kind: "character", characterId: "ch1" }), ctx())).status).toBe(403);
  });

  it("creates with the campaign and the fixed source and returns the DM view", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(pageRow as never);
    vi.mocked(prisma.acquaintance.create).mockResolvedValue(row() as never);

    const res = await (await collection()).POST(json("POST", payload), ctx());

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.acquaintance.create).mock.calls[0][0].data).toMatchObject({ campaignId: "c1", kind: "micro", name: "Ярема", sourcePageId: "p1", sourceSectionId: "s1" });
    expect(await res.json()).toMatchObject({ id: "a1", hidden: false });
  });

  it("defaults the name of a full NPC to the character name when stored", async () => {
    vi.mocked(prisma.scenarioPage.findUnique).mockResolvedValue(pageRow as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ campaignId: "c1", name: "Король" } as never);
    vi.mocked(prisma.acquaintance.create).mockResolvedValue(row({ kind: "character", characterId: "ch1" }) as never);

    await (await collection()).POST(json("POST", { ...payload, kind: "character", characterId: "ch1" }), ctx());

    expect(vi.mocked(prisma.acquaintance.create).mock.calls[0][0].data).toMatchObject({ kind: "character", characterId: "ch1" });
  });
});

describe("PATCH/DELETE /acquaintances/[id]", () => {
  const params = ctx({ acquaintanceId: "a1" });

  it("does not let the source change even when sent", async () => {
    vi.mocked(prisma.acquaintance.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.acquaintance.update).mockResolvedValue(row({ name: "Нове" }) as never);

    const res = await (await single()).PATCH(json("PATCH", { name: "Нове", sourcePageId: "p9", sourceSectionId: "s9" }), params);

    const data = vi.mocked(prisma.acquaintance.update).mock.calls[0][0].data;

    expect(res.status).toBe(200);
    expect(data).toEqual({ name: "Нове" });
  });

  it("deletes for the DM", async () => {
    vi.mocked(prisma.acquaintance.findUnique).mockResolvedValue(row() as never);

    expect((await (await single()).DELETE(json("DELETE"), params)).status).toBe(200);
    expect(prisma.acquaintance.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("403s for an acquaintance of another campaign and 404s for an unknown one", async () => {
    vi.mocked(prisma.acquaintance.findUnique).mockResolvedValueOnce(row({ campaignId: "other" }) as never);

    expect((await (await single()).DELETE(json("DELETE"), params)).status).toBe(403);

    vi.mocked(prisma.acquaintance.findUnique).mockResolvedValueOnce(null);

    expect((await (await single()).DELETE(json("DELETE"), params)).status).toBe(404);
  });
});
