import { describe, expect, it } from "vitest";

import { buildSearchText, findSnippet } from "@/lib/utils/scenario/search-text";

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const content = {
  legend: [],
  sections: [
    { id: "s10", title: "Собор", played: false, rows: [{ id: "r1", story: p("Дзвони обриваються"), notes: p("Біара знає\nпро тавро") }] },
    { id: "s11", title: "Монастир", played: false, rows: [{ id: "r2", story: p("Беатріс біля брами"), notes: p("") }] },
  ],
};

describe("search text", () => {
  it("рядок на розділ з префіксом id; переноси всередині — пробіли", () => {
    const text = buildSearchText("Монастир Світла", content);

    expect(text.split("\n")).toEqual(["Монастир Світла", "§s10\tСобор Дзвони обриваються Біара знає про тавро", "§s11\tМонастир Беатріс біля брами"]);
  });

  it("findSnippet знаходить розділ без урахування регістру", () => {
    const hit = findSnippet(buildSearchText("Монастир Світла", content), "БЕАТРІС");

    expect(hit).toMatchObject({ sectionId: "s11" });
    expect(hit?.snippet).toContain("Беатріс");
  });

  it("збіг у назві сторінки — sectionId null; немає збігу — null", () => {
    expect(findSnippet(buildSearchText("Монастир Світла", content), "світла")?.sectionId).toBeNull();
    expect(findSnippet(buildSearchText("Монастир Світла", content), "дракон")).toBeNull();
  });
});
