/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion -- test file with many mocks and assertions */
/**
 * Тести для executeOnHitEffects (basic) — orchestration на trigger,
 * skip-логіка, oncePerBattle, всі-союзники цілі тощо.
 *
 * Винесено з skill-triggers-execution.test.ts (CODE_AUDIT 5.11).
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeOnHitEffects } from "../execution";
import {
  createMockParticipant,
  createOnHitSkill,
} from "./skill-triggers-execution-mocks";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { BattleParticipant } from "@/types/battle";

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
