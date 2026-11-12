import { composeServer } from './compose';
import type {
    SystemBattleOperation,
    SystemOperation,
    SystemServer,
    SystemToolNote,
} from './types';

import 'server-only';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';
import {
    type ModuleEntry,
    resolveSystem,
} from '@/lib/utils/rules/systems/resolve';
// <systems:generated>
import { ARTIFACTSETS_MODULE_SERVER } from "@/systems/artifactsets/server";
import { D20_MODULE_SERVER } from "@/systems/d20/server";
import { MORALE_MODULE_SERVER } from "@/systems/morale/server";
import { WFRP_MODULE_SERVER } from "@/systems/wfrp/server";
// </systems:generated>

export type { SystemSchemas, SystemServer } from './types';

export const MODULE_SERVER: Record<string, ModuleEntry<SystemServer>> = {
    // <systems:generated>
    artifactsets: ARTIFACTSETS_MODULE_SERVER,
    d20: D20_MODULE_SERVER,
    morale: MORALE_MODULE_SERVER,
    wfrp: WFRP_MODULE_SERVER,
    // </systems:generated>
};

const serverCache = new Map<string, SystemServer>();

const resolve = (system: Pick<Ruleset, 'system'>['system']): SystemServer =>
    resolveSystem(system, serverCache, {
        entries: MODULE_SERVER,
        optional: true,
        compose: composeServer,
    });

export const SYSTEM_SERVER: Readonly<Record<string, SystemServer>> =
    Object.fromEntries(RULE_SYSTEM_KEYS.map((key) => [key, resolve({ key })]));

export const systemServerOf = (
    rules: Pick<Ruleset, 'system'>
): SystemServer => {
    const { key, modules } = rules.system;

    if (!modules && Object.hasOwn(SYSTEM_SERVER, key))
        return SYSTEM_SERVER[key];

    return resolve(rules.system);
};

export const withSystemNotes = (base: string, tool: SystemToolNote): string => {
    const notes = Object.values(SYSTEM_SERVER).flatMap(
        (s) => s.ai?.toolNotes?.[tool] ?? []
    );

    return notes.length > 0 ? `${base} ${notes.join(' ')}` : base;
};

export function systemBattleOperation(
    name: string
): SystemBattleOperation | undefined {
    return Object.values(SYSTEM_SERVER).find(
        (s) => s.battle && Object.hasOwn(s.battle, name)
    )?.battle?.[name];
}

export const systemBattleOperationOf = (
    rules: Pick<Ruleset, 'system'>,
    name: string
): SystemBattleOperation | undefined => {
    const { battle } = systemServerOf(rules);

    return battle && Object.hasOwn(battle, name) ? battle[name] : undefined;
};

export function mergeSystemOperations<T>(
    core: Record<string, T>,
    pick: (op: SystemOperation) => T
): Record<string, T> {
    const merged = { ...core };

    const seen = new Map<string, SystemOperation>();

    for (const [key, op] of Object.values(SYSTEM_SERVER).flatMap((s) =>
        Object.entries(s.operations ?? {})
    )) {
        if (seen.get(key) === op) continue;

        if (Object.hasOwn(merged, key))
            throw new Error(`Duplicate character operation: ${key}`);

        seen.set(key, op);

        merged[key] = pick(op);
    }

    return merged;
}
