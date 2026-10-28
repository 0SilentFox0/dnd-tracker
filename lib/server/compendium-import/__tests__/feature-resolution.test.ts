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

  it("preserves subclass identity, mergeParent, bindings, notes and nested IDs", () => {
    const key = canonicalKey("subclass", "School", "T", "classic", ["Mage", "T"]);

    const uid = "Gift|Mage|T|School|T|1|T";

    const sf = { ...feature, subclassShortName: "School", subclassSource: "T", edition: "classic" };

    const result = adaptCompendium({ _meta: meta, subclass: [{ name: "School", className: "Mage", classSource: "T", edition: "classic", subclassFeatures: [uid], entries: ["School text"] }], subclassFeature: [{ ...sf, subclassShortName: "Other" }, { ...sf, subclassSource: "U" }, { ...sf, classSource: "U" }, { ...sf, source: "U" }, sf] }, { sourceBindings: { "subclass[0]": "T" } });

    expect(result.entries[0]).toMatchObject({ key, inputPath: "subclass[0]", edition: "classic", source: "T", notes: "School text", refs: [], mergeParent: { path: [], kind: "class", name: "Mage", source: "T", edition: "classic" }, body: { subclasses: [{ id: nestedId(key), name: "School", features: [{ level: 1, description: "Gift\nGain power manually.", abilities: [] }] }] } });
    expect(result.embedded).toEqual({ subclassFeature: 1, optionalfeature: 0 });
  });

  it("keeps optional count, IDs, descriptions, issue order and unique embedded count", () => {
    const owner = `${canonicalKey("class", "Mage", "T", "one")}.classFeatures`;

    const uid = "Gift|Mage|T|1|T";

    const result = adaptCompendium({ _meta: meta, class: [mage], classFeature: [{ ...feature, extraRule: 7, entries: [{ type: "options", count: 2, entries: [{ type: "refOptionalfeature", optionalfeature: "A|T" }, { type: "refOptionalfeature", optionalfeature: "B|T" }] }, { type: "refOptionalfeature", optionalfeature: "A|T" }] }], optionalfeature: [{ name: "A", source: "T", entries: ["{@b A} text"], prerequisite: { level: 2 }, extra: "manual" }, { name: "B", source: "T", entries: ["B text"] }, { name: "Unused", source: "T" }] });

    const options = [{ id: nestedId("A|T"), name: "A", description: 'A text\nextra: "manual"\nВимоги (ДМ перевіряє вручну): {"level":2}', abilities: [] }, { id: nestedId("B|T"), name: "B", description: "B text", abilities: [] }];

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
