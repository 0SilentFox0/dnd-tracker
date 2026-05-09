/* eslint-disable @typescript-eslint/no-explicit-any -- test file with many mocks and assertions */
/**
 * Тести для executeBonusActionSkill.
 *
 * Винесено з skill-triggers-execution.test.ts (CODE_AUDIT 5.11) щоб
 * розбити мега-файл (2847 рядків) на тематичні suite-файли.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeBonusActionSkill } from "../execution";
import { createMockParticipant } from "./skill-triggers-execution-mocks";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";

describe("executeBonusActionSkill", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    expect(result.messages.some((m) => m.includes("не спрацювало"))).toBe(true);
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

    expect(result.messages.some((m) => m.includes("перенаправляє"))).toBe(true);
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
      result.updatedParticipants.find((p) => p.basicInfo.id === "e1")?.battleData
        .activeEffects.length,
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

    expect(result.messages.some((m) => m.includes("unknown_bonus"))).toBe(true);
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

    expect(result.updatedParticipant.actionFlags.hasUsedBonusAction).toBe(true);
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
    expect(
      updatedEnemy?.battleData.activeEffects[0].dotDamage?.damagePerRound,
    ).toBe(0);
  });
});
