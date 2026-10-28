import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIRS = ["lib/utils/compendium-import", "lib/utils/content/import"];

const WORKER = "file.worker.ts";

const VALUE_SERVER_IMPORT = /^import\s+(?!type\b)[^;]*from\s+["']@\/lib\/server\//m;

describe("client-shared import utils", () => {
  it("do not import lib/server values (type-only imports and the parser worker are allowed)", () => {
    const offenders = DIRS.flatMap((dir) =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".ts") && f !== WORKER)
        .filter((f) => VALUE_SERVER_IMPORT.test(readFileSync(join(dir, f), "utf8"))),
    );

    expect(offenders).toEqual([]);
  });
});
