import { describe, expect, it } from "vitest";

import { hasMarkdownTable, parseMarkdownLite } from "@/lib/utils/text/markdown-lite";

const dragon = `Your lineage stems from a dragon.

Table: Draconic Ancestors

| Dragon | Damage Type |
|---|---|
| Black | Acid |
| Brass |Fire |
|Gold|Fire|`;

describe("parseMarkdownLite", () => {
  it("splits text and a pipe table with uneven spacing", () => {
    const blocks = parseMarkdownLite(dragon);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ kind: "text", text: "Your lineage stems from a dragon.\n\nTable: Draconic Ancestors" });
    expect(blocks[1]).toEqual({ kind: "table", header: ["Dragon", "Damage Type"], rows: [["Black", "Acid"], ["Brass", "Fire"], ["Gold", "Fire"]] });
  });

  it("keeps text after the table", () => {
    const blocks = parseMarkdownLite("| A |\n|---|\n| 1 |\n\nafter");

    expect(blocks.map((b) => b.kind)).toEqual(["table", "text"]);
  });

  it("a line with a pipe but no separator stays text", () => {
    expect(parseMarkdownLite("a | b")).toEqual([{ kind: "text", text: "a | b" }]);
    expect(hasMarkdownTable("a | b")).toBe(false);
    expect(hasMarkdownTable(dragon)).toBe(true);
  });

  it("empty input gives no blocks", () => {
    expect(parseMarkdownLite("  ")).toEqual([]);
  });
});
