import {
    composition,
    moduleCatalog,
    PRESETS,
    type SystemSelection,
} from './catalog';
import { composeSystem } from './compose';
import { RULE_SYSTEM_KEYS } from './meta';
import { type ModuleEntry, resolveSystem } from './resolve';
import type { LevelResetPart, RuleSystemDefinition } from './types';

import { type Coin, COIN_VALUE } from '@/lib/constants/inventory';
import type { Ruleset } from '@/lib/utils/rules/schema';

type Entries = Readonly<Record<string, ModuleEntry<RuleSystemDefinition>>>;

export class SystemNotInstalledError extends Error {
    constructor(readonly key: string) {
        super(`Rule system is not installed: ${key}`);
        this.name = 'SystemNotInstalledError';
    }
}

let installed: Entries | undefined;

let systemCache = new Map<string, RuleSystemDefinition>();

let table: Record<string, RuleSystemDefinition> | undefined;

let levelResets: readonly LevelResetPart[] | undefined;

let conditionKeys: readonly string[] | undefined;

export function installModules(entries: Entries): void {
    if (
        installed &&
        Object.entries(entries).every(([id, e]) => installed?.[id] === e)
    )
        return;

    installed = installed ? { ...installed, ...entries } : entries;
    systemCache = new Map();
    table = undefined;
    levelResets = undefined;
    conditionKeys = undefined;
}

export function isInstalled(system: SystemSelection): boolean {
    if (!installed) return false;

    const { base, modules } = composition(system);

    const entries = installed;

    return [base, ...modules].every((id) => Object.hasOwn(entries, id));
}

const withKey = (
    definition: RuleSystemDefinition,
    key: string
): RuleSystemDefinition =>
    definition.key === key ? definition : { ...definition, key };

const resolve = (system: SystemSelection): RuleSystemDefinition => {
    if (!installed) throw new SystemNotInstalledError(system.key);

    return resolveSystem(system, systemCache, {
        entries: installed,
        compose: (base, addons) =>
            withKey(composeSystem(base, addons), system.key),
    });
};

const registryTable = (): Record<string, RuleSystemDefinition> =>
    (table ??= Object.fromEntries(
        RULE_SYSTEM_KEYS.filter((key) => isInstalled({ key })).map((key) => [
            key,
            resolve({ key }),
        ])
    ));

/** Reads the installed table on every access, so importing it before an install root has run is safe */
export const RULE_SYSTEM_REGISTRY: Record<string, RuleSystemDefinition> =
    new Proxy({} as Record<string, RuleSystemDefinition>, {
        get: (_, prop) => Reflect.get(registryTable(), prop),
        set: (_, prop, value) => Reflect.set(registryTable(), prop, value),
        has: (_, prop) => Reflect.has(registryTable(), prop),
        deleteProperty: (_, prop) =>
            Reflect.deleteProperty(registryTable(), prop),
        ownKeys: () => Reflect.ownKeys(registryTable()),
        getOwnPropertyDescriptor: (_, prop) =>
            Reflect.getOwnPropertyDescriptor(registryTable(), prop),
    });

/** Resets of every module regardless of the campaign composition: column integrity is not a game rule, a level-down must not leave stale data behind a switched-off module */
export function allLevelResets(): readonly LevelResetPart[] {
    levelResets ??= [
        ...new Set(
            Object.entries(PRESETS)
                .filter(([, { modules }]) => modules.length === 0)
                .flatMap(([key, { base }]) => {
                    const addons = moduleCatalog()
                        .addons.filter((a) => a.requires.includes(base))
                        .map((a) => a.id);

                    return (
                        resolve({ key, modules: addons }).progression
                            .levelResets ?? []
                    );
                })
        ),
    ];

    return levelResets;
}

/** Standard conditions of every installed base: for places with no campaign (template editor, labels) */
export function allConditionKeys(): readonly string[] {
    return (conditionKeys ??= [
        ...new Set(
            RULE_SYSTEM_KEYS.flatMap(
                (key) => ruleSystemByKey(key)?.conditionSet.keys ?? []
            )
        ),
    ]);
}

export const ruleSystemOf = (rules: {
    system: SystemSelection;
}): RuleSystemDefinition => {
    return resolve(rules.system);
};

export const systemKeyOf = (rules: Pick<Ruleset, 'system'>): string =>
    rules.system.key;

export const currencyValueOf = (
    rules: Pick<Ruleset, 'system'>
): Record<Coin, number> => ruleSystemOf(rules).currency?.value ?? COIN_VALUE;

/** Undefined for an unknown key or before an install root has run */
export const ruleSystemByKey = (
    key: string
): RuleSystemDefinition | undefined =>
    installed && RULE_SYSTEM_KEYS.includes(key) && isInstalled({ key })
        ? resolve({ key })
        : undefined;
