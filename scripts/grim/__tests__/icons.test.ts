import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { GRIM_ROW_KINDS, type GrimData } from "../data";
import { grimIconGaps, grimIconIssues, type GrimIcons, readGrimIcons, withGrimIcons, writeGrimIcons } from "../icons";

const data: GrimData = { feats: [{ name: "Steady Aim" }], careers: [{ name: "Archivist" }], races: [{ name: "Lowlander" }], spells: [{ name: "Dazzle" }], units: [{ name: "Ash Hound" }, { name: "Clay Drudge" }], artifacts: [{ name: "Spear" }], raceProfiles: [] };

const empty = (): GrimIcons => ({ feats: {}, careers: {}, races: {}, spells: {}, units: {}, artifacts: {} });

describe("grim icons", () => {
  it("sets avatar on units and icon elsewhere only where a URL exists, without mutating the input", () => {
    const icons = { ...empty(), units: { "Ash Hound": "https://x.test/a.webp" }, careers: { Archivist: "https://x.test/b.webp" } };

    const out = withGrimIcons(data, icons);

    expect(out.units).toEqual([{ name: "Ash Hound", avatar: "https://x.test/a.webp" }, { name: "Clay Drudge" }]);
    expect(out.careers).toEqual([{ name: "Archivist", icon: "https://x.test/b.webp" }]);
    expect(out.spells).toEqual([{ name: "Dazzle" }]);
    expect(data.units[0]).toEqual({ name: "Ash Hound" });
  });

  it("flags names outside the catalog and non-https urls", () => {
    const icons = { ...empty(), careers: { Nobody: "https://x.test/a.webp" }, units: { "Ash Hound": "http://x.test/a.webp" } };

    expect(grimIconIssues(data, icons)).toEqual(['icons: careers "Nobody" is not in the catalog', 'icons: units "Ash Hound" url must be https']);
  });

  it("reports a gap per catalog entry when icons are empty", () => {
    expect(grimIconGaps(data, empty())).toHaveLength(GRIM_ROW_KINDS.reduce((n, k) => n + data[k].length, 0));
    expect(grimIconGaps(data, empty())).toContain('icons: spells "Dazzle" has no icon');
  });

  it("reads a missing file as empty kinds and round-trips sorted", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grim-icons-"));

    expect(readGrimIcons(dir)).toEqual(empty());

    writeGrimIcons({ ...empty(), units: { B: "https://x.test/b", A: "https://x.test/a" } }, dir);

    expect(Object.keys(readGrimIcons(dir).units)).toEqual(["A", "B"]);
    expect(Object.keys(JSON.parse(fs.readFileSync(path.join(dir, "icons.json"), "utf8")))).toEqual([...GRIM_ROW_KINDS]);
  });
});
