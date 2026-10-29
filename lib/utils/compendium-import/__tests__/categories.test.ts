import { describe, expect, it } from "vitest";

import { allKinds, chapterBlocks, estimateRecords, groupInventory, NOTES_LIMIT_BYTES, recommendedKinds } from "../categories";
import { compendiumErrorMessage } from "../flow";

import { ApiError } from "@/lib/api/client";

const big = { name: "Велика", entries: ["x".repeat(NOTES_LIMIT_BYTES + 10)] };

const root = {
  _meta: {},
  spell: [{}, {}],
  monster: [{}],
  race: [{}],
  condition: [{}],
  item: [{}],
  bookData: [{ id: "b", name: "Книга", data: [{ name: "Один" }, big] }],
  adventure: [{}],
  monsterFluff: [{}],
  foundrySpell: [{}],
};

describe("compendium category groups", () => {
  it("groups supported kinds by meaning and hides technical ones", () => {
    const { groups, skipped } = groupInventory(root);

    expect(groups.map((g) => [g.id, g.rows.map((r) => r.kind)])).toEqual([
      ["rules", ["condition"]],
      ["spells", ["spell"]],
      ["characters", ["race"]],
      ["items", ["item"]],
      ["bestiary", ["monster"]],
      ["dm", ["bookData", "adventure"]],
    ]);
    expect(skipped.map((r) => r.kind).sort()).toEqual(["foundrySpell", "monsterFluff"]);
  });

  it("all / recommended (no DM materials) selections", () => {
    expect(allKinds(root)).toHaveLength(7);
    expect(recommendedKinds(root).sort()).toEqual(["condition", "item", "monster", "race", "spell"]);
  });

  it("flags oversized chapters and counts only included ones in the estimate", () => {
    const [block] = chapterBlocks(root, ["bookData"]);

    expect(block.chapters.map((c) => c.oversized)).toEqual([false, true]);
    expect(estimateRecords(root, ["spell", "bookData"], [])).toBe(4);
    expect(estimateRecords(root, ["spell", "bookData"], ["bookData[0].data[1]"])).toBe(3);
    expect(estimateRecords(root, [], [])).toBe(0);
  });

  it("NOTES_SIZE error shows the record and size", () => {
    expect(compendiumErrorMessage(new ApiError("x", 422, "/preview", { code: "NOTES_SIZE", details: "feat.3: 70 КБ" }), "f")).toContain("feat.3: 70 КБ");
  });
});
