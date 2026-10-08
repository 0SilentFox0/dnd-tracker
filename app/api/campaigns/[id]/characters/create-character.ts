import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createCharacterSchema } from "./create-character-schema";
import { resolveCharacterOwner } from "./resolve-character-owner";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";
import { fullSpellSlots } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

const INVALID_OWNER_REFERENCE =
  "Невірне посилання на користувача (controlledBy). Переконайтесь, що обраний гравець існує в users і є учасником кампанії.";

export async function createCharacter(request: Request, campaignId: string): Promise<NextResponse> {
  const accessResult = await requireDM(campaignId);

  if (accessResult instanceof NextResponse) return accessResult;

  const data = await parseBody(createCharacterSchema, request);

  if (data instanceof NextResponse) return data;

  const owner = await resolveCharacterOwner(campaignId, accessResult.userId, data);

  if ("error" in owner) return owner.error;

  let spellSlots = data.spellSlots;

  if (!spellSlots || typeof spellSlots !== "object" || Object.keys(spellSlots).length === 0) {
    const race = await prisma.race.findFirst({ where: { campaignId, name: data.race }, select: { spellSlotProgression: true } });

    spellSlots = fullSpellSlots(data.level, Array.isArray(race?.spellSlotProgression) ? (race.spellSlotProgression as unknown as SpellSlotProgression[]) : null);
  }

  try {
    const character = await prisma.character.create({
      data: {
        campaignId,
        type: data.type,
        controlledBy: owner.controlledBy,
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

        savingThrows: data.savingThrows as Record<string, boolean>,
        skills: data.skills as Record<string, boolean>,

        spellcastingAbility: data.spellcastingAbility,
        spellSlots,
        knownSpells: data.knownSpells,

        languages: data.languages,
        immunities: data.immunities || [],
        proficiencies: data.proficiencies,

        personalSkillId: data.personalSkillId ?? null,
        primaryAbility: data.primaryAbility ?? null,

        skillTreeProgress: {},
      },
      include: { user: true },
    });

    await prisma.characterInventory.create({
      data: { characterId: character.id, equipped: {}, backpack: [], gold: 0, silver: 0, copper: 0, items: [] },
    });

    return NextResponse.json(character);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return errorResponse(INVALID_OWNER_REFERENCE, 400);
    }

    throw error;
  }
}
