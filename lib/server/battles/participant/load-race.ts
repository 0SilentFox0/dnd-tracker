import { prisma } from '@/lib/db';
import type { RaceRow } from '@/types/races';

export async function loadRace(
    raceName: string | null | undefined,
    campaignId: string,
    preloaded?: RaceRow | null
): Promise<RaceRow | null> {
    if (preloaded !== undefined) return preloaded;

    if (!raceName) return null;

    return prisma.race.findFirst({ where: { campaignId, name: raceName } });
}
