import {
    ArtifactSetsLink,
    ArtifactSetsPanel,
} from './content/ArtifactSetsCatalogParts';
import { ArtifactSetsPage } from './content/ArtifactSetsPage';
import { ArtifactSetsSection } from './ArtifactSetsSection';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';
import { useItemGroups } from '@/systems/artifactsets/hooks';

export const ARTIFACTSETS_MODULE_UI = defineAddon<SystemUi>(() => ({
    sheet: { itemSections: [ArtifactSetsSection] },
    dmPages: { 'artifact-sets': ArtifactSetsPage },
    itemGroups: {
        Link: ArtifactSetsLink,
        Panel: ArtifactSetsPanel,
        useGroups: useItemGroups,
    },
}));
