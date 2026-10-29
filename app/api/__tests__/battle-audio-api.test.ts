import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { checkRateLimit } from "@/lib/utils/api/rate-limit";
import { audioState, fileTrack } from "@/lib/utils/audio/__tests__/fixtures";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/utils/api/rate-limit", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 20, retryAfterSeconds: 10 })) }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (callback: (tx: unknown) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }),
    campaignMember: { findUnique: async () => ({ role: "dm" }) },

    battleScene: { findFirst: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
    campaignTrack: { findMany: vi.fn() },
  },
}));

const access = (isDM: boolean) => ({ userId: isDM ? "dm" : "p", isDM, campaign: { id: "c1", maxLevel: 20, members: [] } }) as never;

const params = { id: "c1", battleId: "b1" };

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/campaigns/[id]/battles/[battleId]/audio/route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve(params) });
};

const rows = [
  { id: "t1", ...fileTrack },
  { id: "t2", title: "Таверна", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null },
];

const playing = audioState({ startedAt: 1_000, seq: 3 });

describe("battle audio API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.useFakeTimers({ now: 21_000, toFake: ["Date"] });
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access(true));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(false));
    vi.mocked(prisma.campaignTrack.findMany).mockResolvedValue(rows as never);
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", campaignId: "c1", audio: null } as never);
  });

  afterEach(() => vi.useRealTimers());

  it("гравець — 403 без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await post({ action: "pause" })).status).toBe(403);
    expect(prisma.battleScene.updateMany).not.toHaveBeenCalled();
  });

  it("play з порожнього стану: пише лише audio з умовою IS NULL, version не чіпає; відповідь і Pusher після неї", async () => {
    const res = await post({ action: "play", trackId: "t2" });

    const expected = { trackId: "t2", track: { title: "Таверна", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null }, playing: true, offsetSec: 0, startedAt: 21_000, seq: 1 };

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ audio: expected });

    const call = vi.mocked(prisma.battleScene.updateMany).mock.calls[0][0] as { where: Record<string, unknown>; data: Record<string, unknown> };

    expect(call.where).toEqual({ id: "b1", campaignId: "c1", audio: { equals: Prisma.DbNull } });
    expect(Object.keys(call.data)).toEqual(["audio"]);
    expect(trigger).not.toHaveBeenCalled();

    await Promise.all(afterCallbacks.map((cb) => cb()));
    expect(trigger).toHaveBeenCalledWith("private-battle-b1", "battle-audio", { battleId: "b1", audio: expected });
  });

  it("pause: умова за попереднім seq, позиція на момент паузи", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", campaignId: "c1", audio: playing } as never);

    const res = await post({ action: "pause" });

    expect(await res.json()).toEqual({ audio: { ...playing, playing: false, offsetSec: 20, startedAt: 21_000, seq: 4 } });
    expect(vi.mocked(prisma.battleScene.updateMany).mock.calls[0][0]).toMatchObject({ where: { audio: { path: ["seq"], equals: 3 } } });
    expect(prisma.campaignTrack.findMany).not.toHaveBeenCalled();
  });

  it("гонка двох команд — 409 і без Pusher", async () => {
    vi.mocked(prisma.battleScene.updateMany).mockResolvedValueOnce({ count: 0 });

    const res = await post({ action: "next" });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: API_ERRORS.BATTLE_AUDIO_CONFLICT });
    expect(afterCallbacks).toHaveLength(0);
  });

  it("недоступна команда — 422; чужий бій — 404; невідома дія — 400", async () => {
    expect((await post({ action: "resume" })).status).toBe(422);

    vi.mocked(prisma.battleScene.findFirst).mockResolvedValueOnce(null);
    expect((await post({ action: "stop" })).status).toBe(404);

    expect((await post({ action: "seek" })).status).toBe(400);
  });

  it("audio rate limit keeps retry metadata", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 21, limit: 20, retryAfterSeconds: 17 });

    const response = await post({ action: "stop" });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("17");
    expect(prisma.battleScene.updateMany).not.toHaveBeenCalled();
  });

  it("GET для учасника: поточний стан без кешу", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ id: "b1", campaignId: "c1", audio: playing } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/audio/route");

    const res = await GET(new Request("http://x"), { params: Promise.resolve(params) });

    expect(await res.json()).toEqual({ audio: playing });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
