import { describe, expect, it } from "vitest";

import { paragraphs, parseHighlights, toggleHighlight } from "@/lib/utils/characters/biography";

describe("biography highlights", () => {
  it("розбирає виділення", () => {
    expect(parseHighlights("а ==б== в")).toEqual([
      { text: "а ", marked: false },
      { text: "б", marked: true },
      { text: " в", marked: false },
    ]);
  });

  it("незакритий маркер і порожнє виділення лишаються текстом", () => {
    expect(parseHighlights("а ==б")).toEqual([{ text: "а ==б", marked: false }]);
    expect(parseHighlights("а ==== б")).toEqual([{ text: "а ==== б", marked: false }]);
  });

  it("HTML лишається текстом", () => {
    expect(parseHighlights("==<script>x</script>==")).toEqual([{ text: "<script>x</script>", marked: true }]);
  });

  it("обгортає виділення без пробілів по краях і зсуває курсор", () => {
    expect(toggleHighlight("мати загинула тут", 0, 14)).toEqual({ text: "==мати загинула== тут", start: 2, end: 15 });
  });

  it("знімає виділення, якщо курсор всередині підсвіченого", () => {
    expect(toggleHighlight("а ==брат== в", 5, 7)).toEqual({ text: "а брат в", start: 2, end: 6 });
  });

  it("прибирає вкладені маркери при обгортанні", () => {
    expect(toggleHighlight("а ==б== в", 0, 9).text).toBe("==а б в==");
  });

  it("порожнє виділення нічого не змінює", () => {
    expect(toggleHighlight("abc", 1, 1)).toEqual({ text: "abc", start: 1, end: 1 });
  });

  it("абзаци за порожнім рядком", () => {
    expect(paragraphs("а\nб\n\nв\n\n\n")).toEqual(["а\nб", "в"]);
  });
});
