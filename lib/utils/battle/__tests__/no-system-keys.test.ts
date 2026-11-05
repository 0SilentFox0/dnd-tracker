import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const SYSTEM_KEY = /["`]battleWfrp\./;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);

    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);

    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("battle core knows no rule-system i18n keys", () => {
  it("lib/utils/battle has no battleWfrp.* literals", () => {
    const hits = walk(join(ROOT, "lib/utils/battle"))
      .map((file) => relative(ROOT, file))
      .flatMap((file) =>
        readFileSync(join(ROOT, file), "utf8")
          .split("\n")
          .flatMap((line, i) => (SYSTEM_KEY.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
      );

    expect(hits, "system keys belong to lib/utils/rules/systems/<system>").toEqual([]);
  });

  it("the pattern catches both quote styles", () => {
    expect(SYSTEM_KEY.test('textRef("battleWfrp.log.x")')).toBe(true);
    expect(SYSTEM_KEY.test("textRef(`battleWfrp.${k}`)")).toBe(true);
    expect(SYSTEM_KEY.test("battleLog.percentile")).toBe(false);
  });
});
