/* eslint-disable @typescript-eslint/no-explicit-any -- test file with many mocks and assertions */
/**
 * Тести для executeOnKillEffects + probability skip.
 *
 * Винесено з skill-triggers-execution.test.ts (CODE_AUDIT 5.11).
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeOnKillEffects } from "../execution";
import {
  createMockParticipant,
} from "./skill-triggers-execution-mocks";

import { SkillLevel } from "@/lib/types/skill-tree";

afterEach(() => {
  vi.restoreAllMocks();
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
