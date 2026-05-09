/* eslint-disable @typescript-eslint/no-explicit-any -- test file with many mocks and assertions */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeAfterSpellCastTriggers,
  executeBeforeAttackTriggers,
  executeBeforeSpellCastTriggers,
  executeComplexTriggersForChangedParticipant,
  executeSkillsByTrigger,
  executeStartOfRoundTriggers,
} from "../execution";
import {
  createMockParticipant,
  withActiveSkills,
} from "./skill-triggers-execution-mocks";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";

describe("skill-triggers-execution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  describe("applyMainActionUsed", () => {
    it("зменшує pendingExtraActions і залишає hasUsedAction false коли пул > 0", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
          pendingExtraActions: 2,
        },
        actionFlags: {
          hasUsedAction: false,
          hasUsedBonusAction: false,
          hasUsedReaction: false,
          hasExtraTurn: false,
        },
      });

      const result = applyMainActionUsed(participant);

      expect(result.battleData.pendingExtraActions).toBe(1);
      expect(result.actionFlags.hasUsedAction).toBe(false);
    });

    it("виставляє hasUsedAction true коли пул 0", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
          pendingExtraActions: 0,
        },
        actionFlags: {
          hasUsedAction: false,
          hasUsedBonusAction: false,
          hasUsedReaction: false,
          hasExtraTurn: false,
        },
      });

      const result = applyMainActionUsed(participant);

      expect(result.actionFlags.hasUsedAction).toBe(true);
    });

    it("трактує відсутній pendingExtraActions як 0", () => {
      const participant = createMockParticipant({
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [],
          equippedArtifacts: [],
        },
      });

      const result = applyMainActionUsed(participant);

      expect(result.actionFlags.hasUsedAction).toBe(true);
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

  describe("executeComplexTriggersForChangedParticipant", () => {
    it("виконує complex-тригер після зниження HP союзника", () => {
      const iven = createMockParticipant({
        basicInfo: {
          ...createMockParticipant().basicInfo,
          id: "iven",
          name: "Айвен",
          side: ParticipantSide.ALLY,
        },
        combatStats: {
          ...createMockParticipant().combatStats,
          currentHp: 10,
          maxHp: 82,
        },
      });

      const godrick = withActiveSkills(
        createMockParticipant({
          basicInfo: {
            ...createMockParticipant().basicInfo,
            id: "godrick",
            name: "Годрик",
            side: ParticipantSide.ALLY,
          },
        }),
        [
          {
            skillId: "godrick-skill",
            mainSkillId: "",
            level: SkillLevel.BASIC,
            name: "Годрик",
            effects: [
              {
                stat: "morale",
                type: "min",
                value: 1,
                isPercentage: false,
              },
              {
                stat: "damage",
                type: "formula",
                value: "1d4 + hero_level / 3",
                isPercentage: false,
              },
            ],
            skillTriggers: [
              {
                type: "complex",
                stat: "HP",
                target: "ally",
                operator: "<=",
                value: 15,
                valueType: "percent",
              },
            ],
          },
        ],
      );

      const enemy = createMockParticipant({
        basicInfo: {
          ...createMockParticipant().basicInfo,
          id: "enemy",
          name: "Ворог",
          side: ParticipantSide.ENEMY,
        },
      });

      const result = executeComplexTriggersForChangedParticipant(
        [godrick, iven, enemy],
        "iven",
        1,
      );

      const updatedGodrick = result.updatedParticipants.find(
        (p) => p.basicInfo.id === "godrick",
      );

      expect(updatedGodrick).toBeDefined();
      expect(updatedGodrick?.battleData.activeEffects).toHaveLength(1);
      expect(updatedGodrick?.battleData.activeEffects[0].name).toBe(
        "Годрик — morale",
      );
      expect(result.messages).toContain("✨ Годрик: morale +1");
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



});
