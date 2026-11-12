import { completedSetsLoader } from './battle/apply-completed-sets';
import { attachArtifactSetsToSpellContext } from './battle/attach-to-spell-context';

import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const ARTIFACTSETS_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    participant: {
        characterRefs: [completedSetsLoader],
        prepareContext: [attachArtifactSetsToSpellContext],
    },
}));
