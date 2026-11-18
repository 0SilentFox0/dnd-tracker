import { type ArtifactSetBattleMaps, artifactSetContext } from './load-maps';

import type { CharacterContextLoader } from '@/lib/server/systems/types';

type SetRow = ArtifactSetBattleMaps['artifactSetsById'][string] & {
    artifacts: { id: string }[];
};

export const artifactSetCharacterContext: CharacterContextLoader = {
    artifactInclude: {
        artifactSet: { include: { artifacts: { select: { id: true } } } },
    },
    load: async ({ artifacts }) => {
        const maps: ArtifactSetBattleMaps = {
            artifactSetsById: {},
            artifactSetMemberIds: {},
        };

        for (const { artifactSet } of artifacts as {
            artifactSet?: SetRow | null;
        }[]) {
            if (!artifactSet) continue;

            maps.artifactSetsById[artifactSet.id] = {
                id: artifactSet.id,
                name: artifactSet.name,
                setBonus: artifactSet.setBonus,
                icon: artifactSet.icon,
                abilities: artifactSet.abilities,
            };
            maps.artifactSetMemberIds[artifactSet.id] =
                artifactSet.artifacts.map((a) => a.id);
        }

        const holder = { ext: {} };

        artifactSetContext.write(holder, maps);

        return { ext: holder.ext };
    },
};
