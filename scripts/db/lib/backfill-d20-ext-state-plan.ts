import { isRecord } from '@/lib/utils/common/is-record';
import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export interface ParticipantStateRow {
    id: string;
    state: unknown;
    /** The stored text, for the compare-and-set of the write */
    raw?: string;
}

export interface ParticipantStateChange {
    id: string;
    before: string;
    state: Record<string, unknown>;
}

const RULES = defaultRulesFor({ key: 'dnd5e' });

/** Rows whose stored `system` slot still has flat pre-ext fields; the upgrade hooks come from the composition, not from module imports */
export function planD20ExtState(rows: ParticipantStateRow[]): {
    changes: ParticipantStateChange[];
    unchanged: number;
} {
    const hooks = ruleSystemOf(RULES).participant?.upgradeState ?? [];

    const changes: ParticipantStateChange[] = [];

    for (const row of rows) {
        if (!isRecord(row.state)) continue;

        const battleData = row.state as unknown as BattleParticipant['battleData'];

        const next = hooks.reduce((acc, hook) => hook(acc), battleData);

        if (JSON.stringify(next) === JSON.stringify(battleData)) continue;

        changes.push({
            id: row.id,
            before: row.raw ?? JSON.stringify(row.state),
            state: next as unknown as Record<string, unknown>,
        });
    }

    return { changes, unchanged: rows.length - changes.length };
}
