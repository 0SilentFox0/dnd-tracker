/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion -- test file with many mocks and assertions */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeAfterSpellCastTriggers,
  executeBeforeAttackTriggers,
  executeBeforeSpellCastTriggers,
  executeComplexTriggersForChangedParticipant,
  executeOnBattleStartEffects,
  executeOnHitEffects,
  executeOnKillEffects,
  executeSkillsByTrigger,
  executeStartOfRoundTriggers,
  updateMoraleOnEvent,
} from "../execution";
import {
  createMockParticipant,
  createOnHitSkill,
  withActiveSkills,
} from "./skill-triggers-execution-mocks";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import type { BattleParticipant } from "@/types/battle";

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

    it("застосовує initiative та melee_damage з target all_allies до всіх союзників і повертає updatedParticipants", () => {
      const ally1 = createMockParticipant({
        basicInfo: {
          id: "ally1",
          name: "Союзник1",
          side: ParticipantSide.ALLY,
        } as any,
        abilities: { level: 5 } as any,
      });

      const ally2 = createMockParticipant({
        basicInfo: {
          id: "ally2",
          name: "Союзник2",
          side: ParticipantSide.ALLY,
        } as any,
        abilities: { level: 3 } as any,
      });

      const attacker = createMockParticipant({
        basicInfo: {
          id: "attacker",
          name: "Атакуючий",
          side: ParticipantSide.ALLY,
        } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              ...createOnHitSkill("s1", "Баф союзників", [
                {
                  stat: "initiative",
                  type: "flat",
                  value: 2,
                  isPercentage: false,
                  target: "all_allies",
                  duration: 2,
                },
                {
                  stat: "melee_damage",
                  type: "formula",
                  value: "1d4 + hero_level / 3",
                  isPercentage: false,
                  target: "all_allies",
                  duration: 2,
                },
              ]),
            },
          ],
          equippedArtifacts: [],
        } as any,
      });

      const target = createMockParticipant({
        basicInfo: {
          id: "enemy1",
          name: "Ворог",
          side: ParticipantSide.ENEMY,
        } as any,
      });

      const allParticipants = [attacker, ally1, ally2, target];

      const result = executeOnHitEffects(
        attacker,
        target,
        1,
        undefined,
        undefined,
        allParticipants,
      );

      expect(result.updatedParticipants).toBeDefined();
      expect(result.updatedParticipants).toHaveLength(4);

      const ally1Updated = result.updatedParticipants!.find(
        (p) => p.basicInfo.id === "ally1",
      );

      const ally2Updated = result.updatedParticipants!.find(
        (p) => p.basicInfo.id === "ally2",
      );

      const attackerUpdated = result.updatedParticipants!.find(
        (p) => p.basicInfo.id === "attacker",
      );

      expect(ally1Updated?.battleData.activeEffects.length).toBeGreaterThanOrEqual(
        2,
      );
      expect(ally2Updated?.battleData.activeEffects.length).toBeGreaterThanOrEqual(
        2,
      );

      const hasInitiative = (p: BattleParticipant) =>
        p.battleData.activeEffects.some((e) =>
          e.effects?.some((d) => d.type === "initiative_bonus"),
        );

      const hasMeleeDamage = (p: BattleParticipant) =>
        p.battleData.activeEffects.some((e) =>
          e.effects?.some((d) => d.type === "melee_damage"),
        );

      expect(hasInitiative(ally1Updated!)).toBe(true);
      expect(hasInitiative(ally2Updated!)).toBe(true);
      expect(hasMeleeDamage(ally1Updated!)).toBe(true);
      expect(hasMeleeDamage(ally2Updated!)).toBe(true);

      expect(result.messages.length).toBeGreaterThanOrEqual(1);
      expect(attackerUpdated).toBeDefined();
    });

    it("не перетирає вже зменшений HP цілі під час onHit all_allies", () => {
      const attacker = createMockParticipant({
        basicInfo: {
          id: "attacker",
          name: "Атакуючий",
          side: ParticipantSide.ALLY,
        } as any,
        battleData: {
          attacks: [],
          activeEffects: [],
          passiveAbilities: [],
          racialAbilities: [],
          activeSkills: [
            {
              ...createOnHitSkill("s1", "Баф союзників", [
                {
                  stat: "initiative",
                  type: "flat",
                  value: 2,
                  isPercentage: false,
                  target: "all_allies",
                  duration: 2,
                },
              ]),
            },
          ],
          equippedArtifacts: [],
        } as any,
      });

      const damagedTarget = createMockParticipant({
        basicInfo: {
          id: "enemy1",
          name: "Ворог",
          side: ParticipantSide.ENEMY,
        } as any,
        combatStats: {
          ...createMockParticipant().combatStats,
          maxHp: 78,
          currentHp: 59,
        },
      });

      const staleTargetFromOrder = createMockParticipant({
        basicInfo: {
          id: "enemy1",
          name: "Ворог",
          side: ParticipantSide.ENEMY,
        } as any,
        combatStats: {
          ...createMockParticipant().combatStats,
          maxHp: 78,
          currentHp: 78,
        },
      });

      const ally = createMockParticipant({
        basicInfo: {
          id: "ally1",
          name: "Союзник1",
          side: ParticipantSide.ALLY,
        } as any,
      });

      const result = executeOnHitEffects(
        attacker,
        damagedTarget,
        1,
        undefined,
        undefined,
        [attacker, ally, staleTargetFromOrder],
      );

      const targetFromParticipants = result.updatedParticipants?.find(
        (p) => p.basicInfo.id === "enemy1",
      );

      expect(result.updatedTarget.combatStats.currentHp).toBe(59);
      expect(targetFromParticipants?.combatStats.currentHp).toBe(59);
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
    it("додає pendingExtraActions і скидає hasUsedAction при onKill + actions effect", () => {
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
      expect(result.updatedKiller.battleData.pendingExtraActions).toBe(1);
      expect(result.messages.some((m) => m.includes("додатков"))).toBe(true);
    });

    it("onKill з effect value 2 додає 2 до pendingExtraActions", () => {
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
              name: "Нагорода x2",
              effects: [
                {
                  stat: "actions",
                  type: "flat",
                  value: 2,
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

      expect(result.updatedKiller.battleData.pendingExtraActions).toBe(2);
      expect(result.updatedKiller.actionFlags.hasUsedAction).toBe(false);
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

      // initiative_bonus зберігається в activeEffects, застосовується в calculateInitiative
      const initiativeEffect = result.updatedParticipant.battleData.activeEffects.find(
        (e) => e.effects?.some((d) => d.type === "initiative_bonus"),
      );

      expect(initiativeEffect).toBeDefined();

      const bonus = initiativeEffect?.effects?.find((d) => d.type === "initiative_bonus");

      expect(bonus?.value).toBe(2);
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
