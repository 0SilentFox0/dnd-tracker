import type { Career } from '@prisma/client';
import type { z } from 'zod';

import 'server-only';
import { getCachedCareers } from '@/lib/cache/reference-data';
import { ReferenceKind } from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { createCareerSchema, updateCareerSchema } from '@/lib/schemas/careers';
import { assertCampaignRefs } from '@/lib/server/campaigns/campaign-refs';
import { careerNameTaken } from '@/lib/server/careers/career-name';
import { defineResource } from '@/lib/server/content/define-resource';
import { ContentError } from '@/lib/server/content/errors';
import { profileReferences } from '@/lib/server/races/profile-usage';
import { toCareerData } from '@/lib/utils/careers/row';
import { toInputJson } from '@/lib/utils/common/json';
import type { CareerTierDef } from '@/types/careers';

const talentIds = (tiers?: CareerTierDef[]) =>
    tiers?.flatMap((t) => t.talents) ?? [];

async function assertName(campaignId: string, name: string, exceptId?: string) {
    if (await careerNameTaken(campaignId, name, exceptId))
        throw new ContentError(API_ERRORS.CAREER_NAME_TAKEN, 409, undefined, {
            name,
        });
}

async function careerInUse(campaignId: string, careerId: string) {
    return (
        (await prisma.character.count({
            where: {
                campaignId,
                characteristics: {
                    path: ['career', 'careerId'],
                    equals: careerId,
                },
            },
        })) > 0
    );
}

export const careersResource = defineResource<
    Career,
    z.infer<typeof createCareerSchema>,
    z.infer<typeof updateCareerSchema>
>({
    kind: 'careers',
    idParam: 'careerId',
    label: 'Careers',
    description:
        'Careers: four tiers with characteristics, skills, talents and trappings.',
    path: '/careers',
    listFields: ['class'],
    schemas: { create: createCareerSchema, update: updateCareerSchema },
    errors: [409],
    access: { list: 'member', item: 'dm' },
    invalidates: [ReferenceKind.CAREERS],
    notFound: API_ERRORS.CAREER_NOT_FOUND,
    list: async (actor) =>
        (await getCachedCareers(actor.campaignId)).map(toCareerData),
    toItem: toCareerData,
    find: (actor, id) =>
        prisma.career.findFirst({
            where: { id, campaignId: actor.campaignId },
        }),
    async create(actor, data) {
        await assertName(actor.campaignId, data.name);
        await assertCampaignRefs(actor.campaignId, {
            feat: talentIds(data.tiers),
        });

        return prisma.career.create({
            data: {
                ...data,
                campaignId: actor.campaignId,
                tiers: toInputJson(data.tiers),
            },
        });
    },
    async update(actor, existing, data) {
        if (data.name !== undefined)
            await assertName(actor.campaignId, data.name, existing.id);

        await assertCampaignRefs(actor.campaignId, {
            feat: talentIds(data.tiers),
        });

        const { tiers, ...rest } = data;

        return prisma.career.update({
            where: { id: existing.id },
            data: {
                ...rest,
                ...(tiers !== undefined && { tiers: toInputJson(tiers) }),
            },
        });
    },
    async remove(actor, existing) {
        if (await careerInUse(actor.campaignId, existing.id))
            throw new ContentError(API_ERRORS.CAREER_IN_USE, 409);

        if (
            await profileReferences(actor.campaignId, { careerId: existing.id })
        )
            throw new ContentError(API_ERRORS.CAREER_IN_SPECIES_TABLE, 409);

        await prisma.career.deleteMany({
            where: { id: existing.id, campaignId: actor.campaignId },
        });
    },
});
