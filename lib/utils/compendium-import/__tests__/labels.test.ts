import { describe, expect, it } from "vitest";

import { describeRulesPatch, entryLabel, groupIssues, infoSummary, issueCodeLabel, metaSummary, readablePath, REPORT_ROW_FILTERS, splitInfoIssues, summaryLines } from "../labels";

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
    expect(describeRulesPatch({ classes: { enabled: true }, conditions: { custom: [{}, {}] } })).toBe("увімкнути режим класів 5e; власні стани з книги: 2");
    expect(summaryLines({ choices: [1], skills: [1, 2], tools: [], originFeat: [{ name: "Gift" }] }).join("|")).toContain("Origin feat: «Gift»");
  });

  it("separates informational skip notices from manual actions", () => {
    const issues = [{ code: "UNSUPPORTED_CATEGORY", severity: "warning" as const, path: "foundrySpell", action: "x" }, { code: "MEDIA_OR_FOUNDRY_SKIPPED", severity: "warning" as const, path: "a", action: "x" }, { code: "MANUAL_SPELL", severity: "warning" as const, path: "b", action: "y" }];

    const { actions, info } = splitInfoIssues(issues);

    expect(actions.map(i => i.code)).toEqual(["MANUAL_SPELL"]);
    expect(infoSummary(info)).toBe("Пропущено непідтримувані категорії: foundrySpell. Пропущено медіа/Foundry-полів: 1");
  });
});

describe("report grouping", () => {
  it("groups issues by code with a human title, errors first, and keeps differing actions per item", () => {
    const issue = (code: string, path: string, action: string, severity: "warning" | "error" = "warning") => ({ code, path, action, severity });

    const groups = groupIssues([issue("MANUAL_EQUIPMENT", "a", "X"), issue("MANUAL_EQUIPMENT", "b", "Y"), issue("MANUAL_EQUIPMENT", "c", "X"), issue("UNRESOLVED_REF", "d", "Z", "error")]);

    expect(groups.map(g => g.code)).toEqual(["UNRESOLVED_REF", "MANUAL_EQUIPMENT"]);
    expect(groups[1]).toMatchObject({ title: "Спорядження видати вручну", action: "X" });
    expect(groups[1].items).toEqual([{ path: "a" }, { path: "b", action: "Y" }, { path: "c" }]);
    expect(issueCodeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  it("treats rows with manual actions as changed but not info-only rows", () => {
    const info = { code: "MEDIA_OR_FOUNDRY_SKIPPED", severity: "warning" as const, path: "p", action: "a" };

    expect(REPORT_ROW_FILTERS.changed({ status: "unchanged", issues: [info] })).toBe(false);
    expect(REPORT_ROW_FILTERS.changed({ status: "update", issues: [] })).toBe(true);
    expect(REPORT_ROW_FILTERS.manual({ status: "unchanged", issues: [{ ...info, code: "MANUAL" }] })).toBe(true);
  });
});
