import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: (...a: unknown[]) => findFirst(...a) } } }));

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const wfrp = parseRules(WFRP_RULES);

const passive = (id: string, effects: unknown[]) => ({ id, name: id, trigger: { event: "passive" }, effects });

const traitAbilities = [
  passive("armour", [{ kind: "wfrpArmour", head: 3, body: 3, arm: 3, leg: 3 }]),
  passive("ward", [{ kind: "wfrpWard", value: 7 }]),
  passive("size", [{ kind: "wfrpSize", size: "large" }]),
  passive("bite", [{ kind: "wfrpAttack", attack: "bite", damage: 2 }]),
  passive("breath", [{ kind: "wfrpAttack", attack: "breath", damage: 4, rangeFt: 36 }]),
];

const unit = (abilities: unknown[] = []) =>
  ({
    id: "u1", campaignId: "c1", name: "Дракон", race: "", raceId: null, groupId: null, groupColor: null, damageModifier: null, level: 1,
    strength: 10, dexterity: 12, constitution: 10, intelligence: 8, wisdom: 8, charisma: 8, armorClass: 12, initiative: 1, speed: 30, maxHp: 7,
    proficiencyBonus: 2, attacks: [{ name: "Кіготь", attackBonus: 3, damageDice: "1d6", damageType: "slashing" }], specialAbilities: [], knownSpells: [], avatar: null,
    createdAt: new Date(0), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities, characteristics: { base: { s: 40, t: 40 } },
  }) as unknown as UnitFromPrisma;

const build = (abilities: unknown[], rules = wfrp) => createBattleParticipantFromUnit(unit(abilities), "b1", ParticipantSide.ENEMY, 1, undefined, rules);

const stripId = (p: Awaited<ReturnType<typeof build>>) => ({ ...p, basicInfo: { ...p.basicInfo, id: "x" } });

describe("participant from unit: WFRP traits", () => {
  beforeEach(() => findFirst.mockReset());

  it("writes AP, ward and size and appends trait attacks", async () => {
    const p = await build(traitAbilities);

    expect(p.abilities.wfrp).toMatchObject({ ap: { head: 3, body: 3, arm: 3, leg: 3 }, ward: 7, size: "large" });

    const [claw, bite, breath] = p.battleData.attacks;

    expect(claw.name).toBe("Кіготь");
    expect(p.battleData.attacks).toHaveLength(3);
    expect(bite).toMatchObject({ type: AttackType.MELEE, damageBonus: 2, damageDice: "", wfrp: { reachCells: 1 } });
    expect(breath).toMatchObject({ type: AttackType.RANGED, range: "36 ft", targetType: "aoe", wfrp: { blastRadius: 2, noSb: true } });
  });

  it("without traits the participant equals the plain wfrp build", async () => {
    const withNote = await build([passive("n", [{ kind: "note", text: "x" }])]);

    const plain = await build([]);

    expect(withNote.abilities).toEqual(plain.abilities);
    expect(withNote.battleData.attacks).toEqual(plain.battleData.attacks);
    expect(stripId(plain).abilities.wfrp).not.toHaveProperty("ward");
    expect(plain.battleData.attacks).toHaveLength(1);
  });

  it("a d20 ruleset ignores the traits", async () => {
    const p = await build(traitAbilities, DEFAULT_RULES);

    expect(p.abilities.wfrp).toBeUndefined();
    expect(p.battleData.attacks).toHaveLength(1);
  });
});
