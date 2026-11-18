import type { SystemServer } from './types';

import 'server-only';
import {
    type Addon,
    composeParts,
    CompositionError,
} from '@/lib/utils/rules/systems/compose';

const baseOnly = (addon: Addon<SystemServer>): Addon<SystemServer> => ({
    ...addon,
    build: (prev) => {
        const part = addon.build(prev);

        if (part.drafts !== undefined)
            throw new CompositionError(
                `${addon.id}: drafts is an exclusive slot of the base`
            );

        return part;
    },
});

export const composeServer = (
    base: SystemServer,
    addons: readonly Addon<SystemServer>[]
): SystemServer =>
    composeParts(base, addons.map(baseOnly), {
        dictionaries: [
            'operations',
            'battle',
            'contentKinds',
            'content.operations',
            'content.abilityOwners',
            'content.schemaTargets',
            'content.mediaKinds',
            'content.readActions',
            'content.aliases',
            'content.template.localize',
            'content.template.afterSyncUpdate',
            'content.template.usageSelect',
            'routes.campaign',
            'routes.character',
            'ai.heroSelect',
            'ai.toolNotes',
        ],
    });
