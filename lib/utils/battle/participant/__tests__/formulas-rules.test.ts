import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn().mockResolvedValue(null) } } }));

import { ParticipantSide } from "@/lib/constants/battle";
import { getUnitStats } from "@/lib/utils/battle/balance/stats";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { spellcastingDerived } from "@/lib/utils/common/calculations";
import { DEFAULT_RULES, proficiencyForLevel } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

const scores = { strength: 10, dexterity: 10, constitution: 10, intelligence: 16, wisdom: 14, charisma: 10 };

const custom = parseRules({ formulas: { saveDcBase: 10, proficiencyBase: 1, proficiencyEvery: 2 } });

const unit = (knownSpells: string[]) =>
  ({
    id: "u1",
    campaignId: "c1",
    name: "Маг",
    race: "",
    raceId: null,
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 14,
    charisma: 10,
    armorClass: 12,
    initiative: 0,
    speed: 30,
    maxHp: 7,
    proficiencyBonus: 2,
    attacks: [],
    specialAbilities: [],
    knownSpells,
    immunities: [],
    morale: 0,
    maxTargets: 1,
    minTargets: 1,
    abilities: [],
  }) as unknown as UnitFromPrisma;

describe("формули кампанії: герой", () => {
  it("DEFAULT_RULES: майстерність 3, СК 14 на 5-му рівні при INT 16", () => {
    expect(proficiencyForLevel(5, DEFAULT_RULES.formulas)).toBe(3);
    expect(spellcastingDerived(5, "intelligence", scores)).toEqual({ saveDC: 14, attackBonus: 6 });
  });

  it("власні формули: майстерність 3, СК 16", () => {
    expect(proficiencyForLevel(5, custom.formulas)).toBe(3);
    expect(spellcastingDerived(5, "intelligence", scores, custom.formulas)).toEqual({ saveDC: 16, attackBonus: 6 });
  });
});

describe("формули кампанії: юніт", () => {
  it("СК юніта = база кампанії + майстерність + тір", async () => {
    const p = await createBattleParticipantFromUnit(unit(["s1"]), "b", ParticipantSide.ENEMY, 1, undefined, custom);

    expect(spellSaveDc(p, undefined, 8)).toBe(13);
  });

  it("DEFAULT_RULES: СК юніта 8 + майстерність + тір", async () => {
    const p = await createBattleParticipantFromUnit(unit(["s1"]), "b", ParticipantSide.ENEMY, 1);

    expect(spellSaveDc(p, undefined, 8)).toBe(11);
  });
});

describe("формули кампанії: баланс", () => {
  const input = {
    id: "u",
    name: "Маг",
    maxHp: 10,
    level: 1,
    strength: 10,
    dexterity: 10,
    proficiencyBonus: 2,
    attacks: [],
    spells: [
      {
        dice: 3,
        targeting: { kind: "allEnemies" },
        resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
        spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }],
      },
    ],
  };

  it("saveDcBase 10 дає СК на 2 більший, ніж 8", () => {
    const dc = (saveDcBase?: number) => getUnitStats({ ...input, saveDcBase }).spell?.save?.dc;

    expect(dc(10)).toBe(12);
    expect((dc(10) ?? 0) - (dc(8) ?? 0)).toBe(2);
    expect(dc()).toBe(dc(8));
  });
});
