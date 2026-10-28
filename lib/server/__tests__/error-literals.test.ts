import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");

const SKIP = new Set(["lib/ai/context/prompt.ts"]);

const ERROR_CONTEXT = /throw |errorResponse\(|Error\(|forbidden\(|conflict\(|json\(\{ *error|error: ["`']/;

const CYRILLIC_LITERAL = /(["'`])[^"'`\n]*[А-Яа-яІЇЄҐіїєґ][^"'`\n]*\1/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);

    if (e.isDirectory()) return e.name === "__tests__" ? [] : walk(p);

    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("error texts", () => {
  it("lib/server and lib/ai keep Cyrillic error texts in API_ERRORS", () => {
    const offenders = [...walk(join(ROOT, "lib/server")), ...walk(join(ROOT, "lib/ai"))].flatMap((file) => {
      const rel = relative(ROOT, file);

      if (SKIP.has(rel)) return [];

      return readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (ERROR_CONTEXT.test(line) && CYRILLIC_LITERAL.test(line) ? [`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`] : []));
    });

    expect(offenders).toEqual([]);
  });
});
