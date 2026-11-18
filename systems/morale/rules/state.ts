import type { PendingMoraleCheckPayload } from './threshold';

import { isRecord } from '@/lib/utils/common/is-record';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    SceneStateReset,
    SceneStateUpgrade,
} from '@/lib/utils/rules/systems/types';
import { D20_SCENE } from '@/systems/d20/rules/scene-state';

interface MoraleSceneState {
    pending: PendingMoraleCheckPayload | null;
}

const parsePayload = (raw: unknown): PendingMoraleCheckPayload | null =>
    isRecord(raw) &&
    typeof raw.participantId === 'string' &&
    isRecord(raw.moraleResult)
        ? (raw as unknown as PendingMoraleCheckPayload)
        : null;

/** `pending: null` marks a scene already moved off the legacy column */
export const MORALE_SCENE = D20_SCENE.extend<MoraleSceneState>(
    'morale',
    (raw) =>
        isRecord(raw) && 'pending' in raw
            ? { pending: parsePayload(raw.pending) }
            : undefined
);

export const pendingMoraleOf = (
    slot: SystemSlot | undefined
): PendingMoraleCheckPayload | null => MORALE_SCENE.read(slot)?.pending ?? null;

/** An empty value is never written into a slot that has none */
export function withPendingMorale(
    slot: SystemSlot | undefined,
    pending: PendingMoraleCheckPayload | null
): SystemSlot | undefined {
    if (!pending && !pendingMoraleOf(slot)) return slot;

    return MORALE_SCENE.write({ pending }, slot);
}

export const resetPendingMorale: SceneStateReset = (slot) =>
    withPendingMorale(slot, null);

export const upgradePendingMorale: SceneStateUpgrade = (slot, legacy) => {
    if (MORALE_SCENE.read(slot)) return slot;

    const pending = parsePayload(legacy.pendingMoraleCheck);

    return pending ? withPendingMorale(slot, pending) : slot;
};
