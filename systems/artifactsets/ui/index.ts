import { ArtifactSetsSection } from './ArtifactSetsSection';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const ARTIFACTSETS_MODULE_UI = defineAddon<SystemUi>(() => ({
    sheet: { itemSections: [ArtifactSetsSection] },
}));
