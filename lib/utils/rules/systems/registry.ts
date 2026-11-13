import { moduleCatalog, PRESETS } from './catalog';
import { composeSystem } from './compose';
import { RULE_SYSTEM_KEYS } from './meta';
import { type ModuleEntry, resolveSystem } from './resolve';
import type { LevelResetPart, RuleSystemDefinition } from './types';

import { type Coin, COIN_VALUE } from '@/lib/constants/inventory';
import type { Ruleset } from '@/lib/utils/rules/schema';
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

const withKey = (
    definition: RuleSystemDefinition,
    key: string
): RuleSystemDefinition =>
    definition.key === key ? definition : { ...definition, key };

const systemCache = new Map<string, RuleSystemDefinition>();

const resolve = (
    system: Pick<Ruleset, 'system'>['system']
): RuleSystemDefinition =>
    resolveSystem(system, systemCache, {
        entries: MODULES,
        compose: (base, addons) =>
            withKey(composeSystem(base, addons), system.key),
    });

export const RULE_SYSTEM_REGISTRY: Record<string, RuleSystemDefinition> =
    Object.fromEntries(RULE_SYSTEM_KEYS.map((key) => [key, resolve({ key })]));

let levelResets: readonly LevelResetPart[] | undefined;

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

export const isEmptySystemData = (value: unknown): boolean =>
    Object.values(RULE_SYSTEM_REGISTRY).some((system) =>
        system.characteristics.isEmpty(value)
    );

export const ruleSystemOf = (
    rules: Pick<Ruleset, 'system'>
): RuleSystemDefinition => {
    const { key, modules } = rules.system;

    if (!modules && Object.hasOwn(RULE_SYSTEM_REGISTRY, key))
        return RULE_SYSTEM_REGISTRY[key];

    return resolve(rules.system);
};

export const systemKeyOf = (rules: Pick<Ruleset, 'system'>): string =>
    rules.system.key;

export const currencyValueOf = (
    rules: Pick<Ruleset, 'system'>
): Record<Coin, number> => ruleSystemOf(rules).currency?.value ?? COIN_VALUE;

export const ruleSystemByKey = (
    key: string
): RuleSystemDefinition | undefined =>
    Object.hasOwn(RULE_SYSTEM_REGISTRY, key)
        ? RULE_SYSTEM_REGISTRY[key]
        : undefined;
