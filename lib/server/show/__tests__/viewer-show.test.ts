import { beforeEach, describe, expect, it, vi } from "vitest";

const heroes = vi.fn();

const trigger = vi.fn(async () => undefined);

const updateMany = vi.fn(async () => ({ count: 1 }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { campaignShow: { findUnique: vi.fn(), updateMany } } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/pusher/safe-trigger", () => ({ safePusherTrigger: (_p: unknown, ...args: unknown[]) => trigger(...(args as [])) }));
vi.mock("@/lib/server/world/travel-store", () => ({ activePlayerHeroes: heroes }));

const pub = { id: "slide-0001", imageUrl: "https://a/public.webp" };

const secret = { id: "slide-0002", imageUrl: "https://a/secret.webp", caption: "secret caption", trackId: "t-secret", audience: ["h1"] };

const restricted = { deckId: "d", deckTitle: "D", slide: secret, nextImageUrl: "https://a/next.webp", audio: null, trail: [{ slide: pub }, { slide: secret }], seq: 5 };

const publicState = { ...restricted, slide: pub, trail: [{ slide: pub }] };

beforeEach(() => vi.clearAllMocks());

describe("showForViewer", () => {
  it("hides the restricted slide from a hero outside the audience", async () => {
    heroes.mockResolvedValue([{ id: "h2" }]);

    const { showForViewer } = await import("../viewer-show");

    const view = await showForViewer("c1", { userId: "u2", isDM: false }, restricted);

    const json = JSON.stringify(view);

    for (const leak of ["secret.webp", "secret caption", "t-secret", "next.webp", "trail", "audience"]) expect(json).not.toContain(leak);

    expect(view?.slide?.imageUrl).toBe(pub.imageUrl);
  });

  it("shows it to a hero in the audience, still without trail/audience", async () => {
    heroes.mockResolvedValue([{ id: "h1" }]);

    const { showForViewer } = await import("../viewer-show");

    const view = await showForViewer("c1", { userId: "u1", isDM: false }, restricted);

    expect(view?.slide?.imageUrl).toBe(secret.imageUrl);
    expect(JSON.stringify(view)).not.toContain("trail");
    expect(JSON.stringify(view)).not.toContain("audience");
  });

  it("gives the DM everything but the trail without a hero lookup", async () => {
    const { showForViewer } = await import("../viewer-show");

    const view = await showForViewer("c1", { userId: "dm", isDM: true }, restricted);

    expect(view?.slide?.audience).toEqual(["h1"]);
    expect(view?.trail).toBeUndefined();
    expect(heroes).not.toHaveBeenCalled();
  });

  it("skips the hero lookup for unrestricted shows", async () => {
    const { showForViewer } = await import("../viewer-show");

    const view = await showForViewer("c1", { userId: "u2", isDM: false }, publicState);

    expect(view?.slide).toEqual(pub);
    expect(heroes).not.toHaveBeenCalled();
  });
});

describe("publishShow", () => {
  it("sends only campaignId and seq when the current slide is restricted", async () => {
    const { publishShow } = await import("../show-store");

    await publishShow("c1", restricted as never);

    expect(trigger).toHaveBeenCalledWith(expect.any(String), expect.any(String), { campaignId: "c1", seq: 5 }, expect.anything());
  });

  it("sends the full state without trail otherwise", async () => {
    const { publishShow } = await import("../show-store");

    await publishShow("c1", publicState as never);

    const payload = (trigger.mock.calls[0] as unknown[])[2] as { show: Record<string, unknown>; seq: number };

    expect(payload.seq).toBe(5);
    expect(payload.show.trail).toBeUndefined();
    expect(payload.show.slide).toEqual(pub);
  });
});
