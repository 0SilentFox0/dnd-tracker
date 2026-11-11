import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { iconGaps, iconIssues, readIcons, withIcons, writeIcons } from "../lib/icons-file";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "icons-file-"));

describe("readIcons / writeIcons", () => {
  it("reads a missing file as empty and round-trips with sorted keys, keeping kind order", () => {
    const dir = tmp();

    fs.mkdirSync(path.join(dir, "pack"));

    expect(readIcons("pack", dir)).toEqual({});

    writeIcons("pack", { spells: { b: "https://x/b", a: "https://x/a" }, careers: { z: "https://x/z" } }, dir);

    const back = readIcons("pack", dir);

    expect(Object.keys(back)).toEqual(["spells", "careers"]);
    expect(Object.keys(back.spells)).toEqual(["a", "b"]);
  });
});

describe("withIcons", () => {
  it("fills the column by slug and keeps an explicit value", () => {
    const rows = [{ slug: "a", name: "A" }, { slug: "b", name: "B", icon: "own" }, { slug: "c", name: "C" }];

    expect(withIcons(rows, { a: "https://x/a", b: "https://x/b" })).toEqual([{ slug: "a", name: "A", icon: "https://x/a" }, { slug: "b", name: "B", icon: "own" }, { slug: "c", name: "C" }]);
    expect(withIcons([{ slug: "u" }], { u: "https://x/u" }, "avatar")).toEqual([{ slug: "u", avatar: "https://x/u" }]);
    expect(rows[0]).toEqual({ slug: "a", name: "A" });
  });

  it("returns rows untouched without icons", () => {
    const rows = [{ slug: "a" }];

    expect(withIcons(rows, undefined)).toBe(rows);
  });
});

describe("iconIssues / iconGaps", () => {
  const data = { spells: [{ slug: "fireball" }, { slug: "bolt" }], careers: [{ slug: "rat-catcher" }] };

  it("flags an orphaned key, a sub-id of an unknown slug and a non-https url; skips kinds outside the data", () => {
    const icons = { spells: { fireball: "https://x/f", ghost: "https://x/g", "bolt/sub": "http://x/s" }, features: { "nothing/x": "https://x/n" } };

    expect(iconIssues(data, icons)).toEqual(['icons: spells "ghost" is not in the catalog', 'icons: spells "bolt/sub" url must be https']);
  });

  it("lists rows without an icon", () => {
    expect(iconGaps(data, { spells: { bolt: "https://x/b" } })).toEqual(['icons: spells "fireball" has no icon', 'icons: careers "rat-catcher" has no icon']);
  });
});
