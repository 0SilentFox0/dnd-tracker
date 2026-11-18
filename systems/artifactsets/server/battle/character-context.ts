import { type ArtifactSetBattleMaps, artifactSetContext } from './load-maps';

import { prisma } from '@/lib/db';
import type { CharacterContextLoader } from '@/lib/server/systems/types';

export const artifactSetCharacterContext: CharacterContextLoader = {
    load: async ({ artifacts }) => {
        const maps: ArtifactSetBattleMaps = {
            artifactSetsById: {},
            artifactSetMemberIds: {},
        };

        const setIds = [
            ...new Set(
                (artifacts as { setId?: string | null }[]).flatMap((a) =>
                    a.setId ? [a.setId] : []
                )
            ),
        ];

        const [sets, members] = setIds.length
            ? await Promise.all([
                  prisma.artifactSet.findMany({
                      where: { id: { in: setIds } },
                  }),
                  prisma.artifact.findMany({
                      where: { setId: { in: setIds } },
                      select: { id: true, setId: true },
                  }),
              ])
            : [[], []];

        for (const set of sets) {
            maps.artifactSetsById[set.id] = {
                id: set.id,
                name: set.name,
                setBonus: set.setBonus,
                icon: set.icon,
                abilities: set.abilities,
            };
            maps.artifactSetMemberIds[set.id] = members
                .filter((m) => m.setId === set.id)
                .map((m) => m.id);
        }

        const holder = { ext: {} };

        artifactSetContext.write(holder, maps);

        return { ext: holder.ext };
    },
};
