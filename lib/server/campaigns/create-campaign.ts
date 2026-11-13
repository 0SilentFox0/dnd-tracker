import type { Campaign, Prisma } from '@prisma/client';

import { invalidateCampaignLists } from '@/lib/cache/campaign-list';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    CampaignKind,
    CampaignRole,
    CampaignVisibility,
} from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { invalidateCampaignLayer } from '@/lib/db/content-layer';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';
import { assertValidSystem } from '@/lib/server/campaigns/modules';
import { ContentError } from '@/lib/server/content/errors';
import { type Bundle, TemplateLeakError } from '@/lib/server/templates/bundle';
import { importBundle } from '@/lib/server/templates/import-bundle';
import {
    prepareCampaignSource,
    type PreparedCampaignSource,
    type PreparedLayer,
} from '@/lib/server/templates/prepare-source';
import { baselineFromBundle } from '@/lib/server/templates/sync/hash';
import { PUBLIC_USER_SELECT } from '@/lib/server/users/db-user';
import { canReadSource } from '@/lib/utils/api/is-dm';
import {
    generateInviteCode,
    INVITE_CODE_ATTEMPTS,
    isInviteCodeClash,
} from '@/lib/utils/campaigns/invite-code';
import {
    DEFAULT_RULES,
    localizedDefaultAttacks,
} from '@/lib/utils/rules/defaults';
import { initialRules } from '@/lib/utils/rules/initial-rules';
import { parseRules, type Ruleset } from '@/lib/utils/rules/schema';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';
import type { TemplateContentLocale } from '@/lib/utils/templates/manifest';

export { TemplateLeakError };

export const CAMPAIGN_INCLUDE = {
    members: { include: { user: { select: PUBLIC_USER_SELECT } } },
    dm: { select: PUBLIC_USER_SELECT },
} as const;
export const CAMPAIGN_OMIT = { aiInstructions: true } as const;

interface CreateFromBundleInput {
    userId: string;
    name: string;
    description?: string | null;
    bundle: Bundle | null;
    kind?: 'campaign' | 'template';
    visibility?: 'private' | 'official';
    createdFromId?: string | null;
    sourceVersion?: number | null;
    layer?: PreparedLayer | null;
    contentLocale?: string | null;
    settings?: Partial<Bundle['settings']>;
    critChoiceByDm?: boolean;
    defaultAttacks?: Ruleset['defaultAttacks'];
    system?: SystemSelection;
}

const defined = <T extends object>(obj: T) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

function campaignData(
    input: CreateFromBundleInput
): Prisma.CampaignCreateInput | Prisma.CampaignUncheckedCreateInput {
    const s = { ...input.bundle?.settings, ...defined(input.settings ?? {}) };

    return {
        name: input.name,
        description: input.description ?? null,
        inviteCode: generateInviteCode(),
        dmUserId: input.userId,
        kind: input.kind ?? CampaignKind.CAMPAIGN,
        visibility: input.visibility ?? CampaignVisibility.PRIVATE,
        createdFromId: input.createdFromId ?? null,
        locale: input.contentLocale ?? null,
        ...(input.layer && {
            baseSourceId: input.layer.sourceId,
            baseVersion: input.layer.baseVersion,
        }),
        ...(s.maxLevel !== undefined && { maxLevel: s.maxLevel }),
        ...(s.xpMultiplier !== undefined && { xpMultiplier: s.xpMultiplier }),
        ...(s.allowPlayerEdit !== undefined && {
            allowPlayerEdit: s.allowPlayerEdit,
        }),
        ...(s.friendlyFire !== undefined && { friendlyFire: s.friendlyFire }),
        ...(input.critChoiceByDm !== undefined && {
            critChoiceByDm: input.critChoiceByDm,
        }),
        ...(input.bundle
            ? {
                  rules: parseRules({
                      ...(input.defaultAttacks && {
                          defaultAttacks: input.defaultAttacks,
                      }),
                      ...(input.bundle.rules as object | undefined),
                  }) as Prisma.InputJsonObject,
              }
            : input.system
              ? {
                    rules: initialRules(input.system, {
                        ...(input.defaultAttacks && {
                            defaultAttacks: input.defaultAttacks,
                        }),
                    }) as Prisma.InputJsonObject,
                }
              : {
                    rules: {
                        ...(input.defaultAttacks && {
                            defaultAttacks: input.defaultAttacks,
                        }),
                        system: { key: DEFAULT_RULES.system.key },
                    },
                }),
        ...(input.bundle?.credits !== undefined && {
            credits: input.bundle.credits,
        }),
        members: { create: { userId: input.userId, role: CampaignRole.DM } },
    } as Prisma.CampaignUncheckedCreateInput;
}

export async function createCampaignFromBundle(
    input: CreateFromBundleInput
): Promise<{ campaign: Omit<Campaign, 'aiInstructions'>; warnings: string[] }> {
    for (let attempt = 1; ; attempt++) {
        try {
            const { bundle } = input;

            if (!bundle) {
                const campaign = await prisma.campaign.create({
                    data: campaignData(input),
                    include: { members: true },
                    omit: { aiInstructions: true },
                });

                return { campaign, warnings: [] };
            }

            const created = await prisma.$transaction(
                async (tx) => {
                    const campaign = await tx.campaign.create({
                        data: campaignData(input),
                        include: { members: true },
                        omit: { aiInstructions: true },
                    });

                    const { warnings, hashes } = await importBundle(
                        tx,
                        bundle,
                        campaign.id,
                        input.layer ?? undefined
                    );

                    if (input.layer?.hides.length)
                        await tx.campaignContentHide.createMany({
                            data: input.layer.hides.map((hide) => ({
                                campaignId: campaign.id,
                                table: hide.table,
                                id: hide.id,
                            })),
                        });

                    if (input.createdFromId && !input.layer) {
                        await tx.campaignSourceSync.create({
                            data: {
                                campaignId: campaign.id,
                                sourceCampaignId: input.createdFromId,
                                sourceVersion: input.sourceVersion ?? null,
                                baseline: baselineFromBundle(
                                    bundle,
                                    hashes
                                ) as Prisma.InputJsonObject,
                            },
                        });
                    }

                    return { campaign, warnings };
                },
                { timeout: 60_000, maxWait: 10_000 }
            );

            if (input.layer) invalidateCampaignLayer(created.campaign.id);

            return created;
        } catch (error) {
            if (attempt >= INVITE_CODE_ATTEMPTS || !isInviteCodeClash(error))
                throw error;
        }
    }
}

export async function loadTemplateForUser(
    userId: string,
    templateId: string
): Promise<
    { ok: true; template: Campaign } | { ok: false; status: 403 | 404 }
> {
    const template = await prisma.campaign.findUnique({
        where: { id: templateId },
        include: { members: { where: { userId } } },
    });

    if (!template || template.kind !== CampaignKind.TEMPLATE)
        return { ok: false, status: 404 };

    return canReadSource(template.visibility, template.members)
        ? { ok: true, template }
        : { ok: false, status: 403 };
}

type CreateCampaignData = {
    name: string;
    description?: string | null;
    templateId?: string;
    contentLocale?: TemplateContentLocale;
    maxLevel?: number;
    allowPlayerEdit?: boolean;
    critChoiceByDm?: boolean;
    system?: SystemSelection;
};

type CampaignSource = PreparedCampaignSource;

export async function createCampaignForUser(
    userId: string,
    data: CreateCampaignData,
    options: {
        source?: CampaignSource;
        defer?: (effect: () => Promise<void>) => void;
        locale?: Locale;
    } = {}
) {
    let source = options.source ?? null;

    if (data.system) assertValidSystem(data.system);

    if (!source && data.templateId) {
        try {
            source = await prepareCampaignSource(prisma, data.templateId, {
                userId,
                contentLocale: data.contentLocale,
                mode: 'create',
            });
        } catch (error) {
            if (
                error instanceof ContentError &&
                (error.status === 403 || error.status === 404)
            )
                return { ok: false as const, status: error.status };

            throw error;
        }
    }

    if (!source && data.contentLocale !== undefined)
        throw new ContentError(API_ERRORS.TEMPLATE_CONTENT_LOCALE, 400);

    const created = await createCampaignFromBundle({
        userId,
        name: data.name,
        description: data.description,
        bundle: source?.bundle ?? null,
        createdFromId: source?.id ?? null,
        sourceVersion: source?.contentVersion ?? null,
        layer: source?.layer,
        contentLocale: source?.contentLocale ?? null,
        settings: {
            maxLevel: data.maxLevel,
            allowPlayerEdit: data.allowPlayerEdit,
        },
        critChoiceByDm: data.critChoiceByDm,
        system: data.system,
        defaultAttacks: localizedDefaultAttacks(
            await getTranslator(options.locale ?? DEFAULT_LOCALE, 'rules')
        ),
    });

    const invalidate = () => invalidateCampaignLists([userId]);

    if (options.defer) options.defer(invalidate);
    else await invalidate();

    return { ok: true as const, ...created };
}
