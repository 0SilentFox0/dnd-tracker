import {
    installServerModules,
    systemServers,
    systemServerUnion,
} from './lookup';
import type { SystemServer } from './types';

import 'server-only';
import '@/lib/utils/rules/systems/registry';
import type { ModuleEntry } from '@/lib/utils/rules/systems/resolve';
// <systems:generated>
import { ARTIFACTSETS_MODULE_SERVER } from '@/systems/artifactsets/server';
import { D20_MODULE_SERVER } from '@/systems/d20/server';
import { MORALE_MODULE_SERVER } from '@/systems/morale/server';
import { SKILLTREES_MODULE_SERVER } from '@/systems/skilltrees/server';
import { WFRP_MODULE_SERVER } from '@/systems/wfrp/server';
// </systems:generated>

export * from './lookup';

export const MODULE_SERVER: Record<string, ModuleEntry<SystemServer>> = {
    // <systems:generated>
    artifactsets: ARTIFACTSETS_MODULE_SERVER,
    d20: D20_MODULE_SERVER,
    morale: MORALE_MODULE_SERVER,
    skilltrees: SKILLTREES_MODULE_SERVER,
    wfrp: WFRP_MODULE_SERVER,
    // </systems:generated>
};

installServerModules(MODULE_SERVER);

export const SYSTEM_SERVER = systemServers();

export const SYSTEM_SERVER_UNION = systemServerUnion();
