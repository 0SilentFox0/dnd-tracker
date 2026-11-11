import { randomUUID } from "node:crypto";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { CharacterGate } from "@/lib/server/characters/access";
import { characteristicsJson } from "@/lib/server/characters/core/characteristics-json";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import { toCareerData } from "@/lib/utils/careers/row";
import { ruleSystemOf } from "@/lib/utils/rules/systems/registry";
import { availableXp, planPurchase, planUndo } from "@/systems/wfrp/rules/advancement";
import type { PurchaseError } from "@/systems/wfrp/rules/advancement/plan";
import type { Characteristics, LedgerEntry } from "@/systems/wfrp/rules/characteristics/keys";
import { readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import type { AdvanceInput } from "@/systems/wfrp/server/progression-schemas";

export type AdvanceResult = { characteristics: Characteristics; experience: number; available: number; entry: LedgerEntry };

const PURCHASE_ERRORS: Record<PurchaseError, [string, number]> = {
  INSUFFICIENT_XP: [API_ERRORS.ADVANCE_INSUFFICIENT_XP, 409],
  AT_LIMIT: [API_ERRORS.ADVANCE_AT_LIMIT, 409],
  MAX_RANK: [API_ERRORS.ADVANCE_MAX_RANK, 409],
  UNKNOWN_KEY: [API_ERRORS.ADVANCE_UNKNOWN, 400],
  UNKNOWN_TALENT: [API_ERRORS.ADVANCE_UNKNOWN, 400],
  TALENT_NO_COST: [API_ERRORS.ADVANCE_UNKNOWN, 400],
};

const UNDO_ERRORS = { LEDGER_EMPTY: API_ERRORS.ADVANCE_LEDGER_EMPTY, LEDGER_STALE: API_ERRORS.ADVANCE_LEDGER_STALE } as const;

function advancementOf({ access, character }: CharacterGate) {
  const advancement = ruleSystemOf(access.campaign.rules).advancement;

  if (!advancement) throw new ContentError(API_ERRORS.ADVANCE_NOT_WFRP, 409);

  if (character.status !== CharacterStatus.ACTIVE) throw new ContentError(API_ERRORS.XP_CHARACTERS_INVALID, 400);

  return { planPurchase, planUndo, availableXp };
}

export async function advanceCharacter(gate: CharacterGate, input: AdvanceInput): Promise<AdvanceResult> {
  const { access, character } = gate;

  const advancement = advancementOf(gate);

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const feat = input.kind === "talent" ? await tx.feat.findFirst({ where: { id: input.key, campaignId: character.campaignId }, select: { id: true, xpCost: true, maxRank: true } }) : null;

    const state = readCharacteristics(locked).career;

    const row = state ? await tx.career.findFirst({ where: { id: state.careerId, campaignId: character.campaignId } }) : null;

    const plan = advancement.planPurchase({
      characteristics: readCharacteristics(locked),
      available: advancement.availableXp(locked.experience, readCharacteristics(locked)),
      request: input,
      rules: access.campaign.rules.advancement,
      talent: feat ?? undefined,
      career: state && row ? { state, tiers: toCareerData(row).tiers } : undefined,
      now: new Date().toISOString(),
      id: randomUUID(),
    });

    if (!plan.ok) {
      const [message, status] = PURCHASE_ERRORS[plan.error];

      throw new ContentError(message, status);
    }

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson(plan.next) } });

    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.ADVANCE, data: { kind: input.kind, key: input.key, from: plan.entry.from, to: plan.entry.to, cost: plan.entry.cost } }]);

    return { characteristics: plan.next, experience: locked.experience, available: advancement.availableXp(locked.experience, plan.next), entry: plan.entry };
  });
}

export async function undoAdvance(gate: CharacterGate): Promise<AdvanceResult> {
  const { access, character } = gate;

  const advancement = advancementOf(gate);

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const plan = advancement.planUndo(readCharacteristics(locked));

    if (!plan.ok) throw new ContentError(UNDO_ERRORS[plan.error], 409);

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson(plan.next) } });

    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.ADVANCE, data: { undo: true, kind: plan.entry.kind, key: plan.entry.key, from: plan.entry.from, to: plan.entry.to, cost: plan.entry.cost } }]);

    return { characteristics: plan.next, experience: locked.experience, available: advancement.availableXp(locked.experience, plan.next), entry: plan.entry };
  });
}
