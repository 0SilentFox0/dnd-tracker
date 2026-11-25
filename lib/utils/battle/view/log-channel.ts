import type { BattleAction } from '@/types/battle-actions';

export type LogFilter = 'all' | 'battle' | 'system';

export const LOG_FILTERS: readonly LogFilter[] = ['all', 'battle', 'system'];

type Entry = Pick<BattleAction, 'actionType' | 'actionDetails'>;

export function logChannel(e: Entry): 'battle' | 'system' {
    const d = e.actionDetails;

    return e.actionType === 'end_turn' ||
        e.actionType === 'skip_turn' ||
        d?.battleResult ||
        d?.mazeEvent ||
        d?.hazard
        ? 'system'
        : 'battle';
}

export function filterLog<T extends Entry>(entries: T[], filter: LogFilter): T[] {
    return filter === 'all'
        ? entries
        : entries.filter((e) => logChannel(e) === filter);
}
