import { z } from 'zod';

import { readAction } from './define';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';

export const campaignBriefInput = z.strictObject({});

export const CAMPAIGN_BRIEF_ACTION = readAction({
    id: 'campaign.brief',
    title: 'Campaign description',
    description:
        "Campaign name, description and the DM's standing instructions.",
    scope: 'campaign:read',
    input: campaignBriefInput,
    run: async ({ campaignId }) => {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { name: true, description: true, aiInstructions: true },
        });

        if (!campaign)
            throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

        return {
            name: campaign.name,
            description: campaign.description,
            instructions: campaign.aiInstructions,
        };
    },
});
