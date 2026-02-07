import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeAfterSpellCastTriggers,
  executeBeforeAttackTriggers,
  executeBeforeSpellCastTriggers,
  executeBonusActionSkill,
  executeOnBattleStartEffects,
  executeOnHitEffects,
  executeOnKillEffects,
  executeSkillsByTrigger,
  executeStartOfRoundTriggers,
  updateMoraleOnEvent,
} from "../skill-triggers-execution";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillEffect,
} from "@/types/battle";

function createMockParticipant(
  overrides?: Partial<BattleParticipant>,
): BattleParticipant {
  return {
    basicInfo: {
      id: "p1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Тест",
      side: ParticipantSide.ALLY,
      controlledBy: "user-1",
    },
    abilities: {
      level: 1,
      initiative: 10,
      baseInitiative: 10,
      strength: 14,
      dexterity: 12,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: {
        strength: 2,
        dexterity: 1,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      proficiencyBonus: 2,
      race: "human",
    },
    combatStats: {
      maxHp: 20,
      currentHp: 20,
      tempHp: 0,
      armorClass: 14,
      speed: 30,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: { spellSlots: {}, knownSpells: [] },
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
    ...overrides,
  };
}

function createOnHitSkill(
  skillId: string,
  name: string,
  effects: SkillEffect[],
  modifiers?: {
    oncePerBattle?: boolean;
    twicePerBattle?: boolean;
    probability?: number;
  },
): ActiveSkill {
  return {
    skillId,
    mainSkillId: "",
    level: SkillLevel.BASIC,
    name,
    effects,
    skillTriggers: [
      {
        type: "simple",
        trigger: "onHit",
        ...(modifiers && { modifiers }),
      },
    ],
  };
}

function withActiveSkills(
  participant: BattleParticipant,
  skills: ActiveSkill[],
): BattleParticipant {
  return {
    ...participant,
    battleData: {
      ...participant.battleData,
      activeSkills: skills,
    },
  };
}

describe("skill-triggers-execution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeOnHitEffects", () => {
    it("повертає незмінених учасників при відсутності onHit скілів", () => {
      const attacker = createMockParticipant();

      const target = createMockParticipant({
        basicInfo: {
          ...createMockParticipant().basicInfo,
          id: "t1",
          name: "Ціль",
        },
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedTarget).toEqual(target);
      expect(result.updatedAttacker).toEqual(attacker);
      expect(result.messages).toHaveLength(0);
    });

    it("пропускає скіл без skillTriggers (continue)", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Удар", [
              { stat: "bleed_damage", type: "flat", value: 1, isPercentage: false },
            ]),
            {
              skillId: "s2",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Без тригера",
              effects: [],
              skillTriggers: [],
            },
          ],
          equippedArtifacts: [],
        },
      });
      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });
      const result = executeOnHitEffects(attacker, target, 1);
      expect(result.updatedTarget.battleData.activeEffects).toHaveLength(1);
    });

    it("пропускає скіл з тригером не onHit (continue)", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Удар", [
              { stat: "bleed_damage", type: "flat", value: 1, isPercentage: false },
            ]),
            {
              skillId: "s2",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Старт раунду",
              effects: [],
              skillTriggers: [{ type: "simple", trigger: "startRound" }],
            },
          ],
          equippedArtifacts: [],
        },
      });
      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });
      const result = executeOnHitEffects(attacker, target, 1);
      expect(result.updatedTarget.battleData.activeEffects).toHaveLength(1);
    });

    it("застосовує bleed_damage DOT до цілі", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Рублячий удар", [
              {
                stat: "bleed_damage",
                type: "dice",
                value: "1d4",
                isPercentage: false,
                duration: 2,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: {
          id: "t1",
          name: "Орк",
          side: ParticipantSide.ENEMY,
        } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedTarget.battleData.activeEffects).toHaveLength(1);
      expect(
        result.updatedTarget.battleData.activeEffects[0].dotDamage,
      ).toEqual({
        damagePerRound: 3,
        damageType: "bleed",
      });
      expect(result.updatedTarget.battleData.activeEffects[0].duration).toBe(2);
      expect(result.messages.some((m) => m.includes("bleed"))).toBe(true);
    });

    it("лікує атакуючого на 50% фізичної шкоди (blood_sacrifice_heal)", () => {
      const attacker = createMockParticipant({
        combatStats: {
          maxHp: 20,
          currentHp: 10,
          tempHp: 0,
          armorClass: 14,
          speed: 30,
          morale: 0,
          status: "active",
          minTargets: 1,
          maxTargets: 1,
        },
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Кровожертсво", [
              {
                stat: "blood_sacrifice_heal",
                type: "percent",
                value: 50,
                isPercentage: true,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1, undefined, 20);

      expect(result.updatedAttacker.combatStats.currentHp).toBe(20);
      expect(
        result.messages.some(
          (m) => m.includes("лікується") && m.includes("10"),
        ),
      ).toBe(true);
    });

    it("накладає руну runic_attack на атакуючого (ініціатива)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Рунічна атака", [
              {
                stat: "runic_attack",
                type: "flag",
                value: true,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedAttacker.battleData.activeEffects).toHaveLength(1);
      expect(
        result.updatedAttacker.battleData.activeEffects[0].effects[0],
      ).toEqual({
        type: "initiative_bonus",
        value: 1,
      });
      expect(result.messages.some((m) => m.includes("ініціатива +1"))).toBe(
        true,
      );
    });

    it("пропускає onHit при oncePerBattle якщо вже спрацював", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill(
              "s1",
              "Раз за бій",
              [
                {
                  stat: "bleed_damage",
                  type: "flat",
                  value: 5,
                  isPercentage: false,
                },
              ],
              { oncePerBattle: true },
            ),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const skillUsageCounts: Record<string, number> = { s1: 1 };

      const result = executeOnHitEffects(attacker, target, 1, skillUsageCounts);

      expect(result.updatedTarget.battleData.activeEffects).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe("checkSurviveLethal", () => {
    it("повертає survived: true коли є onLethalDamage + survive_lethal", () => {
      const participant = createMockParticipant({
        combatStats: {
          maxHp: 20,
          currentHp: 0,
          tempHp: 0,
          armorClass: 14,
          speed: 30,
          morale: 0,
          status: "active",
          minTargets: 1,
          maxTargets: 1,
        },
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Битва до останнього",
              effects: [
                {
                  stat: "survive_lethal",
                  type: "flag",
                  value: true,
                  isPercentage: false,
                },
              ],
              skillTriggers: [
                {
                  type: "simple",
                  trigger: "onLethalDamage",
                  modifiers: { oncePerBattle: true },
                },
              ],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = checkSurviveLethal(participant, {});

      expect(result.survived).toBe(true);
      expect(result.message).toContain("вижив з 1 HP");
    });

    it("повертає survived: false коли немає відповідного скіла", () => {
      const participant = createMockParticipant();

      const result = checkSurviveLethal(participant);

      expect(result.survived).toBe(false);
      expect(result.message).toBeNull();
    });

    it("пропускає при oncePerBattle якщо вже спрацював", () => {
      const participant = createMockParticipant({
        combatStats: {
          maxHp: 20,
          currentHp: 0,
          tempHp: 0,
          armorClass: 14,
          speed: 30,
          morale: 0,
          status: "active",
          minTargets: 1,
          maxTargets: 1,
        },
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Битва до останнього",
              effects: [
                {
                  stat: "survive_lethal",
                  type: "flag",
                  value: true,
                  isPercentage: false,
                },
              ],
              skillTriggers: [
                {
                  type: "simple",
                  trigger: "onLethalDamage",
                  modifiers: { oncePerBattle: true },
                },
              ],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = checkSurviveLethal(participant, { s1: 1 });

      expect(result.survived).toBe(false);
    });

    it("пропускає скіл без skillTriggers (continue)", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Без тригера",
              effects: [{ stat: "survive_lethal", type: "flag", value: true, isPercentage: false }],
              skillTriggers: [],
            },
          ],
          equippedArtifacts: [],
        },
      });
      expect(checkSurviveLethal(participant).survived).toBe(false);
    });

    it("пропускає скіл з тригером не onLethalDamage (continue)", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Старт раунду",
              effects: [{ stat: "survive_lethal", type: "flag", value: true, isPercentage: false }],
              skillTriggers: [{ type: "simple", trigger: "startRound" }],
            },
          ],
          equippedArtifacts: [],
        },
      });
      expect(checkSurviveLethal(participant).survived).toBe(false);
    });

    it("пропускає скіл з onLethalDamage але без survive_lethal ефекту (continue)", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Інший ефект",
              effects: [{ stat: "hp_bonus", type: "flat", value: 5, isPercentage: false }],
              skillTriggers: [{ type: "simple", trigger: "onLethalDamage" }],
            },
          ],
          equippedArtifacts: [],
        },
      });
      expect(checkSurviveLethal(participant).survived).toBe(false);
    });
  });

  describe("executeOnKillEffects", () => {
    it("скидає hasUsedAction при onKill + actions effect", () => {
      const killer = createMockParticipant({
        actionFlags: {
          hasUsedAction: true,
          hasUsedBonusAction: false,
          hasUsedReaction: false,
          hasExtraTurn: false,
        },
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Нагорода",
              effects: [
                {
                  stat: "actions",
                  type: "flat",
                  value: 1,
                  isPercentage: false,
                },
              ],
              skillTriggers: [{ type: "simple", trigger: "onKill" }],
            },
          ],
          equippedArtifacts: [],
        },
      });

      vi.spyOn(Math, "random").mockReturnValue(0);

      const result = executeOnKillEffects(killer);

      expect(result.updatedKiller.actionFlags.hasUsedAction).toBe(false);
      expect(result.messages.some((m) => m.includes("додаткову дію"))).toBe(
        true,
      );
    });

    it("не змінює учасника без onKill скілів", () => {
      const killer = createMockParticipant({
        actionFlags: { hasUsedAction: true } as any,
      });

      const result = executeOnKillEffects(killer);

      expect(result.updatedKiller.actionFlags.hasUsedAction).toBe(true);
      expect(result.messages).toHaveLength(0);
    });

    it("пропускає скіл без skillTriggers (continue)", () => {
      const killer = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Без тригера",
              effects: [{ stat: "actions", type: "flat", value: 1, isPercentage: false }],
              skillTriggers: [],
            },
          ],
          equippedArtifacts: [],
        },
      });
      const result = executeOnKillEffects(killer);
      expect(result.messages).toHaveLength(0);
    });

    it("пропускає скіл з тригером не onKill (continue)", () => {
      const killer = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Старт раунду",
              effects: [{ stat: "actions", type: "flat", value: 1, isPercentage: false }],
              skillTriggers: [{ type: "simple", trigger: "startRound" }],
            },
          ],
          equippedArtifacts: [],
        },
      });
      const result = executeOnKillEffects(killer);
      expect(result.messages).toHaveLength(0);
    });

    it("пропускає onKill при oncePerBattle вже використано (continue)", () => {
      const killer = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Нагорода",
              effects: [{ stat: "actions", type: "flat", value: 1, isPercentage: false }],
              skillTriggers: [
                { type: "simple", trigger: "onKill", modifiers: { oncePerBattle: true } },
              ],
            },
          ],
          equippedArtifacts: [],
        },
      });
      vi.spyOn(Math, "random").mockReturnValue(0);
      const result = executeOnKillEffects(killer, { s1: 1 });
      expect(result.messages).toHaveLength(0);
    });
  });

  describe("executeOnBattleStartEffects", () => {
    it("додає +2 ініціативи при onBattleStart + initiative", () => {
      const participant = createMockParticipant({
        abilities: { initiative: 10, baseInitiative: 10 } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Перший удар",
              effects: [
                {
                  stat: "initiative",
                  type: "flat",
                  value: 2,
                  isPercentage: false,
                },
              ],
              skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = executeOnBattleStartEffects(participant, 1);

      expect(result.updatedParticipant.abilities.initiative).toBe(12);
      expect(result.messages.some((m) => m.includes("ініціатива"))).toBe(true);
    });

    it("не змінює учасника без onBattleStart скілів", () => {
      const participant = createMockParticipant({
        abilities: { initiative: 10 } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Інший скіл",
              effects: [
                {
                  stat: "initiative",
                  type: "flat",
                  value: 2,
                  isPercentage: false,
                },
              ],
              skillTriggers: [{ type: "simple", trigger: "bonusAction" }],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = executeOnBattleStartEffects(participant, 1);

      expect(result.updatedParticipant.abilities.initiative).toBe(10);
      expect(result.messages).toHaveLength(0);
    });

    it("додає бонус урону на першу атаку (damage)", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Перший удар",
              effects: [
                { stat: "damage", type: "flat", value: 5, isPercentage: false },
              ],
              skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = executeOnBattleStartEffects(participant, 1);

      expect(result.updatedParticipant.battleData.activeEffects).toHaveLength(
        1,
      );
      expect(
        result.updatedParticipant.battleData.activeEffects[0].effects[0],
      ).toEqual({
        type: "damage_bonus",
        value: 5,
      });
    });

    it("додає advantage на першу атаку (advantage)", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Перевага",
              effects: [
                {
                  stat: "advantage",
                  type: "flag",
                  value: true,
                  isPercentage: false,
                },
              ],
              skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = executeOnBattleStartEffects(participant, 1);

      expect(result.updatedParticipant.battleData.activeEffects).toHaveLength(
        1,
      );
      expect(
        result.updatedParticipant.battleData.activeEffects[0].effects[0].type,
      ).toBe("advantage_attack");
    });

    it("onBattleStart default (невідомий stat) — пропускає ефект", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Невідомий",
              effects: [
                {
                  stat: "unknown_battle_start",
                  type: "flat",
                  value: 1,
                  isPercentage: false,
                },
              ],
              skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
            },
          ],
          equippedArtifacts: [],
        },
      });
      const result = executeOnBattleStartEffects(participant, 1);
      expect(result.updatedParticipant.battleData.activeEffects).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe("executeSkillsByTrigger", () => {
    it("повертає порожній результат при відсутності скілів", () => {
      const participant = createMockParticipant();

      const result = executeSkillsByTrigger(
        participant,
        "startRound",
        [participant],
        {
          currentRound: 1,
        },
      );

      expect(result.executedSkills).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
    });

    it("виконує startRound скіл з melee_damage ефектом", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Удар",
          effects: [
            {
              stat: "melee_damage",
              type: "percent",
              value: 25,
              isPercentage: true,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "startRound" }],
        },
      ]);

      const result = executeSkillsByTrigger(
        participant,
        "startRound",
        [participant],
        {
          currentRound: 1,
        },
      );

      expect(result.executedSkills).toHaveLength(1);
      expect(
        result.executedSkills[0].effects.some((e) =>
          e.includes("melee_damage"),
        ),
      ).toBe(true);
    });

    it("виконує скіл з physical_resistance", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Стійкість",
          effects: [
            {
              stat: "physical_resistance",
              type: "flat",
              value: 20,
              isPercentage: false,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "passive" }],
        },
      ]);

      const result = executeSkillsByTrigger(
        participant,
        "passive",
        [participant],
        {
          currentRound: 1,
        },
      );

      expect(result.executedSkills).toHaveLength(1);
    });

    it("виконує скіл з hp_bonus (buff)", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Життя",
          effects: [
            {
              stat: "hp_bonus",
              type: "flat",
              value: 5,
              isPercentage: false,
              duration: 2,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "startRound" }],
        },
      ]);

      const result = executeSkillsByTrigger(
        participant,
        "startRound",
        [participant],
        {
          currentRound: 1,
        },
      );

      expect(result.participant.battleData.activeEffects).toHaveLength(1);
      expect(
        result.participant.battleData.activeEffects[0].effects[0].type,
      ).toBe("hp_bonus");
    });

    it("виконує скіл з bleed_damage DOT через startRound (executeSkillEffects)", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Кровотеча",
          effects: [
            {
              stat: "bleed_damage",
              type: "dice",
              value: "1d6",
              isPercentage: false,
              duration: 1,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "startRound" }],
        },
      ]);

      const result = executeSkillsByTrigger(
        participant,
        "startRound",
        [participant],
        {
          currentRound: 1,
        },
      );

      expect(result.participant.battleData.activeEffects).toHaveLength(1);
      expect(
        result.participant.battleData.activeEffects[0].dotDamage?.damageType,
      ).toBe("bleed");
    });

    it("parseDiceAverage повертає 0 для невалідної dice-нотації (bleed_damage string)", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Кровотеча",
          effects: [
            {
              stat: "bleed_damage",
              type: "dice",
              value: "invalid-dice",
              isPercentage: false,
              duration: 1,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "startRound" }],
        },
      ]);

      const result = executeSkillsByTrigger(
        participant,
        "startRound",
        [participant],
        { currentRound: 1 },
      );

      expect(result.participant.battleData.activeEffects).toHaveLength(1);
      expect(
        result.participant.battleData.activeEffects[0].dotDamage
          ?.damagePerRound,
      ).toBe(0);
    });

    it("виконує скіл з attack_before_enemy (flag)", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Флаг",
          effects: [
            {
              stat: "attack_before_enemy",
              type: "flag",
              value: true,
              isPercentage: false,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "passive" }],
        },
      ]);

      const result = executeSkillsByTrigger(participant, "passive", [
        participant,
      ]);

      expect(
        result.executedSkills[0].effects.some((e) =>
          e.includes("attack_before_enemy"),
        ),
      ).toBe(true);
    });

    it("виконує скіл з невідомим stat (default)", () => {
      const participant = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Невідомий",
          effects: [
            {
              stat: "unknown_stat",
              type: "flat",
              value: 1,
              isPercentage: false,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "passive" }],
        },
      ]);

      const result = executeSkillsByTrigger(participant, "passive", [
        participant,
      ]);

      expect(result.executedSkills[0].effects).toContain("unknown_stat: 1");
    });
  });

  describe("executeStartOfRoundTriggers", () => {
    it("виконує startRound для всіх учасників", () => {
      const p1 = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Раунд",
          effects: [
            { stat: "initiative", type: "flat", value: 1, isPercentage: false },
          ],
          skillTriggers: [{ type: "simple", trigger: "startRound" }],
        },
      ]);

      const participants = [
        p1,
        createMockParticipant({
          basicInfo: { ...p1.basicInfo, id: "p2", name: "P2" } as any,
        }),
      ];

      const result = executeStartOfRoundTriggers(participants, 2);

      expect(result.updatedParticipants).toHaveLength(2);
    });
  });

  describe("executeBeforeAttackTriggers / executeAfterAttackTriggers", () => {
    it("executeBeforeAttackTriggers викликає beforeOwnerAttack при isOwnerAction", () => {
      const attacker = withActiveSkills(createMockParticipant(), [
        {
          skillId: "s1",
          mainSkillId: "",
          level: SkillLevel.BASIC,
          name: "Перед атакою",
          effects: [
            {
              stat: "melee_damage",
              type: "flat",
              value: 2,
              isPercentage: false,
            },
          ],
          skillTriggers: [{ type: "simple", trigger: "beforeOwnerAttack" }],
        },
      ]);

      const target = createMockParticipant({
        basicInfo: {
          id: "t1",
          name: "Ціль",
          side: ParticipantSide.ENEMY,
        } as any,
      });

      const result = executeBeforeAttackTriggers(
        attacker,
        target,
        [attacker, target],
        true,
      );

      expect(result.messages).toBeDefined();
    });

    it("executeAfterAttackTriggers викликає afterEnemyAttack при !isOwnerAction", () => {
      const attacker = createMockParticipant({
        basicInfo: { side: ParticipantSide.ENEMY } as any,
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeAfterAttackTriggers(
        attacker,
        target,
        [attacker, target],
        false,
      );

      expect(result.updatedAttacker).toBeDefined();
    });
  });

  describe("executeBeforeSpellCastTriggers / executeAfterSpellCastTriggers", () => {
    it("executeBeforeSpellCastTriggers з isOwnerAction", () => {
      const caster = createMockParticipant();

      const result = executeBeforeSpellCastTriggers(
        caster,
        undefined,
        [caster],
        true,
      );

      expect(result.updatedCaster).toEqual(caster);
    });

    it("executeAfterSpellCastTriggers з target", () => {
      const caster = createMockParticipant();

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeAfterSpellCastTriggers(
        caster,
        target,
        [caster, target],
        true,
      );

      expect(result.updatedCaster).toBeDefined();
    });
  });

  describe("executeOnHitEffects — кожен тип ефекту", () => {
    it("poison_damage DOT на ціль", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Отрута", [
              {
                stat: "poison_damage",
                type: "flat",
                value: 3,
                isPercentage: false,
                duration: 2,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(
        result.updatedTarget.battleData.activeEffects[0].dotDamage?.damageType,
      ).toBe("poison");
    });

    it("burn_damage DOT", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Опік", [
              {
                stat: "burn_damage",
                type: "flat",
                value: 4,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(
        result.updatedTarget.battleData.activeEffects[0].dotDamage?.damageType,
      ).toBe("burn");
    });

    it("fire_damage DOT", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Вогонь", [
              {
                stat: "fire_damage",
                type: "flat",
                value: 2,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(
        result.updatedTarget.battleData.activeEffects[0].dotDamage?.damageType,
      ).toBe("fire");
    });

    it("initiative дебаф на ціль", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Оглушення", [
              {
                stat: "initiative",
                type: "flat",
                value: -2,
                isPercentage: false,
                duration: 1,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(
        result.updatedTarget.battleData.activeEffects[0].effects[0].type,
      ).toBe("initiative_bonus");
    });

    it("armor дебаф на ціль", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Бронебій", [
              {
                stat: "armor",
                type: "flat",
                value: -1,
                isPercentage: false,
                duration: 1,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
        combatStats: { armorClass: 15 } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedTarget.combatStats.armorClass).toBe(14);
    });

    it("speed дебаф на ціль (percent)", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Сповільнення", [
              {
                stat: "speed",
                type: "percent",
                value: -50,
                isPercentage: true,
                duration: 1,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
        combatStats: { speed: 30 } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedTarget.combatStats.speed).toBe(15);
    });

    it("damage_resistance ignore", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Пробивний", [
              {
                stat: "damage_resistance",
                type: "ignore",
                value: true,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.messages.some((m) => m.includes("резист"))).toBe(true);
    });

    it("damage stack", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Послідовність", [
              { stat: "damage", type: "stack", value: 2, isPercentage: false },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.messages.some((m) => m.includes("урону"))).toBe(true);
    });

    it("guaranteed_hit", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "В яблучко", [
              {
                stat: "guaranteed_hit",
                type: "flag",
                value: true,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.messages.some((m) => m.includes("автовлучання"))).toBe(
        true,
      );
    });

    it("area_damage", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Площа", [
              {
                stat: "area_damage",
                type: "percent",
                value: 40,
                isPercentage: true,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.messages.some((m) => m.includes("area"))).toBe(true);
    });

    it("area_cells", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Зона", [
              {
                stat: "area_cells",
                type: "flat",
                value: 9,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.messages.some((m) => m.includes("зона"))).toBe(true);
    });

    it("armor_reduction на ціль", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Зниження AC", [
              {
                stat: "armor_reduction",
                type: "percent",
                value: 20,
                isPercentage: true,
                duration: 1,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
        combatStats: { armorClass: 20 } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedTarget.combatStats.armorClass).toBe(16);
    });

    it("runic_attack — руна AC", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.26);

      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Рунічна атака", [
              {
                stat: "runic_attack",
                type: "flag",
                value: true,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(
        result.updatedAttacker.battleData.activeEffects[0].effects[0].type,
      ).toBe("ac_bonus");
    });

    it("runic_attack — руна HP heal", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.51);

      const attacker = createMockParticipant({
        combatStats: { maxHp: 20, currentHp: 12 } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Рунічна атака", [
              {
                stat: "runic_attack",
                type: "flag",
                value: true,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedAttacker.combatStats.currentHp).toBe(20);
    });

    it("runic_attack — руна мораль", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.76);

      const attacker = createMockParticipant({
        combatStats: { morale: 0 } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Рунічна атака", [
              {
                stat: "runic_attack",
                type: "flag",
                value: true,
                isPercentage: false,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedAttacker.combatStats.morale).toBe(1);
    });

    it("blood_sacrifice_heal не лікує при 0 фізичної шкоди", () => {
      const attacker = createMockParticipant({
        combatStats: { currentHp: 10 } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill("s1", "Кровожертсво", [
              {
                stat: "blood_sacrifice_heal",
                type: "percent",
                value: 50,
                isPercentage: true,
              },
            ]),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1, undefined, 0);

      expect(result.updatedAttacker.combatStats.currentHp).toBe(10);
      expect(result.messages).toHaveLength(0);
    });

    it("пропускає onHit при twicePerBattle", () => {
      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill(
              "s1",
              "Двічі",
              [
                {
                  stat: "bleed_damage",
                  type: "flat",
                  value: 1,
                  isPercentage: false,
                },
              ],
              { twicePerBattle: true },
            ),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1, { s1: 2 });

      expect(result.updatedTarget.battleData.activeEffects).toHaveLength(0);
    });

    it("пропускає onHit при probability", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);

      const attacker = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            createOnHitSkill(
              "s1",
              "Шанс",
              [
                {
                  stat: "bleed_damage",
                  type: "flat",
                  value: 1,
                  isPercentage: false,
                },
              ],
              { probability: 0.5 },
            ),
          ],
          equippedArtifacts: [],
        },
      });

      const target = createMockParticipant({
        basicInfo: { id: "t1", name: "Ціль" } as any,
      });

      const result = executeOnHitEffects(attacker, target, 1);

      expect(result.updatedTarget.battleData.activeEffects).toHaveLength(0);
    });
  });

  describe("executeOnKillEffects — probability skip", () => {
    it("пропускає onKill при probability", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.9);

      const killer = createMockParticipant({
        actionFlags: { hasUsedAction: true } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Нагорода",
              effects: [
                {
                  stat: "actions",
                  type: "flat",
                  value: 1,
                  isPercentage: false,
                },
              ],
              skillTriggers: [
                {
                  type: "simple",
                  trigger: "onKill",
                  modifiers: { probability: 0.5 },
                },
              ],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = executeOnKillEffects(killer);

      expect(result.updatedKiller.actionFlags.hasUsedAction).toBe(true);
    });
  });

  describe("executeBonusActionSkill", () => {
    const bonusActionSkill = (
      effects: SkillEffect[],
      modifiers?: {
        oncePerBattle?: boolean;
        twicePerBattle?: boolean;
        probability?: number;
      },
    ): ActiveSkill => ({
      skillId: "s1",
      mainSkillId: "",
      level: SkillLevel.BASIC,
      name: "Бонус",
      effects,
      skillTriggers: [
        {
          type: "simple",
          trigger: "bonusAction",
          ...(modifiers && { modifiers }),
        },
      ],
    });

    it("повертає незмінених при відсутності тригера bonusAction", () => {
      const skill: ActiveSkill = {
        skillId: "s1",
        mainSkillId: "",
        level: SkillLevel.BASIC,
        name: "Не бонус",
        effects: [],
        skillTriggers: [{ type: "simple", trigger: "startRound" }],
      };

      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        skill,
        [participant],
        1,
      );

      expect(result.updatedParticipant).toEqual(participant);
    });

    it("повертає early при oncePerBattle вже використано", () => {
      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([], { oncePerBattle: true }),
        [participant],
        1,
        undefined,
        { s1: 1 },
      );

      expect(result.messages.some((m) => m.includes("використано"))).toBe(true);
    });

    it("повертає early при twicePerBattle вже двічі", () => {
      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([], { twicePerBattle: true }),
        [participant],
        1,
        undefined,
        { s1: 2 },
      );

      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("повертає early при probability не спрацювала", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.9);

      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([], { probability: 0.5 }),
        [participant],
        1,
      );

      expect(result.messages.some((m) => m.includes("не спрацювало"))).toBe(
        true,
      );
    });

    it("redirect_physical_damage з ціллю", () => {
      const participant = createMockParticipant();

      const other = createMockParticipant({
        basicInfo: { id: "p2", name: "P2" } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "redirect_physical_damage",
            type: "percent",
            value: 50,
            isPercentage: true,
          },
        ]),
        [participant, other],
        1,
        "p2",
      );

      expect(result.messages.some((m) => m.includes("перенаправляє"))).toBe(
        true,
      );
    });

    it("summon_tier", () => {
      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "summon_tier", type: "flat", value: 2, isPercentage: false },
        ]),
        [participant],
        1,
      );

      expect(result.messages.some((m) => m.includes("призиває"))).toBe(true);
    });

    it("marked_targets", () => {
      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "marked_targets",
            type: "flat",
            value: 3,
            isPercentage: false,
          },
        ]),
        [participant],
        1,
      );

      expect(result.messages.some((m) => m.includes("позначає"))).toBe(true);
    });

    it("extra_casts скидає hasUsedAction", () => {
      const participant = createMockParticipant({
        actionFlags: { hasUsedAction: true } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "extra_casts", type: "flat", value: 1, isPercentage: false },
        ]),
        [participant],
        1,
      );

      expect(result.updatedParticipant.actionFlags.hasUsedAction).toBe(false);
    });

    it("morale на себе", () => {
      const participant = createMockParticipant({
        combatStats: { morale: 0 } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "morale", type: "flat", value: 2, isPercentage: false },
        ]),
        [participant],
        1,
      );

      expect(result.updatedParticipant.combatStats.morale).toBe(2);
    });

    it("morale на ціль (targetParticipantId)", () => {
      const participant = createMockParticipant();

      const ally = createMockParticipant({
        basicInfo: { id: "ally1", name: "Ally" } as any,
        combatStats: { morale: 0 } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "morale", type: "flat", value: 1, isPercentage: false },
        ]),
        [participant, ally],
        1,
        "ally1",
      );

      expect(
        result.updatedParticipants.find((p) => p.basicInfo.id === "ally1")
          ?.combatStats.morale,
      ).toBe(1);
    });

    it("restore_spell_slot", () => {
      const participant = createMockParticipant({
        spellcasting: {
          spellSlots: {
            "1": { max: 2, current: 1 },
            "2": { max: 1, current: 0 },
          },
          knownSpells: [],
        },
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "restore_spell_slot",
            type: "flat",
            value: 1,
            isPercentage: false,
          },
        ]),
        [participant],
        1,
      );

      const slot = result.updatedParticipant.spellcasting.spellSlots["1"];

      expect(slot?.current).toBe(2);
    });

    it("field_damage (formula)", () => {
      const participant = createMockParticipant({
        abilities: { level: 5 } as any,
      });

      const enemy = createMockParticipant({
        basicInfo: {
          id: "e1",
          name: "Enemy",
          side: ParticipantSide.ENEMY,
        } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "field_damage",
            type: "formula",
            value: "hero_level",
            isPercentage: false,
          },
        ]),
        [participant, enemy],
        1,
      );

      expect(
        result.updatedParticipants.find((p) => p.basicInfo.id === "e1")
          ?.battleData.activeEffects.length,
      ).toBe(1);
    });

    it("revive_hp з ціллю", () => {
      const participant = createMockParticipant();

      const deadAlly = createMockParticipant({
        basicInfo: { id: "dead1", name: "Dead" } as any,
        combatStats: { maxHp: 20, currentHp: 0, status: "dead" } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "revive_hp", type: "flat", value: 10, isPercentage: false },
        ]),
        [participant, deadAlly],
        1,
        "dead1",
      );

      const revived = result.updatedParticipants.find(
        (p) => p.basicInfo.id === "dead1",
      );

      expect(revived?.combatStats.status).toBe("active");
      expect(revived?.combatStats.currentHp).toBe(10);
    });

    it("morale_restore (негативна мораль на ворогів)", () => {
      const participant = createMockParticipant();

      const enemy = createMockParticipant({
        basicInfo: { id: "e1", name: "E", side: ParticipantSide.ENEMY } as any,
        combatStats: { morale: 0, status: "active" } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "morale_restore",
            type: "flat",
            value: -3,
            isPercentage: false,
          },
        ]),
        [participant, enemy],
        1,
      );

      expect(
        result.updatedParticipants.find((p) => p.basicInfo.id === "e1")
          ?.combatStats.morale,
      ).toBe(-3);
    });

    it("clear_negative_effects з ціллю", () => {
      const participant = createMockParticipant();

      const ally = createMockParticipant({
        basicInfo: { id: "a1", name: "Ally" } as any,
        battleData: {
          attacks: [],
          activeEffects: [
            {
              id: "debuff1",
              name: "Debuff",
              type: "debuff",
              duration: 1,
              appliedAt: { round: 1, timestamp: new Date() },
              effects: [],
            },
          ],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
        },
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "clear_negative_effects",
            type: "flag",
            value: true,
            isPercentage: false,
          },
        ]),
        [participant, ally],
        1,
        "a1",
      );

      expect(
        result.updatedParticipants.find((p) => p.basicInfo.id === "a1")
          ?.battleData.activeEffects,
      ).toHaveLength(0);
    });

    it("default effect логує повідомлення", () => {
      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "unknown_bonus",
            type: "flat",
            value: 5,
            isPercentage: false,
          },
        ]),
        [participant],
        1,
      );

      expect(result.messages.some((m) => m.includes("unknown_bonus"))).toBe(
        true,
      );
    });

    it("встановлює hasUsedBonusAction", () => {
      const participant = createMockParticipant();

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "summon_tier", type: "flat", value: 1, isPercentage: false },
        ]),
        [participant],
        1,
      );

      expect(result.updatedParticipant.actionFlags.hasUsedBonusAction).toBe(
        true,
      );
    });

    it("інкрементує skillUsageCounts при успішному виконанні", () => {
      const participant = createMockParticipant();
      const counts: Record<string, number> = {};

      executeBonusActionSkill(
        participant,
        bonusActionSkill([
          { stat: "summon_tier", type: "flat", value: 1, isPercentage: false },
        ]),
        [participant],
        1,
        undefined,
        counts,
      );

      expect(counts["s1"]).toBe(1);
    });

    it("field_damage з невалідною формулою повертає 0 урону (catch evaluateFormulaSimple)", () => {
      const participant = createMockParticipant();
      const enemy = createMockParticipant({
        basicInfo: { id: "e1", side: ParticipantSide.ENEMY } as any,
        combatStats: { status: "active" } as any,
      });

      const result = executeBonusActionSkill(
        participant,
        bonusActionSkill([
          {
            stat: "field_damage",
            type: "formula",
            value: ")", // невалідна формула — викликає catch у evaluateFormulaSimple
            isPercentage: false,
          },
        ]),
        [participant, enemy],
        1,
      );

      const updatedEnemy = result.updatedParticipants.find(
        (p) => p.basicInfo.id === "e1",
      );
      expect(updatedEnemy?.battleData.activeEffects).toHaveLength(1);
      expect(updatedEnemy?.battleData.activeEffects[0].dotDamage?.damagePerRound).toBe(0);
    });
  });

  describe("updateMoraleOnEvent", () => {
    it("повертає незмінених при відсутності учасника", () => {
      const participants = [createMockParticipant()];

      const result = updateMoraleOnEvent(participants, "kill", "nonexistent");

      expect(result.updatedParticipants).toEqual(participants);
      expect(result.messages).toHaveLength(0);
    });

    it("збільшує мораль союзників при kill (morale_per_kill)", () => {
      const killer = createMockParticipant({
        basicInfo: { id: "k1", name: "Killer" } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Помста",
              effects: [
                {
                  stat: "morale_per_kill",
                  type: "flat",
                  value: 1,
                  isPercentage: false,
                },
              ],
              skillTriggers: [],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const ally = createMockParticipant({
        basicInfo: { id: "a1", name: "Ally" } as any,
        combatStats: { morale: 0 } as any,
      });

      const enemy = createMockParticipant({
        basicInfo: { id: "e1", name: "Enemy", side: ParticipantSide.ENEMY } as any,
        combatStats: { morale: 0, status: "active" } as any,
      });

      const result = updateMoraleOnEvent(
        [killer, ally, enemy],
        "kill",
        "k1",
      );

      expect(result.messages.length).toBeGreaterThan(0);

      const updatedKiller = result.updatedParticipants.find(
        (p) => p.basicInfo.id === "k1",
      );
      expect(updatedKiller?.combatStats.morale).toBe(1);

      const unchangedEnemy = result.updatedParticipants.find(
        (p) => p.basicInfo.id === "e1",
      );
      expect(unchangedEnemy?.combatStats.morale).toBe(0);
    });

    it("змінює мораль при allyDeath (morale_per_ally_death)", () => {
      const deadAlly = createMockParticipant({
        basicInfo: {
          id: "p1",
          name: "Dead",
          side: ParticipantSide.ALLY,
        } as any,
        combatStats: { morale: 0, status: "dead" } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
        },
      });

      const livingAlly = createMockParticipant({
        basicInfo: { id: "a1", name: "Ally", side: ParticipantSide.ALLY } as any,
        combatStats: { morale: 0, status: "active" } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Скорбота",
              effects: [
                {
                  stat: "morale_per_ally_death",
                  type: "flat",
                  value: -1,
                  isPercentage: false,
                },
              ],
              skillTriggers: [],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const result = updateMoraleOnEvent(
        [deadAlly, livingAlly],
        "allyDeath",
        "p1",
      );

      const updatedLiving = result.updatedParticipants.find(
        (p) => p.basicInfo.id === "a1",
      );
      expect(updatedLiving?.combatStats.morale).toBe(-1);
    });

    it("не змінює союзника без morale_per_ally_death (return p)", () => {
      const deadAlly = createMockParticipant({
        basicInfo: {
          id: "p1",
          name: "Dead",
          side: ParticipantSide.ALLY,
        } as any,
        combatStats: { morale: 0, status: "dead" } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
        },
      });

      const livingWithSkill = createMockParticipant({
        basicInfo: { id: "a1", name: "WithSkill", side: ParticipantSide.ALLY } as any,
        combatStats: { morale: 0, status: "active" } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              skillId: "s1",
              mainSkillId: "",
              level: SkillLevel.BASIC,
              name: "Скорбота",
              effects: [
                {
                  stat: "morale_per_ally_death",
                  type: "flat",
                  value: -1,
                  isPercentage: false,
                },
              ],
              skillTriggers: [],
            },
          ],
          equippedArtifacts: [],
        },
      });

      const livingWithoutSkill = createMockParticipant({
        basicInfo: { id: "a2", name: "NoSkill", side: ParticipantSide.ALLY } as any,
        combatStats: { morale: 5, status: "active" } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
        },
      });

      const result = updateMoraleOnEvent(
        [deadAlly, livingWithSkill, livingWithoutSkill],
        "allyDeath",
        "p1",
      );

      expect(
        result.updatedParticipants.find((p) => p.basicInfo.id === "a1")
          ?.combatStats.morale,
      ).toBe(-1);
      expect(
        result.updatedParticipants.find((p) => p.basicInfo.id === "a2")
          ?.combatStats.morale,
      ).toBe(5);
    });
  });
});
