import { describe, expect, it, vi } from "vitest";

const updateMany = vi.fn(async () => ({ count: 1 }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { campaignShow: { findUnique: vi.fn(), updateMany } } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: vi.fn() } }));

const spec = { cut: "classic" as const, count: 4, seed: 1, imageWidth: 100, imageHeight: 100 };

const state = {
  deckId: "d1",
  deckTitle: "Н",
  slide: { id: "slide-0001", imageUrl: "https://a/1.webp", kind: "puzzle" as const, puzzle: spec },
  nextImageUrl: null,
  audio: null,
  puzzle: { pieces: { p0: { x: 1, y: 2, rot: 45, place: "tray" as const, correct: false } }, solved: false },
  seq: 3,
};

describe("show-store puzzle round trip", () => {
  it("writeShowState nests puzzle state inside slide, toShowState splits it back", async () => {
    const { toShowState, writeShowState } = await import("../show-store");

    await writeShowState("c1", { ...state, seq: 2 }, state);

    const { slide } = (updateMany.mock.calls as unknown as [{ data: { slide: Record<string, unknown> } }][])[0][0].data;

    expect(slide.puzzleState).toEqual(state.puzzle);
    expect(slide.puzzle).toEqual(spec);

    const back = toShowState({ deckId: "d1", deckTitle: "Н", slide, nextImageUrl: null, audio: null, battle: null, cover: null, curtain: false, world: null, seq: 3 } as never);

    expect(back).toEqual(state);
  });
});
