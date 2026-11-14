import { installModules } from './lookup';
import type { ModuleEntry } from './resolve';
import type { RuleSystemDefinition } from './types';

import {
    type AbilityModule,
    installAbilityModules,
} from '@/lib/utils/abilities/registry/install';
// <systems:generated>
import { ARTIFACTSETS_MODULE } from '@/systems/artifactsets';
import { D20_MODULE } from '@/systems/d20';
import { D20_ABILITY_MODULE } from '@/systems/d20/rules/ability-install';
import { HEROSCALING_MODULE } from '@/systems/heroscaling';
import { MORALE_MODULE } from '@/systems/morale';
import { MORALE_ABILITY_MODULE } from '@/systems/morale/rules/ability-install';
import { RETALIATION_MODULE } from '@/systems/retaliation';
import { RETALIATION_ABILITY_MODULE } from '@/systems/retaliation/rules/ability-install';
import { SKILLTREES_MODULE } from '@/systems/skilltrees';
import { UNITSTACKS_MODULE } from '@/systems/unitstacks';
import { WFRP_MODULE } from '@/systems/wfrp';
import { WFRP_ABILITY_MODULE } from '@/systems/wfrp/rules/ability-install';
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

export const ABILITY_MODULES: Record<string, AbilityModule> = {
    // <systems:generated>
    d20: D20_ABILITY_MODULE,
    morale: MORALE_ABILITY_MODULE,
    retaliation: RETALIATION_ABILITY_MODULE,
    wfrp: WFRP_ABILITY_MODULE,
    // </systems:generated>
};

installModules(MODULES);
installAbilityModules(ABILITY_MODULES);
