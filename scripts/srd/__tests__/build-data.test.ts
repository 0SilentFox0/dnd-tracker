import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { assertKnown, assertUniqueSlugs } from "../lib/build-data";
import { readSrdData, readSrdManifest, toImportRows, writeSrdData } from "../lib/data-files";
import type { SrdData } from "../lib/types";

describe("build helpers", () => {
  it("assertUniqueSlugs / assertKnown throw with the offending keys", () => {
    expect(() => assertUniqueSlugs("spells", [{ slug: "a" }, { slug: "a" }])).toThrow(/spells: duplicate slug a/);
    expect(() => assertUniqueSlugs("spells", [{ slug: "" }])).toThrow(/empty slug/);
    expect(() => assertKnown("spell overrides", ["x", "y"], new Set(["x"]))).toThrow(/spell overrides: unknown y/);
  });

  it("toImportRows drops slug only", () => {
    expect(toImportRows([{ slug: "s", name: "N", level: 1 }])).toEqual([{ name: "N", level: 1 }]);
  });

  it("writes files and a manifest, reads them back", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srd-data-"));

    const data: SrdData = { "spell-groups": [{ slug: "g", name: "G", color: "#000000", icon: "eye" }], spells: [], races: [], classes: [], feats: [], backgrounds: [], units: [], artifacts: [] };

    const manifest = writeSrdData(data, dir, "2026-10-23");

    expect(manifest.counts).toEqual({ "spell-groups": 1, spells: 0, races: 0, classes: 0, feats: 0, backgrounds: 0, units: 0, artifacts: 0 });
    expect(readSrdManifest(dir)).toEqual(manifest);
    expect(readSrdData(dir)).toEqual(data);
  });
});
