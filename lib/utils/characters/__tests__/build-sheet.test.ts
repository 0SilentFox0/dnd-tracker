import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { buildCharacterSheet, type SheetInput } from "@/lib/utils/characters/sheet";
import type { BattleAttack } from "@/types/battle";
import type { AbilityKey } from "@/types/characters";

const bow = { id: "bow", name: "Довгий лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

const sword = { id: "sw", name: "Кинджал", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4" } as BattleAttack;

function lira(over: Partial<SheetInput["character"]> = {}, attacks: BattleAttack[] = [bow, sword], meleeMultiplier = 1): SheetInput {
  const p = createMockParticipant();

  p.abilities = { ...p.abilities, level: 30, strength: 10, dexterity: 18, modifiers: { ...p.abilities.modifiers, strength: 0, dexterity: 4 }, proficiencyBonus: 9, primaryAbility: (over.primaryAbility ?? undefined) as AbilityKey | undefined, meleeMultiplier, rangedMultiplier: 1 };
  p.battleData.attacks = attacks;
  p.combatStats = { ...p.combatStats, armorClass: 14, maxHp: 127 };

  return {
    participant: p,
    viewer: { isDM: false, isOwner: true },
    maxLevel: 20,
    character: {
      id: "lira", name: "Ліра", avatar: null, level: 30, class: "Ranger", subclass: null, race: "Ельф", alignment: null,
      strength: 10, dexterity: 18, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 14, savingThrows: { dexterity: true }, skills: { stealth: true, perception: true },
      languages: ["Ельфійська"], proficiencies: {}, spellcastingAbility: null, hpMultiplier: null,
      primaryAbility: null, background: "Вона ==вірить== у брата", goals: [{ id: "g", text: "Знайти брата", status: "active", author: "dm" }],
      ...over,
    },
    raceIcon: null,
    immunities: [],
    artifacts: [{ id: "a1", name: "Кольчуга ельфів", icon: null, slot: "armor", rarity: "rare", description: null, effects: ["AC +2"] }],
    spells: [],
    personalSkill: null,
  };
}

describe("buildCharacterSheet", () => {
  it("майстерність від рівня і модифікатори характеристик", () => {
    const s = buildCharacterSheet(lira());

    expect(s.proficiency).toBe(9);
    expect(s.abilities.find((a) => a.key === "dexterity")).toMatchObject({ score: 18, mod: 4, isPrimary: false });
  });

  it("основна СПР → +4 і в ближній атаці; влучання = бойовий calculateAttackBonus", () => {
    const input = lira({ primaryAbility: "dexterity" });

    const s = buildCharacterSheet(input);

    const dagger = s.attacks.find((a) => a.id === "sw");

    expect(dagger?.toHit.total).toBe(calculateAttackBonus(input.participant, sword));
    expect(dagger?.toHit.total).toBe(4 + 9);
    expect(dagger?.toHit.lines[0]).toMatchObject({ label: "Спритність ★", value: "+4" });
    expect(s.abilities.find((a) => a.key === "dexterity")?.isPrimary).toBe(true);
  });

  it("без основної ближня атака бере СИЛ", () => {
    expect(buildCharacterSheet(lira()).attacks.find((a) => a.id === "sw")?.toHit.total).toBe(0 + 9);
  });

  it("середня шкода: кубики зброї + рівень + кубики рівня + характеристика, з коефіцієнтом ДМа", () => {
    const plain = buildCharacterSheet(lira()).attacks.find((a) => a.id === "sw")?.avgDamage.total;

    const doubled = buildCharacterSheet(lira({}, [bow, sword], 2)).attacks.find((a) => a.id === "sw")?.avgDamage.total;

    expect(plain).toBeGreaterThan(30);
    expect(doubled).toBe(Math.floor((plain ?? 0) * 2));
  });

  it("найкраще влучання; без атак — null", () => {
    expect(buildCharacterSheet(lira()).bestToHit).toBe(13);
    expect(buildCharacterSheet(lira({}, [])).bestToHit).toBeNull();
  });

  it("рятівні кидки й навички з майстерністю; пасивне сприйняття", () => {
    const s = buildCharacterSheet(lira());

    expect(s.saves.find((x) => x.key === "dexterity")).toMatchObject({ bonus: 13, proficient: true });
    expect(s.skills.find((x) => x.key === "stealth")).toMatchObject({ label: "Скритність", bonus: 13 });
    expect(s.passives.perception).toBe(10 + 0 + 9);
  });

  it("без магії — magic null і порожні слоти", () => {
    const s = buildCharacterSheet(lira());

    expect(s.magic).toBeNull();
    expect(s.slots).toEqual([]);
  });

  it("історія й ефекти артефактів проходять як є", () => {
    const s = buildCharacterSheet(lira());

    expect(s.story.biography).toBe("Вона ==вірить== у брата");
    expect(s.story.goals).toHaveLength(1);
    expect(s.items.artifacts[0].effects).toEqual(["AC +2"]);
    expect(s.items.grid.armor?.id).toBe("a1");
  });

  it("СЛ і атака заклинанням — ті самі, що в бою (з учасника, а не з бонусних характеристик)", () => {
    const input = lira({ spellcastingAbility: "intelligence" });

    input.participant.abilities.intelligence = 12;
    input.participant.spellcasting = { ...input.participant.spellcasting, spellSaveDC: 17, spellAttackBonus: 9 };

    expect(buildCharacterSheet(input).magic).toEqual({ ability: "Інтелект", saveDC: 17, attackBonus: 9 });
  });

  it("імунітети — зібрані з персонажа й раси (як у бою)", () => {
    const input = lira();

    input.immunities = ["отрута", "сон"];

    expect(buildCharacterSheet(input).immunities).toEqual(["отрута", "сон"]);
  });

  it("рядки шкоди підписані своїм джерелом: артефакт, а не вміння", () => {
    const input = lira();

    input.participant.battleData.resolvedAbilities = [
      { key: "bow", name: "Лук вітру", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, flat: 3 }], source: { type: "artifact", id: "a", name: "Лук вітру" } },
      { key: "arch", name: "Стрільба", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 10 }], source: { type: "skill", id: "s", name: "Стрільба" } },
    ] as never;

    const lines = buildCharacterSheet(input).attacks.find((a) => a.id === "bow")?.avgDamage.lines ?? [];

    expect(lines.find((l) => l.label === "Лук вітру")?.source).toBe("artifact");
    expect(lines.find((l) => l.label === "Стрільба")?.source).toBe("skill");
  });

  it("сети бере з учасника", () => {
    const input = lira();

    const set = { setId: "s1", name: "Мисливець", have: 2, total: 3, complete: false, effects: ["Ініціатива +1"] };

    input.participant.battleData.artifactSets = [set];

    expect(buildCharacterSheet(input).items.sets).toEqual([set]);
  });
});
