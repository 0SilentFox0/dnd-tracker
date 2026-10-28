import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "..");

describe("pipeline layering", () => {
  it("не імпортує lib/server, lib/db і не використовує динамічні імпорти", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(join(dir, file), "utf8");

      expect(source, file).not.toMatch(/lib\/server|@\/lib\/db/);
      expect(source, file).not.toMatch(/\bimport\(/);
    }
  });
});
