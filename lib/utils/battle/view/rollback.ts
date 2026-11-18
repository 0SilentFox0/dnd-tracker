import {
    BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE,
    BattleStatus,
} from '@/lib/constants/battle';
import type { BattleScene } from '@/types/api';
import type { BattleAction } from '@/types/battle-actions';

export function canRollbackEntry(
    battle: Pick<BattleScene, 'status' | 'battleLog'>,
    entry: BattleAction
): boolean {
    if (entry.isCancelled) return false;

    if (battle.status !== BattleStatus.COMPLETED) return true;

    const active = (battle.battleLog ?? [])
        .filter((e) => !e.isCancelled)
        .map((e) => e.actionIndex)
        .sort((a, b) => b - a);

    const oldestKept =
        active[BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE - 1] ?? -Infinity;

    return entry.actionIndex >= oldestKept;
}
