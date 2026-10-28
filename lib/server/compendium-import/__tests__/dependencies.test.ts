import { describe, expect, it } from "vitest";

import { buildDependencyClosure } from "../dependencies";
import { canonicalKey } from "../identity";

describe("explicit template dependency closure", () => {
  const refKey = canonicalKey("class", "Mage", "Core", "classic");

  const template = { id: "template", edition: "one" as const, rows: [{ id: "cls", kind: "classes" as const, body: { name: "Mage", features: [], subclasses: [], choices: [], spellId: "spell" } }, { id: "spell", kind: "spells" as const, body: { name: "Light", level: 0, groupId: "school", icon: "https://invalid.test/image" } }, { id: "school", kind: "spell-groups" as const, body: { name: "School" } }] };

  it("requires explicit mixed-edition consent and copies only the dependency closure", () => {
    const choices = [{ refKey, templateId: "template", kind: "classes" as const, localId: "cls", edition: "one" as const }];

    expect(() => buildDependencyClosure([template], choices, false)).toThrow(/MIXED_EDITION/);

    const result = buildDependencyClosure([template], choices, true);

    expect(result.entries).toHaveLength(3);
    expect(result.aliases[refKey]).toBe(result.entries.find((e) => e.kind === "classes")?.key);
    expect(result.entries.find((e) => e.kind === "spells")?.body).not.toHaveProperty("icon");
    expect(result.entries.find((e) => e.kind === "spells")?.refs).toMatchObject([{ path: ["groupId"] }]);
  });

  it("rejects a wrong kind or missing template target", () => {
    expect(() => buildDependencyClosure([template], [{ refKey, templateId: "template", kind: "feats", localId: "cls", edition: "one" }], true)).toThrow();
    expect(() => buildDependencyClosure([], [{ refKey, templateId: "missing", kind: "classes", localId: "cls", edition: "one" }], true)).toThrow();
  });
});

it("creates a bootstrapped parent before merging its imported nested option", async () => {
  const { adaptCompendium } = await import("../adapt");

  const { buildImportPlan } = await import("../plan");

  const refKey = canonicalKey("race", "People", "Absent", "one");

  const closure = buildDependencyClosure([{ id: "srd", edition: "one", rows: [{ id: "race", kind: "races", body: { name: "People", choices: [], abilities: [] } }] }], [{ refKey, templateId: "srd", kind: "races", localId: "race", edition: "one" }]);

  const parent = closure.entries[0];

  const initial = buildImportPlan({ entries: closure.entries, issues: [], sources: [] }, { campaignId: "c", existing: [] });

  const adapted = adaptCompendium({ _meta: { edition: "one" }, subrace: [{ name: "Hill", source: "S", raceName: "People", raceSource: "Absent" }] });

  const plan = buildImportPlan({ ...adapted, entries: [...adapted.entries, ...closure.entries] }, { campaignId: "c", existing: [], bindings: { [refKey]: { key: parent.key, kind: "races", edition: "one", localId: initial.writes[0].localId, body: parent.body, baseline: parent.body } } });

  expect(plan.errors).toEqual([]);
  expect(plan.writes.find(r => !r.nested)?.operation).toBe("create");
  expect(JSON.stringify(plan.writes.find(r => !r.nested)?.body)).toContain("Hill");
});
