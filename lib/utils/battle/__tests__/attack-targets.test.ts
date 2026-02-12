import { describe, expect,it } from "vitest";

import { BattleAttack,BattleParticipant } from "../../../../types/battle";
import { AttackType,ParticipantSide } from "../../../constants/battle";
import { processAttack } from "../battle-attack-process";

describe("Multi-target Attack Logic", () => {
  const mockAttacker: BattleParticipant = {
    basicInfo: {
      id: "attacker-1",
      battleId: "battle-1",
      sourceId: "char-1",
      sourceType: "character",
      name: "Elf Archer",
      side: ParticipantSide.ALLY,
      controlledBy: "player-1",
    },
    abilities: {
      level: 1,
      initiative: 10,
      baseInitiative: 10,
      strength: 10,
      dexterity: 16,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: {
        strength: 0,
        dexterity: 3,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      proficiencyBonus: 2,
      race: "Elf",
    },
    combatStats: {
      maxHp: 20,
      currentHp: 20,
      tempHp: 0,
      armorClass: 15,
      speed: 30,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 3, // Simulate bonuses already applied
    },
    spellcasting: {
      spellSlots: {},
      knownSpells: [],
    },
    battleData: {
      attacks: [],
      activeEffects: [],
      passiveAbilities: [],
      racialAbilities: [],
      activeSkills: [],
      equippedArtifacts: [],
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  const mockTarget: BattleParticipant = {
    ...mockAttacker,
    basicInfo: {
      ...mockAttacker.basicInfo,
      id: "target-1",
      name: "Orc 1",
      side: ParticipantSide.ENEMY,
    },
  };

  const mockAttack: BattleAttack = {
    name: "Longbow",
    type: AttackType.RANGED,
    attackBonus: 0,
    damageDice: "1d8",
    damageType: "piercing",
  };

  it("can process a single attack from a multi-target attacker", () => {
    const result = processAttack({
      attacker: mockAttacker,
      target: mockTarget,
      attack: mockAttack,
      d20Roll: 15,
      damageRolls: [5],
      allParticipants: [mockAttacker, mockTarget],
      currentRound: 1,
      battleId: "battle-1",
    });

    expect(result.success).toBe(true);
    expect(result.attackerUpdated.actionFlags.hasUsedAction).toBe(true);
    expect(result.targetUpdated.combatStats.currentHp).toBeLessThan(20);
  });

  it("can be called sequentially for multiple targets", () => {
    const target2 = {
      ...mockTarget,
      basicInfo: { ...mockTarget.basicInfo, id: "target-2", name: "Orc 2" },
    };

    // First attack
    const result1 = processAttack({
      attacker: mockAttacker,
      target: mockTarget,
      attack: mockAttack,
      d20Roll: 15,
      damageRolls: [5],
      allParticipants: [mockAttacker, mockTarget, target2],
      currentRound: 1,
      battleId: "battle-1",
    });

    // Second attack using updated attacker from first attack
    const result2 = processAttack({
      attacker: result1.attackerUpdated,
      target: target2,
      attack: mockAttack,
      d20Roll: 15,
      damageRolls: [5],
      allParticipants: [
        result1.attackerUpdated,
        result1.targetUpdated,
        target2,
      ],
      currentRound: 1,
      battleId: "battle-1",
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result2.attackerUpdated.actionFlags.hasUsedAction).toBe(true);
    expect(result1.targetUpdated.combatStats.currentHp).toBeLessThan(20);
    expect(result2.targetUpdated.combatStats.currentHp).toBeLessThan(20);
  });
});
