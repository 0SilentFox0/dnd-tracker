import { findArtifactSetForEdit } from './content/queries';

import 'server-only';
import type { SystemDmPageResolver } from '@/lib/server/systems/types';
import { readAbilities } from '@/lib/utils/abilities/read';

export const artifactSetsDmPage: SystemDmPageResolver = async ({
    campaignId,
    rest,
}) => {
    if (rest.length === 0) return { view: { type: 'list' } };

    if (rest.length > 1) return null;

    const [segment] = rest;

    if (segment === 'new') return { view: { type: 'new' } };

    const found = await findArtifactSetForEdit(campaignId, segment);

    if (!found) return null;

    const { set, artifactIds } = found;

    const { abilities, issues } = readAbilities('artifactSet', set);

    const bonus = (set.setBonus ?? {}) as {
        name?: unknown;
        description?: unknown;
    };

    return {
        view: { type: 'edit', id: set.id },
        data: {
            name: set.name,
            setId: set.id,
            initial: {
                name: set.name,
                description: set.description,
                icon: set.icon,
                setBonus: {
                    name:
                        typeof bonus.name === 'string' ? bonus.name : undefined,
                    description:
                        typeof bonus.description === 'string'
                            ? bonus.description
                            : undefined,
                },
                abilities,
                abilityIssues: issues,
                artifactIds,
            },
        },
    };
};
