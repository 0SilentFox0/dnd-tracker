import { describe, expect, it } from "vitest";

import { planSlugBackfill } from "../lib/backfill-slugs";
import { planLocaleBackfill } from "../lib/locale-backfill";
import { pruneOrder } from "../lib/prune";
import { assertNoDuplicatesFromUnslugged, slugsToCreate } from "../lib/slug-guard";

const row = (slug: string, name = slug) => ({ slug, name });

const keyOf = (r: { name?: string }) => String(r.name).toLowerCase();

describe("slugsToCreate / assertNoDuplicatesFromUnslugged (D33)", () => {
  it("creates nothing when every pack row matches by slug or by the name of an unslugged row", () => {
    expect(slugsToCreate([row("a"), row("b", "Old")], keyOf, [{ slug: "a", key: "a" }, { slug: null, key: "old" }])).toEqual([]);
  });

  it("lists a pack row that matches nothing", () => {
    expect(slugsToCreate([row("a"), row("c", "New")], keyOf, [{ slug: "a", key: "a" }])).toEqual(["c"]);
  });

  it("refuses to create next to unslugged rows, and allows it when all rows are slugged", () => {
    expect(() => assertNoDuplicatesFromUnslugged("units", [row("c", "New")], keyOf, [{ slug: null, key: "legacy" }])).toThrow(/Refusing to create 1 units row\(s\) while 1 row\(s\).*backfill-slugs/);
    expect(() => assertNoDuplicatesFromUnslugged("units", [row("c", "New")], keyOf, [{ slug: "a", key: "a" }])).not.toThrow();
    expect(() => assertNoDuplicatesFromUnslugged("units", [row("legacy", "Legacy")], keyOf, [{ slug: null, key: "legacy" }])).not.toThrow();
  });
});

describe("pruneOrder", () => {
  it("deletes artifacts before their sets and dependents before dependencies", () => {
    const order = pruneOrder(["spell-groups", "spells", "races", "units", "main-skills", "skills", "artifact-sets", "artifacts", "skillTrees", "tracks"]);

    expect(order.indexOf("artifacts")).toBeLessThan(order.indexOf("artifact-sets"));
    expect(order.indexOf("skills")).toBeLessThan(order.indexOf("main-skills"));
    expect(order.indexOf("units")).toBeLessThan(order.indexOf("races"));
    expect(order.indexOf("spells")).toBeLessThan(order.indexOf("spell-groups"));
    expect([...order].sort()).toEqual(["artifact-sets", "artifacts", "main-skills", "races", "skillTrees", "skills", "spell-groups", "spells", "tracks", "units"]);
  });
});

describe("planSlugBackfill (D33)", () => {
  it("slugs unslugged rows from the map by id and leaves slugged rows alone", () => {
    const { plan, unmapped, collisions } = planSlugBackfill({ units: [{ id: "u1", slug: null, label: "A" }, { id: "u2", slug: "b", label: "B" }] }, { units: { u1: "a" } });

    expect({ plan, unmapped, collisions }).toEqual({ plan: [{ kind: "units", id: "u1", slug: "a" }], unmapped: [], collisions: [] });
  });

  it("reports an id outside the map and a slug already taken", () => {
    const { plan, unmapped, collisions } = planSlugBackfill({ units: [{ id: "u1", slug: null, label: "A" }, { id: "u2", slug: null, label: "B" }, { id: "u3", slug: "a", label: "C" }] }, { units: { u1: "a" } });

    expect(plan).toEqual([]);
    expect(unmapped.map((r) => r.id)).toEqual(["u2"]);
    expect(collisions).toEqual(['units u1: slug "a" is already taken']);
  });
});

describe("planLocaleBackfill (D34)", () => {
  it("picks clones without a locale only", () => {
    expect(planLocaleBackfill([{ id: "a", name: "A", locale: null }, { id: "b", name: "B", locale: "en" }, { id: "c", name: "C", locale: "uk" }])).toEqual(["a"]);
  });
});
