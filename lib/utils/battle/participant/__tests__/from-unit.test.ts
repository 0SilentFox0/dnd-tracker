import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: (...a: unknown[]) => findFirst(...a) } } }));

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";

const orc = {
  id: "r1",
  campaignId: "c1",
  name: "Орк",
  color: "#22c55e",
  icon: null,
  availableSkills: [],
  disabledSkills: [],
  passiveAbility: null,
  spellSlotProgression: [],
  abilities: [{ id: "orc-skin", name: "Шкіра орка", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 25 }] }],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const unit = (over: Partial<UnitFromPrisma> = {}) =>
  ({
    id: "u1",
    campaignId: "c1",
    name: "Гоблін",
    race: "Стара назва",
    raceId: "r1",
    groupId: null,
    groupColor: null,
    damageModifier: null,
    level: 1,
    strength: 10,
    dexterity: 12,
    constitution: 10,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
    armorClass: 12,
    initiative: 1,
    speed: 30,
    maxHp: 7,
    proficiencyBonus: 2,
    attacks: [],
    specialAbilities: [],
    knownSpells: [],
    avatar: null,
    createdAt: new Date(0),
    immunities: [],
    morale: 0,
    maxTargets: 1,
    minTargets: 1,
    abilities: [],
    ...over,
  }) as UnitFromPrisma;

const raceAbilities = (p: Awaited<ReturnType<typeof createBattleParticipantFromUnit>>) =>
  (p.battleData.resolvedAbilities ?? []).filter((a) => a.source.type === "race");

describe("createBattleParticipantFromUnit + raceId", () => {
  beforeEach(() => findFirst.mockReset());

  it("назва й вміння раси — з рядка Race за raceId (не з legacy units.race)", async () => {
    const p = await createBattleParticipantFromUnit(unit(), "b1", ParticipantSide.ENEMY, 1, { r1: orc as never });

    expect(p.abilities.race).toBe("Орк");
    expect(raceAbilities(p).map((a) => a.source.id)).toEqual(["r1"]);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("без мапи (призов, додавання учасника) — раса з БД за id у межах кампанії", async () => {
    findFirst.mockResolvedValue(orc);

    const p = await createBattleParticipantFromUnit(unit(), "b1", ParticipantSide.ENEMY, 1);

    expect(findFirst).toHaveBeenCalledWith({ where: { id: "r1", campaignId: "c1" } });
    expect(p.abilities.race).toBe("Орк");
  });

  it("raceId = null — порожня назва, без вмінь раси, без запиту", async () => {
    const p = await createBattleParticipantFromUnit(unit({ raceId: null }), "b1", ParticipantSide.ENEMY, 1);

    expect(p.abilities.race).toBe("");
    expect(raceAbilities(p)).toEqual([]);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
