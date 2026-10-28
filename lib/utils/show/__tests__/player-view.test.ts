import { describe, expect, it } from "vitest";

import { stageMode } from "../player-view";

import type { ShowState } from "@/types/show";

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
