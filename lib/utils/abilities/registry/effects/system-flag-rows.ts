import type { FlagDefinition } from './flag-kit';
import type { OwnedFlagRows } from './system-flag-row';

import type { FlagKey } from '@/lib/utils/abilities/schema';
// <systems:generated>
import { D20_FLAG_ROWS } from "@/systems/d20/rules/ability-flag-rows";
import { MORALE_FLAG_ROWS } from "@/systems/morale/rules/ability-flag-rows";
import { RETALIATION_FLAG_ROWS } from "@/systems/retaliation/rules/ability-flag-rows";
// </systems:generated>

const ownedFlags = (
    system: string,
    rows: OwnedFlagRows['rows']
): OwnedFlagRows => ({ system, rows });

const SYSTEM_FLAG_ROW_LISTS: readonly OwnedFlagRows[] = [
    // <systems:generated>
    ownedFlags("d20", D20_FLAG_ROWS),
    ownedFlags("morale", MORALE_FLAG_ROWS),
    ownedFlags("retaliation", RETALIATION_FLAG_ROWS),
    // </systems:generated>
];

const entries = SYSTEM_FLAG_ROW_LISTS.flatMap(({ system, rows }) =>
    Object.entries(rows).map(([flag, row]) => ({
        flag: flag as FlagKey,
        system,
        row: row as FlagDefinition<FlagKey>,
    }))
);

export const SYSTEM_FLAG_ROWS = Object.fromEntries(
    entries.map((e) => [e.flag, e.row])
) as { [K in FlagKey]?: FlagDefinition<K> };

export const SYSTEM_FLAG_OWNERS: Readonly<Record<string, string>> =
    Object.fromEntries(entries.map((e) => [e.flag, e.system]));
