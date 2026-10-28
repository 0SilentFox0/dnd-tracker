import { describe, expect, it } from "vitest";

import { sectionDone } from "@/lib/utils/scenario/reveal";
import type { ScenarioSection } from "@/types/scenario";

const s = (over: Partial<ScenarioSection> = {}): ScenarioSection => ({ id: "s1", title: "1.0", played: false, revealedAt: null, rows: [], ...over });

describe("sectionDone", () => {
  it("сцена: done = played", () => {
    expect(sectionDone(s({ played: true }), false)).toEqual({ done: true, byPlay: false });
    expect(sectionDone(s(), false)).toEqual({ done: false, byPlay: false });
  });

  it("герой: revealedAt відкриває главу", () => {
    expect(sectionDone(s({ revealedAt: "2026-10-21" }), true)).toEqual({ done: true, byPlay: false });
  });

  it("герой: глава відкрита зіграним розділом іншої сторінки", () => {
    const section = s({ reveal: { mode: "afterSection", pageId: "p", sectionId: "x" } });

    expect(sectionDone(section, true, (pageId, sectionId) => pageId === "p" && sectionId === "x")).toEqual({ done: true, byPlay: true });
    expect(sectionDone(section, true)).toEqual({ done: false, byPlay: false });
  });

  it("герой: played ігнорується", () => {
    expect(sectionDone(s({ played: true }), true).done).toBe(false);
  });
});
