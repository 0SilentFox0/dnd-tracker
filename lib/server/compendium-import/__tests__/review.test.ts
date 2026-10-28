import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { CompendiumBundleSchema } from "../bundle";
import { canonicalKey } from "../identity";
import { buildImportPlan, type ExistingEntry } from "../plan";

const stateOf = (plan: ReturnType<typeof buildImportPlan>): ExistingEntry[] => plan.writes.filter((r) => r.provenance !== false).map((r) => ({ key: r.key, kind: r.kind, localId: r.localId, baseline: r.baseline!, body: plan.writes.find((parent) => !parent.nested && parent.localId === r.localId)?.body ?? r.body }));

const raceRoot = { race: [{ name: "People", source: "S" }], subrace: [{ name: "Hill", source: "S", raceName: "People", raceSource: "S", entries: ["Old Hill"] }, { name: "Coast", source: "S", raceName: "People", raceSource: "S", entries: ["Coast"] }] };

const klass = { name: "Mage", source: "S", hd: { faces: 8 }, classFeatures: ["Gift|Mage|S|1|S", "More|Mage|S|2|S"] };

const features = [{ name: "Gift", source: "S", className: "Mage", classSource: "S", level: 1 }, { name: "More", source: "S", className: "Mage", classSource: "S", level: 2 }].map((r) => ({ ...r, entries: [{ type: "options", count: 1, entries: [{ type: "refOptionalfeature", optionalfeature: "A|S" }] }] }));

describe("final review regressions", () => {
  it("reimports two subraces without false conflicts or unnecessary parent writes, then updates one only", () => {
    const first = buildImportPlan(adaptCompendium(raceRoot), { campaignId: "c", existing: [] });

    const second = buildImportPlan(adaptCompendium(raceRoot), { campaignId: "c", existing: stateOf(first) });

    expect(second.writes.flatMap((r) => r.issues).filter((i) => i.code === "LOCAL_CONFLICT")).toEqual([]);
    expect(second.writes.filter((r) => !r.nested).every((r) => r.operation === "unchanged")).toBe(true);

    const changed = structuredClone(raceRoot);

    changed.subrace[0].entries = ["New Hill"];

    const third = buildImportPlan(adaptCompendium(changed), { campaignId: "c", existing: stateOf(second) });

    expect(JSON.stringify(third.writes.find((r) => !r.nested)?.body)).toContain("New Hill");
    expect(JSON.stringify(third.writes.find((r) => !r.nested)?.body)).not.toContain("Old Hill");
    expect(JSON.stringify(third.writes.find((r) => !r.nested)?.body)).toContain("Coast");
  });

  it("uses distinct stable feature-choice IDs across levels and subclass array reorder", () => {
    const adapted = adaptCompendium({ class: [klass], classFeature: features, optionalfeature: [{ name: "A", source: "S", entries: ["Option"] }] });

    const plan = buildImportPlan(adapted, { campaignId: "c", existing: [] });

    expect(plan.errors).toEqual([]);

    const subclass = (name: string) => ({ name, shortName: name, source: "S", className: "Mage", classSource: "S", subclassFeatures: [`Gift|Mage|S|${name}|S|3|S`] });

    const make = (names: string[]) => adaptCompendium({ subclass: names.map(subclass), subclassFeature: names.map((name) => ({ ...features[0], level: 3, subclassShortName: name, subclassSource: "S" })), optionalfeature: [{ name: "A", source: "S" }] }).entries;

    expect(make(["One", "Two"]).find((e) => e.name === "One")?.body).toEqual(make(["Two", "One"]).find((e) => e.name === "One")?.body);
  });

  it("derives an unambiguous subclass acquisition level for an imported parent class", () => {
    const plan = buildImportPlan(adaptCompendium({ class: [{ ...klass, classFeatures: [] }], subclass: [{ name: "Order", shortName: "Order", source: "S", className: "Mage", classSource: "S", subclassFeatures: ["Gift|Mage|S|Order|S|3|S"] }], subclassFeature: [{ ...features[0], entries: ["Subclass gift"], level: 3, subclassShortName: "Order", subclassSource: "S" }] }), { campaignId: "c", existing: [] });

    expect(plan.errors).toEqual([]);
    expect(plan.writes.find((r) => !r.nested)?.body.subclassLevel).toBe(3);

    const again = buildImportPlan(adaptCompendium({ class: [{ ...klass, classFeatures: [] }], subclass: [{ name: "Order", shortName: "Order", source: "S", className: "Mage", classSource: "S", subclassFeatures: ["Gift|Mage|S|Order|S|3|S"] }], subclassFeature: [{ ...features[0], entries: ["Subclass gift"], level: 3, subclassShortName: "Order", subclassSource: "S" }] }), { campaignId: "c", existing: stateOf(plan) });

    expect(again.writes.filter((r) => !r.nested).every((r) => r.operation === "unchanged")).toBe(true);
  });

  it("does not apply per-file limits to all accumulated campaign provenance", () => {
    const entry = { canonicalKey: "k", kind: "feats", localId: "id", edition: "one", sourceJson: "S", originalName: "N", adapterVersion: "1", inputHash: "h", baseline: {}, notes: "", locator: [], issues: [], bindings: {}, attribution: {} };

    expect(CompendiumBundleSchema.safeParse({ formatVersion: 1, sources: Array.from({ length: 101 }, (_, i) => ({ sourceJson: `S${i}`, metadata: {} })), entries: Array.from({ length: 2001 }, (_, i) => ({ ...entry, canonicalKey: `k${i}` })), pages: [] }).success).toBe(true);
  });

  it("allows copied rows to be excluded by identity and source-less rows by path", () => {
    const root = { feat: [{ name: "Good", source: "S" }, { name: "Copy", source: "S", _copy: {} }] };

    const plan = buildImportPlan(adaptCompendium(root), { campaignId: "c", existing: [], excludedKeys: [canonicalKey("feat", "Copy", "S", "unknown")] });

    expect(plan.errors).toEqual([]);
    expect(buildImportPlan(adaptCompendium({ feat: [{ name: "No source" }, root.feat[0]] }, { excludedPaths: ["feat[0]"] }), { campaignId: "c", existing: [] }).errors).toEqual([]);
  });

  it("retains class features after an explicit source binding", () => {
    const sourceLess = { ...klass, source: undefined };

    const result = adaptCompendium({ class: [sourceLess], classFeature: features, optionalfeature: [{ name: "A", source: "S" }] }, { sourceBindings: { "class[0]": "S" } });

    expect(result.entries[0].body.features).toHaveLength(2);
  });

  it("requires confirmation for a local parent binding with a different known edition", () => {
    const key = canonicalKey("class", "Mage", "Core", "classic");

    const adapted = adaptCompendium({ _meta: { edition: "classic" }, subclass: [{ name: "Order", source: "S", className: "Mage", classSource: "Core", subclassFeatures: [] }] });

    const ctx = { campaignId: "c", existing: [], bindings: { [key]: { key, kind: "classes" as const, edition: "one" as const, localId: "local", body: { name: "Mage", hitDie: 8, subclasses: [] }, baseline: {} } } };

    expect(buildImportPlan(adapted, ctx).errors.some((e) => e.code === "MIXED_EDITION_CONFIRMATION_REQUIRED")).toBe(true);
    expect(buildImportPlan(adapted, { ...ctx, allowMixedEdition: true }).errors.some((e) => e.code === "MIXED_EDITION_CONFIRMATION_REQUIRED")).toBe(false);
  });
});
