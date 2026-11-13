import { ARTIFACT_SETS_IMPORT } from './import/artifact-sets';

import type { ImportSpec } from '@/types/content-import';

export const ARTIFACTSETS_IMPORT_SPECS: Record<string, ImportSpec> = {
    'artifact-sets': ARTIFACT_SETS_IMPORT,
};
