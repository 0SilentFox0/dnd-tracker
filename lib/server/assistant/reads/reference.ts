import { z } from 'zod';

import { readAction } from './define';

import 'server-only';
import {
    getCachedRaces,
    getCachedSpells,
    getCachedUnits,
} from '@/lib/cache/reference-data';
import { AI_LIMITS } from '@/lib/constants/ai';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';
import { loadRules } from '@/lib/server/campaigns/rules';
import { ContentError } from '@/lib/server/content/errors';
import { systemServerOf } from '@/lib/server/systems/lookup';
import {
    abilityRegistryOf,
    flowSegments,
    linesText,
} from '@/lib/utils/abilities/segments';
import { unsafeCast } from '@/lib/utils/common/cast';

export const referenceKindSchema = z.enum([
    'unit',
    'spell',
    'race',
    'skill',
    'artifact',
]);

type Kind = z.infer<typeof referenceKindSchema>;

type Entry = { id: string; name: string } & Record<string, unknown>;

// skills and artifacts are not in the reference cache
async function listOf(
    campaignId: string,
    kind: Kind,
    locale: Locale
): Promise<Entry[]> {
    if (kind === 'unit') {
        const units = await getCachedUnits(campaignId);

        const registry = abilityRegistryOf(await getTranslator(locale));

        const unitView = systemServerOf(await loadRules(campaignId)).ai
            ?.unitView;

        return unsafeCast<Entry[]>(
            units.map((u) => ({
                ...u,
                abilitySummary: linesText(
                    registry,
                    (u.abilitySummary ?? []).map(flowSegments)
                ),
                ...(unitView && u.characteristics && unitView(u)),
            }))
        );
    }

    if (kind === 'spell')
        return unsafeCast<Entry[]>(await getCachedSpells(campaignId));

    if (kind === 'race')
        return unsafeCast<Entry[]>(await getCachedRaces(campaignId));

    if (kind === 'skill')
        return prisma.skill.findMany({
            where: { campaignId },
            select: { id: true, name: true },
        });

    return prisma.artifact.findMany({
        where: { campaignId },
        select: { id: true, name: true },
    });
}

async function findEntry(
    campaignId: string,
    kind: Kind,
    id: string,
    locale: Locale
): Promise<Entry | null> {
    if (kind === 'skill')
        return (await prisma.skill.findFirst({
            where: { id, campaignId },
        })) as Entry | null;

    if (kind === 'artifact')
        return (await prisma.artifact.findFirst({
            where: { id, campaignId },
        })) as Entry | null;

    return (
        (await listOf(campaignId, kind, locale)).find((e) => e.id === id) ??
        null
    );
}

export const searchReferenceInput = z.strictObject({
    kind: referenceKindSchema,
    query: z.string().trim().min(1).max(60),
});

export const readReferenceInput = z.strictObject({
    kind: referenceKindSchema,
    id: z.string().min(1).max(200),
});

export const SEARCH_REFERENCE_ACTION = readAction({
    id: 'reference.search',
    title: 'Reference search',
    description: 'Search the campaign reference by name.',
    scope: 'content:read',
    input: searchReferenceInput,
    run: async ({ campaignId, locale }, { kind, query }) => {
        const q = query.toLocaleLowerCase('uk');

        return (await listOf(campaignId, kind, locale))
            .filter((e) => e.name.toLocaleLowerCase('uk').includes(q))
            .slice(0, AI_LIMITS.searchHits)
            .map(({ id, name }) => ({ id, name }));
    },
});

export const READ_REFERENCE_ACTION = readAction({
    id: 'reference.read',
    title: 'Reference entry',
    description: 'Full reference entry by kind and id.',
    scope: 'content:read',
    input: readReferenceInput,
    run: async ({ campaignId, locale }, { kind, id }) => {
        const entry = await findEntry(campaignId, kind, id, locale);

        if (!entry)
            throw new ContentError(
                API_ERRORS.REFERENCE_ENTRY_MISSING,
                404,
                undefined,
                { kind, id }
            );

        return entry;
    },
});
