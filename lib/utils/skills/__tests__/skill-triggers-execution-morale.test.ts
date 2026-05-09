/* eslint-disable @typescript-eslint/no-explicit-any -- test file with many mocks and assertions */
/**
 * Тести для updateMoraleOnEvent.
 *
 * Винесено з skill-triggers-execution.test.ts (CODE_AUDIT 5.11).
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { updateMoraleOnEvent } from "../execution";
import {
  createMockParticipant,
} from "./skill-triggers-execution-mocks";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";

afterEach(() => {
  vi.restoreAllMocks();
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
