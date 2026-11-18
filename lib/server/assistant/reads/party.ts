import { z } from 'zod';

import { readAction } from './define';

import 'server-only';
import '@/lib/server/systems/registry';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { ACTIVE_CHARACTER, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { loadRules } from '@/lib/server/campaigns/rules';
import { ContentError } from '@/lib/server/content/errors';
import { readContent } from '@/lib/server/scenario/page-store';
import { systemServerOf } from '@/lib/server/systems/lookup';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { withStoredColumns } from '@/lib/utils/rules/systems/column-view';
import { docText } from '@/lib/utils/scenario/doc';

const PARTY_SELECT = {
    id: true,
    name: true,
    level: true,
    class: true,
    race: true,
    armorClass: true,
    characteristics: true,
    notes: true,
} as const;

const flatRow = <T extends object>(row: T) => {
    const { characteristics: _stored, ...rest } = withStoredColumns(
        row
    ) as T & {
        characteristics?: unknown;
    };

    return rest;
};

export type PartyMember = {
    id: string;
    name: string;
    level: number;
    race: string;
    notes: string | null;
} & Record<string, unknown>;

export async function partySummary(
    campaignId: string,
    limit?: number,
    rules?: Ruleset
): Promise<PartyMember[]> {
    const resolved = rules ?? (await loadRules(campaignId));

    const query = {
        where: { campaignId, type: CharacterType.PLAYER, ...ACTIVE_CHARACTER },
        orderBy: { name: 'asc' as const },
        ...(limit !== undefined && { take: limit }),
    };

    const ai = systemServerOf(resolved).ai;

    if (ai?.party) return (await ai.party(campaignId, query)) as PartyMember[];

    return (
        await prisma.character.findMany({ ...query, select: PARTY_SELECT })
    ).map(flatRow);
}

export const partyInput = z.strictObject({});

export const readCharacterInput = z.strictObject({
    id: z.string().min(1).max(200),
});

export const PARTY_ACTION = readAction({
    id: 'characters.party',
    title: 'Party',
    description:
        'Player heroes of the campaign: id, name, level, class, race, AC, DM notes.',
    scope: 'characters:read',
    input: partyInput,
    run: ({ campaignId }) => partySummary(campaignId),
});

export const READ_CHARACTER_ACTION = readAction({
    id: 'characters.sheet-read',
    title: 'Character sheet',
    description:
        'Full character sheet (player hero or NPC hero) with the hero biography from the scenario.',
    scope: 'characters:read',
    input: readCharacterInput,
    run: async ({ campaignId }, { id }) => {
        const ai = systemServerOf(await loadRules(campaignId)).ai;

        const common = {
            type: true,
            subclass: true,
            alignment: true,
            background: true,
            goals: true,
        } as const;

        const c = await prisma.character.findFirst({
            where: { id, campaignId: campaignId, ...ACTIVE_CHARACTER },
            select: ai?.heroSelect
                ? { ...ai.heroSelect, ...common }
                : {
                      ...PARTY_SELECT,
                      ...common,
                      strength: true,
                      dexterity: true,
                      constitution: true,
                      intelligence: true,
                      wisdom: true,
                      charisma: true,
                      speed: true,
                      morale: true,
                  },
        });

        if (!c)
            throw new ContentError(
                API_ERRORS.CHARACTER_NOT_IN_CAMPAIGN,
                404,
                undefined,
                { id }
            );

        const bio = await prisma.scenarioPage.findFirst({
            where: {
                campaignId: campaignId,
                characterId: id,
                kind: 'hero',
            },
            select: { content: true },
        });

        const biography = bio
            ? readContent(bio.content)
                  .sections.map(
                      (s) =>
                          `${s.title}: ${s.rows.map((r) => docText(r.story)).join(' ')}`
                  )
                  .join('\n')
            : null;

        if (ai?.hero && ai.heroSelect)
            return { ...(await ai.hero(campaignId, c)), biography };

        return { ...flatRow(c), biography };
    },
});
