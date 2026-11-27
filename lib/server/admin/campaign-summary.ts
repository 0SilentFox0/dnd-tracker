import 'server-only';
import { prisma } from '@/lib/db';
import { cloneWhere, systemKey } from '@/lib/server/admin/campaign-links';
import type { AdminCampaignSummary } from '@/types/admin';

export async function getAdminCampaignSummary(
    id: string
): Promise<AdminCampaignSummary | null> {
    const c = await prisma.campaign.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            kind: true,
            status: true,
            rules: true,
            contentVersion: true,
            createdAt: true,
            updatedAt: true,
            dm: { select: { id: true, displayName: true, email: true } },
            members: {
                select: {
                    role: true,
                    user: { select: { id: true, displayName: true } },
                },
            },
            _count: {
                select: {
                    characters: true,
                    battles: true,
                    battleMaps: true,
                    scenarioPages: true,
                    units: true,
                    spells: true,
                },
            },
        },
    });

    if (!c) return null;

    const clones =
        c.kind === 'template'
            ? await prisma.campaign.count({ where: cloneWhere([c.id]) })
            : 0;

    return {
        id: c.id,
        name: c.name,
        kind: c.kind,
        status: c.status,
        system: systemKey(c.rules),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        owner: c.dm,
        members: c.members.map((m) => ({
            id: m.user.id,
            displayName: m.user.displayName,
            role: m.role,
        })),
        counts: {
            characters: c._count.characters,
            battles: c._count.battles,
            maps: c._count.battleMaps,
            scenarioPages: c._count.scenarioPages,
            units: c._count.units,
            spells: c._count.spells,
        },
        storageBytes: null,
        template:
            c.kind === 'template'
                ? { versions: c.contentVersion, clones }
                : null,
    };
}
