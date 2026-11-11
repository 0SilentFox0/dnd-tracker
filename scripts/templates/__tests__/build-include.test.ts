import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { applyIncludes, buildPack } from "../lib/build";
import { type Pack, type PackRow, readPack } from "../lib/pack";

const fixtures = path.join(__dirname, "fixtures");

const source = (): Pack => structuredClone(readPack("fixture-pack", fixtures));

const target = (include: NonNullable<Pack["manifest"]["include"]>, kinds: Pack["manifest"]["kinds"] = ["feats"]): Pack => ({
  manifest: { ...source().manifest, key: "child", kinds, include, counts: {} },
  rows: Object.fromEntries(kinds.map((kind) => [kind, []])),
  extras: {},
  icons: {},
});

describe("applyIncludes", () => {
  it('copies every row of a kind with "all", sets origin and carries the icon url', () => {
    const src = source();

    const out = applyIncludes(target([{ from: "fixture-pack", kinds: { feats: "all" } }]), { "fixture-pack": src });

    expect((out.rows.feats as PackRow[]).map((r) => r.slug)).toEqual(["fix-alert", "fix-archery"]);
    expect((out.rows.feats as PackRow[])[0].origin).toEqual({ template: "fixture-pack", slug: "fix-alert" });
    expect(out.icons.feats).toEqual({ "fix-alert": src.icons.feats["fix-alert"] });
  });

  it("copies only the listed slugs", () => {
    const out = applyIncludes(target([{ from: "fixture-pack", kinds: { feats: ["fix-archery"] } }]), { "fixture-pack": source() });

    expect((out.rows.feats as PackRow[]).map((r) => r.slug)).toEqual(["fix-archery"]);
  });

  it("does not touch the input pack", () => {
    const input = target([{ from: "fixture-pack", kinds: { feats: "all" } }]);

    applyIncludes(input, { "fixture-pack": source() });
    expect(input.rows.feats).toEqual([]);
  });

  it("throws on a slug clash with an existing row", () => {
    const input = target([{ from: "fixture-pack", kinds: { feats: "all" } }]);

    (input.rows.feats as PackRow[]).push({ slug: "fix-alert", name: "My Alert" });

    expect(() => applyIncludes(input, { "fixture-pack": source() })).toThrow(/slug "fix-alert" collides with "My Alert"/);
  });

  it("throws on a slug missing in the source and on an unloaded source", () => {
    expect(() => applyIncludes(target([{ from: "fixture-pack", kinds: { feats: ["nope"] } }]), { "fixture-pack": source() })).toThrow(/feats "nope" is not in the source/);
    expect(() => applyIncludes(target([{ from: "fixture-pack", kinds: { feats: "all" } }]), {})).toThrow(/not loaded/);
  });

  it("throws when the kind is not in the manifest kinds", () => {
    expect(() => applyIncludes(target([{ from: "fixture-pack", kinds: { feats: "all" } }], ["spells"]), { "fixture-pack": source() })).toThrow(/not in the manifest kinds/);
  });
});

describe("buildPack", () => {
  it("writes included rows, icons and counts into the pack folder", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-pack-"));

    try {
      fs.cpSync(path.join(fixtures, "fixture-pack"), path.join(dir, "fixture-pack"), { recursive: true });
      fs.mkdirSync(path.join(dir, "child"));
      fs.writeFileSync(path.join(dir, "child", "manifest.json"), JSON.stringify({ ...source().manifest, key: "child", locales: ["en"], kinds: ["feats"], include: [{ from: "fixture-pack", kinds: { feats: ["fix-alert"] } }], counts: {} }));

      const built = await buildPack("child", { dir });

      expect(built.manifest.counts).toEqual({ feats: 1 });
      expect(readPack("child", dir).rows.feats).toHaveLength(1);
      expect(JSON.parse(fs.readFileSync(path.join(dir, "child", "manifest.json"), "utf8")).counts).toEqual({ feats: 1 });
      expect(readPack("child", dir).icons.feats).toHaveProperty("fix-alert");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
