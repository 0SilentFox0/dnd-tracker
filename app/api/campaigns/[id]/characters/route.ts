import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getProficiencyBonus,
  getAbilityModifier,
  getPassiveScore,
  getSpellSaveDC,
  getSpellAttackBonus,
} from "@/lib/utils/calculations";

const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["player", "npc_hero"]),
  controlledBy: z.string(),
  level: z.number().min(1).max(30).default(1),
  class: z.string().min(1),
  subclass: z.string().optional(),
  race: z.string().min(1),
  subrace: z.string().optional(),
  alignment: z.string().optional(),
  background: z.string().optional(),
  experience: z.number().min(0).default(0),
  avatar: z.string().optional(),
  
  // Ability Scores
  strength: z.number().min(1).max(30).default(10),
  dexterity: z.number().min(1).max(30).default(10),
  constitution: z.number().min(1).max(30).default(10),
  intelligence: z.number().min(1).max(30).default(10),
  wisdom: z.number().min(1).max(30).default(10),
  charisma: z.number().min(1).max(30).default(10),
  
  // Бойові параметри
  armorClass: z.number().min(0).default(10),
  initiative: z.number().default(0),
  speed: z.number().min(0).default(30),
  maxHp: z.number().min(1).default(10),
  currentHp: z.number().min(0).default(10),
  tempHp: z.number().min(0).default(0),
  hitDice: z.string().default("1d8"),
  
  // Saving Throws & Skills
  savingThrows: z.record(z.string(), z.boolean()).default({}),
  skills: z.record(z.string(), z.boolean()).default({}),
  
  // Заклинання
  spellcastingClass: z.string().optional(),
  spellcastingAbility: z.enum(["intelligence", "wisdom", "charisma"]).optional(),
  spellSlots: z.record(z.string(), z.object({
    max: z.number(),
    current: z.number(),
  })).default({}),
  knownSpells: z.array(z.string()).default([]),
  
  // Інше
  languages: z.array(z.string()).default([]),
  proficiencies: z.record(z.string(), z.array(z.string())).default({}),
  
  // Roleplay
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createCharacterSchema.parse(body);

    // Розраховуємо автоматичні значення
    const proficiencyBonus = getProficiencyBonus(data.level);
    const strMod = getAbilityModifier(data.strength);
    const dexMod = getAbilityModifier(data.dexterity);
    const conMod = getAbilityModifier(data.constitution);
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
        data.spellcastingAbility === "intelligence" ? intMod :
        data.spellcastingAbility === "wisdom" ? wisMod : chaMod;
      
      spellSaveDC = getSpellSaveDC(proficiencyBonus, abilityMod);
      spellAttackBonus = getSpellAttackBonus(proficiencyBonus, abilityMod);
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
        spellSlots: data.spellSlots,
        knownSpells: data.knownSpells,
        
        languages: data.languages,
        proficiencies: data.proficiencies,
        
        personalityTraits: data.personalityTraits,
        ideals: data.ideals,
        bonds: data.bonds,
        flaws: data.flaws,
        
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
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    // Перевіряємо чи юзер є учасником кампанії
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const characters = await prisma.character.findMany({
      where: {
        campaignId: id,
      },
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
