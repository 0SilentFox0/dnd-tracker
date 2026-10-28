import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { limitsLabel } from "@/lib/utils/abilities/registry/labels";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { abilityOptions } from "@/lib/utils/battle/view";

const wing = { id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] };

describe("limits.legendaryCost", () => {
  it("дозволено лише для вміння-дії, 1–3, без aim", () => {
    expect(AbilitySchema.safeParse(wing).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...wing, trigger: { event: "bonusAction" } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...wing, limits: { legendaryCost: 4 } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...wing, aim: { kind: "cell", range: 30 } }).success).toBe(false);
  });

  it("підпис ліміту", () => {
    expect(limitsLabel({ legendaryCost: 2 })).toEqual(["легендарна дія (2)"]);
  });

  it("у звичайному ході легендарне вміння приховане", () => {
    const normal = resolved({ id: "hit", name: "Удар", trigger: { event: "action" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const p = makeParticipant({ id: "d", abilities: [normal, resolved(wing as never)] });

    expect(abilityOptions(p, "action", 1).map((o) => o.ability.id)).toEqual(["hit"]);
  });
});
