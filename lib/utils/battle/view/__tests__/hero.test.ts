import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { abilityCharges, bonusTargetSide, lastAction, needsMoraleCheck, slotLevels, spellTier, weaponPreview } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction } from "@/types/battle";

const ability = (over: Partial<ResolvedAbility>): ResolvedAbility =>
  ({ key: "k", name: "Друге дихання", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: "1d10" }], source: { type: "skill", id: "s", name: "S" }, ...over }) as ResolvedAbility;

describe("мій герой", () => {
  it("spellTier", () => {
    expect([0, 1, 2, 3, 4, 5].map(spellTier)).toEqual(["iron", "bronze", "silver", "gold", "mithril", "platinum"]);
  });

  it("slotLevels — п'ять кіл, відсутні з max 0", () => {
    const p = createMockParticipant();

    const s = slotLevels({ ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 4, current: 3 }, "3": { max: 2, current: 2 } } } });

    expect(s).toEqual([
      { level: 1, max: 4, current: 3 }, { level: 2, max: 0, current: 0 }, { level: 3, max: 2, current: 2 },
      { level: 4, max: 0, current: 0 }, { level: 5, max: 0, current: 0 },
    ]);
  });

  it("abilityCharges — лише обмежені бонусні дії, з урахуванням використань", () => {
    const p = createMockParticipant();

    const limited = ability({ key: "sw", limits: { perBattle: 1 } });

    const charges = abilityCharges({
      ...p,
      battleData: { ...p.battleData, resolvedAbilities: [limited, ability({ key: "free" })], abilityUsage: { sw: { battle: 1, round: 1, turn: 1 } } },
    });

    expect(charges).toEqual([{ key: "sw", name: "Друге дихання", icon: undefined, left: 0, limit: 1, per: "battle" }]);
  });

  it("getEffectiveArmorClass враховує ауру союзника", () => {
    const base = createMockParticipant();

    const me = { ...base, basicInfo: { ...base.basicInfo, id: "me" }, combatStats: { ...base.combatStats, armorClass: 16 } };

    const paladin = {
      ...base,
      basicInfo: { ...base.basicInfo, id: "pal" },
      battleData: { ...base.battleData, resolvedAbilities: [ability({ key: "aura", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 4, target: "allAllies" }] as ResolvedAbility["effects"] })] },
    };

    expect(getEffectiveArmorClass(me, [me, paladin])).toBe(20);
  });

  it("bonusTargetSide", () => {
    expect(bonusTargetSide(ability({ effects: [{ kind: "heal", amount: "1d8", target: "eventTarget" }] as ResolvedAbility["effects"] }))).toBe("ally");
    expect(bonusTargetSide(ability({ effects: [{ kind: "dealDamage", amount: "2d6", target: "eventTarget" }] as ResolvedAbility["effects"] }))).toBe("enemy");
    expect(bonusTargetSide(ability({}))).toBeNull();
  });

  it("lastAction пропускає end_turn", () => {
    const log = [{ actionType: "attack", actionIndex: 1 }, { actionType: "end_turn", actionIndex: 2 }] as BattleAction[];

    expect(lastAction(log)?.actionIndex).toBe(1);
    expect(lastAction([])).toBeNull();
  });

  it("needsMoraleCheck: мораль ≠ 0, не некромант, людина з від'ємною — ні, вже перевірено — ні", () => {
    const p = createMockParticipant();

    const m = (morale: number, race = "elf") => ({ ...p, abilities: { ...p.abilities, race }, combatStats: { ...p.combatStats, morale } });

    expect(needsMoraleCheck(m(1), null)).toBe(true);
    expect(needsMoraleCheck(m(0), null)).toBe(false);
    expect(needsMoraleCheck(m(-1, "human"), null)).toBe(false);
    expect(needsMoraleCheck(m(2, "necromancer"), null)).toBe(false);
    expect(needsMoraleCheck(m(1), { participantId: p.basicInfo.id })).toBe(false);
  });

  it("weaponPreview: бонус ближнього бою видно на мечі, але не на луку; оцінка з бонусом", () => {
    const base = createMockParticipant();

    const me = {
      ...base,
      basicInfo: { ...base.basicInfo, sourceType: "unit" as const },
      battleData: { ...base.battleData, resolvedAbilities: [ability({ key: "ea", name: "Експертна атака", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 25 }] as ResolvedAbility["effects"] })] },
    };

    const sword = { name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

    const bow = { ...sword, name: "Лук", type: AttackType.RANGED };

    const s = weaponPreview(me, sword, [me]);

    expect(s.bonuses.map((b) => [b.label, b.percent])).toEqual([["Експертна атака", 25]]);
    expect(weaponPreview(me, bow, [me]).bonuses).toEqual([]);
    expect(s.estimate).toBeGreaterThan(weaponPreview({ ...me, battleData: { ...me.battleData, resolvedAbilities: [] } }, sword, [me]).estimate);
  });

  it("сторона з ParticipantSide лишається рядком", () => {
    expect(ParticipantSide.ALLY).toBe("ally");
    expect(AttackType.MELEE).toBeDefined();
  });
});
