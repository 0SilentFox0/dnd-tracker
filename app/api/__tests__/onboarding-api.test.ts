import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userOnboardingFlag: { findMany: vi.fn(), upsert: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    campaignMember: { findMany: vi.fn() },
  },
}));

const access = (role: "dm" | "player") => ({ userId: "u1", isDM: role === "dm", campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, members: [{ userId: "u1", role }] } }) as never;

const dmRow = { races: 1, units: 1, players: 1, activePlayerCharacters: 1, pendingDrafts: 0, battles: 1, battlesStarted: 1, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0, checklistFlag: null };

const playerRow = (row: Partial<{ activeCharacter: number; pendingCharacter: number; joinedBattle: number; sheetSeen: boolean; checklistFlag: string | null }>) => [{ activeCharacter: 0, pendingCharacter: 0, joinedBattle: 0, sheetSeen: false, checklistFlag: null, ...row }];

const json = (body: unknown, method = "PUT") => new Request("http://x", { method, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiAuth.requireAuth).mockResolvedValue({ userId: "u1" });
  vi.mocked(prisma.userOnboardingFlag.findMany).mockResolvedValue([]);
  vi.mocked(prisma.userOnboardingFlag.createMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ role: "dm" }] as never);
});

describe("GET /api/onboarding", () => {
  it("перший візит — whats-new ставиться на найновіший запис, бейджа немає", async () => {
    const { GET } = await import("@/app/api/onboarding/route");

    const body = await (await GET()).json();

    expect(body.flags["whats-new"]).toBe(WHATS_NEW[0].id);
    expect(body.audiences).toEqual(["dm"]);
    expect(prisma.userOnboardingFlag.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_key: { userId: "u1", key: "whats-new" } } }));
  });

  it("наявний whats-new не перезаписується", async () => {
    vi.mocked(prisma.userOnboardingFlag.findMany).mockResolvedValue([{ key: "whats-new", value: "old" }] as never);

    const { GET } = await import("@/app/api/onboarding/route");

    const body = await (await GET()).json();

    expect(body.flags["whats-new"]).toBe("old");
    expect(prisma.userOnboardingFlag.upsert).not.toHaveBeenCalled();
  });

  it("запис першого візиту впав (немає рядка users) — GET однаково 200", async () => {
    vi.mocked(prisma.userOnboardingFlag.upsert).mockRejectedValueOnce(new Error("Foreign key constraint violated"));

    const { GET } = await import("@/app/api/onboarding/route");

    const res = await GET();

    expect(res.status).toBe(200);
    expect((await res.json()).flags["whats-new"]).toBe(WHATS_NEW[0].id);
  });

  it("без сесії — 401", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 401 }));

    const { GET } = await import("@/app/api/onboarding/route");

    expect((await GET()).status).toBe(401);
  });
});

describe("PUT /api/onboarding/flags", () => {
  it("валідний ключ — upsert", async () => {
    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "hint:dm.races" }))).status).toBe(200);
    expect(prisma.userOnboardingFlag.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: "u1", key: "hint:dm.races", value: null } }));
  });

  it("сміттєвий ключ або довге значення — 400", async () => {
    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "anything" }))).status).toBe(400);
    expect((await PUT(json({ key: "hint:dm.races", value: "v".repeat(101) }))).status).toBe(400);
    expect((await PUT(json({ key: "hint:not-a-real-hint" }))).status).toBe(400);
    expect(prisma.userOnboardingFlag.upsert).not.toHaveBeenCalled();
  });

  it("чекліст чужої кампанії — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "checklist:other", value: "hidden" }))).status).toBe(403);
    expect(prisma.userOnboardingFlag.upsert).not.toHaveBeenCalled();
  });

  it("чекліст своєї кампанії — 200", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("player"));

    const { PUT } = await import("@/app/api/onboarding/flags/route");

    expect((await PUT(json({ key: "checklist:camp", value: "hidden" }))).status).toBe(200);
  });
});

describe("POST /api/onboarding/reset", () => {
  it("hints — видаляє hint:*", async () => {
    const { POST } = await import("@/app/api/onboarding/reset/route");

    expect((await POST(json({ scope: "hints" }, "POST"))).status).toBe(200);
    expect(prisma.userOnboardingFlag.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", key: { startsWith: "hint:" } } });
  });

  it("невідомий scope — 400", async () => {
    const { POST } = await import("@/app/api/onboarding/reset/route");

    expect((await POST(json({ scope: "all" }, "POST"))).status).toBe(400);
  });
});

describe("GET /api/campaigns/[id]/onboarding", () => {
  const get = async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/onboarding/route");

    return GET(new Request("http://x"), { params: Promise.resolve({ id: "camp" }) });
  };

  it("ДМ із виконаними кроками — collapsed і completedAt записано", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm"));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([dmRow]);

    const body = await (await get()).json();

    expect(body.role).toBe("dm");
    expect(body.state).toBe("collapsed");
    expect(prisma.userOnboardingFlag.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ key: "checklist:camp" }), skipDuplicates: true }));
  });

  it("гравець отримує лише кроки гравця", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("player"));
    vi.mocked(prisma.$queryRaw).mockResolvedValue(playerRow({ pendingCharacter: 1 }));

    const body = await (await get()).json();

    expect(body.role).toBe("player");
    expect(body.steps.map((s: { id: string }) => s.id)).toEqual(["character", "sheet", "battle", "show"]);
    expect(body.steps[0].variant).toEqual({ name: "pending" });
    expect(body.state).toBe("open");
    expect(prisma.userOnboardingFlag.createMany).not.toHaveBeenCalled();
  });

  it("аркуш переглянуто — крок «аркуш» виконано", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("player"));

    vi.mocked(prisma.$queryRaw).mockResolvedValue(playerRow({ activeCharacter: 1, sheetSeen: true }));
    expect((await (await get()).json()).steps.find((s: { id: string }) => s.id === "sheet").done).toBe(true);

    vi.mocked(prisma.$queryRaw).mockResolvedValue(playerRow({ activeCharacter: 1 }));
    expect((await (await get()).json()).steps.find((s: { id: string }) => s.id === "sheet").done).toBe(false);
  });

  it("нинішній гравець, що вже бився, — чекліст одразу згорнутий", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("player"));
    vi.mocked(prisma.$queryRaw).mockResolvedValue(playerRow({ activeCharacter: 1, joinedBattle: 1 }));

    expect((await (await get()).json()).state).toBe("collapsed");
  });

  it("один запит до БД: прапорець чекліста приходить разом із фактами", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm"));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ...dmRow, races: 0, checklistFlag: "hidden" }]);

    expect((await (await get()).json()).state).toBe("hidden");
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.userOnboardingFlag.findMany).not.toHaveBeenCalled();
  });

  it("не член кампанії — статус від requireCampaignAccess", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await get()).status).toBe(403);
  });
});
