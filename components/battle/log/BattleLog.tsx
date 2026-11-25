'use client';

import { useMemo, useState } from 'react';

import { LogFilterBar } from './LogFilterBar';
import { LogTimeline } from './LogTimeline';

import { BattleLogLoadEarlier } from '@/components/battle/log/BattleLogLoadEarlier';
import { useBattleRules, useBattleScene } from '@/lib/hooks/battle';
import {
    filterLog,
    type LogFilter,
    sanitizeLogEntry,
} from '@/lib/utils/battle/view';

export function BattleLog() {
    const { battle, viewer, log } = useBattleScene();

    const { hpTerm } = useBattleRules();

    const [filter, setFilter] = useState<LogFilter>('all');

    const { battleLog, initiativeOrder, rules } = battle;

    const entries = useMemo(
        () =>
            [...(battleLog ?? [])].reverse().map((e) =>
                sanitizeLogEntry(e, viewer, {
                    participants: initiativeOrder,
                    rules,
                })
            ),
        [battleLog, viewer, initiativeOrder, rules]
    );

    const shown = useMemo(() => filterLog(entries, filter), [entries, filter]);

    return (
        <>
            <LogFilterBar value={filter} onChange={setFilter} />
            <LogTimeline
                entries={shown}
                participants={initiativeOrder}
                focus={log.focus}
                wounds={hpTerm === 'wounds'}
            />
            <BattleLogLoadEarlier />
        </>
    );
}
