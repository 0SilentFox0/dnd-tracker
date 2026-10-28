import { describe, expect, it } from "vitest";

import { categoryInventory, compendiumErrorMessage, destination, excludeBlocked, projectInput } from "../flow";

import { ApiError } from "@/lib/api/client";

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

describe("projectInput record size", () => {
  const big = { name: "x", entries: Array.from({ length: 4 }, () => "x".repeat(100_000)) };

  it("ignores oversized records outside the selection and in book material", () => {
    expect(() => projectInput({ monster: [big], bookData: [{ id: "B", data: [big, big] }] }, ["bookData"])).not.toThrow();
  });

  it("rejects an oversized record in a selected category", () => {
    expect(() => projectInput({ monster: [big] }, ["monster"])).toThrow("RECORD_SIZE: monster");
  });
  it("tells the DM that a missing preview secret makes import unavailable", () => {
    const message = compendiumErrorMessage(new ApiError("x", 503, "/preview", { code: "PREVIEW_SECRET_REQUIRED" }), "fallback");

    expect(message).toContain("COMPENDIUM_PREVIEW_SECRET");
    expect(message).toContain("Імпорт недоступний");
  });
});
