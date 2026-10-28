import { describe, expect, it } from "vitest";

import { categoryInventory, destination, excludeBlocked,projectInput } from "../flow";

describe("campaign compendium flow", () => {
  const root = { _meta: { sources: [{ json: "synthetic", full: "Synthetic" }] }, spell: [{ name: "Light", source: "synthetic" }], background: [], feat: [], bookData: [{ id: "notes", data: [] }], monsterFluff: [{ name: "excluded" }], foundrySpell: [{}] };

  it("selects native and nested categories by default, asks explicitly for DM materials", () => {
    const inventory = categoryInventory(root);

    expect(inventory.find(x => x.kind === "spell")).toMatchObject({ selected: true, supported: true });
    expect(inventory.find(x => x.kind === "bookData")).toMatchObject({ selected: false, supported: true });
    expect(inventory.find(x => x.kind === "foundrySpell")).toMatchObject({ selected: false, supported: false });
  });
  it("projects selected categories without media or unselected payload and keeps attribution", () => {
    const input = projectInput(root, ["spell"]);

    expect(JSON.parse(input.json)).toEqual({ _meta: root._meta, spell: root.spell, monsterFluff: [{}], foundrySpell: [{}] });
    expect(input.categories).toEqual(["spell", "monsterFluff", "foundrySpell"]);
  });
  it("rejects oversized serialized requests before fetch", () => {
    expect(() => projectInput({ spell: [{ name: '"'.repeat(1_600_000) }] }, ["spell"])).toThrow();
  });
  it("routes entities and manual actions to campaign editors", () => {
    expect(destination("c", { kind: "spells", targetId: "s" })).toBe("/campaigns/c/dm/spells/s");
    expect(destination("c", { code: "CHARACTERS_REQUIRED" })).toBe("/campaigns/c/dm/characters");
  });
  it("excludes blocked rows by root path without silently excluding valid rows", () => {
    expect(excludeBlocked([{ code: "UNRESOLVED_REF", severity: "error", path: "background[2].feat", action: "resolve" }, { code: "UNKNOWN", severity: "warning", path: "spell[0]", action: "read" }])).toEqual(["background[2]"]);
  });
});
it("projects only selected chapters while retaining book identity", () => {
  const root = { bookData: [{ id: "b", data: [{ name: "one" }, { name: "two" }] }] };

  expect(JSON.parse(projectInput(root, ["bookData"], {}, ["bookData[0].data[1]"]).json)).toEqual({ bookData: [{ id: "b", data: [{ name: "one" }] }] });
});
