import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { CharacterStatus } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import type { CharacterGate } from '@/lib/server/characters/access';
import { characteristicsJson } from '@/lib/server/characters/core/characteristics-json';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ContentError } from '@/lib/server/content/errors';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';
import {
    availableXp,
    CAREER_ADVANCE_XP,
    careerChangeCost,
    planCareerAdvance,
    planCareerRevert,
    planCareerSet,
    planTrappingTick,
} from '@/systems/wfrp/rules/advancement';
import type { Characteristics } from '@/systems/wfrp/rules/characteristics/keys';
import { readCharacteristics } from '@/systems/wfrp/rules/characteristics/keys';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { toCareerData } from '@/systems/wfrp/server/careers/row';
import { parseSpeciesProfile } from '@/systems/wfrp/server/profile-refs';
import type {
    CareerAdvanceInput,
    CareerSetInput,
    CareerTrappingInput,
} from '@/systems/wfrp/server/progression-schemas';

export type CareerResult = { characteristics: Characteristics };

const ADVANCE_ERRORS = {
    NO_CAREER: API_ERRORS.CAREER_NO_CAREER,
    MAX_TIER: API_ERRORS.CAREER_MAX_TIER,
    TICKS_MISSING: API_ERRORS.CAREER_TICKS_MISSING,
    INSUFFICIENT_XP: API_ERRORS.ADVANCE_INSUFFICIENT_XP,
} as const;

function advancementOf({ access, character }: CharacterGate) {
    const advancement = ruleSystemOf(access.campaign.rules).advancement;

    if (!advancement)
        throw new ContentError(API_ERRORS.ADVANCE_NOT_SUPPORTED, 409);

    if (character.status !== CharacterStatus.ACTIVE)
        throw new ContentError(API_ERRORS.XP_CHARACTERS_INVALID, 400);

    return { planCareerSet, planCareerAdvance, availableXp };
}

export async function setCareer(
    gate: CharacterGate,
    input: CareerSetInput
): Promise<CareerResult> {
    const { access, character } = gate;

    const advancement = advancementOf(gate);

    return prisma.$transaction(async (tx) => {
        const locked = (await lockCharacters(tx, [character.id])).get(
            character.id
        );

        if (!locked)
            throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const career = await tx.career.findFirst({
            where: { id: input.careerId, campaignId: character.campaignId },
            select: { id: true, name: true, class: true },
        });

        if (!career) throw new ContentError(API_ERRORS.CAREER_NOT_FOUND, 404);

        const current = readCharacteristics(locked);

        const canon = editionOf(access.campaign.rules).xpTables === 'canon5e';

        if (canon && !access.isDM && character.race) {
            const race = await tx.race.findFirst({
                where: {
                    name: character.race,
                    campaignId: character.campaignId,
                },
                select: { profile: true },
            });

            const profile = parseSpeciesProfile(race?.profile);

            if (
                profile &&
                profile.careerTable.length > 0 &&
                !profile.careerTable.some((r) => r.careerId === career.id)
            )
                throw new ContentError(
                    API_ERRORS.CAREER_NOT_IN_SPECIES_TABLE,
                    409
                );
        }

        if (current.career?.careerId === career.id)
            throw new ContentError(API_ERRORS.CAREER_SAME, 409);

        const previous =
            canon && input.force !== true && current.career
                ? await tx.career.findFirst({
                      where: {
                          id: current.career.careerId,
                          campaignId: character.campaignId,
                      },
                      select: { class: true },
                  })
                : null;

        const cost = previous
            ? careerChangeCost(previous.class, career.class)
            : 0;

        if (cost > 0 && availableXp(locked.experience, current) < cost)
            throw new ContentError(API_ERRORS.ADVANCE_INSUFFICIENT_XP, 409);

        const next = advancement.planCareerSet(current, career.id, cost);

        await tx.character.update({
            where: { id: character.id },
            data: { characteristics: characteristicsJson(next) },
        });

        await writeCharacterLog(tx, [
            {
                campaignId: character.campaignId,
                characterId: character.id,
                actorUserId: access.userId,
                kind: CharacterLogKind.CAREER_SET,
                data: {
                    careerId: career.id,
                    name: career.name,
                    ...(cost > 0 && { cost }),
                },
            },
        ]);

        return { characteristics: next };
    });
}

export async function advanceCareer(
    gate: CharacterGate,
    input: CareerAdvanceInput
): Promise<CareerResult> {
    const { access, character } = gate;

    const advancement = advancementOf(gate);

    return prisma.$transaction(async (tx) => {
        const locked = (await lockCharacters(tx, [character.id])).get(
            character.id
        );

        if (!locked)
            throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const current = readCharacteristics(locked);

        const plan = advancement.planCareerAdvance(
            current,
            access.campaign.rules.advancement,
            {
                force: input.force === true,
                ...(editionOf(access.campaign.rules).xpTables === 'canon5e' && {
                    charge: {
                        cost: CAREER_ADVANCE_XP,
                        available: advancement.availableXp(
                            locked.experience,
                            current
                        ),
                    },
                }),
            }
        );

        if (!plan.ok) {
            const career = readCharacteristics(locked).career;

            const issues =
                plan.error === 'TICKS_MISSING' && career
                    ? {
                          needed: access.campaign.rules.advancement.career
                              .ticksRequired[career.tier - 1],
                          have: career.ticks.length,
                      }
                    : undefined;

            throw new ContentError(ADVANCE_ERRORS[plan.error], 409, issues);
        }

        const charged = plan.next.spentArchived - current.spentArchived;

        await tx.character.update({
            where: { id: character.id },
            data: { characteristics: characteristicsJson(plan.next) },
        });

        await writeCharacterLog(tx, [
            {
                campaignId: character.campaignId,
                characterId: character.id,
                actorUserId: access.userId,
                kind: CharacterLogKind.CAREER_ADVANCE,
                data: {
                    careerId: plan.next.career?.careerId,
                    tier: plan.next.career?.tier,
                    forced: input.force === true,
                    ...(charged > 0 && { cost: charged }),
                },
            },
        ]);

        return { characteristics: plan.next };
    });
}

export async function revertCareer(gate: CharacterGate): Promise<CareerResult> {
    const { access, character } = gate;

    advancementOf(gate);

    return prisma.$transaction(async (tx) => {
        const locked = (await lockCharacters(tx, [character.id])).get(
            character.id
        );

        if (!locked)
            throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const plan = planCareerRevert(readCharacteristics(locked));

        if (!plan.ok)
            throw new ContentError(
                plan.error === 'STALE'
                    ? API_ERRORS.ADVANCE_LEDGER_STALE
                    : API_ERRORS.ADVANCE_LEDGER_EMPTY,
                409
            );

        await tx.character.update({
            where: { id: character.id },
            data: { characteristics: characteristicsJson(plan.next) },
        });

        await writeCharacterLog(tx, [
            {
                campaignId: character.campaignId,
                characterId: character.id,
                actorUserId: access.userId,
                kind: CharacterLogKind.CAREER_SET,
                data: {
                    careerId: plan.next.career?.careerId,
                    revert: true,
                },
            },
        ]);

        return { characteristics: plan.next };
    });
}

const TRAPPING_ERRORS = {
    NO_CAREER: API_ERRORS.CAREER_NO_CAREER,
    MAX_TIER: API_ERRORS.CAREER_MAX_TIER,
    NOT_LISTED: API_ERRORS.CAREER_NOT_FOUND,
    ALREADY: API_ERRORS.CAREER_SAME,
} as const;

export async function tickTrapping(
    gate: CharacterGate,
    input: CareerTrappingInput
): Promise<CareerResult> {
    const { character } = gate;

    advancementOf(gate);

    return prisma.$transaction(async (tx) => {
        const locked = (await lockCharacters(tx, [character.id])).get(
            character.id
        );

        if (!locked)
            throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const current = readCharacteristics(locked);

        const row = current.career
            ? await tx.career.findFirst({
                  where: {
                      id: current.career.careerId,
                      campaignId: character.campaignId,
                  },
              })
            : null;

        const plan = planTrappingTick(
            current,
            row ? toCareerData(row).tiers : [],
            input.name
        );

        if (!plan.ok) throw new ContentError(TRAPPING_ERRORS[plan.error], 409);

        await tx.character.update({
            where: { id: character.id },
            data: { characteristics: characteristicsJson(plan.next) },
        });

        return { characteristics: plan.next };
    });
}
