import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

const REMOVED = ["spellEnhancement", "spellEffectIncrease", "spellTargetChange", "spellAdditionalModifier", "spellEnhancers", "effectDetails", "hitCheck", "summonUnitId", "castingTime", "healModifier"];

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(full);

    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

describe("поля старої моделі заклинань", () => {
  it("колонки лишаються лише в схемі й міграціях — жоден код їх не читає", () => {
    const hits = ["app", "lib", "components", "types"].flatMap((d) => sources(path.join(ROOT, d))).flatMap((file) => {
      const text = fs.readFileSync(file, "utf8");

      return REMOVED.filter((name) => text.includes(name)).map((name) => `${path.relative(ROOT, file)}: ${name}`);
    }).filter((hit) => !hit.startsWith("lib/__tests__/removed-spell-fields"));

    expect(hits).toEqual([]);
  });
});
