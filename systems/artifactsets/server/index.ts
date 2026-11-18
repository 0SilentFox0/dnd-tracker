import { completedSetsLoader } from './battle/apply-completed-sets';
import { attachArtifactSetsToSpellContext } from './battle/attach-to-spell-context';
import { artifactSetsResource } from './content/artifact-sets';
import { ARTIFACTSETS_CONTENT } from './content/content-contribution';

import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const ARTIFACTSETS_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    contentKinds: { 'artifact-sets': { resource: artifactSetsResource } },
    content: ARTIFACTSETS_CONTENT,
    participant: {
        characterRefs: [completedSetsLoader],
        prepareContext: [attachArtifactSetsToSpellContext],
    },
}));
