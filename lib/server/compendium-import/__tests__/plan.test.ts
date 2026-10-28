import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { canonicalKey } from "../identity";
import { buildImportPlan } from "../plan";

const root = { _meta: { edition: "one", sources: [{ json: "Test" }] }, feat: [{ name: "Gift", source: "Test", category: "O" }], background: [{ name: "Past", source: "Test", feats: [{ "Gift|Test": true }] }] };

describe("source aware atomic import plan", () => {
  it("reserves local IDs and orders feats before dependent backgrounds", () => {
    const plan = buildImportPlan(adaptCompendium(root), { campaignId: "c", existing: [] });

    expect(plan.errors).toEqual([]);

    const [feat, background] = plan.writes;

    expect(feat.kind).toBe("feats");
    expect(background.body.originFeatId).toBe(feat.localId);
    expect(plan.writes.every((r) => r.operation === "create")).toBe(true);
    expect(buildImportPlan(adaptCompendium(root), { campaignId: "c", existing: [] }).hash).toBe(plan.hash);
  });

  it("blocks unresolved and non-origin refs before writes", () => {
    const missing = buildImportPlan(adaptCompendium({ background: root.background }), { campaignId: "c", existing: [] });

    expect(missing.errors.some((e) => e.code === "UNRESOLVED_REF")).toBe(true);

    const general = buildImportPlan(adaptCompendium({ ...root, feat: [{ ...root.feat[0], category: "G" }] }), { campaignId: "c", existing: [] });

    expect(general.errors.some((e) => e.code === "BACKGROUND_FEAT_INVALID")).toBe(true);
  });

  it("records explicit bindings for reuse and rejects bindings of the wrong resource kind", () => {
    const adapted = adaptCompendium({ background: root.background });

    const key = canonicalKey("feat", "Gift", "Test", "unknown");

    const bound = { key, localId: "existing-gift", kind: "feats" as const, body: { name: "Gift", type: "origin" }, baseline: {} };

    const plan = buildImportPlan(adapted, { campaignId: "c", existing: [], bindings: { [key]: bound } });

    expect(plan.writes[0].resolvedBindings).toHaveProperty(key, { kind: "feats", id: "existing-gift" });

    const wrong = buildImportPlan(adapted, { campaignId: "c", existing: [], bindings: { [key]: { ...bound, kind: "spells" } } });

    expect(wrong.errors.some((i) => i.code === "BINDING_WRONG_KIND")).toBe(true);
  });

  it("retains identities, detects identical input and defaults to keeping local changes", () => {
    const first = buildImportPlan(adaptCompendium(root), { campaignId: "c", existing: [] });

    const existing = first.writes.map((r) => ({ key: r.key, localId: r.localId, body: r.body, baseline: r.body }));

    expect(buildImportPlan(adaptCompendium(root), { campaignId: "c", existing }).writes.every((r) => r.operation === "unchanged")).toBe(true);
    existing[0].body = { ...existing[0].body, description: "DM changed this" };

    const changed = buildImportPlan(adaptCompendium(root), { campaignId: "c", existing });

    expect(changed.writes[0].body.description).toBe("DM changed this");
    expect(changed.writes[0].issues.some((e) => e.code === "LOCAL_CONFLICT")).toBe(true);

    const repeated = buildImportPlan(adaptCompendium(root), { campaignId: "c", existing: changed.writes.map((r) => ({ key: r.key, localId: r.localId, body: r.body, baseline: r.baseline! })) });

    expect(repeated.writes[0].body.description).toBe("DM changed this");
  });

  it("gives same display names different stable source-aware names and IDs", () => {
    const input = adaptCompendium({ feat: [{ name: "Same", source: "A" }, { name: "Same", source: "B" }] });

    const plan = buildImportPlan(input, { campaignId: "c", existing: [] });

    expect(plan.writes[0].localId).not.toBe(plan.writes[1].localId);
    expect(plan.writes[0].body.name).not.toBe(plan.writes[1].body.name);

    const reimport = buildImportPlan(input, { campaignId: "c", existing: plan.writes.map((r) => ({ key: r.key, localId: r.localId, body: r.body, baseline: r.body })) });

    expect(reimport.writes.map((r) => r.body.name)).toEqual(plan.writes.map((r) => r.body.name));
  });

  it("resolves subraces into parent lineage without creating a second race", () => {
    const plan = buildImportPlan(adaptCompendium({ race: [{ name: "People", source: "T" }], subrace: [{ name: "Hill", source: "T", raceName: "People", raceSource: "T", entries: ["Hill heritage"] }] }), { campaignId: "c", existing: [] });

    expect(plan.errors).toEqual([]);
    expect(plan.writes.filter((r) => !r.nested)).toHaveLength(1);
    expect(plan.writes.find((r) => !r.nested)?.body.choices).toMatchObject([{ lineage: true, options: [{ name: "Hill" }] }]);
  });

  it("validates target schemas and never silently truncates long descriptions", () => {
    const plan = buildImportPlan(adaptCompendium({ feat: [{ name: "Large", source: "T", entries: ["x".repeat(8001)] }] }), { campaignId: "c", existing: [] });

    expect(plan.errors.some((e) => e.code === "DOMAIN_SCHEMA")).toBe(true);
  });

  it("permits explicit exclusion of a malformed row without leaving its stale errors active", () => {
    const adapted = adaptCompendium({ monster: [{ name: "Missing stats", source: "T" }], feat: [{ name: "Good", source: "T" }] });

    const excludedKeys = adapted.entries.filter((r) => r.kind === "units").map((r) => r.key);

    const plan = buildImportPlan(adapted, { campaignId: "c", existing: [], excludedKeys });

    expect(plan.errors).toEqual([]);
    expect(plan.writes).toHaveLength(1);
  });

  it("does not report LOCAL_CONFLICT when the stored nested subclass only gained schema defaults", () => {
    const meta = { edition: "classic", sources: [{ json: "T" }] };

    const adapted = adaptCompendium({
      _meta: meta,
      subclass: [{ name: "Path", source: "T", className: "Mage", classSource: "PHB", shortName: "P", subclassFeatures: ["F|Mage|PHB|P|T|3|T"] }],
      subclassFeature: [{ name: "F", source: "T", className: "Mage", classSource: "PHB", subclassShortName: "P", subclassSource: "T", level: 3, entries: [{ type: "options", count: 1, entries: [{ type: "refOptionalfeature", optionalfeature: "O1|T" }, { type: "refOptionalfeature", optionalfeature: "O2|T" }] }] }],
      optionalfeature: [{ name: "O1", source: "T", entries: ["a"] }, { name: "O2", source: "T", entries: ["b"] }],
    });

    const parentKey = canonicalKey("class", "Mage", "PHB", "classic");

    const parent = { key: parentKey, localId: "mage", kind: "classes" as const, edition: "classic" as const, body: { name: "Mage", subclasses: [] }, baseline: {} };

    const first = buildImportPlan(adapted, { campaignId: "c", existing: [], bindings: { [parentKey]: parent } });

    expect(first.errors).toEqual([]);

    const sub = first.writes.find((w) => w.inputKind === "subclass")!;

    const stored = structuredClone(sub.body.subclasses) as Array<{ features: Array<{ choices: Array<Record<string, unknown>> }> }>;

    stored[0].features[0].choices.forEach((c) => { c.level = 1; });

    const again = buildImportPlan(adapted, { campaignId: "c", existing: [{ key: sub.key, localId: "mage", kind: "classes", edition: "classic", body: { name: "Mage", subclasses: stored }, baseline: sub.baseline! }], bindings: { [parentKey]: { ...parent, body: { name: "Mage", subclasses: stored } } } });

    expect(again.writes.flatMap((w) => w.issues).filter((i) => i.code === "LOCAL_CONFLICT")).toEqual([]);
  });

  it("warns about an allowed mixed-edition binding without blocking", () => {
    const adapted = adaptCompendium({ _meta: { edition: "classic", sources: [{ json: "T" }] }, background: [{ name: "Past", source: "T", feats: [{ "Gift|Test": true }] }] });

    const key = canonicalKey("feat", "Gift", "Test", "classic");

    const bound = { key, localId: "gift", kind: "feats" as const, edition: "one" as const, body: { name: "Gift", type: "origin" }, baseline: {} };

    const plan = buildImportPlan(adapted, { campaignId: "c", existing: [], bindings: { [key]: bound }, allowMixedEdition: true });

    expect(plan.errors).toEqual([]);
    expect(plan.warnings.map((w) => w.code)).toContain("MIXED_EDITION_WARNING");
  });
});
