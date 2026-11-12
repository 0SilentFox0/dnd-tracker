import { MAIN_SKILLS_IMPORT } from './import/main-skills';
import { SKILLS_IMPORT } from './import/skills';

import type { ImportSpec } from '@/types/content-import';

export const SKILLTREES_IMPORT_SPECS: Record<string, ImportSpec> = {
    'main-skills': MAIN_SKILLS_IMPORT,
    skills: SKILLS_IMPORT,
};
