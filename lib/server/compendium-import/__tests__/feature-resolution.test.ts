import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { canonicalKey, nestedId } from "../identity";
import type { Compendium } from "../parse";

const feature = { name: "Gift", source: "T", className: "Mage", classSource: "T", level: 1, entries: ["Gain {@b power} manually."] };

const mage = { name: "Mage", source: "T", hd: { faces: 8 }, classFeatures: ["Gift|Mage|T|1|T"] };

const meta = { edition: "one", sources: [{ json: "T" }] };

describe("nested feature characterization", () => {
  it("resolves full class parent/source/level identity in UID order", () => {
    const result = adaptCompendium({ _meta: meta, class: [{ ...mage, classFeatures: ["Gift|Mage|T|2|U", { classFeature: "Gift|Mage|T|1|T" }] }], classFeature: [
      { ...feature, className: "Other", entries: ["wrong parent"] },
      { ...feature, classSource: "U", entries: ["wrong parent source"] },
      { ...feature, source: "U", level: 2, entries: ["second level"] },
      feature,
    ] });

    expect(result.entries[0].body.features).toEqual([
      { level: 2, description: "Gift\nsecond level", abilities: [] },
      { level: 1, description: "Gift\nGain power manually.", abilities: [] },
    ]);
    expect(result.entries[0].refs).toEqual([]);
    expect(result.embedded).toEqual({ classFeature: 2, optionalfeature: 0 });
    expect(result.issues.map(({ code, path }) => [code, path])).toEqual(Array(2).fill(["MANUAL_CLASS_FEATURE", `${result.entries[0].key}.classFeatures`]));
  });

  it.each(["missing", "duplicate", "edition", "source"])("refuses %s class UID candidates without choosing the first", (variant) => {
    const candidates = variant === "missing" ? [] : variant === "duplicate" ? [feature, feature] : variant === "edition" ? [{ ...feature, edition: "one" }, { ...feature, edition: "classic" }] : [feature, { ...feature, source: "U" }];

    const result = adaptCompendium({ _meta: meta, class: [{ ...mage, classFeatures: [variant === "source" ? "Gift|Mage|T|1" : mage.classFeatures[0]] }], classFeature: candidates });

    expect(result.entries[0].body.features).toEqual([]);
    expect(result.issues).toEqual([{ code: "FEATURE_REF_UNRESOLVED", severity: "error", path: `${result.entries[0].key}.classFeatures[0]`, action: "Додайте точне визначення feature або виключіть залежний клас/підклас" }]);
    expect(result.embedded).toEqual({ optionalfeature: 0 });
  });

  it.each([["classic", "PHB"], ["one", "XPHB"]])("resolves an empty class/subclass source to the %s default (%s)", (edition, source) => {
    const sf = { name: "Petal", source: "S", className: "Druid", classSource: source, subclassShortName: "Bloom", subclassSource: source, level: 2, entries: ["Petal text"] };

    const uid = "Petal|Druid||Bloom||2|S";

    const result = adaptCompendium({ _meta: { edition, sources: [{ json: "S" }] }, subclass: [{ name: "Bloom", source: "S", shortName: "Bloom", className: "Druid", classSource: source, subclassFeatures: [uid] }], subclassFeature: [sf, { ...sf, classSource: "OTHER", entries: ["wrong"] }] });

    expect(result.issues.filter((i) => i.code === "FEATURE_REF_UNRESOLVED")).toEqual([]);
    expect(result.entries[0].body.subclasses).toMatchObject([{ features: [{ level: 2, description: "Petal\nPetal text" }] }]);
  });

  it("resolves an empty class source in a class feature UID and keeps explicit sources strict", () => {
    const cf = { name: "Gift", source: "S", className: "Mage", classSource: "PHB", level: 1, entries: ["x"] };

    const run = (uid: string) => adaptCompendium({ _meta: { edition: "classic", sources: [{ json: "S" }] }, class: [{ name: "Mage", source: "S", hd: { faces: 8 }, classFeatures: [uid] }], classFeature: [cf] });

    expect(run("Gift|Mage||1|S").entries[0].body.features).toHaveLength(1);
    expect(run("Gift|Mage|PHB|1|S").entries[0].body.features).toHaveLength(1);
    expect(run("Gift|Mage|XPHB|1|S").issues.map((i) => i.code)).toContain("FEATURE_REF_UNRESOLVED");
    expect(run("Gift|Unknown||1|S").issues.map((i) => i.code)).toContain("FEATURE_REF_UNRESOLVED");
  });

  it("preserves subclass identity, mergeParent, bindings, notes and nested IDs", () => {
    const key = canonicalKey("subclass", "School", "T", "classic", ["Mage", "T"]);

    const uid = "Gift|Mage|T|School|T|1|T";

    const sf = { ...feature, subclassShortName: "School", subclassSource: "T", edition: "classic" };

    const result = adaptCompendium({ _meta: meta, subclass: [{ name: "School", className: "Mage", classSource: "T", edition: "classic", subclassFeatures: [uid], entries: ["School text"] }], subclassFeature: [{ ...sf, subclassShortName: "Other" }, { ...sf, subclassSource: "U" }, { ...sf, classSource: "U" }, { ...sf, source: "U" }, sf] }, { sourceBindings: { "subclass[0]": "T" } });

    expect(result.entries[0]).toMatchObject({ key, inputPath: "subclass[0]", edition: "classic", source: "T", notes: "School text", refs: [], mergeParent: { path: [], kind: "class", name: "Mage", source: "T", edition: "classic" }, body: { subclasses: [{ id: nestedId(key), name: "School", features: [{ level: 1, description: "Gift\nGain power manually.", abilities: [] }] }] } });
    expect(result.embedded).toEqual({ subclassFeature: 1, optionalfeature: 0 });
  });

  it("renders a child feature referenced by UID inline and counts it as embedded", () => {
    const parent = { name: "Path", source: "T", className: "Mage", classSource: "T", subclassShortName: "School", subclassSource: "T", level: 3, entries: ["Intro", { type: "refSubclassFeature", subclassFeature: "Child|Mage|T|School|T|3" }] };

    const child = { ...parent, name: "Child", entries: ["Child text"] };

    const result = adaptCompendium({ _meta: meta, subclass: [{ name: "School", shortName: "School", source: "T", className: "Mage", classSource: "T", subclassFeatures: ["Path|Mage|T|School|T|3"] }], subclassFeature: [parent, child] });

    const description = JSON.stringify(result.entries[0].body);

    expect(description).toContain("Child text");
    expect(description).not.toContain("Child|Mage");
    expect(result.embedded?.subclassFeature).toBe(2);
  });

  it("keeps optional count, IDs, descriptions, issue order and unique embedded count", () => {
    const owner = `${canonicalKey("class", "Mage", "T", "one")}.classFeatures`;

    const uid = "Gift|Mage|T|1|T";

    const result = adaptCompendium({ _meta: meta, class: [mage], classFeature: [{ ...feature, extraRule: 7, entries: [{ type: "options", count: 2, entries: [{ type: "refOptionalfeature", optionalfeature: "A|T" }, { type: "refOptionalfeature", optionalfeature: "B|T" }] }, { type: "refOptionalfeature", optionalfeature: "A|T" }] }], optionalfeature: [{ name: "A", source: "T", entries: ["{@b A} text"], prerequisite: { level: 2 }, extra: "manual" }, { name: "B", source: "T", entries: ["B text"] }, { name: "Unused", source: "T" }] });

    const options = [{ id: nestedId("A|T"), name: "A", description: 'A text\nextra: "manual"\nВимоги (ДМ перевіряє вручну): рівень 2+', abilities: [] }, { id: nestedId("B|T"), name: "B", description: "B text", abilities: [] }];

    expect(result.entries[0].body.features).toMatchObject([{ abilities: [], choices: [
      { id: nestedId(`${owner}:${JSON.stringify(uid.split("|"))}:0`), label: "Особливості на вибір", kind: "option", count: 2, options },
      { id: nestedId(`${owner}:${JSON.stringify(uid.split("|"))}:1:A|T`), label: "A", kind: "option", count: 1, options: [options[0]] },
    ] }]);
    expect(result.embedded).toEqual({ classFeature: 1, optionalfeature: 2 });
    expect(result.issues.map(({ code, path }) => [code, path])).toEqual([
      ["MANUAL_CLASS_FEATURE", owner], ["UNSUPPORTED_FIELD", `${owner}.extraRule`],
      ["UNSUPPORTED_FIELD", `${owner}.extra`], ["UNSUPPORTED_FIELD", `${owner}.extra`],
      ["OPTIONAL_FEATURE_WITHOUT_OWNER", "optionalfeature[2]"],
    ]);
  });

  it("rejects ambiguous optional editions and missing UIDs without emitting an incomplete choice", () => {
    const result = adaptCompendium({ _meta: meta, class: [mage], classFeature: [{ ...feature, entries: [{ type: "options", count: 1, entries: ["A", "B", "Missing"].map(name => ({ type: "refOptionalfeature", optionalfeature: `${name}|T` })) }] }], optionalfeature: [{ name: "A", source: "T", edition: "one" }, { name: "A", source: "T", edition: "classic" }, { name: "B", source: "T" }] });

    expect(result.entries[0].body.features).toMatchObject([{ abilities: [] }]);
    expect(result.entries[0].body.features).not.toMatchObject([{ choices: expect.anything() }]);
    expect(result.embedded).toEqual({ classFeature: 1, optionalfeature: 1 });
    expect(result.issues.map(i => i.code)).toEqual(["MANUAL_CLASS_FEATURE", "OPTIONAL_FEATURE_REF", "OPTIONAL_FEATURE_REF", "OPTIONAL_FEATURE_WITHOUT_OWNER", "OPTIONAL_FEATURE_WITHOUT_OWNER"]);
  });

  it.each([0, 1.5, 3, undefined])("leaves invalid options count %s manual and optionals unused", (count) => {
    const result = adaptCompendium({ _meta: meta, class: [mage], classFeature: [{ ...feature, entries: [{ type: "options", count, entries: [{ type: "refOptionalfeature", optionalfeature: "A|T" }, { type: "refOptionalfeature", optionalfeature: "B|T" }] }] }], optionalfeature: [{ name: "A", source: "T" }, { name: "B", source: "T" }] });

    expect(result.entries[0].body.features).not.toMatchObject([{ choices: expect.anything() }]);
    expect(result.embedded).toEqual({ classFeature: 1, optionalfeature: 0 });
    expect(result.issues.map(i => i.code)).toEqual(["MANUAL_CLASS_FEATURE", "MANUAL_OPTIONAL_PROGRESSION", "OPTIONAL_FEATURE_WITHOUT_OWNER", "OPTIONAL_FEATURE_WITHOUT_OWNER"]);
  });

  it("resolves dependencies of selected owners even if nested categories are not selected", () => {
    const root: Compendium = { _meta: meta, class: [mage], classFeature: [{ ...feature, entries: [{ type: "refOptionalfeature", optionalfeature: "A|T" }] }], optionalfeature: [{ name: "A", source: "T" }, { name: "Unused", source: "T" }], subclass: [{ name: "School", source: "T", className: "Mage", classSource: "T", subclassFeatures: ["Missing"] }] };

    const selected = adaptCompendium(root, { categories: ["class"], excludedPaths: ["classFeature[0]", "optionalfeature[0]"] });

    expect(selected.entries).toHaveLength(1);
    expect(selected.embedded).toEqual({ classFeature: 1, optionalfeature: 1 });
    expect(selected.issues.map(i => i.code)).toEqual(["MANUAL_CLASS_FEATURE"]);

    const excluded = adaptCompendium(root, { excludedPaths: ["class[0]", "subclass[0]"] });

    expect(excluded.entries).toEqual([]);
    expect(excluded.embedded).toEqual({ optionalfeature: 0 });
    expect(excluded.issues.map(({ code, path }) => [code, path])).toEqual([["OPTIONAL_FEATURE_WITHOUT_OWNER", "optionalfeature[0]"], ["OPTIONAL_FEATURE_WITHOUT_OWNER", "optionalfeature[1]"]]);
  });
});

describe("optionalfeatureProgression binding", () => {
  const owner = { name: "Order", source: "T", className: "Mage", classSource: "T", shortName: "Ord", optionalfeatureProgression: [{ name: "Marks", featureType: ["MK"], progression: { 3: 2, 7: 3 } }] };

  const root = (extra: Record<string, unknown> = {}): Compendium => ({ _meta: meta, class: [mage], classFeature: [feature], subclass: [owner], optionalfeature: [{ name: "A", source: "T", featureType: ["MK"], entries: ["A text"] }, { name: "B", source: "T", featureType: ["MK"], entries: ["B text"] }, { name: "Z", source: "T", featureType: ["ZZ"], entries: ["unowned"] }], ...extra });

  it("attaches optional features of the matching featureType to the subclass as one choice per progression increase", () => {
    const result = adaptCompendium(root());

    const sub = result.entries.find((e) => e.inputKind === "subclass")!;

    const features = (sub.body.subclasses as Array<{ features: Array<{ level: number; choices: Array<{ count: number; options: Array<{ name: string }> }> }> }>)[0].features;

    expect(features.map((f) => [f.level, f.choices[0].count, f.choices[0].options.map((o) => o.name)])).toEqual([[3, 2, ["A", "B"]], [7, 1, ["A", "B"]]]);
    expect(result.embedded?.optionalfeature).toBe(2);
    expect(result.issues.filter((i) => i.code === "OPTIONAL_FEATURE_WITHOUT_OWNER").map((i) => i.path)).toEqual(["optionalfeature[2]"]);
    expect(result.issues.map((i) => i.code)).toContain("MANUAL_OPTIONAL_FEATURE");
  });

  it("leaves an option owned by another subclass out of this one", () => {
    const result = adaptCompendium(root({ optionalfeature: [{ name: "A", source: "T", featureType: ["MK"], entries: ["A"] }, { name: "Other", source: "T", featureType: ["MK"], entries: ["O"], prerequisite: [{ level: { level: 3, class: { name: "Mage" }, subclass: { name: "Elsewhere", source: "T" } } }] }] }));

    const sub = result.entries.find((e) => e.inputKind === "subclass")!;

    expect(JSON.stringify(sub.body)).toContain('"A"');
    expect(JSON.stringify(sub.body)).not.toContain("Other");
    expect(result.issues.filter((i) => i.code === "OPTIONAL_FEATURE_WITHOUT_OWNER").map((i) => i.path)).toEqual(["optionalfeature[1]"]);
  });

  it("works for classes with an array progression and reports a progression without matching options as manual", () => {
    const result = adaptCompendium(root({ subclass: [], class: [{ ...mage, optionalfeatureProgression: [{ name: "Marks", featureType: ["MK"], progression: [0, 1, 1, 2] }, { name: "None", featureType: ["NOPE"], progression: { 1: 1 } }] }] }));

    const features = result.entries[0].body.features as Array<{ level: number; choices?: Array<{ count: number }> }>;

    expect(features.filter((f) => f.choices).map((f) => [f.level, f.choices![0].count])).toEqual([[2, 1], [4, 1]]);
    expect(result.issues.filter((i) => i.code === "MANUAL_OPTIONAL_PROGRESSION")).toHaveLength(1);
  });
});
