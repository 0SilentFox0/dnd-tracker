import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";

const m = vi.hoisted(() => ({
  db: {
    user: { upsert: vi.fn() },
    campaign: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    campaignMember: { create: vi.fn() },
    campaignSourceSync: { create: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(async () => [{ id: "c1" }]),
  },
  kvDel: vi.fn(),
  requireDM: vi.fn(),
  userId: { current: "u1" },
  importBundle: vi.fn(),
  exportCampaign: vi.fn(),
  admin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: m.db }));
vi.mock("@/lib/cache/kv", () => ({ kvDel: m.kvDel, kvGet: vi.fn(), kvSet: vi.fn() }));
vi.mock("@/lib/utils/api/platform-admin", () => ({ isPlatformAdmin: m.admin }));
vi.mock("@/lib/utils/api/api-auth", async () => {
  const { NextResponse } = await import("next/server");

  return {
    requireAuth: vi.fn(async () => ({ userId: m.userId.current })),
    requireAuthUser: vi.fn(async () => ({ userId: m.userId.current, authUser: { id: m.userId.current, email: "u@x.y" } })),
    requireDM: m.requireDM.mockImplementation(async () => NextResponse.json({ error: "x" }, { status: 403 })),
  };
});
vi.mock("@/lib/server/templates/import-bundle", () => ({ importBundle: m.importBundle }));
vi.mock("@/lib/server/templates/export-campaign", () => ({ exportCampaign: m.exportCampaign }));

import { GET as exportGet } from "@/app/api/campaigns/[id]/export/route";
import { PATCH } from "@/app/api/campaigns/[id]/route";
import { POST as saveAsTemplate } from "@/app/api/campaigns/[id]/save-as-template/route";
import { POST as importPost } from "@/app/api/campaigns/import/route";
import { POST as joinPost } from "@/app/api/campaigns/join/route";
import { POST as createPost } from "@/app/api/campaigns/route";
import { GET as templatesGet } from "@/app/api/templates/route";
import { BundleInvalidError } from "@/lib/server/templates/bundle";

const bundle = {
  formatVersion: 1,
  settings: { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false },
  rules: {},
  spellGroups: [],
  races: [],
  units: [],
  spells: [],
  mainSkills: [],
  skills: [],
  skillTrees: [],
  artifactSets: [],
  artifacts: [],
  tracks: [],
};

const json = (body: unknown, url = "http://x") => new Request(url, { method: "POST", body: JSON.stringify(body) });

const params = (id = "c1") => ({ params: Promise.resolve({ id }) });

const asDM = () => m.requireDM.mockImplementation(async (id: string) => ({ userId: "u1", isDM: true, campaign: { id } }));

describe("campaign templates API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.userId.current = "u1";
    m.exportCampaign.mockResolvedValue(bundle);
    m.importBundle.mockResolvedValue({ idMap: new Map(), warnings: [], hashes: {} });
    m.db.campaign.create.mockImplementation(async ({ data }: { data: object }) => ({ id: "new", ...data }));
    m.db.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb(m.db));
    m.requireDM.mockImplementation(async () => NextResponse.json({ error: "x" }, { status: 403 }));
  });

  describe("створення з шаблону", () => {
    it("офіційний шаблон — будь-кому; createdFromId, kind campaign, кеш скинуто", async () => {
      m.db.campaign.findUnique.mockResolvedValue({ id: "t1", kind: "template", visibility: "official", members: [] });

      const res = await createPost(json({ name: "N", templateId: "t1" }));

      expect(res.status).toBe(200);
      expect(m.db.campaign.create.mock.calls[0][0].data).toMatchObject({ createdFromId: "t1", kind: "campaign" });
      expect(m.kvDel).toHaveBeenCalledWith("campaigns:u1");
      expect(m.db.campaignSourceSync.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sourceCampaignId: "t1" }) }),
      );
    });

    it.each([
      ["чужий приватний", { id: "t1", kind: "template", visibility: "private", members: [] }, 403],
      ["неіснуючий", null, 404],
      ["звичайна кампанія", { id: "t1", kind: "campaign", visibility: "official", members: [] }, 404],
    ])("%s — %i", async (_n, row, status) => {
      m.db.campaign.findUnique.mockResolvedValue(row);

      expect((await createPost(json({ name: "N", templateId: "t1" }))).status).toBe(status);
      expect(m.db.campaign.create).not.toHaveBeenCalled();
    });

    it("BundleInvalidError з імпорту шаблону — 400 з текстом, не 500", async () => {
      m.db.campaign.findUnique.mockResolvedValue({ id: "t1", kind: "template", visibility: "official", members: [] });
      m.importBundle.mockRejectedValue(new BundleInvalidError("Бандл посилається на контент інших кампаній: cx"));

      const res = await createPost(json({ name: "N", templateId: "t1" }));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Бандл посилається на контент інших кампаній: cx");
    });

    it("двічі з одного шаблону — той самий бандл імпортується двічі", async () => {
      m.db.campaign.findUnique.mockResolvedValue({ id: "t1", kind: "template", visibility: "official", members: [] });

      await createPost(json({ name: "A", templateId: "t1" }));
      await createPost(json({ name: "B", templateId: "t1" }));

      expect(m.importBundle).toHaveBeenCalledTimes(2);
      expect(m.importBundle.mock.calls[0][1]).toBe(m.importBundle.mock.calls[1][1]);
    });
  });

  describe("експорт", () => {
    it("ДМ — 200 з Content-Disposition", async () => {
      asDM();

      const res = await exportGet(new Request("http://x"), params());

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="campaign-c1-\d{4}-\d{2}-\d{2}\.json"$/);
    });

    it("гравець — 403", async () => {
      expect((await exportGet(new Request("http://x"), params())).status).toBe(403);
    });
  });

  describe("save-as-template", () => {
    it("ДМ — новий приватний шаблон з createdFromId", async () => {
      asDM();

      const res = await saveAsTemplate(json({ name: "T" }), params());

      expect(res.status).toBe(200);
      expect(m.db.campaign.create.mock.calls[0][0].data).toMatchObject({ kind: "template", visibility: "private", createdFromId: "c1" });
    });

    it("гравець — 403", async () => {
      expect((await saveAsTemplate(json({ name: "T" }), params())).status).toBe(403);
      expect(m.db.campaign.create).not.toHaveBeenCalled();
    });
  });

  describe("імпорт", () => {
    it("валідний бандл — 200", async () => {
      expect((await importPost(json({ name: "N", bundle }))).status).toBe(200);
      expect(m.db.campaignSourceSync.create).not.toHaveBeenCalled();
    });

    it("formatVersion 2 — 400 з issues", async () => {
      const res = await importPost(json({ name: "N", bundle: { ...bundle, formatVersion: 2 } }));

      expect(res.status).toBe(400);
      expect((await res.json()).issues).toBeDefined();
    });

    it("BundleInvalidError — 400 з текстом", async () => {
      m.importBundle.mockRejectedValue(new BundleInvalidError("Погана ссилка"));

      const res = await importPost(json({ name: "N", bundle }));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Погана ссилка");
    });

    it("завеликий content-length — 413", async () => {
      const req = new Request("http://x", { method: "POST", body: "{}", headers: { "content-length": String(5 * 1024 * 1024) } });

      expect((await importPost(req)).status).toBe(413);
    });
  });

  it("join за кодом шаблону — 403 TEMPLATE_NOT_JOINABLE", async () => {
    m.db.campaign.findFirst.mockResolvedValue({ id: "t1", kind: "template", status: "active", members: [] });

    const res = await joinPost(json({ inviteCode: "ABC123" }));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(API_ERRORS.TEMPLATE_NOT_JOINABLE);
  });

  it("GET /api/templates — офіційні й мої, без чужих приватних", async () => {
    m.db.campaign.findMany.mockImplementation(async ({ where }: { where: { visibility: unknown } }) =>
      where.visibility === "official"
        ? [{ id: "o1", name: "O", description: null, visibility: "official", _count: { spellGroups: 2, races: 0 } }]
        : [{ id: "m1", name: "M", description: null, visibility: "private", _count: { spellGroups: 0, races: 0 } }],
    );

    const body = await (await templatesGet()).json();

    expect(body.official.map((t: { id: string }) => t.id)).toEqual(["o1"]);
    expect(body.mine.map((t: { id: string }) => t.id)).toEqual(["m1"]);
    expect(body.official[0].counts.spellGroups).toBe(2);

    const mineWhere = m.db.campaign.findMany.mock.calls.map((c) => c[0].where).find((w) => w.members);

    expect(mineWhere).toMatchObject({ kind: "template", members: { some: { userId: "u1", role: "dm" } } });
  });

  describe("PATCH visibility", () => {
    const patch = () => PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ visibility: "official" }) }), params());

    beforeEach(() => {
      asDM();
      m.db.campaign.findUnique.mockResolvedValue({ kind: "template" });
      m.db.campaign.update.mockResolvedValue({ id: "c1", members: [] });
    });

    it("не адмін — 403", async () => {
      m.admin.mockReturnValue(false);

      expect((await patch()).status).toBe(403);
      expect(m.db.campaign.update).not.toHaveBeenCalled();
    });

    it("адмін, шаблон — 200", async () => {
      m.admin.mockReturnValue(true);

      expect((await patch()).status).toBe(200);
    });

    it("адмін, але не шаблон — 403", async () => {
      m.admin.mockReturnValue(true);
      m.db.campaign.findUnique.mockResolvedValue({ kind: "campaign" });

      expect((await patch()).status).toBe(403);
    });
  });
});
