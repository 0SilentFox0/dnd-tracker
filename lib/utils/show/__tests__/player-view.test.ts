import { describe, expect, it } from "vitest";

import { isRestricted, playerShowView, stageMode, toClientShow } from "../player-view";

import type { BattleAudioState } from "@/types/audio";
import type { ShowState, Slide } from "@/types/show";

const base: ShowState = { deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, seq: 1 };

const slide = { id: "slide-0001", imageUrl: "https://a/1.webp" };

describe("stageMode", () => {
  it("picks the mode by priority", () => {
    expect(stageMode(null)).toBe("waiting");
    expect(stageMode(base)).toBe("waiting");
    expect(stageMode({ ...base, slide })).toBe("slide");
    expect(stageMode({ ...base, slide, world: { mapId: "m" } })).toBe("world");
    expect(stageMode({ ...base, world: { mapId: "m" } })).toBe("world");
    expect(stageMode({ ...base, slide, world: { mapId: "m" }, curtain: true })).toBe("cover");
  });

  it("puzzle slide gives puzzle mode unless curtain or world", () => {
    const puzzleSlide = { ...slide, kind: "puzzle" as const, puzzle: { cut: "classic" as const, count: 6, seed: 1, imageWidth: 100, imageHeight: 100 } };

    expect(stageMode({ ...base, slide: puzzleSlide })).toBe("puzzle");
    expect(stageMode({ ...base, slide: puzzleSlide, curtain: true })).toBe("cover");
    expect(stageMode({ ...base, slide: puzzleSlide, world: { mapId: "m" } })).toBe("world");
  });
});

describe("playerShowView", () => {
  const sl = (n: number, over: Partial<Slide> = {}): Slide => ({ id: `slide-000${n}`, imageUrl: `https://a/${n}.webp`, caption: `c${n}`, ...over });

  const pub = sl(1);

  const secret = sl(2, { audience: ["h1", "h2"], trackId: "t2" });

  const secret2 = sl(3, { audience: ["h3"] });

  const state = (current: Slide, trail: Slide[], over: Partial<ShowState> = {}): ShowState => ({ ...base, deckId: "d", slide: current, nextImageUrl: "https://a/next.webp", trail: trail.map((x) => ({ slide: x })), ...over });

  it("keeps a public slide and strips trail", () => {
    const view = playerShowView(state(pub, [pub]), []);

    expect(view.slide).toEqual(pub);
    expect(view.trail).toBeUndefined();
    expect(view.nextImageUrl).toBe("https://a/next.webp");
  });

  it("shows a restricted slide to a listed hero without the audience field", () => {
    const view = playerShowView(state(secret, [pub, secret]), ["x", "h2"]);

    expect(view.slide).toEqual({ id: secret.id, imageUrl: secret.imageUrl, caption: "c2", trackId: "t2" });
  });

  it("falls back to the last slide the heroes can see", () => {
    const view = playerShowView(state(secret2, [pub, secret, secret2]), ["h1"]);

    expect(view.slide).toEqual({ id: secret.id, imageUrl: secret.imageUrl, caption: "c2", trackId: "t2" });
    expect(view.nextImageUrl).toBeNull();
    expect(JSON.stringify(view)).not.toContain("a/3.webp");
  });

  it("falls back to the public slide when nothing matches", () => {
    const view = playerShowView(state(secret, [pub, secret]), ["nobody"]);

    expect(view.slide?.id).toBe(pub.id);
    expect(JSON.stringify(view)).not.toContain("a/2.webp");
  });

  it("returns no slide when the trail has nothing visible", () => {
    expect(playerShowView(state(secret, [secret]), []).slide).toBeNull();
    expect(playerShowView(state(secret, []), []).slide).toBeNull();
  });

  it("keeps curtain and world but never ships a hidden slide under them", () => {
    const curtained = playerShowView(state(secret, [pub, secret], { curtain: true }), []);

    expect(curtained.curtain).toBe(true);
    expect(curtained.slide?.id).toBe(pub.id);
    expect(playerShowView(state(secret, [secret], { world: { mapId: "m" } }), []).world).toEqual({ mapId: "m" });
    expect(JSON.stringify(curtained)).not.toContain("a/2.webp");
  });

  it("keeps the puzzle of a public puzzle slide", () => {
    const puzzle = { pieces: {}, solved: false };

    expect(playerShowView(state(sl(4, { kind: "puzzle" }), [], { puzzle }), []).puzzle).toBe(puzzle);
  });

  it("drops the puzzle state on fallback", () => {
    expect(playerShowView(state(secret, [pub, secret], { puzzle: { pieces: {}, solved: false } }), []).puzzle).toBeUndefined();
  });

  describe("music", () => {
    const track = (trackId: string) => ({ trackId, track: { title: "t", kind: "file", url: "https://a/x.mp3", youtubeId: null, durationSec: 10 }, playing: true, offsetSec: 0, startedAt: 1, seq: 1 }) as unknown as BattleAudioState;

    it("is silent when the playing track was started by a hidden slide", () => {
      expect(playerShowView(state(secret, [pub, secret], { audio: track("t2") }), []).audio).toBeNull();
    });

    it("keeps the track of a public slide", () => {
      const a = track("t1");

      expect(playerShowView(state(secret2, [sl(1, { trackId: "t1" }), secret2], { audio: a }), []).audio).toBe(a);
    });

    it("hears the hidden-slide track when the hero is in the audience", () => {
      const a = track("t2");

      expect(playerShowView(state(secret, [pub, secret], { audio: a }), ["h1"]).audio).toBe(a);
    });
  });
});

describe("isRestricted / toClientShow", () => {
  const restricted = { id: "slide-0002", imageUrl: "u", audience: ["h1"] };

  it("is restricted only while the current slide is limited", () => {
    expect(isRestricted(null)).toBe(false);
    expect(isRestricted({ ...base, slide: restricted, trail: [{ slide: restricted }] })).toBe(true);
    expect(isRestricted({ ...base, slide, trail: [{ slide }] })).toBe(false);
    expect(isRestricted({ ...base, slide, trail: [{ slide: restricted }] })).toBe(false);
  });

  it("strips trail for clients", () => {
    expect(toClientShow({ ...base, trail: [{ slide }] })).toEqual(base);
  });
});
