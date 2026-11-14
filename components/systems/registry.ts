import { installUiModules } from './lookup';
import type { SystemUi } from './types';

import type { ModuleEntry } from '@/lib/utils/rules/systems/resolve';
// <systems:generated>
import { ARTIFACTSETS_MODULE_UI } from '@/systems/artifactsets/ui';
import { D20_MODULE_UI } from '@/systems/d20/ui';
import { DEATHSAVES_MODULE_UI } from '@/systems/deathsaves/ui';
import { HEROSCALING_MODULE_UI } from '@/systems/heroscaling/ui';
import { MORALE_MODULE_UI } from '@/systems/morale/ui';
import { RETALIATION_MODULE_UI } from '@/systems/retaliation/ui';
import { SKILLTREES_MODULE_UI } from '@/systems/skilltrees/ui';
import { WFRP_MODULE_UI } from '@/systems/wfrp/ui';
// </systems:generated>

export const MODULE_UI: Record<string, ModuleEntry<SystemUi>> = {
    // <systems:generated>
    artifactsets: ARTIFACTSETS_MODULE_UI,
    d20: D20_MODULE_UI,
    deathsaves: DEATHSAVES_MODULE_UI,
    heroscaling: HEROSCALING_MODULE_UI,
    morale: MORALE_MODULE_UI,
    retaliation: RETALIATION_MODULE_UI,
    skilltrees: SKILLTREES_MODULE_UI,
    wfrp: WFRP_MODULE_UI,
    // </systems:generated>
};

installUiModules(MODULE_UI);

export { SYSTEM_UI, systemUiByKey, systemUiOf } from './lookup';
