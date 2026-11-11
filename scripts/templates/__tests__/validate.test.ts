import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterAll, describe, expect, it } from "vitest";

import { type Pack, type PackRow, readPack } from "../lib/pack";
import { validatePack } from "../lib/validate";
import { type PackIssue, systemBases } from "../systems";
import { treeFromPack } from "../systems/homm/skill-trees";

import type { SystemMeta } from "@/lib/utils/rules/systems/meta";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";

const fixtures = path.join(__dirname, "fixtures");

const load = (): Pack => structuredClone(readPack("fixture-pack", fixtures));

const errorsOf = (pack: Pack, opts: Parameters<typeof validatePack>[1] = { dir: fixtures }): string[] => validatePack(pack, { dir: fixtures, ...opts }).filter((issue: PackIssue) => issue.level === "error").map((issue) => issue.message);

const sibling: TemplateManifest = { ...load().manifest, key: "sibling", system: "wfrp" };

describe("validatePack on the fixture pack", () => {
  it("has no errors", () => {
    expect(validatePack(load(), { dir: fixtures }).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("warns about missing icons and untranslated entries", () => {
    const messages = validatePack(load(), { dir: fixtures }).filter((issue) => issue.level === "warning").map((issue) => issue.message);

    expect(messages.some((m) => m.startsWith("icons: spells"))).toBe(true);
    expect(messages.some((m) => m.startsWith("i18n uk: stale 0, missing "))).toBe(true);
  });

  it("flags a duplicate slug with both names (Review Focus 5)", () => {
    const pack = load();

    const feats = pack.rows.feats as PackRow[];

    feats[1].slug = feats[0].slug;

    const errors = errorsOf(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('duplicate slug "fix-alert"');
    expect(errors[0]).toContain("Archery");
    expect(errors[0]).toContain("Alert");
  });

  it("flags a broken link", () => {
    const pack = load();

    (pack.rows.spells as PackRow[])[0].groupId = "Nowhere";
    expect(errorsOf(pack)).toEqual(['spells #1 "Fire Bolt": unknown groupId "Nowhere"']);
  });

  it("flags an unknown system", () => {
    const pack = load();

    pack.manifest = { ...pack.manifest, system: "nope" };
    expect(errorsOf(pack)[0]).toBe('manifest: system "nope" is not a known rule system');
  });

  it("flags rules of another system", () => {
    const pack = load();

    pack.rules = { system: { key: "wfrp" } } as Pack["rules"];
    expect(errorsOf(pack)).toEqual(['rules: system.key "wfrp" does not match manifest system "dnd5e"']);
  });

  it("flags wrong counts", () => {
    const pack = load();

    pack.manifest = { ...pack.manifest, counts: { ...pack.manifest.counts, spells: 5 } };
    expect(errorsOf(pack)).toEqual(["manifest: counts.spells is 5, the pack has 2 rows"]);
  });

  it("flags an icon key without a row", () => {
    const pack = load();

    pack.icons = { feats: { ...pack.icons.feats, ghost: "https://example.test/x.webp" } };
    expect(errorsOf(pack)).toEqual(['icons: feats "ghost" is not in the catalog']);
  });

  it("flags an orphan translation key", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-orphan-"));

    try {
      fs.cpSync(path.join(fixtures, "fixture-pack"), path.join(dir, "fixture-pack"), { recursive: true });
      fs.writeFileSync(path.join(dir, "fixture-pack", "i18n", "uk.json"), JSON.stringify({ "feats/gone/name": { text: "Зник", en: "Gone" } }));

      expect(errorsOf(readPack("fixture-pack", dir), { dir })).toEqual(['i18n uk: orphan key "feats/gone/name"']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags an include from a pack of another module (Review Focus 5)", () => {
    const pack = load();

    pack.manifest = { ...pack.manifest, include: [{ from: "sibling", kinds: { feats: "all" } }] };

    expect(errorsOf(pack, { registry: { sibling } })).toEqual(['manifest: include.from "sibling" belongs to system "wfrp", a different base than "dnd5e"']);
    expect(errorsOf(pack, { registry: { sibling: { ...sibling, system: "homm" } } })).toEqual([]);
    expect(errorsOf(pack, { registry: {} })).toEqual(['manifest: include.from "sibling" is not a known pack']);
  });
});

describe("readPack", () => {
  it("throws when a kind of the manifest has no file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "read-pack-"));

    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    fs.cpSync(path.join(fixtures, "fixture-pack"), path.join(dir, "fixture-pack"), { recursive: true });
    fs.rmSync(path.join(dir, "fixture-pack", "spells.json"));

    expect(() => readPack("fixture-pack", dir)).toThrow(/spells\.json is missing/);
  });
});

describe("validatePack on heroes-homm guards (D25, D25b, D25c)", () => {
  const heroes = (): Pack => structuredClone(readPack("heroes-homm"));

  const heroesErrors = (pack: Pack) => validatePack(pack).filter((issue) => issue.level === "error").map((issue) => issue.message);

  it("is valid as it is", () => {
    expect(heroesErrors(heroes())).toEqual([]);
  });

  it("errors on a raw id and on an unknown slug inside JSON columns", () => {
    const pack = heroes();

    const spell = (pack.rows.spells as PackRow[]).find((row) => Array.isArray(row.spellEffects) && row.spellEffects.length > 0) as PackRow;

    spell.raceModifiers = [{ raceId: "cmuylhk0c0001ia06lg5eommv" }];
    spell.spellEffects = [{ unitId: "no-such-unit" }];

    const errors = heroesErrors(pack);

    expect(errors.some((m) => m.includes("left inside rows"))).toBe(true);
    expect(errors.some((m) => m.includes('unknown units slug "no-such-unit"'))).toBe(true);
  });

  it("rejects an extra column outside the whitelist and extra on a kind without any", () => {
    const pack = heroes();

    (pack.rows.units as PackRow[])[0].extra = { hp: 1 };
    (pack.rows.skillTrees as PackRow[])[0].extra = { race: "x" };

    const errors = heroesErrors(pack);

    expect(errors.filter((m) => m.includes("extra column(s) hp are not allowed"))).toHaveLength(1);
    expect(errors.filter((m) => m.includes("extra column(s) race are not allowed (allowed: none)"))).toHaveLength(1);
  });

  it("rejects two skill trees of one race", () => {
    const pack = heroes();

    const trees = pack.rows.skillTrees as PackRow[];

    trees[1] = { ...trees[1], race: trees[0].race };

    expect(heroesErrors(pack).some((m) => m.includes("duplicate race"))).toBe(true);
  });

  it("rejects a tree that names a slug no row of the pack has", () => {
    const pack = heroes();

    const tree = (pack.rows.skillTrees as PackRow[])[0];

    const branch = (tree.skills as { mainSkills: Array<Record<string, unknown>> }).mainSkills.find((b) => b.id !== "racial") as Record<string, unknown>;

    branch.id = "no-such-branch";

    expect(heroesErrors(pack).some((m) => m.includes('unknown main-skills "no-such-branch"'))).toBe(true);
  });

  it("treeFromPack throws on an unresolved slug instead of keeping it", () => {
    const row = { slug: "t", race: "Human", skills: { mainSkills: [{ id: "racial" }, { id: "missing" }] } } as unknown as PackRow;

    expect(() => treeFromPack(row, { idOf: () => undefined, slugOf: () => undefined, rowId: undefined })).toThrow(/no main-skills row with slug "missing"/);
  });
});

describe("systemBases", () => {
  const meta = (module: string, keys: string[], extra: Partial<SystemMeta> = {}): SystemMeta => ({ module, keys, i18n: {}, unusedMechanics: [], ...extra });

  it("maps every key, presets included, to its base module", () => {
    const metas = [meta("d20", ["dnd5e"], { kind: "base" }), meta("homm", ["homm"], { kind: "preset", preset: { base: "d20", modules: ["homm-units"] } }), meta("wfrp", ["wfrp"])];

    expect(systemBases(metas)).toEqual({ dnd5e: "d20", homm: "d20", wfrp: "wfrp" });
  });
});
