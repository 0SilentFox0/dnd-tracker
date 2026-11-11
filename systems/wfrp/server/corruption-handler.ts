import { randomUUID } from "node:crypto";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { CharacterGate } from "@/lib/server/characters/access";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";
import { characteristicsJson } from "@/lib/server/characters/core/characteristics-json";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import type { CorruptionGrantResult, CorruptionUndoResult } from "@/systems/wfrp/rules/corruption/api-types";
import { planGrant } from "@/systems/wfrp/rules/corruption/plan-grant";
import { planCorruptionUndo } from "@/systems/wfrp/rules/corruption/undo";
import type { CorruptionGrantInput, CorruptionUndoInput } from "@/systems/wfrp/server/corruption-schemas";

function prepare({ access, character }: CharacterGate) {
  const corruption = ruleSystemOf(access.campaign.rules).corruption;

  if (!corruption) throw new ContentError(API_ERRORS.CORRUPTION_UNSUPPORTED, 409);

  if (character.status !== CharacterStatus.ACTIVE) throw new ContentError(API_ERRORS.REST_CHARACTERS_INVALID, 400);

  return { planGrant, planUndo: planCorruptionUndo };
}

export async function grantCorruption(gate: CharacterGate, input: CorruptionGrantInput): Promise<CorruptionGrantResult> {
  const { access, character } = gate;

  const corruption = prepare(gate);

  const campaignId = access.campaign.id;

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    await assertNotInActiveBattle(campaignId, [character.id], API_ERRORS.CORRUPTION_IN_BATTLE);

    const grantId = randomUUID();

    const { state, summary } = corruption.planGrant({ characteristics: readCharacteristics(locked), rules: access.campaign.rules, points: input.points, reason: input.reason, rng: Math.random, id: grantId, at: new Date().toISOString() });

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson({ ...readCharacteristics(locked), corruption: state }) } });

    await writeCharacterLog(tx, [{ campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.CORRUPTION, data: { grantId, reason: input.reason, points: input.points, total: summary.total, threshold: summary.threshold, mutation: !!summary.mutation, summary } }]);

    return { grantId, corruption: state, summary };
  });
}

export async function undoCorruption(gate: CharacterGate, input: CorruptionUndoInput): Promise<CorruptionUndoResult> {
  const { access, character } = gate;

  const corruption = prepare(gate);

  const campaignId = access.campaign.id;

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    await assertNotInActiveBattle(campaignId, [character.id], API_ERRORS.CORRUPTION_IN_BATTLE);

    const result = corruption.planUndo(readCharacteristics(locked).corruption, input.grantId);

    if (!result.ok) throw new ContentError(API_ERRORS.CORRUPTION_STALE, 409);

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson({ ...readCharacteristics(locked), corruption: result.state }) } });

    await writeCharacterLog(tx, [{ campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.CORRUPTION, data: { grantId: input.grantId, undo: true } }]);

    return { corruption: result.state };
  });
}
