import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { isCanonicalTemplate, LEGACY_KEY_BY_NAME, localizationOf, TEMPLATE_REGISTRY, templateKeyOf, templateKeyWhere, templateOf } from "../registry";

const official = { kind: "template", visibility: "official" };

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? (entry.name === "__tests__" ? [] : walk(path.join(dir, entry.name))) : [path.join(dir, entry.name)]));

describe("TEMPLATE_REGISTRY", () => {
  it("has one entry per pack folder", () => {
    const folders = fs.readdirSync(path.join(process.cwd(), "data/templates"), { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(process.cwd(), "data/templates", e.name, "manifest.json"))).map((e) => e.name);

    expect(Object.keys(TEMPLATE_REGISTRY).sort()).toEqual(folders.sort());
  });

  it("finds a pack", () => {
    expect(templateOf("srd-5.2")?.system).toBe("dnd5e");
    expect(templateOf("toString")).toBeUndefined();
  });
});

describe("templateKeyOf", () => {
  it("returns a registered key as is", () => {
    expect(templateKeyOf({ templateKey: "srd-5.2", name: "Renamed" })).toBe("srd-5.2");
  });

  it("maps a legacy name stored as templateKey or only as name", () => {
    expect(templateKeyOf({ templateKey: "5e SRD 5.2" })).toBe("srd-5.2");
    expect(templateKeyOf({ templateKey: null, name: "Heroes" })).toBe("heroes-homm");
    expect(templateKeyOf({ name: "Grim d100 (empty)" })).toBe("grim-d100-empty");
  });

  it("returns null for unknown identities", () => {
    expect(templateKeyOf({ templateKey: "another-source", name: "5e SRD 5.2" })).toBeNull();
    expect(templateKeyOf({ templateKey: null, name: "My template" })).toBeNull();
    expect(templateKeyOf({ name: "constructor" })).toBeNull();
  });

  it("legacy map covers the five official names", () => {
    expect(Object.keys(LEGACY_KEY_BY_NAME)).toHaveLength(5);
  });
});

describe("localizationOf", () => {
  it("localizes official SRD by new and legacy keys", () => {
    expect(localizationOf({ ...official, templateKey: "srd-5.2" })).toEqual({ templateKey: "srd-5.2", locales: ["en", "uk"] });
    expect(localizationOf({ ...official, templateKey: null, name: "5e SRD 5.2" })).toEqual({ templateKey: "srd-5.2", locales: ["en", "uk"] });
  });

  it("is null for empty shells, private templates and unknown keys", () => {
    expect(localizationOf({ ...official, templateKey: "srd-5.2-empty" })).toBeNull();
    expect(localizationOf({ ...official, templateKey: "heroes-homm" })).toBeNull();
    expect(localizationOf({ kind: "template", visibility: "private", templateKey: "srd-5.2" })).toBeNull();
    expect(localizationOf({ ...official, templateKey: "nope" })).toBeNull();
  });

  it("canonical = en or null locale", () => {
    expect(isCanonicalTemplate({ ...official, templateKey: "srd-5.2", locale: null })).toBe(true);
    expect(isCanonicalTemplate({ ...official, templateKey: "srd-5.2", locale: "uk" })).toBe(false);
  });
});

describe("templateKeyWhere", () => {
  it("matches the key, its legacy names and rows without a key", () => {
    expect(templateKeyWhere(["srd-5.2"])).toEqual({ OR: [{ templateKey: { in: ["srd-5.2", "5e SRD 5.2"] } }, { templateKey: null, name: { in: ["5e SRD 5.2"] } }] });
  });
});

describe("layer boundaries", () => {
  it("lib, app, components and types never import from scripts", () => {
    const offenders = ["lib", "app", "components", "types"].flatMap((dir) => walk(path.join(process.cwd(), dir))).filter((file) => /\.tsx?$/.test(file) && /from "@\/scripts\//.test(fs.readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });
});
