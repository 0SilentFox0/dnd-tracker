import type { OwnedFlagRows } from './effects/system-flag-row';
import type { SystemEffectRowInput } from './effects/system-row';

import type { AbilityVariables } from '@/lib/utils/abilities/engine/core/variables';

export interface AbilityModule {
    effectRows?: readonly SystemEffectRowInput[];
    moduleEffectRows?: readonly SystemEffectRowInput[];
    flagRows?: OwnedFlagRows['rows'];
    variables?: AbilityVariables;
}

const installed: Record<string, AbilityModule> = {};

const listeners: (() => void)[] = [];

export function installAbilityModules(
    entries: Readonly<Record<string, AbilityModule>>
): void {
    const fresh = Object.keys(entries).filter(
        (id) => installed[id] !== entries[id]
    );

    if (fresh.length === 0) return;

    Object.assign(installed, entries);
    listeners.forEach((listener) => listener());
}

/** Installed modules in id order, so the merged tables are stable across server and browser */
export const installedAbilityModules = (): [string, AbilityModule][] =>
    Object.keys(installed)
        .sort()
        .map((id) => [id, installed[id]]);

/** Runs now and after every install; derived tables are refilled in place so imported references stay valid */
export function onAbilityInstall(listener: () => void): void {
    listeners.push(listener);
    listener();
}
