import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { GRIM_ROW_KINDS, type GrimData } from "../data";
import { grimIconGaps, grimIconIssues, type GrimIcons, mergeGrimIcons, readGrimIcons, withGrimIcons, writeGrimIcons } from "../icons";

const data: GrimData = {
  feats: [{ slug: "steady-aim", name: "Steady Aim" }],
  careers: [{ slug: "archivist", name: "Archivist" }],
  races: [{ slug: "lowlander", name: "Lowlander" }],
  spells: [{ slug: "dazzle", name: "Dazzle" }],
  units: [{ slug: "ash-hound", name: "Ash Hound" }, { slug: "clay-drudge", name: "Clay Drudge" }],
  artifacts: [{ slug: "spear", name: "Spear" }],
  raceProfiles: [],
};

const empty = (): GrimIcons => ({ feats: {}, careers: {}, races: {}, spells: {}, units: {}, artifacts: {} });

describe("grim icons", () => {
  it("sets avatar on units and icon elsewhere only where a URL exists, without mutating the input", () => {
    const icons = { ...empty(), units: { "ash-hound": "https://x.test/a.webp" }, careers: { archivist: "https://x.test/b.webp" } };

    const out = withGrimIcons(data, icons);

    expect(out.units).toEqual([{ slug: "ash-hound", name: "Ash Hound", avatar: "https://x.test/a.webp" }, { slug: "clay-drudge", name: "Clay Drudge" }]);
    expect(out.careers).toEqual([{ slug: "archivist", name: "Archivist", icon: "https://x.test/b.webp" }]);
    expect(out.spells).toEqual([{ slug: "dazzle", name: "Dazzle" }]);
    expect(data.units[0]).toEqual({ slug: "ash-hound", name: "Ash Hound" });
  });

  it("flags slugs outside the catalog and non-https urls", () => {
    const icons = { ...empty(), careers: { nobody: "https://x.test/a.webp" }, units: { "ash-hound": "http://x.test/a.webp" } };

    expect(grimIconIssues(data, icons)).toEqual(['icons: careers "nobody" is not in the catalog', 'icons: units "ash-hound" url must be https']);
  });

  it("reports a gap per catalog entry when icons are empty", () => {
    expect(grimIconGaps(data, empty())).toHaveLength(GRIM_ROW_KINDS.reduce((n, k) => n + data[k].length, 0));
    expect(grimIconGaps(data, empty())).toContain('icons: spells "dazzle" has no icon');
  });

  it("merges uploads over old icons and prunes slugs outside the catalog", () => {
    const old = { ...empty(), units: { "ash-hound": "https://x.test/old.webp", gone: "https://x.test/gone.webp" } };

    const merged = mergeGrimIcons(old, { ...empty(), units: { "ash-hound": "https://x.test/new.webp" }, careers: { archivist: "https://x.test/c.webp" } }, data);

    expect(merged.units).toEqual({ "ash-hound": "https://x.test/new.webp" });
    expect(merged.careers).toEqual({ archivist: "https://x.test/c.webp" });
  });

  it("reads a missing file as empty kinds and round-trips sorted", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grim-icons-"));

    expect(readGrimIcons(dir)).toEqual(empty());

    writeGrimIcons({ ...empty(), units: { b: "https://x.test/b", a: "https://x.test/a" } }, dir);

    expect(Object.keys(readGrimIcons(dir).units)).toEqual(["a", "b"]);
    expect(Object.keys(JSON.parse(fs.readFileSync(path.join(dir, "icons.json"), "utf8")))).toEqual([...GRIM_ROW_KINDS]);
  });
});
