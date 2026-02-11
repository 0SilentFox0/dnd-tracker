import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAuth, requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import {
  calculateHPGain,
  getAbilityModifier,
  getLevelFromXP,
  getPassiveScore,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
} from "@/lib/utils/common/calculations";

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(1).max(30).optional(),
  class: z.string().min(1).optional(),
  subclass: z.string().optional(),
  race: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().min(1).optional()
  ),
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
  savingThrows: z.record(z.string(), z.boolean()).optional(),
  skills: z.record(z.string(), z.boolean()).optional(),

  // Заклинання
  spellcastingClass: z.string().optional(),
  spellcastingAbility: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(["intelligence", "wisdom", "charisma"]).optional()
  ),
  spellSlots: z
    .record(
      z.string(),
      z.object({
        max: z.number(),
        current: z.number(),
      })
    )
    .optional(),
  knownSpells: z.array(z.string()).optional(),

  // Інше
  languages: z.array(z.string()).optional(),
  proficiencies: z.record(z.string(), z.array(z.string())).optional(),
  immunities: z.array(z.string()).optional(),
  morale: z.number().min(-3).max(3).optional(),

  // Roleplay
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),

  // Прокачка
  controlledBy: z.string().optional(),

  // Уміння (персональний скіл)
  personalSkillId: z.string().optional().nullable(),

  // Прогрес по деревах прокачки
  skillTreeProgress: z
    .record(
      z.string(),
      z.object({
        level: z.string().optional(),
        unlockedSkills: z.array(z.string()).optional(),
      })
    )
    .optional(),

  // Коефіцієнти масштабування (HP, melee, ranged) — окремі для кожного героя
  hpMultiplier: z.number().min(0.1).max(3).optional(),
  meleeMultiplier: z.number().min(0.1).max(3).optional(),
  rangedMultiplier: z.number().min(0.1).max(3).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;
    
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
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

    if (!character || character.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Перевіряємо права доступу (DM або власник)
    const isDM = character.campaign.members[0]?.role === "dm";

    const isOwner = character.controlledBy === userId;

    if (!isDM && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Нормалізуємо knownSpells до масиву для коректного відображення у формі
    const knownSpells = Array.isArray(character.knownSpells)
      ? character.knownSpells
      : [];

    return NextResponse.json({
      ...character,
      knownSpells,
    });
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
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { userId, campaign } = accessResult;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    const validationError = validateCampaignOwnership(character, id);

    if (validationError) {
      return validationError;
    }

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const isDM = campaign.members[0]?.role === "dm";
    const isOwner = character.controlledBy === userId;
    const campaignWithAllow = await prisma.campaign.findUnique({
      where: { id },
      select: { allowPlayerEdit: true },
    });
    const allowPlayerEdit = campaignWithAllow?.allowPlayerEdit ?? false;

    // Дозволити оновлення: DM завжди, або власник персонажа якщо allowPlayerEdit
    if (!isDM && !(isOwner && allowPlayerEdit)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    let data = updateCharacterSchema.parse(body);

    // Гравці не можуть змінювати власника або тип персонажа — залишаємо поточні значення
    if (!isDM) {
      data = {
        ...data,
        controlledBy: character.controlledBy,
        type: character.type,
      } as typeof data;
    }

    // Отримуємо поточні значення або нові
    const level = data.level ?? character.level;

    const experience = data.experience ?? character.experience;

    // strength та dexterity використовуються через ...data в prisma.character.update
    const constitution = data.constitution ?? character.constitution;

    const intelligence = data.intelligence ?? character.intelligence;

    const wisdom = data.wisdom ?? character.wisdom;

    const charisma = data.charisma ?? character.charisma;


    const hitDice = data.hitDice ?? character.hitDice;

    // Перевіряємо чи змінився рівень через XP
    const newLevelFromXP = getLevelFromXP(experience, campaign.xpMultiplier);

    const finalLevel = Math.max(level, newLevelFromXP);

    // Розраховуємо автоматичні значення
    const proficiencyBonus = getProficiencyBonus(finalLevel);

    const conMod = getAbilityModifier(constitution);

    const intMod = getAbilityModifier(intelligence);

    const wisMod = getAbilityModifier(wisdom);

    const chaMod = getAbilityModifier(charisma);

    // Розраховуємо пасивні значення
    const characterSkills = (data.skills ?? character.skills) as Record<string, boolean>;

    const passivePerception = getPassiveScore(
      wisMod,
      characterSkills.perception || false,
      proficiencyBonus
    );

    const passiveInvestigation = getPassiveScore(
      intMod,
      characterSkills.investigation || false,
      proficiencyBonus
    );

    const passiveInsight = getPassiveScore(
      wisMod,
      characterSkills.insight || false,
      proficiencyBonus
    );

    // Розраховуємо spellcasting параметри якщо є
    const spellcastingAbility =
      data.spellcastingAbility ?? character.spellcastingAbility;

    let spellSaveDC: number | null = character.spellSaveDC;

    let spellAttackBonus: number | null = character.spellAttackBonus;

    if (spellcastingAbility) {
      const abilityMod =
        spellcastingAbility === "intelligence"
          ? intMod
          : spellcastingAbility === "wisdom"
          ? wisMod
          : chaMod;

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

    // При зменшенні рівня — скидаємо всі прокачані скіли; при підвищенні — зберігаємо як було
    const levelDecreased = finalLevel < character.level;

    const skillTreeProgressUpdate =
      levelDecreased
        ? ({} as Prisma.InputJsonValue)
        : data.skillTreeProgress !== undefined
          ? (data.skillTreeProgress as Prisma.InputJsonValue)
          : undefined;

    // Оновлюємо персонажа
    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
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
        immunities: data.immunities !== undefined 
          ? (data.immunities as Prisma.InputJsonValue)
          : (character.immunities as Prisma.InputJsonValue | undefined),
        ...(skillTreeProgressUpdate !== undefined && {
          skillTreeProgress: skillTreeProgressUpdate,
        }),
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
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    const validationError = validateCampaignOwnership(character, id);

    if (validationError) {
      return validationError;
    }

    await prisma.character.delete({
      where: { id: characterId },
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
