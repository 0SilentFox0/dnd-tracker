import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { CareerAdvanceInput, CareerSetInput } from "@/lib/schemas/out-of-combat";
import type { CharacterGate } from "@/lib/server/characters/access";
import { characteristicsJson } from "@/lib/server/characters/core/system-fields";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import type { Characteristics } from "@/lib/utils/rules/systems";
import { ruleSystemOf } from "@/lib/utils/rules/systems/registry";

export type CareerResult = { characteristics: Characteristics };

const ADVANCE_ERRORS = {
  NO_CAREER: API_ERRORS.CAREER_NO_CAREER,
  MAX_TIER: API_ERRORS.CAREER_MAX_TIER,
  TICKS_MISSING: API_ERRORS.CAREER_TICKS_MISSING,
} as const;

function advancementOf({ access, character }: CharacterGate) {
  const advancement = ruleSystemOf(access.campaign.rules).advancement;

  if (!advancement) throw new ContentError(API_ERRORS.ADVANCE_NOT_WFRP, 409);

  if (character.status !== CharacterStatus.ACTIVE) throw new ContentError(API_ERRORS.XP_CHARACTERS_INVALID, 400);

  return advancement;
}

export async function setCareer(gate: CharacterGate, input: CareerSetInput): Promise<CareerResult> {
  const { access, character } = gate;

  const advancement = advancementOf(gate);

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const career = await tx.career.findFirst({ where: { id: input.careerId, campaignId: character.campaignId }, select: { id: true, name: true } });

    if (!career) throw new ContentError(API_ERRORS.CAREER_NOT_FOUND, 404);

    const next = advancement.planCareerSet(locked.characteristics, career.id);

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson(next) } });

    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.CAREER_SET, data: { careerId: career.id, name: career.name } }]);

    return { characteristics: next };
  });
}

export async function advanceCareer(gate: CharacterGate, input: CareerAdvanceInput): Promise<CareerResult> {
  const { access, character } = gate;

  const advancement = advancementOf(gate);

  return prisma.$transaction(async (tx) => {
    const locked = (await lockCharacters(tx, [character.id])).get(character.id);

    if (!locked) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const plan = advancement.planCareerAdvance(locked.characteristics, access.campaign.rules.advancement, { force: input.force === true });

    if (!plan.ok) {
      const career = locked.characteristics.career;

      const issues = plan.error === "TICKS_MISSING" && career ? { needed: access.campaign.rules.advancement.career.ticksRequired[career.tier - 1], have: career.ticks.length } : undefined;

      throw new ContentError(ADVANCE_ERRORS[plan.error], 409, issues);
    }

    await tx.character.update({ where: { id: character.id }, data: { characteristics: characteristicsJson(plan.next) } });

    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.CAREER_ADVANCE, data: { careerId: plan.next.career?.careerId, tier: plan.next.career?.tier, forced: input.force === true } }]);

    return { characteristics: plan.next };
  });
}
