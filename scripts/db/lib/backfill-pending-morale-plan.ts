import '@/lib/utils/rules/systems/registry';
import {
    resetSceneState,
    upgradeSceneState,
} from '@/lib/utils/battle/scene-state';
import { isRecord } from '@/lib/utils/common/is-record';
import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { FALLBACK_SYSTEM_KEY } from '@/lib/utils/rules/systems/catalog';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

export interface PendingMoraleRow {
    id: string;
    version: number;
    pendingMoraleCheck: unknown;
    systemState: unknown;
}

export interface PendingMoraleChange {
    id: string;
    version: number;
    systemState: SystemSlot;
}

const RULES = defaultRulesFor({
    key: FALLBACK_SYSTEM_KEY,
    modules: ['morale'],
});

const slotOf = (raw: unknown): SystemSlot | undefined =>
    isRecord(raw) && typeof raw.key === 'string'
        ? { key: raw.key, data: raw.data }
        : undefined;

/** Effective pending state: a slot already on the new form wins over the legacy column */
export function hasPendingMorale(
    column: unknown,
    systemState: unknown
): boolean {
    const slot = slotOf(systemState);

    const effective =
        column === null
            ? slot
            : upgradeSceneState(RULES, slot, { pendingMoraleCheck: column });

    return !!effective && resetSceneState(RULES, effective) !== effective;
}

/** Rows whose legacy column holds a payload the scene slot does not carry yet; the rest are skipped */
export function planPendingMorale(rows: PendingMoraleRow[]): {
    changes: PendingMoraleChange[];
    skipped: string[];
} {
    const changes: PendingMoraleChange[] = [];

    const skipped: string[] = [];

    for (const row of rows) {
        if (row.pendingMoraleCheck === null) continue;

        const slot = slotOf(row.systemState);

        const legacy = { pendingMoraleCheck: row.pendingMoraleCheck };

        const next = upgradeSceneState(RULES, slot, legacy);

        // the key the composition itself writes; a slot of another system is never overwritten
        const ownKey = upgradeSceneState(RULES, undefined, legacy)?.key;

        if (slot && slot.key !== ownKey) {
            skipped.push(row.id);

            continue;
        }

        if (!next || next === slot) {
            skipped.push(row.id);

            continue;
        }

        changes.push({ id: row.id, version: row.version, systemState: next });
    }

    return { changes, skipped };
}
