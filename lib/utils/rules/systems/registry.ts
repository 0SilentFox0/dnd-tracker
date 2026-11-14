import { installModules } from './lookup';
import type { ModuleEntry } from './resolve';
import type { RuleSystemDefinition } from './types';

// <systems:generated>
import { ARTIFACTSETS_MODULE } from '@/systems/artifactsets';
import { D20_MODULE } from '@/systems/d20';
import { HEROSCALING_MODULE } from '@/systems/heroscaling';
import { MORALE_MODULE } from '@/systems/morale';
import { RETALIATION_MODULE } from '@/systems/retaliation';
import { SKILLTREES_MODULE } from '@/systems/skilltrees';
import { UNITSTACKS_MODULE } from '@/systems/unitstacks';
import { WFRP_MODULE } from '@/systems/wfrp';
// </systems:generated>

export const MODULES: Record<string, ModuleEntry<RuleSystemDefinition>> = {
    // <systems:generated>
    artifactsets: ARTIFACTSETS_MODULE,
    d20: D20_MODULE,
    heroscaling: HEROSCALING_MODULE,
    morale: MORALE_MODULE,
    retaliation: RETALIATION_MODULE,
    skilltrees: SKILLTREES_MODULE,
    unitstacks: UNITSTACKS_MODULE,
    wfrp: WFRP_MODULE,
    // </systems:generated>
};

installModules(MODULES);
