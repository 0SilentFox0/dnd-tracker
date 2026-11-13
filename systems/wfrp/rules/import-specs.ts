import { CAREERS_IMPORT } from './import/careers';

import type { ImportSpec } from '@/types/content-import';

export const WFRP_IMPORT_SPECS: Record<string, ImportSpec> = {
    careers: CAREERS_IMPORT,
};
