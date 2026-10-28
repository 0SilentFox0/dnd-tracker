import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/utils/api/rate-limit", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })) }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", async () => {
  const { contentDatabaseDouble } = await import("@/lib/server/content/__tests__/database-double");

  return { prisma: contentDatabaseDouble({
    campaignShow: { findUnique: vi.fn(async () => null), updateMany: vi.fn(async () => ({ count: 1 })), createMany: vi.fn(async () => ({ count: 1 })) },
    slideDeck: { findFirst: vi.fn() },
    battleScene: { findFirst: vi.fn() },
    campaignTrack: { findMany: vi.fn(async () => []) },
  }) };
});

const access = (isDM: boolean) => ({ userId: isDM ? "dm" : "p", isDM, campaign: { id: "c1", maxLevel: 20, members: [] } }) as never;

const url = (n: number) => `https://p.supabase.co/storage/v1/object/public/scene-slides/c1/${n}.webp`;

const deckRow = { id: "d1", title: "Таверна", slides: [{ id: "slide-0001", imageUrl: url(1) }, { id: "slide-0002", imageUrl: url(2) }, { id: "slide-0003", imageUrl: url(3) }] };

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/campaigns/[id]/show/route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1" }) });
};

describe("show API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.useFakeTimers({ now: 10_000, toFake: ["Date"] });
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(null);
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access(true));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(false));
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(deckRow as never);
  });

  afterEach(() => vi.useRealTimers());

  it("гравець не може керувати — 403 без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await post({ action: "next" })).status).toBe(403);
    expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
  });

  it("перший open створює рядок; відповідь — стан без набору; Pusher після відповіді", async () => {
    const res = await post({ action: "open", deckId: "d1" });

    const show = { deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[0], nextImageUrl: url(2), audio: null, seq: 1 };

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ show });
    expect(prisma.campaignShow.createMany).toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();

    await Promise.all(afterCallbacks.map((cb) => cb()));
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", { campaignId: "c1", show });
  });

  it("гонка — 409, без Pusher", async () => {
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[0], nextImageUrl: url(2), audio: null, seq: 4 } as never);
    vi.mocked(prisma.campaignShow.updateMany).mockResolvedValueOnce({ count: 0 });

    const res = await post({ action: "next" });

    expect(res.status).toBe(409);
    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 4 } });
    expect(afterCallbacks).toHaveLength(0);
  });

  it("next на останньому слайді — 200 з тим самим станом, без запису і Pusher", async () => {
    const last = { deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[2], nextImageUrl: null, audio: null, seq: 4 };

    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(last as never);

    const res = await post({ action: "next" });

    expect(await res.json()).toEqual({ show: last });
    expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("native commands share the Campaign write guard", async () => {
    const { currentContentWrite } = await import("@/lib/server/content/write-context");

    let guarded = false;

    vi.mocked(prisma.campaignShow.createMany).mockImplementationOnce((async () => { guarded = currentContentWrite()?.campaignId === "c1";

 return { count: 1 }; }) as never);
    expect((await post({ action: "open", deckId: "d1" })).status).toBe(200);
    expect(guarded).toBe(true);
  });

  it("помилки команд — 422; невідома дія — 400", async () => {
    expect((await post({ action: "next" })).status).toBe(422);
    expect((await post({ action: "jump" })).status).toBe(400);
  });

  it("GET для гравця: лише поточний слайд і наступна картинка, без кешу", async () => {
    const state = { deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[1], nextImageUrl: url(3), audio: null, seq: 2 };

    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(state as never);

    const { GET } = await import("@/app/api/campaigns/[id]/show/route");

    const res = await GET(new Request("http://x"), { params: Promise.resolve({ id: "c1" }) });

    expect(await res.json()).toEqual({ show: state });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(prisma.slideDeck.findFirst).not.toHaveBeenCalled();
  });

  it("battle: активний бій — стан з battle, Pusher", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", name: "Засідка", status: "active" } as never);

    const res = await post({ action: "battle", battleId: "b1" });

    expect(res.status).toBe(200);
    expect((await res.json()).show).toMatchObject({ battle: { id: "b1", name: "Засідка" }, seq: 1 });
    expect(vi.mocked(prisma.battleScene.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "b1", campaignId: "c1" } });
    expect(vi.mocked(prisma.campaignShow.createMany).mock.calls[0][0]).toMatchObject({ data: [{ battle: { id: "b1", name: "Засідка" } }] });

    await Promise.all(afterCallbacks.map((cb) => cb()));
    expect(trigger).toHaveBeenCalled();
  });

  it("battle: чужий/відсутній бій — 404 без запису", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue(null);

    expect((await post({ action: "battle", battleId: "zz" })).status).toBe(404);
    expect(prisma.campaignShow.createMany).not.toHaveBeenCalled();
  });

  it("battle: завершений бій — 422", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", name: "Засідка", status: "completed" } as never);

    expect((await post({ action: "battle", battleId: "b1" })).status).toBe(422);
  });

  it("стан без battle у БД — поле відсутнє у відповіді", async () => {
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: deckRow.slides[0], nextImageUrl: url(2), audio: null, battle: null, seq: 4 } as never);

    const res = await post({ action: "next" });

    expect((await res.json()).show).not.toHaveProperty("battle");
  });
});
