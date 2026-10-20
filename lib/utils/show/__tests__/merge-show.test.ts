import { describe, expect, it } from "vitest";

import { mergeShow } from "../merge-show";

import type { ShowState } from "@/types/show";

const st = (seq: number): ShowState => ({ deckId: "d1", deckTitle: "Т", slide: null, nextImageUrl: null, audio: null, seq });

describe("mergeShow", () => {
  it("бере новіший за seq, старіший і null ігнорує", () => {
    const cached = st(5);

    expect(mergeShow(cached, st(6))).toEqual(st(6));
    expect(mergeShow(cached, st(4))).toBe(cached);
    expect(mergeShow(cached, st(5))).toBe(cached);
    expect(mergeShow(cached, null)).toBe(cached);
    expect(mergeShow(null, st(1))).toEqual(st(1));
  });
});
