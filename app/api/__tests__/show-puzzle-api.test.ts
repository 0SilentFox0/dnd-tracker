import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { generatePuzzle } from "@/lib/utils/puzzle/generate";
import { initPuzzle } from "@/lib/utils/puzzle/puzzle-command";

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: vi.fn(async () => undefined) } }));
vi.mock("@/lib/utils/api/rate-limit", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })) }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaignShow: { findUnique: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn(async () => ({ displayName: "Аліса" })) },
  },
}));

const spec = { cut: "classic" as const, count: 6, seed: 3, imageWidth: 1200, imageHeight: 800 };

const pieceId = generatePuzzle(spec)[0].id;

const row = (seq = 5, puzzleState: unknown = initPuzzle(spec)) => ({
  deckId: "d1",
  deckTitle: "Н",
  slide: { id: "slide-0001", imageUrl: "https://a/1.webp", kind: "puzzle", puzzle: spec, puzzleState },
  nextImageUrl: null,
  audio: null,
  battle: null,
  cover: null,
  curtain: false,
  world: null,
  seq,
});

const access = (isDM: boolean) => ({ userId: isDM ? "dm" : "p1", isDM, campaign: { id: "c1", maxLevel: 20, members: [] } }) as never;

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/campaigns/[id]/show/puzzle/route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1" }) });
};

describe("puzzle API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(false));
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.campaignShow.updateMany).mockResolvedValue({ count: 1 });
  });

  it("player grab writes the holder with the display name and publishes", async () => {
    const res = await post({ action: "puzzleGrab", pieceId });

    expect(res.status).toBe(200);

    const { slide } = vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0].data as { slide: { puzzleState: { pieces: Record<string, { holder: unknown }> } } };

    expect(slide.puzzleState.pieces[pieceId].holder).toMatchObject({ userId: "p1", name: "Аліса" });
    expect(afterCallbacks).toHaveLength(1);
  });

  it("unauthenticated is passed through", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 401 }) as never);

    expect((await post({ action: "puzzleGrab", pieceId })).status).toBe(401);
  });

  it("invalid body is 400", async () => {
    expect((await post({ action: "puzzleDrop", pieceId })).status).toBe(400);
  });

  it("a taken piece is 422", async () => {
    const state = initPuzzle(spec);

    state.pieces[pieceId].holder = { userId: "other", name: "Боб", until: Date.now() + 60_000 };
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(row(5, state) as never);

    const res = await post({ action: "puzzleGrab", pieceId });

    expect(res.status).toBe(422);
    expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
  });

  it("player release/reset is 403, DM is fine", async () => {
    expect((await post({ action: "puzzleRelease" })).status).toBe(403);
    expect((await post({ action: "puzzleReset" })).status).toBe(403);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(true));

    expect((await post({ action: "puzzleReset" })).status).toBe(200);
  });

  it("retries a seq conflict and gives 409 after 3 attempts", async () => {
    vi.mocked(prisma.campaignShow.updateMany).mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    expect((await post({ action: "puzzleGrab", pieceId })).status).toBe(200);
    expect(prisma.campaignShow.updateMany).toHaveBeenCalledTimes(2);

    vi.mocked(prisma.campaignShow.updateMany).mockReset().mockResolvedValue({ count: 0 });

    expect((await post({ action: "puzzleGrab", pieceId })).status).toBe(409);
    expect(prisma.campaignShow.updateMany).toHaveBeenCalledTimes(3);
  });

  it("no puzzle on screen is 422", async () => {
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(null);

    expect((await post({ action: "puzzleGrab", pieceId })).status).toBe(422);
  });
});
