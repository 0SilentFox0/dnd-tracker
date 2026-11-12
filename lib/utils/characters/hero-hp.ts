import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { TextRef } from '@/types/choices';
import type { ResolvedClassEntry } from '@/types/classes';

export interface HpBreakdownLine {
    label: string;
    params?: TextRef['params'];
}

export function characterBaseHp(
    c: { level: number; constitution: number; archetype?: string | null },
    opts: {
        entries?: ResolvedClassEntry[] | null;
        rules: Ruleset;
        characteristics?: unknown;
    }
): { total: number; breakdown: HpBreakdownLine[] } {
    return ruleSystemOf(opts.rules).progression.maxHp({
        character: c,
        entries: opts.entries,
        characteristics: opts.characteristics,
        rules: opts.rules,
    });
}
