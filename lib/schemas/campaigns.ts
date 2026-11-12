import { z } from 'zod';

import { CampaignStatus, CampaignVisibility } from '@/lib/constants/campaigns';
import { TEMPLATE_CONTENT_LOCALES } from '@/lib/utils/templates/manifest';

export const createCampaignSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    maxLevel: z.number().min(1).max(30).optional(),
    allowPlayerEdit: z.boolean().optional(),
    critChoiceByDm: z.boolean().default(false),
    templateId: z.string().min(1).optional(),
    contentLocale: z.enum(TEMPLATE_CONTENT_LOCALES).optional(),
});

export const updateCampaignSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional().nullable(),
    maxLevel: z.number().min(1).max(30).optional(),
    allowPlayerEdit: z.boolean().optional(),
    critChoiceByDm: z.boolean().optional(),
    acquaintancesEnabled: z.boolean().optional(),
    status: z.enum([CampaignStatus.ACTIVE, CampaignStatus.ARCHIVED]).optional(),
    visibility: z
        .enum([CampaignVisibility.PRIVATE, CampaignVisibility.OFFICIAL])
        .optional(),
});

export const joinCampaignSchema = z.object({
    inviteCode: z.string().trim().min(1),
});
