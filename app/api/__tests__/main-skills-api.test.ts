import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  mainSkill: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}));

const revalidateTag = vi.hoisted(() => vi.fn());

const auth = vi.hoisted(() => ({
  requireDM: vi.fn(),
  requireCampaignAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedMainSkills: vi.fn(async () => []) }));
vi.mock("@/lib/utils/api/api-auth", async (orig) => ({
  ...(await orig<object>()),
  requireDM: auth.requireDM,
  requireCampaignAccess: auth.requireCampaignAccess,
}));

import * as one from "@/app/api/campaigns/[id]/main-skills/[mainSkillId]/route";
import * as list from "@/app/api/campaigns/[id]/main-skills/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxOne = { params: Promise.resolve({ id: "c1", mainSkillId: "m1" }) };

const req = (method: string, body?: unknown) =>
  new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const writes: Array<[string, () => Promise<Response>]> = [
  ["POST /main-skills", () => list.POST(req("POST", { name: "Вогонь", color: "red" }), ctx)],
  ["PATCH /main-skills/:id", () => one.PATCH(req("PATCH", { name: "Лід" }), ctxOne)],
  ["DELETE /main-skills/:id", () => one.DELETE(req("DELETE"), ctxOne)],
];

describe("main-skills API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireDM.mockResolvedValue({ userId: "dm" });
    auth.requireCampaignAccess.mockResolvedValue({ userId: "dm" });
    db.mainSkill.create.mockResolvedValue({ id: "m9" });
    db.mainSkill.findUnique.mockResolvedValue({ id: "m1", campaignId: "c1" });
    db.mainSkill.update.mockResolvedValue({ id: "m1" });
  });

  it("GET — private, no-store", async () => {
    const res = await list.GET(req("GET"), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each(writes)("%s скидає кеш основних навиків і скілів одразу", async (_name, call) => {
    const res = await call();

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("main-skills-c1", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("skills-c1", { expire: 0 });
  });

  it.each(writes)("%s гравцю — 403 без запису", async (_name, call) => {
    auth.requireDM.mockResolvedValue(forbidden());

    expect((await call()).status).toBe(403);
    expect(db.mainSkill.create).not.toHaveBeenCalled();
    expect(db.mainSkill.update).not.toHaveBeenCalled();
    expect(db.mainSkill.deleteMany).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("GET /main-skills/:id гравцю — 403", async () => {
    auth.requireDM.mockResolvedValue(forbidden());

    expect((await one.GET(req("GET"), ctxOne)).status).toBe(403);
  });
});
