import { ARTIFACTS_IMPORT } from './artifacts';
import { CAREERS_IMPORT } from './careers';
import { FEATS_IMPORT } from './feats';
import { RACES_IMPORT } from './races';
import { SPELL_GROUPS_IMPORT } from './spell-groups';
import { SPELLS_IMPORT } from './spells';
import { SYSTEM_IMPORT_SPECS } from './system-specs';
import { UNITS_IMPORT } from './units';

import type { ImportKind, ImportSpec } from '@/types/content-import';

const CORE_IMPORT_SPECS = {
    units: UNITS_IMPORT,
    spells: SPELLS_IMPORT,
    'spell-groups': SPELL_GROUPS_IMPORT,
    races: RACES_IMPORT,
    feats: FEATS_IMPORT,
    careers: CAREERS_IMPORT,
    artifacts: ARTIFACTS_IMPORT,
} satisfies Partial<Record<ImportKind, ImportSpec>>;

export const IMPORT_SPECS = {
    ...CORE_IMPORT_SPECS,
    ...SYSTEM_IMPORT_SPECS,
} as Record<ImportKind, ImportSpec>;
