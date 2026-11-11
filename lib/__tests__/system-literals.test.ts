import { describe, expect, it } from "vitest";

import { countLiterals, isLiteralAllowed, literalTokens, readLiteralsExempt, scanLiterals } from "@/scripts/shared/system-ratchet";

describe("system literals ratchet", () => {
  const exempt = readLiteralsExempt();

  const found = scanLiterals();

  it("counts match the recorded numbers exactly", () => {
    const problems = [
      ...Object.entries(found).filter(([file, n]) => n > (exempt[file] ?? 0)).map(([file, n]) => `new leak: ${file} has ${n}, allowed ${exempt[file] ?? 0}`),
      ...Object.entries(exempt).filter(([file, max]) => (found[file] ?? 0) < max).map(([file, max]) => `lower the entry: ${file} has ${found[file] ?? 0}, recorded ${max}`),
    ];

    expect(problems).toEqual([]);
  });

  it("scans neither systems/ nor system-owned folders", () => {
    const tokens = literalTokens();

    expect(Object.keys(found).filter((f) => f.startsWith("systems/") || isLiteralAllowed(f, tokens))).toEqual([]);
  });

  describe("countLiterals", () => {
    const tokens = literalTokens();

    it("counts wfrp case-insensitively as a substring", () => expect(countLiterals("const WFRP_X = wfrpThing; // Wfrp", tokens)).toBe(3));

    it("counts a d20 key only as a quoted literal", () => {
      expect(countLiterals('const a = "homm"; const b = homm;', tokens)).toBe(1);
      expect(countLiterals("key === 'dnd5e'", tokens)).toBe(1);
    });

    it("counts a template key outside the registry", () => expect(countLiterals('const k = "srd-5.2";', tokens)).toBe(1));

    it("ignores unrelated text", () => expect(countLiterals("const x = 1; // plain", tokens)).toBe(0));
  });

  it("allows system folders and the template registry", () => {
    const tokens = literalTokens();

    expect(isLiteralAllowed("lib/utils/rules/systems/d20/index.ts", tokens)).toBe(true);
    expect(isLiteralAllowed("scripts/templates/systems/wfrp/units.ts", tokens)).toBe(true);
    expect(isLiteralAllowed("scripts/templates/grim-d100/validate.ts", tokens)).toBe(true);
    expect(isLiteralAllowed("lib/utils/templates/registry.ts", tokens)).toBe(true);
    expect(isLiteralAllowed("scripts/sim/battle-sweep/profiles/grim-d100.ts", tokens)).toBe(true);
    expect(isLiteralAllowed("scripts/sim/battle-sweep/run.ts", tokens)).toBe(false);
    expect(isLiteralAllowed("lib/utils/battle/foo.ts", tokens)).toBe(false);
    expect(isLiteralAllowed("scripts/templates/lib/foo.ts", tokens)).toBe(false);
  });
});
