import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { writeStoredColumn } from '@/lib/utils/rules/systems/stored-columns';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

interface MoraleRow {
    morale?: number | null;
    characteristics?: unknown;
}

export const storedMorale = (rules: Ruleset, row: MoraleRow): number =>
    ruleSystemOf(rules).combat.moraleStore?.stored(row) ??
    (typeof row.morale === 'number' ? row.morale : 0);

/** Update fields for a morale edit: the column and the stored ext value together, whatever the composition (readers prefer ext) */
export function moraleUpdate(
    system: RuleSystemDefinition,
    row: { characteristics?: unknown },
    value: number
): { morale: number; characteristics?: Record<string, unknown> } {
    const moduleWrite = system.combat.moraleStore?.store(row, value);

    if (moduleWrite) return moduleWrite;

    const characteristics = writeStoredColumn(row, 'morale', value);

    return characteristics
        ? { morale: value, characteristics }
        : { morale: value };
}
