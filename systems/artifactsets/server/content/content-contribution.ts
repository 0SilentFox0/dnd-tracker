import { prisma } from '@/lib/db';
import type { SystemContentServer } from '@/lib/server/systems/content-types';
import { OwnerKind } from '@/lib/utils/abilities/read';

export const ARTIFACTSETS_CONTENT: SystemContentServer = {
    abilityOwners: {
        [OwnerKind.ARTIFACT_SET]: {
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
    mediaKinds: { 'artifact-sets': 'icon' },
};
