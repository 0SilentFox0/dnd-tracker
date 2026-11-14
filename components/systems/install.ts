import { installUiModules, isUiInstalled } from './lookup';
import type { SystemUi } from './types';

import {
    type AbilityModule,
    installAbilityModules,
} from '@/lib/utils/abilities/registry/install';
import {
    composition,
    moduleMetaOf,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';
import { installModules, isInstalled } from '@/lib/utils/rules/systems/lookup';
import { setSystemPreloader } from '@/lib/utils/rules/systems/preload';
import type { ModuleEntry } from '@/lib/utils/rules/systems/resolve';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

interface Loader {
    rules: () => Promise<ModuleEntry<RuleSystemDefinition>>;
    ui?: () => Promise<ModuleEntry<SystemUi>>;
    ability?: () => Promise<AbilityModule>;
}

export const LOADERS: Record<string, Loader> = {
    // <systems:generated>
    artifactsets: {
        rules: () =>
            import('@/systems/artifactsets').then((m) => m.ARTIFACTSETS_MODULE),
        ui: () =>
            import('@/systems/artifactsets/ui').then(
                (m) => m.ARTIFACTSETS_MODULE_UI
            ),
    },
    d20: {
        rules: () => import('@/systems/d20').then((m) => m.D20_MODULE),
        ui: () => import('@/systems/d20/ui').then((m) => m.D20_MODULE_UI),
        ability: () =>
            import('@/systems/d20/rules/ability-install').then(
                (m) => m.D20_ABILITY_MODULE
            ),
    },
    heroscaling: {
        rules: () =>
            import('@/systems/heroscaling').then((m) => m.HEROSCALING_MODULE),
        ui: () =>
            import('@/systems/heroscaling/ui').then(
                (m) => m.HEROSCALING_MODULE_UI
            ),
    },
    morale: {
        rules: () => import('@/systems/morale').then((m) => m.MORALE_MODULE),
        ui: () => import('@/systems/morale/ui').then((m) => m.MORALE_MODULE_UI),
        ability: () =>
            import('@/systems/morale/rules/ability-install').then(
                (m) => m.MORALE_ABILITY_MODULE
            ),
    },
    retaliation: {
        rules: () =>
            import('@/systems/retaliation').then((m) => m.RETALIATION_MODULE),
        ui: () =>
            import('@/systems/retaliation/ui').then(
                (m) => m.RETALIATION_MODULE_UI
            ),
        ability: () =>
            import('@/systems/retaliation/rules/ability-install').then(
                (m) => m.RETALIATION_ABILITY_MODULE
            ),
    },
    skilltrees: {
        rules: () =>
            import('@/systems/skilltrees').then((m) => m.SKILLTREES_MODULE),
        ui: () =>
            import('@/systems/skilltrees/ui').then(
                (m) => m.SKILLTREES_MODULE_UI
            ),
    },
    unitstacks: {
        rules: () =>
            import('@/systems/unitstacks').then((m) => m.UNITSTACKS_MODULE),
    },
    wfrp: {
        rules: () => import('@/systems/wfrp').then((m) => m.WFRP_MODULE),
        ui: () => import('@/systems/wfrp/ui').then((m) => m.WFRP_MODULE_UI),
        ability: () =>
            import('@/systems/wfrp/rules/ability-install').then(
                (m) => m.WFRP_ABILITY_MODULE
            ),
    },
    // </systems:generated>
};

const rulesLoaded: Record<string, ModuleEntry<RuleSystemDefinition>> = {};

const uiLoaded: Record<string, ModuleEntry<SystemUi>> = {};

const abilityLoaded: Record<string, AbilityModule> = {};

const pending = new Map<string, Promise<void>>();

const listeners = new Set<() => void>();

export const isSystemReady = (system: SystemSelection): boolean =>
    isInstalled(system) && isUiInstalled(system);

export function subscribeSystems(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

/** The base, its addons and everything they `requires`, in dependency-first order */
export function moduleIdsOf(system: SystemSelection): string[] {
    const { base, modules } = composition(system);

    const ids = new Set<string>();

    const visit = (id: string) => {
        if (ids.has(id)) return;

        ids.add(id);
        moduleMetaOf(id)?.requires?.forEach(visit);
    };

    [base, ...modules].forEach(visit);

    return [...ids];
}

const cacheKey = (system: SystemSelection): string => {
    const { base, modules } = composition(system);

    return [base, ...modules].join('+');
};

async function load(system: SystemSelection): Promise<void> {
    const ids = moduleIdsOf(system).filter((id) => Object.hasOwn(LOADERS, id));

    await Promise.all(
        ids.map(async (id) => {
            const { rules, ui, ability } = LOADERS[id];

            const [r, u, a] = await Promise.all([rules(), ui?.(), ability?.()]);

            rulesLoaded[id] = r;

            if (u) uiLoaded[id] = u;

            if (a) abilityLoaded[id] = a;
        })
    );

    installAbilityModules({ ...abilityLoaded });
    installModules({ ...rulesLoaded });
    installUiModules({ ...uiLoaded });
    listeners.forEach((l) => l());
}

/** Idempotent; retries once (a chunk fetch can fail transiently), and a failed load is forgotten so the next call retries */
export function loadSystems(system: SystemSelection): Promise<void> {
    if (isSystemReady(system)) return Promise.resolve();

    const key = cacheKey(system);

    const hit = pending.get(key);

    if (hit) return hit;

    const started = load(system)
        .catch(() => load(system))
        .finally(() => pending.delete(key));

    pending.set(key, started);

    return started;
}

setSystemPreloader(loadSystems);
