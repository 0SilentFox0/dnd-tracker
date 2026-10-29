import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { requireCharacterRecord } from "../access";
import { characterHandler, defineCharacterOperation, errorStatusMessage, gateOptions, orThrow } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { applyClasses } from "@/lib/server/characters/apply-classes";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { type ChoiceFields,resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { buildCharacterUpdateData, resolveFinalLevel, tableSlots } from "@/lib/server/characters/core/build-character-update-data";
import { loadRaceProgression } from "@/lib/server/characters/core/load-race-progression";
import { resolveCharacterOwner } from "@/lib/server/characters/core/resolve-character-owner";
import { updateCharacterSchema } from "@/lib/server/characters/core/update-character-schema";
import { lockCharacters } from "@/lib/server/characters/lock";
import { ContentError } from "@/lib/server/content/errors";
import { notifyCharacterOwners } from "@/lib/server/notifications/notify";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { mergeBackground } from "@/lib/utils/backgrounds/selection";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";
import { keepStoredPicks } from "@/lib/utils/characters/choices/picks";
import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";
import { levelNotificationEvents, spellNotificationEvents } from "@/lib/utils/notifications/events";
import type { SpellSlots } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

type Gate = Exclude<Awaited<ReturnType<typeof requireCharacterRecord>>, NextResponse>;

type Parsed = z.infer<typeof updateCharacterSchema>;

type Campaign = Gate["access"]["campaign"];

type CharacterRecord = Gate["character"];

type ClassesResult = Awaited<ReturnType<typeof resolveClasses>>;

async function editableData({ access, character }: Gate, parsed: Parsed) {
  const { userId, campaign, isDM } = access;

  if (parsed.initiative !== undefined) {
    const { heroMin, heroMax } = campaign.rules.initiative;

    if (parsed.initiative < heroMin || parsed.initiative > heroMax) throw new ContentError(API_ERRORS.INITIATIVE_OUT_OF_RANGE_DETAIL, 400, undefined, { min: heroMin, max: heroMax });
  }

  const data = isDM
    ? parsed
    : ({ ...parsed, level: undefined, classes: undefined, archetype: undefined, avatar: undefined, controlledBy: character.controlledBy, type: character.type } as typeof parsed);

  if (isDM && data.controlledBy !== undefined) {
    const owner = await resolveCharacterOwner(character.campaignId, userId, {type: character.type as "player" | "npc_hero", controlledBy: data.controlledBy ?? character.controlledBy ?? ""});

    if ("error" in owner) return { early: errorStatusMessage(owner.error) };

    data.controlledBy = owner.controlledBy;
  }

  return { data };
}

async function resolveClasses(campaign: Campaign, character: CharacterRecord, data: Parsed) {
  const classesInput = data.classes ? keepStoredPicks(data.classes, character.classes) : undefined;

  const applied = classesInput
    ? await applyClasses({
        campaignId: character.campaignId,
        rules: campaign.rules,
        maxLevel: campaign.maxLevel,
        entries: classesInput,
        spellcastingAbility: data.spellcastingAbility ?? character.spellcastingAbility,
      })
    : null;

  if (applied && !applied.ok) throw new ContentError(applied.error, applied.status, undefined, applied.params);

  const fromClasses = applied?.data ?? null;

  const hadClasses = Array.isArray(character.classes) && character.classes.length > 0;

  const clearingClasses = Boolean(applied) && !fromClasses && hadClasses;

  const bodyData = fromClasses ? { ...data, level: undefined } : data;

  const finalLevel = fromClasses?.level ?? resolveFinalLevel(character, data);

  if (finalLevel > character.level && finalLevel > campaign.maxLevel) {
    throw new ContentError(API_ERRORS.MAX_LEVEL_EXCEEDED, 422, undefined, { max: campaign.maxLevel });
  }

  return { classesInput, fromClasses, clearingClasses, bodyData, finalLevel };
}

async function computeUpdate(gate: Gate, data: Parsed, resolved: ClassesResult) {
  const { campaign } = gate.access;

  const { character } = gate;

  const { fromClasses, clearingClasses, bodyData, finalLevel } = resolved;

  const needsRace = !fromClasses && (finalLevel !== character.level || clearingClasses);

  const race = needsRace ? await loadRaceProgression(character.campaignId, data.race ?? character.race) : null;

  const computed = buildCharacterUpdateData({ character, data: bodyData, campaign, race });

  const classSeenLevel = fromClasses ? seenLevelOnLevelChange(character.level, finalLevel, character.seenLevel ?? null) : undefined;

  const progression = Array.isArray(race?.spellSlotProgression) ? (race.spellSlotProgression as unknown as SpellSlotProgression[]) : null;

  const restoredSlots = clearingClasses
    ? tableSlots(finalLevel, (data.spellSlots ?? character.spellSlots) as SpellSlots | null, progression, campaign.maxLevel)
    : undefined;

  return { computed, classSeenLevel, restoredSlots };
}

interface UpdateWriterInput {
  character: CharacterRecord;
  data: Parsed;
  avatar: string | null | undefined;
  resolved: ClassesResult;
  computedState: Awaited<ReturnType<typeof computeUpdate>>;
}

function updateWriter({ character, data, avatar, resolved, computedState }: UpdateWriterInput) {
  const { fromClasses, finalLevel } = resolved;

  const { computed, classSeenLevel, restoredSlots } = computedState;

  const classesData = fromClasses && {
    class: fromClasses.class,
    subclass: fromClasses.subclass,
    spellSlots: fromClasses.spellSlots as Prisma.InputJsonValue,
    ...(fromClasses.spellcastingAbility && { spellcastingAbility: fromClasses.spellcastingAbility }),
  };

  return (db: Pick<Prisma.TransactionClient, "character">, classes: ClassesResult["classesInput"], choiceFields?: ChoiceFields) =>
    db.character.update({
      where: { id: character.id },
      data: {
        ...data,
        backgroundChoices: undefined,
        backgroundFeatPicks: undefined,
        classes: classes as unknown as Prisma.InputJsonValue | undefined,
        avatar,
        level: computed.finalLevel,
        ...computed.abilityScores,
        ...(computed.spellSlots && { spellSlots: computed.spellSlots as Prisma.InputJsonValue }),
        ...(restoredSlots && { spellSlots: restoredSlots as Prisma.InputJsonValue }),
        immunities:
          data.immunities !== undefined
            ? (data.immunities as Prisma.InputJsonValue)
            : (character.immunities as Prisma.InputJsonValue | undefined),
        ...classesData,
        ...(computed.skillTreeProgressUpdate !== undefined && { skillTreeProgress: computed.skillTreeProgressUpdate }),
        ...(computed.seenLevel !== undefined && { seenLevel: computed.seenLevel }),
        ...(fromClasses && { level: finalLevel }),
        ...choiceFields,
        ...(classSeenLevel !== undefined && { seenLevel: classSeenLevel }),
      },
      include: { user: { select: PUBLIC_USER_SELECT }, inventory: true },
      omit: { notes: true },
    });
}

async function patchCore(gate: Gate, parsed: Parsed) {
  const { access, character } = gate;

  const { userId, campaign, isDM } = access;

  const campaignId = character.campaignId;

  const characterId = character.id;

  const editable = await editableData(gate, parsed);

  if ("early" in editable) return editable.early;

  const { data } = editable;

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId, current: character.avatar });

  if (!avatar.ok) throw new ContentError(avatar.message, 400, undefined, avatar.params);

  const resolved = await resolveClasses(campaign, character, data);

  const computedState = await computeUpdate(gate, data, resolved);

  const { computed } = computedState;

  const changesBackground = data.backgroundId !== undefined || data.backgroundChoices !== undefined || data.backgroundFeatPicks !== undefined;

  if (changesBackground) {
    await orThrow(rejectIfInActiveBattle(campaignId, [characterId]));
  }

  const writeUpdate = updateWriter({ character, data, avatar: avatar.avatar, resolved, computedState });

  const updatedCharacter = data.classes || changesBackground
    ? await prisma.$transaction(async (tx) => {
        await lockCharacters(tx, [characterId]);

        const fresh = await tx.character.findUnique({ where: { id: characterId } });

        if (!fresh) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const classes = data.classes ? keepStoredPicks(data.classes, fresh.classes) : undefined;

        const before = choicesStateOf(fresh);

        const choices = changesBackground ? await resolveCharacterChoices({ db: tx, campaignId, rules: campaign.rules, isDM, character: { ...fresh, ...computed.abilityScores, level: resolved.finalLevel }, before, after: { ...before, ...mergeBackground(before, data), classes: classes ?? before.classes } }) : null;

        if (choices && !choices.ok) throw choices.error;

        return writeUpdate(tx, classes, choices?.ok ? choices.fields : undefined);
      })
    : await writeUpdate(prisma, resolved.classesInput);

  await notifyCharacterOwners({
    campaignId,
    actorUserId: userId,
    events: [
      ...levelNotificationEvents(characterId, character.level, updatedCharacter.level),
      ...spellNotificationEvents(characterId, character.knownSpells, data.knownSpells),
    ],
  });

  return updatedCharacter;
}

export const patchOperation = defineCharacterOperation({
  name: "patch",
  action: "update character",
  schema: updateCharacterSchema,
  gate: async ctx => {
    const gate = await requireCharacterRecord(ctx.campaignId, ctx.characterId, { ...gateOptions(ctx), notFound: API_ERRORS.NOT_FOUND });

    if (gate instanceof NextResponse) return gate;

    const { access, character } = gate;

    if (!access.isDM && !(character.controlledBy === access.userId && access.campaign.allowPlayerEdit)) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    if (!access.isDM && character.status === CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_EDIT_VIA_DRAFT, 403);

    return gate;
  },
  prepare: async ({ access, character }, data) => {
    if (!access.isDM || data.avatar === undefined) return data;

    const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId: character.campaignId, current: character.avatar });

    if (!avatar.ok) throw new ContentError(avatar.message, 400, undefined, avatar.params);

    return { ...data, avatar: avatar.avatar };
  },
  run: patchCore,
});

const patch = characterHandler(patchOperation);

export const patchCharacter = (request: Request, campaignId: string, characterId: string, actor?: Actor) => patch(request, campaignId, characterId, actor);
