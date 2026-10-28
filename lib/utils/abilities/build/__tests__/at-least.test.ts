import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { EffectSchema } from "@/lib/utils/abilities/schema";

const passive = (id: string, effect: object) => resolved({ id, name: id, trigger: { event: "passive" }, effects: [effect as never] }, { type: "artifact", id });

const withStr = (strength: number, abilities: ReturnType<typeof passive>[]) => {
  const p = makeParticipant({ id: "h", abilities });

  return { ...p, abilities: { ...p.abilities, strength, modifiers: { ...p.abilities.modifiers, strength: Math.floor((strength - 10) / 2) } } };
};

const gauntlets = passive("g", { kind: "modifyStat", stat: "strength", atLeast: 19 });

describe("modifyStat atLeast", () => {
  it("raises a lower score, keeps a higher one, applies after flat bonuses", () => {
    expect(bakePassives(withStr(12, [gauntlets])).abilities).toMatchObject({ strength: 19, modifiers: { strength: 4 } });
    expect(bakePassives(withStr(20, [gauntlets])).abilities.strength).toBe(20);
    expect(bakePassives(withStr(18, [gauntlets, passive("b", { kind: "modifyStat", stat: "strength", flat: 2 })])).abilities.strength).toBe(20);
    expect(bakePassives(withStr(12, [gauntlets, passive("b", { kind: "modifyStat", stat: "strength", flat: 2 })])).abilities.strength).toBe(19);
  });

  it("only ability scores, never with flat/percent", () => {
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 19 }).success).toBe(true);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "armor", atLeast: 19 }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 19, flat: 1 }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 31 }).success).toBe(false);
  });
});
