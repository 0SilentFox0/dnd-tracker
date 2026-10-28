import { describe, expect, it } from "vitest";

import { bakedStatSources,bakePassives } from "@/lib/utils/abilities/build/bake";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { AbilitySchema, type Condition, isStaticCondition } from "@/lib/utils/abilities/schema";
import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { applyClassArmor } from "@/lib/utils/characters/classes/armor-class";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

const NO_ARMOR: Condition = { type: "armorWorn", categories: ["none"] };

const NO_ARMOR_NO_SHIELD: Condition = { type: "armorWorn", categories: ["none"], shield: "without" };

const chain: EquippedArtifact = { artifactId: "cm", name: "Chain Mail", slot: "armor", bonuses: {}, modifiers: armorStatsColumns({ category: "heavy", base: 16 }).modifiers };

const shield: EquippedArtifact = { artifactId: "sh", name: "Shield", slot: "shield", bonuses: {}, modifiers: [] };

const passive = (id: string, condition: Condition, effects: ResolvedAbility["effects"]): ResolvedAbility => ({ id, name: id, trigger: { event: "passive" }, condition, effects, source: { type: "class", id: "monk", name: "Monk" }, key: `class:monk:${id}` });

function hero(items: EquippedArtifact[], abilities: ResolvedAbility[]): BattleParticipant {
  const base = createMockParticipant();

  return { ...base, abilities: { ...base.abilities, damageModel: "5e", modifiers: { ...base.abilities.modifiers, dexterity: 2, constitution: 3, wisdom: 3 } }, battleData: { ...base.battleData, equippedArtifacts: items, resolvedAbilities: abilities } };
}

const ctx = (p: BattleParticipant) => ({ owner: p, event: null, participants: [p] });

describe("armorWorn", () => {
  it("matches the worn category and the shield option", () => {
    expect(evaluateCondition(NO_ARMOR, ctx(hero([], [])))).toBe(true);
    expect(evaluateCondition(NO_ARMOR, ctx(hero([chain], [])))).toBe(false);
    expect(evaluateCondition(NO_ARMOR, ctx(hero([shield], [])))).toBe(true);
    expect(evaluateCondition(NO_ARMOR_NO_SHIELD, ctx(hero([shield], [])))).toBe(false);
    expect(evaluateCondition({ type: "armorWorn", categories: ["none"], shield: "with" }, ctx(hero([shield], [])))).toBe(true);
    expect(evaluateCondition({ type: "armorWorn", categories: ["none", "light", "medium"] }, ctx(hero([chain], [])))).toBe(false);
  });

  it("is static, also inside not/all/any; other conditions are not", () => {
    expect(isStaticCondition(NO_ARMOR)).toBe(true);
    expect(isStaticCondition({ type: "not", condition: NO_ARMOR })).toBe(true);
    expect(isStaticCondition({ type: "all", conditions: [NO_ARMOR, NO_ARMOR_NO_SHIELD] })).toBe(true);
    expect(isStaticCondition({ type: "any", conditions: [NO_ARMOR, { type: "hpBelow", who: "self", percent: 50 }] })).toBe(false);
    expect(isStaticCondition({ type: "hpBelow", who: "self", percent: 50 })).toBe(false);
  });

  it("schema: a baked stat may use armorWorn, not a dynamic condition", () => {
    const ability = (condition: Condition) => ({ id: "m", name: "Unarmored Movement", trigger: { event: "passive" }, condition, effects: [{ kind: "modifyStat", stat: "speed", flat: 10 }] });

    expect(AbilitySchema.safeParse(ability(NO_ARMOR_NO_SHIELD)).success).toBe(true);
    expect(AbilitySchema.safeParse(ability({ type: "hpBelow", who: "self", percent: 50 })).success).toBe(false);
  });

  it("bakePassives applies armorWorn passives only when the armor matches", () => {
    const movement = passive("move", NO_ARMOR_NO_SHIELD, [{ kind: "modifyStat", stat: "speed", flat: 10 }]);

    expect(bakePassives(hero([], [movement])).combatStats.speed).toBe(40);
    expect(bakePassives(hero([chain], [movement])).combatStats.speed).toBe(30);
    expect(bakePassives(hero([shield], [movement])).combatStats.speed).toBe(30);
    expect(bakedStatSources(hero([], [movement]), "speed")).toEqual([{ label: "Monk", value: 10, sourceType: "class" }]);
    expect(bakedStatSources(hero([chain], [movement]), "speed")).toEqual([]);
  });

  it("Unarmored Defense: Barbarian keeps it with a shield, Monk loses it", () => {
    const barbarian = passive("ud-barb", NO_ARMOR, [{ kind: "modifyStat", stat: "armor", flat: 3 }]);

    const monk = passive("ud-monk", NO_ARMOR_NO_SHIELD, [{ kind: "modifyStat", stat: "armor", flat: 3 }]);

    const shieldBonus = passive("shield", { type: "armorWorn", categories: ["none", "light", "medium", "heavy"] }, [{ kind: "modifyStat", stat: "armor", flat: 2 }]);

    expect(getEffectiveArmorClass(applyClassArmor(hero([shield], [barbarian, shieldBonus])))).toBe(10 + 2 + 3 + 2);
    expect(getEffectiveArmorClass(applyClassArmor(hero([shield], [monk, shieldBonus])))).toBe(10 + 2 + 2);
    expect(getEffectiveArmorClass(applyClassArmor(hero([], [monk])))).toBe(10 + 2 + 3);
    expect(getEffectiveArmorClass(applyClassArmor(hero([chain], [barbarian])))).toBe(16);
  });
});
