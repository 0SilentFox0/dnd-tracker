import { composeServer } from './compose';
import type { SystemContentServer } from './content-types';
import type {
    ContentKindServer,
    ContentRefSource,
    SystemBattleOperation,
    SystemOperation,
    SystemServer,
    SystemToolNote,
} from './types';

import 'server-only';
import { stableStringify } from '@/lib/utils/battle/store/stable-json';
import type { Ruleset } from '@/lib/utils/rules/schema';
import {
    kindOf,
    PRESETS,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';
import { SystemNotInstalledError } from '@/lib/utils/rules/systems/lookup';
import {
    RULE_SYSTEM_KEYS,
    SYSTEM_META,
    type SystemMeta,
} from '@/lib/utils/rules/systems/meta';
import {
    type ModuleEntry,
    resolveSystem,
} from '@/lib/utils/rules/systems/resolve';

export type { SystemSchemas, SystemServer } from './types';
export { SystemNotInstalledError };

const installed: Record<string, ModuleEntry<SystemServer>> = {};

const serverCache = new Map<string, SystemServer>();

let all: Readonly<Record<string, SystemServer>> | undefined;

let union: Readonly<Record<string, SystemServer>> | undefined;

export function installServerModules(
    entries: Readonly<Record<string, ModuleEntry<SystemServer>>>
): void {
    const fresh = Object.keys(entries).filter(
        (id) => installed[id] !== entries[id]
    );

    if (fresh.length === 0) return;

    Object.assign(installed, entries);
    serverCache.clear();
    all = undefined;
    union = undefined;
}

export const isServerInstalled = (system: SystemSelection): boolean =>
    Object.hasOwn(PRESETS, system.key) &&
    Object.hasOwn(installed, PRESETS[system.key].base);

const resolve = (system: SystemSelection): SystemServer => {
    if (Object.hasOwn(PRESETS, system.key) && !isServerInstalled(system))
        throw new SystemNotInstalledError(system.key);

    return resolveSystem(system, serverCache, {
        entries: installed,
        optional: true,
        compose: composeServer,
    });
};

export const systemServers = (): Readonly<Record<string, SystemServer>> =>
    (all ??= Object.fromEntries(
        RULE_SYSTEM_KEYS.map((key) => [key, resolve({ key })])
    ));

/** Per base: the base plus every addon that requires it, keyed by the base's bare preset key */
export const systemServerUnion = (): Readonly<Record<string, SystemServer>> =>
    (union ??= Object.fromEntries(
        (SYSTEM_META as readonly SystemMeta[])
            .filter((meta) => kindOf(meta) === 'base')
            .map((base) => [
                base.keys[0],
                resolve({
                    key: base.keys[0],
                    modules: (SYSTEM_META as readonly SystemMeta[])
                        .filter(
                            (m) =>
                                kindOf(m) === 'addon' &&
                                m.requires?.includes(base.module)
                        )
                        .map((m) => m.module),
                }),
            ])
    ));

const unionServers = (): SystemServer[] => Object.values(systemServerUnion());

export const systemContentKinds = (): Record<string, ContentKindServer> =>
    Object.assign({}, ...unionServers().map((s) => s.contentKinds ?? {}));

/** One dictionary of the content contributions of every installed module, whatever the campaign composition (kind gating stays with the caller) */
export const systemContent = <
    K extends keyof Omit<SystemContentServer, 'template'>,
>(
    key: K
): NonNullable<SystemContentServer[K]> =>
    Object.assign(
        {},
        ...unionServers().map((s) => s.content?.[key] ?? {})
    ) as NonNullable<SystemContentServer[K]>;

export const systemTemplateHooks = <
    K extends keyof NonNullable<SystemContentServer['template']>,
>(
    key: K
): NonNullable<NonNullable<SystemContentServer['template']>[K]> =>
    Object.assign(
        {},
        ...unionServers().map((s) => s.content?.template?.[key] ?? {})
    ) as NonNullable<NonNullable<SystemContentServer['template']>[K]>;

export const systemContentRefs = (): ContentRefSource[] =>
    unionServers().flatMap((s) => s.contentRefs ?? []);

export const systemServerOf = (
    rules: Pick<Ruleset, 'system'>
): SystemServer => {
    return resolve(rules.system);
};

export const operationInComposition = (
    rules: Pick<Ruleset, 'system'>,
    name: string
): boolean => Object.hasOwn(systemServerOf(rules).operations ?? {}, name);

export const withSystemNotes = (base: string, tool: SystemToolNote): string => {
    const notes = unionServers().flatMap((s) => s.ai?.toolNotes?.[tool] ?? []);

    return notes.length > 0 ? `${base} ${notes.join(' ')}` : base;
};

export function indexBattleOperations(
    servers: readonly SystemServer[]
): ReadonlyMap<string, SystemBattleOperation> {
    const index = new Map<string, SystemBattleOperation>();

    for (const [name, op] of servers.flatMap((s) =>
        Object.entries(s.battle ?? {})
    )) {
        const known = index.get(name);

        if (!known) index.set(name, op);
        else if (
            known !== op &&
            stableStringify(known.settings) !== stableStringify(op.settings)
        )
            throw new Error(`Duplicate battle operation: ${name}`);
    }

    return index;
}

let battleOperations: ReadonlyMap<string, SystemBattleOperation> | undefined;

export function systemBattleOperation(
    name: string
): SystemBattleOperation | undefined {
    battleOperations ??= indexBattleOperations(unionServers());

    return battleOperations.get(name);
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
    pick: (op: SystemOperation, key: string) => T
): Record<string, T> {
    const merged = { ...core };

    for (const [key, op] of unionServers().flatMap((s) =>
        Object.entries(s.operations ?? {})
    )) {
        if (Object.hasOwn(merged, key))
            throw new Error(`Duplicate character operation: ${key}`);

        merged[key] = pick(op, key);
    }

    return merged;
}
