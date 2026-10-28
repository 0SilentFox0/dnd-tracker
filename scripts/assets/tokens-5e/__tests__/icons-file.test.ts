import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, it } from "vitest";

import { readIcons, writeIcons } from "../icons-file";

it("round-trips with sorted keys and is stable", () => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "icons-")), "icons.json");

  expect(readIcons(p)).toEqual({ spells: {}, units: {}, artifacts: {} });
  writeIcons({ spells: { b: "u2", a: "u1" }, units: {}, artifacts: {} }, p);

  const first = fs.readFileSync(p, "utf8");

  expect(first.indexOf('"a"')).toBeLessThan(first.indexOf('"b"'));
  writeIcons(readIcons(p), p);
  expect(fs.readFileSync(p, "utf8")).toBe(first);
});
