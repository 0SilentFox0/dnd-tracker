import { describe, expect, it } from "vitest";

import { autoAddedPreview, defaultSelection, formatUsage, groupItems, itemKey, toRefs, usageTotals } from "@/lib/utils/campaigns/source-sync";
import type { SourceDiffItem } from "@/types/campaigns";

const item = (over: Partial<SourceDiffItem>): SourceDiffItem => ({
  scope: "spells",
  key: "k",
  localId: null,
  name: "X",
  status: "new",
  changedFields: [],
  sourceHash: "h",
  requires: [],
  ...over,
});

describe("source sync selection", () => {
  it("defaults: new and updated on; conflict and deletions off", () => {
    const items = [
      item({ key: "a", status: "new" }),
      item({ key: "b", status: "updated" }),
      item({ key: "c", status: "conflict" }),
      item({ key: "d", status: "deletedInSource", sourceHash: null }),
      item({ key: "e", status: "deletedLocally" }),
    ];

    expect([...defaultSelection(items)]).toEqual(["spells:a", "spells:b"]);
  });

  it("groups rules and settings first, then tables in bundle order, skipping empty groups", () => {
    const groups = groupItems([item({ scope: "units", key: "u" }), item({ scope: "rules", key: "morale" }), item({ scope: "spellGroups", key: "g" })]);

    expect(groups.map((g) => g.scope)).toEqual(["rules", "spellGroups", "units"]);
    expect(groups[0].label).toBe("Правила");
  });

  it("autoAddedPreview lists requires that are not selected, once", () => {
    const race = item({ scope: "races", key: "r", name: "Inferno" });

    const unit = item({ scope: "units", key: "u", requires: [{ scope: "races", key: "r", name: "Inferno" }] });

    const unit2 = item({ scope: "units", key: "u2", requires: [{ scope: "races", key: "r", name: "Inferno" }] });

    const items = [race, unit, unit2];

    expect(autoAddedPreview(items, new Set([itemKey(unit), itemKey(unit2)]))).toEqual([{ scope: "races", key: "r", name: "Inferno" }]);
    expect(autoAddedPreview(items, new Set([itemKey(unit), itemKey(race)]))).toEqual([]);
  });

  it("autoAddedPreview follows requires transitively through items in the diff", () => {
    const school = item({ scope: "spellGroups", key: "s", name: "School" });

    const race = item({ scope: "races", key: "r", name: "Inferno", requires: [{ scope: "spellGroups", key: "s", name: "School" }] });

    const unit = item({ scope: "units", key: "u", requires: [{ scope: "races", key: "r", name: "Inferno" }] });

    const out = autoAddedPreview([school, race, unit], new Set([itemKey(unit)]));

    expect(out.map((r) => r.key)).toEqual(["r", "s"]);
  });

  it("usageTotals sums usage across items", () => {
    expect(usageTotals([item({ usage: { characters: 2, content: 1 } }), item({ key: "b" }), item({ key: "c", usage: { characters: 1, content: 0 } })])).toEqual({ characters: 3, content: 1 });
  });

  it("toRefs keeps scope, key, sourceHash and status of selected items", () => {
    const a = item({ key: "a", sourceHash: "h1", status: "conflict" });

    expect(toRefs([a, item({ key: "b" })], new Set([itemKey(a)]))).toEqual([{ scope: "spells", key: "a", sourceHash: "h1", status: "conflict" }]);
  });
});

describe("formatUsage", () => {
  it("pluralizes both counts and skips zeros", () => {
    expect(formatUsage({ characters: 2, content: 1 })).toBe("2 персонажі, 1 запис");
    expect(formatUsage({ characters: 5, content: 0 })).toBe("5 персонажів");
    expect(formatUsage({ characters: 0, content: 3 })).toBe("3 записи");
  });

  it("returns null when nothing uses it", () => {
    expect(formatUsage({ characters: 0, content: 0 })).toBeNull();
  });
});
