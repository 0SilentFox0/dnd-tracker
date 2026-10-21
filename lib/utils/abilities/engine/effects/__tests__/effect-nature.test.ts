import { describe, expect, it } from "vitest";

import { staticEffectNature } from "@/lib/utils/abilities/engine/effects/effect-nature";
import type { StaticEffect } from "@/lib/utils/abilities/schema";

const stat = (s: string, flat: unknown) => ({ kind: "modifyStat", stat: s, flat }) as unknown as StaticEffect;

describe("staticEffectNature", () => {
  it("знак модифікатора: мінус — дебафф, плюс — бафф; поріг криту обернений", () => {
    expect(staticEffectNature(stat("speed", -10))).toBe("debuff");
    expect(staticEffectNature(stat("armor", 2))).toBe("buff");
    expect(staticEffectNature(stat("critThreshold", -1))).toBe("buff");
    expect(staticEffectNature(stat("critThreshold", 1))).toBe("debuff");
  });

  it("прапорці: перешкода й перевага для атакувальників — дебафф, вразливість — дебафф", () => {
    expect(staticEffectNature({ kind: "flag", flag: "disadvantage" } as StaticEffect)).toBe("debuff");
    expect(staticEffectNature({ kind: "flag", flag: "advantageForAttackers" } as StaticEffect)).toBe("debuff");
    expect(staticEffectNature({ kind: "flag", flag: "resistance", damageType: "fire", percent: -50 } as StaticEffect)).toBe("debuff");
    expect(staticEffectNature({ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 } as StaticEffect)).toBe("buff");
    expect(staticEffectNature({ kind: "flag", flag: "disadvantageForAttackers" } as StaticEffect)).toBe("buff");
  });

  it("формула — не визначити", () => {
    expect(staticEffectNature(stat("speed", { formula: "level * -1" }))).toBeNull();
  });
});
