import 'server-only';
import { ACTIVE_CHARACTER } from '@/lib/constants/characters';
import { SCENARIO_MENTION_LIMIT } from '@/lib/constants/scenario';
import { prisma } from '@/lib/db';
import type { MentionOption, MentionType } from '@/types/scenario';
type Group = [MentionType, { id: string; name: string }[]];

const toOptions = (groups: Group[]): MentionOption[] =>
    groups.flatMap(([type, rows]) =>
        rows.map((r) => ({ type, id: r.id, label: r.name }))
    );

export async function searchScenarioMentions(
    campaignId: string,
    q: string
): Promise<MentionOption[]> {
    const args = {
        where: {
            campaignId,
            name: { contains: q, mode: 'insensitive' as const },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' as const },
        take: SCENARIO_MENTION_LIMIT,
    };

    const [unit, artifact, character, spell, battle, marker, acquaintance] =
        await Promise.all([
            prisma.unit.findMany(args),
            prisma.artifact.findMany(args),
            prisma.character.findMany({
                ...args,
                where: { ...args.where, ...ACTIVE_CHARACTER },
            }),
            prisma.spell.findMany(args),
            prisma.battleScene.findMany({
                ...args,
                where: { ...args.where, ownerUserId: null },
            }),
            prisma.worldMarker.findMany({
                ...args,
                where: { map: { campaignId }, name: args.where.name },
            }),
            prisma.acquaintance.findMany(args),
        ]);

    return toOptions([
        ['unit', unit],
        ['artifact', artifact],
        ['character', character],
        ['spell', spell],
        ['battle', battle],
        ['marker', marker],
        ['acquaintance', acquaintance],
    ]);
}

export async function listScenarioMentionNames(
    campaignId: string
): Promise<MentionOption[]> {
    const args = {
        where: { campaignId },
        select: { id: true, name: true },
    };

    const [unit, artifact, character, acquaintance] = await Promise.all([
        prisma.unit.findMany(args),
        prisma.artifact.findMany(args),
        prisma.character.findMany({
            ...args,
            where: { campaignId, ...ACTIVE_CHARACTER },
        }),
        prisma.acquaintance.findMany(args),
    ]);

    return toOptions([
        ['unit', unit],
        ['artifact', artifact],
        ['character', character],
        ['acquaintance', acquaintance],
    ]);
}
