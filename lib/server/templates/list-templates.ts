import { Prisma } from '@prisma/client';

import { BUNDLE_TABLES } from './bundle';

import '@/lib/server/systems/registry';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    CampaignKind,
    CampaignRole,
    CampaignVisibility,
} from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import { type Ruleset, safeParseRules } from '@/lib/utils/rules/schema';
import { systemKeyOf } from '@/lib/utils/rules/systems';
import {
    isCanonicalTemplate,
    isLegacyLocalizedTemplate,
    localizationOf,
    type TemplateIdentity,
    templateKeyOf,
} from '@/lib/utils/templates/registry';
import type { TemplateCard, TemplateList } from '@/types/campaigns';

const campaignRelationKeys = new Set(
    Prisma.dmmf.datamodel.models
        .find((m) => m.name === 'Campaign')
        ?.fields.filter((f) => f.kind === 'object' && f.isList)
        .map((f) => f.name)
);

/** Tables that are `_count`-able relations of Campaign; the rest (module content without a relation) are counted by a groupBy. */
export const RELATION_TABLES = BUNDLE_TABLES.filter((t) =>
    campaignRelationKeys.has(t.key)
);

export const DETACHED_TABLES = BUNDLE_TABLES.filter(
    (t) => !campaignRelationKeys.has(t.key)
);

const select = {
    id: true,
    name: true,
    description: true,
    visibility: true,
    kind: true,
    credits: true,
    locale: true,
    templateKey: true,
    rules: true,
    _count: {
        select: Object.fromEntries(RELATION_TABLES.map((t) => [t.key, true])),
    },
} as const;

const toCard = (
    {
        _count,
        rules: _rules,
        ...t
    }: {
        id: string;
        name: string;
        description: string | null;
        kind: string;
        visibility: string;
        credits: string | null;
        locale: string | null;
        templateKey: string | null;
        rules: unknown;
        _count: Record<string, number>;
    },
    parsed: Ruleset
): TemplateCard => ({
    ...t,
    system: systemKeyOf(parsed),
    counts: _count,
    ...(isCanonicalTemplate(t) && {
        availableLocales: localizationOf(t)?.locales,
    }),
});

/** A template whose rules carry no valid system is hidden from the picker */
const toCards = <T extends { rules: unknown }>(
    rows: T[],
    build: (row: T, parsed: Ruleset) => TemplateCard
): TemplateCard[] =>
    rows.flatMap((row) => {
        const parsed = safeParseRules(row.rules);

        return parsed.ok ? [build(row, parsed.rules)] : [];
    });

/** Shared by the picker API and the owner's direct tile query. */
export function visibleTemplates<T extends TemplateIdentity>(
    templates: T[]
): T[] {
    const canonicalKeys = templates
        .filter(isCanonicalTemplate)
        .map(templateKeyOf);

    if (new Set(canonicalKeys).size !== canonicalKeys.length)
        throw new ContentError(API_ERRORS.SRD_CANONICAL_UNAVAILABLE, 409);

    return templates.filter((template) => !isLegacyLocalizedTemplate(template));
}

type CountedRow = { id: string; _count: Record<string, number> };

async function withDetachedCounts<T extends CountedRow>(
    rows: T[]
): Promise<T[]> {
    if (!rows.length || !DETACHED_TABLES.length) return rows;

    const ids = rows.map((r) => r.id);

    const extra = await Promise.all(
        DETACHED_TABLES.map(async (t) => {
            const groups = await (
                prisma as unknown as Record<
                    string,
                    {
                        groupBy(args: unknown): Promise<
                            Array<{
                                campaignId: string;
                                _count: { _all: number };
                            }>
                        >;
                    }
                >
            )[t.delegate].groupBy({
                by: ['campaignId'],
                where: { campaignId: { in: ids } },
                _count: { _all: true },
            });

            return [
                t.key,
                new Map(groups.map((g) => [g.campaignId, g._count._all])),
            ] as const;
        })
    );

    return rows.map((row) => ({
        ...row,
        _count: {
            ...row._count,
            ...Object.fromEntries(
                extra.map(([key, counts]) => [key, counts.get(row.id) ?? 0])
            ),
        },
    }));
}

export async function listTemplates(userId: string): Promise<TemplateList> {
    const [official, mine] = await Promise.all([
        prisma.campaign.findMany({
            where: {
                kind: CampaignKind.TEMPLATE,
                visibility: CampaignVisibility.OFFICIAL,
            },
            select,
            orderBy: { name: 'asc' },
        }),
        prisma.campaign.findMany({
            where: {
                kind: CampaignKind.TEMPLATE,
                visibility: { not: CampaignVisibility.OFFICIAL },
                members: { some: { userId, role: CampaignRole.DM } },
            },
            select,
            orderBy: { updatedAt: 'desc' },
        }),
    ]);

    const [officialCounted, mineCounted] = await Promise.all([
        withDetachedCounts(visibleTemplates(official)),
        withDetachedCounts(mine),
    ]);

    return {
        official: toCards(officialCounted, toCard),
        mine: toCards(mineCounted, toCard),
    };
}
