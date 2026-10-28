import { describe, expect, it } from "vitest";

import { isChapterOpen, openChapters, playedLookup, revealTargets } from "@/lib/utils/scenario/reveal";
import type { ScenarioContent } from "@/types/scenario";

const p = (text: string, secret = false) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text, ...(secret && { marks: [{ type: "secret" as const }] }) }] }] });

const hero: ScenarioContent = {
  legend: [],
  sections: [
    { id: "h1", title: "Історія", played: false, reveal: { mode: "manual" }, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r1", story: p("Відкрито"), notes: p("нотатка DM") }] },
    { id: "h2", title: "Після собору", played: false, reveal: { mode: "afterSection", pageId: "scene1", sectionId: "s10" }, rows: [{ id: "r2", story: p("Друга глава"), notes: p("") }] },
    { id: "h3", title: "Таємниця", played: false, reveal: { mode: "manual" }, rows: [{ id: "r3", story: p("Закрито"), notes: p("") }] },
    { id: "h4", title: "Видалене", played: false, reveal: { mode: "afterSection", pageId: "gone", sectionId: "x" }, rows: [{ id: "r4", story: p("Ніколи"), notes: p("") }] },
    { id: "h5", title: "Лише секрет", played: false, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r5", story: p("тсс", true), notes: p("") }] },
  ],
};

describe("reveal", () => {
  const played = playedLookup([{ id: "scene1", played: ["s10"] }]);

  it("revealTargets — лише afterSection", () => {
    expect(revealTargets(hero.sections)).toEqual([{ pageId: "scene1", sectionId: "s10" }, { pageId: "gone", sectionId: "x" }]);
  });

  it("isChapterOpen: revealedAt або зіграний цільовий розділ; видалена ціль — закрито", () => {
    expect(hero.sections.map((s) => isChapterOpen(s, played))).toEqual([true, true, false, false, true]);
  });

  it("openChapters: лише story, без секретів і порожніх рядків", () => {
    const chapters = openChapters(hero, played);

    expect(chapters.map((c) => c.id)).toEqual(["h1", "h2", "h5"]);
    expect(JSON.stringify(chapters)).not.toContain("нотатка DM");
    expect(chapters[2].rows).toEqual([]);
  });
});
