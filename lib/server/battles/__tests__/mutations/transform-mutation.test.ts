import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { revertExpiredTransforms } from "@/lib/utils/battle/transform/revert";
import type { BattleParticipant } from "@/types/battle";

const frog = {
  id: "frog", campaignId: "c1", name: "Жаба", raceId: null, level: 1, strength: 8, dexterity: 12, constitution: 10, intelligence: 2, wisdom: 8, charisma: 3, armorClass: 11, initiative: 0, speed: 20, gridSize: 1, maxHp: 4,
  proficiencyBonus: 2, attacks: [], knownSpells: [], avatar: null, createdAt: new Date(), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [], levelScaling: null, cr: null, xp: null, multiattack: 1,
  legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [], statblock: { movement: { walk: 20 } }, spellcasting: {}, sourceId: null, sourceHash: null,
};

const hex = {
  id: "hex", campaignId: "c1", name: "Синтетична жаба", level: 1, groupId: null, icon: null, dice: 0, cost: "action",
  targeting: { kind: "enemy" }, resolution: { kind: "auto" }, raceModifiers: [],
  spellEffects: [{ kind: "transform", unitId: "frog", revertAtZero: true, duration: { rounds: 5 } }],
} as unknown as Spell;

const hero = () => {
  const base = participant("hero", { controlledBy: "user-1" });

  return { ...base, spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["hex"], spellSaveDC: 13, spellAttackBonus: 5 } };
};

const run = (ps: BattleParticipant[] = [hero(), goblin]) => {
  const ctx = context({ participants: ps, rng: () => 0.5, isDM: true, userId: "dm" });

  ctx.scene.round = 1;

  return createSpellMutation({ loadSpell: async () => hex, loadPool: async () => ({ units: [frog as never], races: [] }) })(ctx, { casterId: "hero", spellId: "hex", targetIds: ["gob"], diceRolls: [] } as never);
};

describe("transform через spell-mutation", () => {
  it("ціль набуває форми юніта, а після тривалості повертається", async () => {
    const out = await run();

    const target = out.participants.find((p) => p.basicInfo.id === "gob") as BattleParticipant;

    expect(target.combatStats).toMatchObject({ maxHp: 4, currentHp: 4, armorClass: 11 });
    expect(target.battleData.transform?.saved.maxHp).toBe(goblin.combatStats.maxHp);

    const back = revertExpiredTransforms(out.participants, 7).participants.find((p) => p.basicInfo.id === "gob") as BattleParticipant;

    expect(back.combatStats.maxHp).toBe(goblin.combatStats.maxHp);
    expect(back.battleData.transform).toBeUndefined();
  });
});
