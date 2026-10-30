import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, it } from "vitest";

import { type IconsFile, readIcons, writeIcons } from "../icons-file";

const EMPTY: IconsFile = { spells: {}, units: {}, artifacts: {}, features: {}, races: {}, classes: {}, subclasses: {}, backgrounds: {} };

it("round-trips with sorted keys and is stable", () => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "icons-")), "icons.json");

  expect(readIcons(p)).toEqual(EMPTY);
  writeIcons({ ...EMPTY, spells: { b: "u2", a: "u1" } }, p);

  const first = fs.readFileSync(p, "utf8");

  expect(first.indexOf('"a"')).toBeLessThan(first.indexOf('"b"'));
  writeIcons(readIcons(p), p);
  expect(fs.readFileSync(p, "utf8")).toBe(first);
});

it("loads an old file with only some categories as all eight keys", () => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "icons-")), "icons.json");

  fs.writeFileSync(p, JSON.stringify({ spells: { a: "u" } }));
  expect(readIcons(p)).toEqual({ ...EMPTY, spells: { a: "u" } });
});
