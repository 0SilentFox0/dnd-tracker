import { z } from 'zod';

import { AiToolError, defineTool } from './define';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { ACTIVE_CHARACTER, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { loadRules } from '@/lib/server/campaigns/rules';
import { readContent } from '@/lib/server/scenario/page-store';
import { systemServerOf, withSystemNotes } from '@/lib/server/systems/registry';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { docText } from '@/lib/utils/scenario/doc';

const PARTY_SELECT = {
    id: true,
    name: true,
    level: true,
    class: true,
    race: true,
    armorClass: true,
    notes: true,
} as const;

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

    return prisma.character.findMany({ ...query, select: PARTY_SELECT });
}

export const getPartyTool = defineTool({
    name: 'get_party',
    scopes: ['ai'],
    title: 'Party',
    description: withSystemNotes(
        'Player heroes of the campaign: id, name, level, class, race, AC, DM notes.',
        'get_party'
    ),
    input: z.object({}),
    handler: async (ctx) => partySummary(ctx.campaignId),
});

export const readCharacterTool = defineTool({
    name: 'read_character',
    scopes: ['ai'],
    title: 'Character sheet',
    description: withSystemNotes(
        'Full character sheet (player hero or NPC hero): ability scores, AC, HP-related stats, goals, DM notes and the hero biography from the scenario.',
        'read_character'
    ),
    input: z.object({ id: z.string().min(1) }),
    handler: async (ctx, { id }) => {
        const ai = systemServerOf(await loadRules(ctx.campaignId)).ai;

        const common = {
            type: true,
            subclass: true,
            alignment: true,
            background: true,
            goals: true,
        } as const;

        const c = await prisma.character.findFirst({
            where: { id, campaignId: ctx.campaignId, ...ACTIVE_CHARACTER },
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
            throw new AiToolError(API_ERRORS.CHARACTER_NOT_IN_CAMPAIGN, { id });

        const bio = await prisma.scenarioPage.findFirst({
            where: {
                campaignId: ctx.campaignId,
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
            return { ...(await ai.hero(ctx.campaignId, c)), biography };

        return { ...c, biography };
    },
});
