import { NextResponse } from "next/server";
import { z } from "zod";

import { createCharacterSchema } from "./create-character-schema";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import {
  getAbilityModifier,
  getPassiveScore,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
} from "@/lib/utils/common/calculations";
import { calculateCharacterSpellSlots } from "@/lib/utils/spells/spell-slots";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();

    const data = createCharacterSchema.parse(body);

    // Розраховуємо автоматичні значення
    const proficiencyBonus = getProficiencyBonus(data.level);

    const intMod = getAbilityModifier(data.intelligence);

    const wisMod = getAbilityModifier(data.wisdom);

    const chaMod = getAbilityModifier(data.charisma);

    // Розраховуємо пасивні значення
    const savingThrows = data.savingThrows as Record<string, boolean>;

    const skills = data.skills as Record<string, boolean>;
    
    const passivePerception = getPassiveScore(
      wisMod,
      skills.perception || false,
      proficiencyBonus
    );

    const passiveInvestigation = getPassiveScore(
      intMod,
      skills.investigation || false,
      proficiencyBonus
    );

    const passiveInsight = getPassiveScore(
      wisMod,
      skills.insight || false,
      proficiencyBonus
    );

    // Розраховуємо spellcasting параметри якщо є
    let spellSaveDC: number | null = null;

    let spellAttackBonus: number | null = null;

    if (data.spellcastingAbility) {
      const abilityMod =
        data.spellcastingAbility === "intelligence"
          ? intMod
          : data.spellcastingAbility === "wisdom"
            ? wisMod
            : chaMod;

      spellSaveDC = getSpellSaveDC(proficiencyBonus, abilityMod);
      spellAttackBonus = getSpellAttackBonus(proficiencyBonus, abilityMod);
    }

    // Якщо магічні слоти порожні — обчислюємо за рівнем
    let spellSlotsToCreate = data.spellSlots;

    if (
      !spellSlotsToCreate ||
      typeof spellSlotsToCreate !== "object" ||
      Object.keys(spellSlotsToCreate).length === 0
    ) {
      const computed = calculateCharacterSpellSlots(data.level);

      spellSlotsToCreate = Object.fromEntries(
        Object.entries(computed).map(([k, v]) => [
          k,
          { max: v.max, current: v.max },
        ]),
      );
    }

    // Створюємо персонажа
    const character = await prisma.character.create({
      data: {
        campaignId: id,
        type: data.type,
        controlledBy: data.controlledBy,
        name: data.name,
        level: data.level,
        class: data.class,
        subclass: data.subclass,
        race: data.race,
        subrace: data.subrace,
        alignment: data.alignment,
        background: data.background,
        experience: data.experience,
        avatar: data.avatar,
        
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        maxHp: data.maxHp,
        currentHp: data.currentHp,
        tempHp: data.tempHp,
        hitDice: data.hitDice,
        proficiencyBonus,
        
        savingThrows: savingThrows,
        skills: skills,
        
        passivePerception,
        passiveInvestigation,
        passiveInsight,
        
        spellcastingClass: data.spellcastingClass,
        spellcastingAbility: data.spellcastingAbility,
        spellSaveDC,
        spellAttackBonus,
        spellSlots: spellSlotsToCreate,
        knownSpells: data.knownSpells,
        
        languages: data.languages,
        immunities: data.immunities || [],
        proficiencies: data.proficiencies,
        
        personalityTraits: data.personalityTraits,
        ideals: data.ideals,
        bonds: data.bonds,
        flaws: data.flaws,

        personalSkillId: data.personalSkillId ?? null,

        skillTreeProgress: {},
      },
      include: {
        user: true,
      },
    });

    // Створюємо інвентар для персонажа
    await prisma.characterInventory.create({
      data: {
        characterId: character.id,
        equipped: {},
        backpack: [],
        gold: 0,
        silver: 0,
        copper: 0,
        items: [],
      },
    });

    return NextResponse.json(character);
  } catch (error) {
    console.error("Error creating character:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type"); // "player" | "npc_hero" | null = all

    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const where: { campaignId: string; type?: "player" | "npc_hero" } = {
      campaignId: id,
    };

    if (type === "player" || type === "npc_hero") {
      where.type = type;
    }

    const characters = await prisma.character.findMany({
      where,
      include: {
        user: true,
        inventory: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(characters);
  } catch (error) {
    console.error("Error fetching characters:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const result = await prisma.character.deleteMany({
      where: {
        campaignId: id,
        type: "player",
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error("Error deleting all characters:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
