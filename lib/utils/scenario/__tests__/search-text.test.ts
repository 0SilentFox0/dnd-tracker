import { describe, expect, it } from "vitest";

import { buildSearchText, sectionLead, snippetFromWindow } from "@/lib/utils/scenario/search-text";

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const content = {
  legend: [],
  sections: [
    { id: "s10", title: "Собор", played: false, rows: [{ id: "r1", story: p("Дзвони обриваються"), notes: p("Біара знає\nпро тавро") }] },
    { id: "s11", title: "Монастир", played: false, rows: [{ id: "r2", story: p("Беатріс біля брами"), notes: p("") }] },
  ],
};

describe("search text", () => {
  it("нормалізує до NFC", () => {
    const text = buildSearchText("Й".normalize("NFD"), { legend: [], sections: [] });

    expect(text).toBe("Й".normalize("NFC"));
  });

  it("рядок на розділ з префіксом id; переноси всередині — пробіли", () => {
    const text = buildSearchText("Монастир Світла", content);

    expect(text.split("\n")).toEqual(["Монастир Світла", "§s10\tСобор Дзвони обриваються Біара знає про тавро", "§s11\tМонастир Беатріс біля брами"]);
  });

  it("snippetFromWindow: обрізає по рядку, додає … з боків", () => {
    expect(snippetFromWindow({ win: "Собор Дзвони обриваються", at: 6, cutBefore: false, needleLength: 6 })).toBe("Собор Дзвони обриваються");
    expect(snippetFromWindow({ win: "ний Дзвони обриваються\n§s11\tМонастир", at: 4, cutBefore: true, needleLength: 6 })).toBe("…ний Дзвони обриваються");
    expect(snippetFromWindow({ win: `Дзвони ${"а".repeat(80)}`, at: 0, cutBefore: false, needleLength: 6 })).toBe(`Дзвони ${"а".repeat(59)}…`);
    expect(snippetFromWindow({ win: "🎲🎲 Дзвони обриваються", at: 3, cutBefore: false, needleLength: 6 })).toBe("🎲🎲 Дзвони обриваються");
    expect(snippetFromWindow({ win: "x", at: -1, cutBefore: false, needleLength: 1 })).toBeNull();
  });
});

describe("sectionLead", () => {
  it("strips the title prefix", () => {
    expect(sectionLead("Собор Дзвони обриваються", "Собор", 90)).toBe("Дзвони обриваються");
  });

  it("returns empty for a title-only line", () => {
    expect(sectionLead("Собор", "Собор", 90)).toBe("");
  });

  it("truncates by code point without splitting emoji", () => {
    expect(sectionLead("T 😀😀😀😀", "T", 2)).toBe("😀😀…");
  });

  it("does not add an ellipsis when it fits", () => {
    expect(sectionLead("T abc", "T", 3)).toBe("abc");
  });
});
