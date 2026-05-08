import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createCharacterSchema } from "./create-character-schema";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
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

    const { userId: dmUserId } = accessResult;

    const body = await request.json();

    const data = createCharacterSchema.parse(body);

    // controlledBy — FK на users.id. Для NPC героя в UI поле не показується і часто лишається "".
    let controlledBy: string;

    if (data.type === "npc_hero") {
      controlledBy = dmUserId;
    } else {
      const ownerId = data.controlledBy.trim();

      if (!ownerId) {
        return NextResponse.json(
          { error: "Оберіть гравця для персонажа типу «Гравець»." },
          { status: 400 },
        );
      }

      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true },
      });

      if (!owner) {
        return NextResponse.json(
          {
            error:
              "Користувача з обраним ID немає в базі (наприклад, після зміни Supabase або міграції). Оновіть сторінку та оберіть гравця знову.",
          },
          { status: 400 },
        );
      }

      const membership = await prisma.campaignMember.findFirst({
        where: { campaignId: id, userId: ownerId },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Обраний користувач не є учасником цієї кампанії." },
          { status: 400 },
        );
      }

      controlledBy = ownerId;
    }

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
        controlledBy,
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Невірне посилання на користувача (controlledBy). Переконайтесь, що обраний гравець існує в users і є учасником кампанії.",
        },
        { status: 400 },
      );
    }

    return handleApiError(error, { action: "create character" });
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

    const compact =
      searchParams.get("compact") === "1" ||
      searchParams.get("compact") === "true";

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

    if (compact) {
      const characters = await prisma.character.findMany({
        where,
        select: {
          id: true,
          campaignId: true,
          type: true,
          controlledBy: true,
          name: true,
          level: true,
          class: true,
          race: true,
          avatar: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(characters);
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
    return handleApiError(error, { action: "list characters" });
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
    return handleApiError(error, { action: "delete all characters" });
  }
}
