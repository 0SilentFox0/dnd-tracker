import { BACKGROUNDS_IMPORT } from './import/backgrounds';
import { CLASSES_IMPORT } from './import/classes';

import type { ImportSpec } from '@/types/content-import';

export const D20_IMPORT_SPECS: Record<string, ImportSpec> = {
    classes: CLASSES_IMPORT,
    backgrounds: BACKGROUNDS_IMPORT,
};
