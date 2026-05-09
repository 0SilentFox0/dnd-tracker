/* eslint-disable @typescript-eslint/no-explicit-any -- test file with many mocks and assertions */
/**
 * Тести для executeOnHitEffects — кожен тип ефекту (DOT, debuff, runic,
 * blood-sacrifice, area, modifier gating).
 *
 * Винесено з skill-triggers-execution.test.ts (CODE_AUDIT 5.11) щоб
 * розбити мега-файл (2847 рядків) на тематичні suite-файли.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeOnHitEffects } from "../execution";
import {
  createMockParticipant,
  createOnHitSkill,
} from "./skill-triggers-execution-mocks";

describe("executeOnHitEffects — кожен тип ефекту", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    expect(result.messages.some((m) => m.includes("автовлучання"))).toBe(true);
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
