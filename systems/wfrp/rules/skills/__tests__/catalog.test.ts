import { describe, expect, it } from "vitest";

import { SKILL_ADVANCE_KEY_RE } from "../../characteristics/schema";
import { parseSkillAdvanceKey, SKILL_CATALOG, skillAdvanceKey, skillDef } from "../catalog";

describe("SKILL_CATALOG", () => {
  it("has unique keys matching the advance key regex", () => {
    const keys = SKILL_CATALOG.map((s) => s.key);

    expect(new Set(keys).size).toBe(keys.length);

    for (const k of keys) expect(SKILL_ADVANCE_KEY_RE.test(k) && !k.includes(":")).toBe(true);
  });

  it("fixed skills list specs; basicSpecs are a subset", () => {
    for (const s of SKILL_CATALOG) {
      if (s.spec === "fixed") expect(s.specs?.length).toBeGreaterThan(0);

      for (const b of s.basicSpecs ?? []) expect(s.specs).toContain(b);
    }
  });

  it("advance key round trip", () => {
    expect(skillAdvanceKey("melee", "flail")).toBe("melee:flail");
    expect(parseSkillAdvanceKey("melee:flail")).toEqual({ key: "melee", spec: "flail" });
    expect(parseSkillAdvanceKey("dodge")).toEqual({ key: "dodge" });
    expect(skillDef("dodge")?.characteristic).toBe("ag");
  });
});
