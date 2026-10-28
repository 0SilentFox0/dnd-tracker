import { describe, expect, it } from "vitest";

import { describeRulesPatch, entryLabel, infoSummary, metaSummary, readablePath, splitInfoIssues, summaryLines } from "../labels";

const key = JSON.stringify([1, "feat", "obojimatallgrass", "classic", "cloud hopper", []]);

describe("compendium labels", () => {
  it("renders canonical keys as kind, name and source", () => {
    expect(entryLabel(key)).toBe("Риса «cloud hopper» · obojimatallgrass");
    expect(entryLabel(JSON.stringify([1, "subclass", "s", "classic", "the lantern", ["warlock", "phb"]]))).toBe("Підклас «the lantern» (warlock, phb) · s");
  });

  it("renders key and input-array issue paths without raw tuples", () => {
    expect(readablePath(`${key}.spellcasting.spells.0.spellId`)).toBe("Риса «cloud hopper» · obojimatallgrass · поле spellcasting.spells.0.spellId");
    expect(readablePath(key)).not.toContain("[1");
    expect(readablePath("spell[0]")).toBe("Заклинання №1 у файлі");
    expect(readablePath("bookData[2].data[1]")).toBe("Сторінки книги №3 у файлі · data[1]");
    expect(readablePath("rules.classes")).toBe("rules.classes");
  });

  it("summarizes sources, rules patch and background summaries readably", () => {
    expect(metaSummary({ edition: "classic", sources: [{ json: "X", full: "Book", abbreviation: "BK", authors: ["A", "B"], version: "1.0" }] })).toEqual({ sources: ["Book (BK) — A, B v1.0"], edition: "класична 5e" });
    expect(describeRulesPatch({ classes: { enabled: true } })).toBe("увімкнути режим класів 5e");
    expect(describeRulesPatch(undefined)).toBe("немає");
    expect(summaryLines({ choices: [1], skills: [1, 2], tools: [], originFeat: [{ name: "Gift" }] }).join("|")).toContain("Origin feat: «Gift»");
  });

  it("separates informational skip notices from manual actions", () => {
    const issues = [{ code: "UNSUPPORTED_CATEGORY", severity: "warning" as const, path: "foundrySpell", action: "x" }, { code: "MEDIA_OR_FOUNDRY_SKIPPED", severity: "warning" as const, path: "a", action: "x" }, { code: "MANUAL_SPELL", severity: "warning" as const, path: "b", action: "y" }];

    const { actions, info } = splitInfoIssues(issues);

    expect(actions.map(i => i.code)).toEqual(["MANUAL_SPELL"]);
    expect(infoSummary(info)).toBe("Пропущено непідтримувані категорії: foundrySpell. Пропущено медіа/Foundry-полів: 1");
  });
});
