import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createCharacterSchema } from "./create-character-schema";
import { deriveCharacterDefaults } from "./derive-character-defaults";
import { resolveCharacterOwner } from "./resolve-character-owner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { applyClasses } from "@/lib/server/characters/apply-classes";
import { resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";
import { backgroundFields } from "@/lib/utils/backgrounds/selection";
import { hasPicks } from "@/lib/utils/characters/choices/read";

const INVALID_OWNER_REFERENCE =
  "Невірне посилання на користувача (controlledBy). Переконайтесь, що обраний гравець існує в users і є учасником кампанії.";

export async function createCharacter(request: Request, campaignId: string): Promise<NextResponse> {
  const accessResult = await requireDM(campaignId);

  if (accessResult instanceof NextResponse) return accessResult;

  const data = await parseBody(createCharacterSchema, request);

  if (data instanceof NextResponse) return data;

  const { heroMin, heroMax } = accessResult.campaign.rules.initiative;

  if (data.initiative < heroMin || data.initiative > heroMax) return errorResponse(`${API_ERRORS.INITIATIVE_OUT_OF_RANGE} (${heroMin}–${heroMax})`, 400);

  const { campaign } = accessResult;

  const applied = await applyClasses({
    campaignId,
    rules: campaign.rules,
    maxLevel: campaign.maxLevel,
    entries: data.classes ?? [],
    spellcastingAbility: data.spellcastingAbility ?? null,
  });

  if (!applied.ok) return errorResponse(applied.error, applied.status);

  const fromClasses = applied.data;

  const entries = data.classes ?? [];

  const withChoices = !!data.backgroundId || hasPicks(data.raceChoices) || (data.feats?.length ?? 0) > 0 || entries.some((e) => hasPicks(e.choices));

  const choices = withChoices
    ? await resolveCharacterChoices({
        campaignId,
        rules: campaign.rules,
        isDM: true,
        character: { race: data.race, level: fromClasses?.level ?? data.level, skills: data.skills, strength: data.strength, dexterity: data.dexterity, constitution: data.constitution, intelligence: data.intelligence, wisdom: data.wisdom, charisma: data.charisma },
        before: { raceChoices: {}, feats: [], classes: [] },
        after: { ...backgroundFields(data), raceChoices: data.raceChoices ?? {}, feats: data.feats ?? [], classes: entries },
      })
    : null;

  if (choices && !choices.ok) return choices.response;

  const owner = await resolveCharacterOwner(campaignId, accessResult.userId, data);

  if ("error" in owner) return owner.error;

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400);

  const spellSlots = fromClasses?.spellSlots ?? (await deriveCharacterDefaults(campaignId, data)).spellSlots;

  try {
    const character = await prisma.character.create({
      data: {
        campaignId,
        type: data.type,
        controlledBy: owner.controlledBy,
        name: data.name,
        level: fromClasses?.level ?? data.level,
        class: fromClasses?.class ?? data.class ?? "",
        subclass: fromClasses ? fromClasses.subclass : data.subclass,
        classes: (data.classes ?? []) as unknown as Prisma.InputJsonValue,
        archetype: data.archetype ?? null,
        race: data.race,
        subrace: data.subrace,
        alignment: data.alignment,
        background: data.background,
        avatar: avatar.avatar ?? undefined,

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

        spellcastingAbility: fromClasses?.spellcastingAbility ?? data.spellcastingAbility,
        spellSlots,
        knownSpells: data.knownSpells,

        languages: data.languages,
        immunities: data.immunities || [],
        proficiencies: data.proficiencies,

        personalSkillId: data.personalSkillId ?? null,
        primaryAbility: data.primaryAbility ?? null,

        skillTreeProgress: {},
        ...(choices?.ok && choices.fields),
      },
      include: { user: { select: PUBLIC_USER_SELECT } },
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
