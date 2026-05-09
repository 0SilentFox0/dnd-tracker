/* eslint-disable @typescript-eslint/no-explicit-any -- test file with many mocks and assertions */
/**
 * Тести для executeOnBattleStartEffects.
 *
 * Винесено з skill-triggers-execution.test.ts (CODE_AUDIT 5.11).
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeOnBattleStartEffects } from "../execution";
import {
  createMockParticipant,
} from "./skill-triggers-execution-mocks";

import { SkillLevel } from "@/lib/types/skill-tree";

afterEach(() => {
  vi.restoreAllMocks();
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
