import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import {
  calculateHPGain,
  getAbilityModifier,
  getPassiveScore,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
} from "@/lib/utils/common/calculations";
import { calculateSpellSlotGain } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { campaign } = accessResult;

    // Отримуємо персонажа з його расою
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    const validationError = validateCampaignOwnership(character, id);

    if (validationError) {
      return validationError;
    }

    // Після перевірки character гарантовано не null
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    
    // Перевіряємо максимальний рівень
    if (character.level >= campaign.maxLevel) {
      return NextResponse.json(
        { error: `Персонаж досяг максимального рівня ${campaign.maxLevel}` },
        { status: 400 }
      );
    }

    // Отримуємо расу персонажа
    const race = await prisma.race.findFirst({
      where: {
        campaignId: id,
        name: character.race,
      },
    });

    const spellSlotProgression: SpellSlotProgression[] =
      Array.isArray(race?.spellSlotProgression)
        ? (race.spellSlotProgression as unknown as SpellSlotProgression[])
        : [];

    // Новий рівень
    const newLevel = character.level + 1;

    // Розраховуємо модифікатор конституції для розрахунку HP
    const conMod = getAbilityModifier(character.constitution);

    // Обираємо випадковий атрибут для +1
    const abilities = [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ] as const;

    const randomAbility =
      abilities[Math.floor(Math.random() * abilities.length)];

    // Оновлюємо значення атрибуту
    const updatedAbilities: Record<string, number> = {
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
    };
    
    // Додаємо +1 до випадкового атрибуту
    updatedAbilities[randomAbility] = (character[randomAbility as keyof typeof character] as number) + 1;


    const newIntMod = getAbilityModifier(updatedAbilities.intelligence);

    const newWisMod = getAbilityModifier(updatedAbilities.wisdom);

    const newChaMod = getAbilityModifier(updatedAbilities.charisma);

    // Збільшуємо HP
    const hitDice = character.hitDice;

    const hpGain = calculateHPGain(hitDice, conMod);

    const newMaxHp = character.maxHp + hpGain;

    const newCurrentHp = character.currentHp + hpGain; // Автоматично лікуємо при прокачці

    // Розраховуємо нові автоматичні значення
    const proficiencyBonus = getProficiencyBonus(newLevel);

    const skills = (character.skills || {}) as Record<string, boolean>;

    const passivePerception = getPassiveScore(
      newWisMod,
      skills.perception || false,
      proficiencyBonus
    );

    const passiveInvestigation = getPassiveScore(
      newIntMod,
      skills.investigation || false,
      proficiencyBonus
    );

    const passiveInsight = getPassiveScore(
      newWisMod,
      skills.insight || false,
      proficiencyBonus
    );

    // Розраховуємо spellcasting параметри якщо є
    let spellSaveDC: number | null = character.spellSaveDC;

    let spellAttackBonus: number | null = character.spellAttackBonus;

    if (character.spellcastingAbility) {
      const abilityMod =
        character.spellcastingAbility === "intelligence"
          ? newIntMod
          : character.spellcastingAbility === "wisdom"
          ? newWisMod
          : newChaMod;

      spellSaveDC = getSpellSaveDC(proficiencyBonus, abilityMod);
      spellAttackBonus = getSpellAttackBonus(proficiencyBonus, abilityMod);
    }

    // Розраховуємо нові магічні слоти
    const currentSpellSlots = (character.spellSlots ||
      {}) as Record<
      string,
      { max: number; current: number }
    >;

    const spellSlotGain = calculateSpellSlotGain(
      character.level,
      newLevel,
      campaign.maxLevel,
      spellSlotProgression
    );

    // Об'єднуємо поточні слоти з новими
    const newSpellSlots: Record<string, { max: number; current: number }> = {
      ...currentSpellSlots,
    };

    for (const [level, slots] of Object.entries(spellSlotGain)) {
      if (newSpellSlots[level]) {
        newSpellSlots[level] = {
          max: newSpellSlots[level].max + slots.max,
          current: newSpellSlots[level].current + slots.current,
        };
      } else {
        newSpellSlots[level] = slots;
      }
    }

    // Оновлюємо персонажа
    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        level: newLevel,
        ...updatedAbilities,
        maxHp: newMaxHp,
        currentHp: newCurrentHp,
        proficiencyBonus,
        passivePerception,
        passiveInvestigation,
        passiveInsight,
        spellSaveDC,
        spellAttackBonus,
        spellSlots: newSpellSlots,
      },
      include: {
        user: true,
        inventory: true,
      },
    });

    return NextResponse.json({
      ...updatedCharacter,
      levelUpDetails: {
        abilityIncreased: randomAbility,
        hpGain,
        spellSlotGain,
      },
    });
  } catch (error) {
    console.error("Error leveling up character:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
