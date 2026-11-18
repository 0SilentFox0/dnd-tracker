import { prisma } from '@/lib/db';
import type { SystemContentServer } from '@/lib/server/systems/content-types';
import { OwnerKind } from '@/lib/utils/abilities/read';

export const ARTIFACTSETS_CONTENT: SystemContentServer = {
    abilityOwners: {
        [OwnerKind.artifactSet]: {
            contentKind: 'artifact-sets',
            order: 40,
            load: (where) =>
                prisma.artifactSet.findMany({
                    where,
                    select: { id: true, name: true },
                }),
            find: (where) => prisma.artifactSet.findFirst({ where }),
        },
    },
    embeds: {
        artifactSet: {
            host: 'artifacts',
            as: 'artifactSet',
            column: 'setId',
            load: ({ campaignId, ids, brief }) =>
                prisma.artifactSet.findMany({
                    where: { campaignId, id: { in: ids } },
                    ...(brief && { select: { id: true, name: true } }),
                }),
        },
    },
    mediaKinds: { 'artifact-sets': 'icon' },
};
