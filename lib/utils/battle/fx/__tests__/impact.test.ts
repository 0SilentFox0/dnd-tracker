import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { IMPACT_MS, impactFor as impactForSpec, mapAction } from "@/lib/utils/battle/fx";
import type { BattleAction } from "@/types/battle";

const impactFor = (action: BattleAction | undefined, id: string) => impactForSpec(action ? mapAction(action)[0] : undefined, id);

describe("impactFor", () => {
  it("fire bolt target → fire damage after the bolt", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactFor(a, "t")).toEqual({ element: "fire", kind: "damage", delayMs: IMPACT_MS.bolt });
  });

  it("heal spell target → kind heal", () => {
    const a = action({ actionType: "spell", actionDetails: { spellEffectKinds: ["heal"] } });

    expect(impactFor(a, "t")).toMatchObject({ kind: "heal", delayMs: IMPACT_MS.heal });
  });

  it("melee physical hit → attack melee", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true, damageRolls: [{ dice: "1d8", results: [5], total: 5, damageType: "slashing" }] } });

    expect(impactFor(a, "t")).toMatchObject({ element: "physical", attack: "melee" });
  });

  it("ranged physical hit → attack ranged", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: true, damageRolls: [{ dice: "1d8", results: [5], total: 5, damageType: "piercing" }] } });

    expect(impactFor(a, "t")).toMatchObject({ element: "physical", attack: "ranged" });
  });

  it("spell bolt → no attack kind", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactFor(a, "t")?.attack).toBeUndefined();
  });

  it("miss → null", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: false } });

    expect(impactFor(a, "t")).toBeNull();
  });

  it("non-target and no action → null", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

    expect(impactFor(a, "x")).toBeNull();
    expect(impactFor(undefined, "t")).toBeNull();
  });

  it("buff/debuff → null (no damage frame borrowed)", () => {
    expect(impactFor(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["modifyStat"] } }), "t")).toBeNull();
    expect(impactFor(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["applyCondition"] } }), "t")).toBeNull();
  });

  it("eldritch borrows the fire frame at its own impact time; slow, haste and stoneskin have none", () => {
    const cast = (spellName: string, actionDetails: Record<string, unknown>) => impactFor(action({ actionType: "spell", actionDetails: { spellName, ...actionDetails } }), "t");

    expect(cast("Потойбічна стріла", { spellDamageType: "fire", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toEqual({ element: "fire", kind: "damage", delayMs: IMPACT_MS.eldritch });
    expect(cast("Сповільнення", { spellEffectKinds: ["modifyStat"] })).toBeNull();
    expect(cast("Поспіх", { spellEffectKinds: ["modifyStat"] })).toBeNull();
    expect(cast("Кам'яна шкіра", { spellEffectKinds: ["modifyStat"] })).toBeNull();
  });
});
