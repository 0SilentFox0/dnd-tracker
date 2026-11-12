import type { RuleSystemDefinition } from './types';

import {
    CHARACTER_SYSTEM_COLUMNS,
    type CharacterSystemColumn,
} from '@/lib/constants/stat-columns';
import type { Ruleset } from '@/lib/utils/rules/schema';

export const statColumnsOf = (
    def: RuleSystemDefinition
): ReadonlySet<CharacterSystemColumn> =>
    new Set((def.stats?.columns ?? []).flatMap((part) => part.owns));

export const foreignColumnsOf = (
    def: RuleSystemDefinition
): CharacterSystemColumn[] => {
    const owned = statColumnsOf(def);

    return CHARACTER_SYSTEM_COLUMNS.filter((column) => !owned.has(column));
};

export const statColumnFillOf = (
    def: RuleSystemDefinition,
    rules: Ruleset
): Partial<Record<CharacterSystemColumn, unknown>> =>
    Object.assign(
        {},
        ...(def.stats?.columns ?? []).map((part) => part.fill?.(rules))
    );
