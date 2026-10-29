import { Prisma } from "@prisma/client";

import { type CampaignScope, characterHandler, defineCharacterOperation, dmScope, errorStatusMessage } from "../operation-runner";

import { getCachedBackgrounds } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { applyClasses } from "@/lib/server/characters/apply-classes";
import { resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { type CreateCharacterInput, createCharacterSchema } from "@/lib/server/characters/core/create-character-schema";
import { deriveCharacterDefaults } from "@/lib/server/characters/core/derive-character-defaults";
import { resolveCharacterOwner } from "@/lib/server/characters/core/resolve-character-owner";
import { ContentError } from "@/lib/server/content/errors";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import type { Actor } from "@/lib/utils/api/actor";
import { toBackgroundData } from "@/lib/utils/backgrounds/row";
import { backgroundFields } from "@/lib/utils/backgrounds/selection";
import { classSkillIssues, skillIdsInPicks } from "@/lib/utils/characters/choices/class-skills";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

async function assertClassSkills({ campaignId, data, entries, byId }: { campaignId: string; data: CreateCharacterInput; entries: CharacterClassEntry[]; byId: Record<string, GameClassData> | undefined }) {
  const cls = entries[0] && byId?.[entries[0].classId];

  if (!cls) return;

  const background = data.backgroundId ? (await getCachedBackgrounds(campaignId)).find((b) => b.id === data.backgroundId) : undefined;

  const otherSources = [...(background ? toBackgroundData(background).skillProficiencies : []), ...skillIdsInPicks(data.raceChoices), ...entries.flatMap((e) => skillIdsInPicks(e.choices))];

  const issues = classSkillIssues({ skills: data.skills, cls, otherSources });

  if (issues.length > 0) throw new ContentError(issues[0].message, 422, issues);
}

async function createCharacterCore({ access, campaignId }: CampaignScope, data: CreateCharacterInput) {
  const { heroMin, heroMax } = access.campaign.rules.initiative;

  if (data.initiative < heroMin || data.initiative > heroMax) throw new ContentError(API_ERRORS.INITIATIVE_OUT_OF_RANGE_DETAIL, 400, undefined, { min: heroMin, max: heroMax });

  const { campaign } = access;

  const applied = await applyClasses({
    campaignId,
    rules: campaign.rules,
    maxLevel: campaign.maxLevel,
    entries: data.classes ?? [],
    spellcastingAbility: data.spellcastingAbility ?? null,
  });

  if (!applied.ok) throw new ContentError(applied.error, applied.status, undefined, applied.params);

  const fromClasses = applied.data;

  const entries = data.classes ?? [];

  await assertClassSkills({ campaignId, data, entries, byId: applied.classesById });

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

  if (choices && !choices.ok) throw choices.error;

  const owner = await resolveCharacterOwner(campaignId, access.userId, data);

  if ("error" in owner) return errorStatusMessage(owner.error);

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) throw new ContentError(avatar.message, 400);

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

    return character;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new ContentError(API_ERRORS.CHARACTER_CONTROLLER_INVALID, 400);
    }

    throw error;
  }
}

export const createOperation = defineCharacterOperation({
  name: "create",
  action: "create character",
  schema: createCharacterSchema,
  gate: dmScope,
  prepare: async ({ campaignId }, data) => {
    if (data.avatar === undefined) return data;

    const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

    if (!avatar.ok) throw new ContentError(avatar.message, 400);

    return { ...data, avatar: avatar.avatar ?? undefined };
  },
  run: createCharacterCore,
});

const create = characterHandler(createOperation);

export const createCharacter = (request: Request, campaignId: string, actor?: Actor) => create(request, campaignId, undefined, actor);
