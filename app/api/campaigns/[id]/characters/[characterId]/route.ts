import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  getProficiencyBonus,
  getAbilityModifier,
  getPassiveScore,
  getSpellSaveDC,
  getSpellAttackBonus,
  getLevelFromXP,
  calculateHPGain,
} from "@/lib/utils/calculations";

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(1).max(30).optional(),
  class: z.string().min(1).optional(),
  subclass: z.string().optional(),
  race: z.string().min(1).optional(),
  subrace: z.string().optional(),
  alignment: z.string().optional(),
  background: z.string().optional(),
  experience: z.number().min(0).optional(),
  avatar: z.string().optional(),
  
  // Ability Scores
  strength: z.number().min(1).max(30).optional(),
  dexterity: z.number().min(1).max(30).optional(),
  constitution: z.number().min(1).max(30).optional(),
  intelligence: z.number().min(1).max(30).optional(),
  wisdom: z.number().min(1).max(30).optional(),
  charisma: z.number().min(1).max(30).optional(),
  
  // Бойові параметри
  armorClass: z.number().min(0).optional(),
  initiative: z.number().optional(),
  speed: z.number().min(0).optional(),
  maxHp: z.number().min(1).optional(),
  currentHp: z.number().min(0).optional(),
  tempHp: z.number().min(0).optional(),
  hitDice: z.string().optional(),
  
  // Saving Throws & Skills
  savingThrows: z.record(z.boolean()).optional(),
  skills: z.record(z.boolean()).optional(),
  
  // Заклинання
  spellcastingClass: z.string().optional(),
  spellcastingAbility: z.enum(["intelligence", "wisdom", "charisma"]).optional(),
  spellSlots: z.record(z.object({
    max: z.number(),
    current: z.number(),
  })).optional(),
  knownSpells: z.array(z.string()).optional(),
  
  // Інше
  languages: z.array(z.string()).optional(),
  proficiencies: z.record(z.array(z.string())).optional(),
  
  // Roleplay
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),
  
  // Прокачка
  controlledBy: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string; characterId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const character = await prisma.character.findUnique({
      where: { id: params.characterId },
      include: {
        user: true,
        inventory: true,
        campaign: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!character || character.campaignId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Перевіряємо права доступу
    const isDM = character.campaign.members[0]?.role === "dm";
    const isOwner = character.controlledBy === userId;
    
    if (!isDM && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error("Error fetching character:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; characterId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const character = await prisma.character.findUnique({
      where: { id: params.characterId },
    });

    if (!character || character.campaignId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateCharacterSchema.parse(body);

    // Отримуємо поточні значення або нові
    const level = data.level ?? character.level;
    const experience = data.experience ?? character.experience;
    const strength = data.strength ?? character.strength;
    const dexterity = data.dexterity ?? character.dexterity;
    const constitution = data.constitution ?? character.constitution;
    const intelligence = data.intelligence ?? character.intelligence;
    const wisdom = data.wisdom ?? character.wisdom;
    const charisma = data.charisma ?? character.charisma;
    const savingThrows = (data.savingThrows ?? character.savingThrows) as Record<string, boolean>;
    const skills = (data.skills ?? character.skills) as Record<string, boolean>;
    const hitDice = data.hitDice ?? character.hitDice;

    // Перевіряємо чи змінився рівень через XP
    const newLevelFromXP = getLevelFromXP(experience, campaign.xpMultiplier);
    const finalLevel = Math.max(level, newLevelFromXP);

    // Розраховуємо автоматичні значення
    const proficiencyBonus = getProficiencyBonus(finalLevel);
    const strMod = getAbilityModifier(strength);
    const dexMod = getAbilityModifier(dexterity);
    const conMod = getAbilityModifier(constitution);
    const intMod = getAbilityModifier(intelligence);
    const wisMod = getAbilityModifier(wisdom);
    const chaMod = getAbilityModifier(charisma);

    // Розраховуємо пасивні значення
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
    const spellcastingAbility = data.spellcastingAbility ?? character.spellcastingAbility;
    let spellSaveDC: number | null = character.spellSaveDC;
    let spellAttackBonus: number | null = character.spellAttackBonus;
    
    if (spellcastingAbility) {
      const abilityMod = 
        spellcastingAbility === "intelligence" ? intMod :
        spellcastingAbility === "wisdom" ? wisMod : chaMod;
      
      spellSaveDC = getSpellSaveDC(proficiencyBonus, abilityMod);
      spellAttackBonus = getSpellAttackBonus(proficiencyBonus, abilityMod);
    }

    // Якщо рівень збільшився, додаємо HP
    let maxHp = data.maxHp ?? character.maxHp;
    let currentHp = data.currentHp ?? character.currentHp;
    
    if (finalLevel > character.level) {
      const levelsGained = finalLevel - character.level;
      for (let i = 0; i < levelsGained; i++) {
        const hpGain = calculateHPGain(hitDice, conMod);
        maxHp += hpGain;
        currentHp += hpGain; // Автоматично лікуємо при прокачці
      }
    }

    // Оновлюємо персонажа
    const updatedCharacter = await prisma.character.update({
      where: { id: params.characterId },
      data: {
        ...data,
        level: finalLevel,
        proficiencyBonus,
        passivePerception,
        passiveInvestigation,
        passiveInsight,
        spellSaveDC,
        spellAttackBonus,
        maxHp,
        currentHp,
      },
      include: {
        user: true,
        inventory: true,
      },
    });

    return NextResponse.json(updatedCharacter);
  } catch (error) {
    console.error("Error updating character:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; characterId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const character = await prisma.character.findUnique({
      where: { id: params.characterId },
    });

    if (!character || character.campaignId !== params.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.character.delete({
      where: { id: params.characterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting character:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
