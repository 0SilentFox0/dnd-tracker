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
});
