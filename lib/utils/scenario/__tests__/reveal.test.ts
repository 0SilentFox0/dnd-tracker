import { describe, expect, it } from "vitest";

import { isChapterOpen, newlyPlayedSections, openChapters, playedLookup, revealTargets } from "@/lib/utils/scenario/reveal";
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

  it("openChapters: прив'язки рядків (slide, battleId) ніколи не потрапляють до гравців", () => {
    const bound: ScenarioContent = {
      legend: [],
      sections: [{ id: "h1", title: "Історія", played: false, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r1", story: p("Відкрито"), notes: p("нотатка"), slide: { deckId: "deck-secret", slideId: "slide-secret" }, battleId: "battle-secret" }] }],
    };

    const json = JSON.stringify(openChapters(bound, playedLookup([])));

    expect(json).toContain("Відкрито");
    expect(json).not.toMatch(/deck-secret|slide-secret|battle-secret|slide|battleId/);
  });
});

describe("newlyPlayedSections", () => {
  const sec = (id: string, played: boolean) => ({ id, title: id, played, rows: [] });

  const content = (...sections: ReturnType<typeof sec>[]): ScenarioContent => ({ legend: [], sections });

  it("returns sections that went from not played to played", () => {
    expect(newlyPlayedSections(content(sec("a", false), sec("b", true)), content(sec("a", true), sec("b", true)))).toEqual(["a"]);
  });

  it("ignores played to not played and unchanged sections", () => {
    expect(newlyPlayedSections(content(sec("a", true), sec("b", false)), content(sec("a", false), sec("b", false)))).toEqual([]);
  });

  it("treats a new section as played only when it is created played", () => {
    expect(newlyPlayedSections(content(), content(sec("n1", false), sec("n2", true)))).toEqual(["n2"]);
  });
});
