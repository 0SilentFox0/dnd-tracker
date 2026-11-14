import { composeUi } from './compose';
import type { SystemUi } from './types';

import {
    composition,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';
import { SystemNotInstalledError } from '@/lib/utils/rules/systems/lookup';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';
import {
    type ModuleEntry,
    resolveSystem,
} from '@/lib/utils/rules/systems/resolve';

type Entries = Readonly<Record<string, ModuleEntry<SystemUi>>>;

let installed: Entries | undefined;

let uiCache = new Map<string, SystemUi>();

let table: Record<string, SystemUi> | undefined;

export function installUiModules(entries: Entries): void {
    if (installed === entries) return;

    installed = entries;
    uiCache = new Map();
    table = undefined;
}

/** Only the base is required: addons without a ui layer contribute nothing */
export function isUiInstalled(system: SystemSelection): boolean {
    if (!installed) return false;

    return Object.hasOwn(installed, composition(system).base);
}

const resolve = (key: string, modules?: readonly string[]): SystemUi => {
    if (!installed) throw new SystemNotInstalledError(key);

    return resolveSystem({ key, modules }, uiCache, {
        entries: installed,
        optional: true,
        compose: composeUi,
    });
};

const uiTable = (): Record<string, SystemUi> =>
    (table ??= Object.fromEntries(
        RULE_SYSTEM_KEYS.map((key) => [key, resolve(key)])
    ));

/** Reads the installed table on every access, so importing it before an install is safe */
export const SYSTEM_UI: Record<string, SystemUi> = new Proxy(
    {} as Record<string, SystemUi>,
    {
        get: (_, prop) => Reflect.get(uiTable(), prop),
        has: (_, prop) => Reflect.has(uiTable(), prop),
        ownKeys: () => Reflect.ownKeys(uiTable()),
        getOwnPropertyDescriptor: (_, prop) =>
            Reflect.getOwnPropertyDescriptor(uiTable(), prop),
    }
);

export const systemUiOf = (
    key: string,
    modules?: readonly string[]
): SystemUi => {
    if (!modules && RULE_SYSTEM_KEYS.includes(key)) return uiTable()[key];

    return resolve(key, modules);
};

/** Undefined for an unknown key or before an install */
export const systemUiByKey = (key: string): SystemUi | undefined =>
    installed && RULE_SYSTEM_KEYS.includes(key) ? uiTable()[key] : undefined;
