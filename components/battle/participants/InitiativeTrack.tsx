'use client';

import { memo, useRef } from 'react';

import { Portrait } from '@/components/battle/hud';
import { ROMAN_NUMERALS } from '@/lib/constants/spells';
import { useBattleSceneData, useInitiativeDrag } from '@/lib/hooks/battle';
import { useFlip } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { queueKeys } from '@/lib/utils/battle/view';

const roman = (n: number) => ROMAN_NUMERALS[n] ?? String(n);

export const InitiativeTrack = memo(function InitiativeTrack({
    onReorder,
}: {
    onReorder?: (order: string[]) => void;
}) {
    const {
        battle,
        turn: { queue },
        roster: { myParticipants },
        select,
    } = useBattleSceneData();

    const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

    const keys = queueKeys(queue);

    const track = useRef<HTMLDivElement>(null);

    useFlip(track, queue);

    const dragProps = useInitiativeDrag(
        (battle.initiativeOrder ?? []).map((p) => p.basicInfo.id),
        onReorder
    );

    return (
        <div
            ref={track}
            data-tour="battle.initiative"
            className="relative flex h-[72px] items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
            {queue.map((e, i) =>
                e.kind === 'round' ? (
                    <span
                        key="round"
                        data-flip="round"
                        className="relative mx-0.5 h-12 w-px shrink-0 bg-white/30"
                    >
                        <span className="hud-sc absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[11px] text-[var(--hud-muted)]">
                            {roman(e.round)}
                        </span>
                    </span>
                ) : (
                    <button
                        key={keys[i]}
                        data-flip={keys[i]}
                        type="button"
                        onClick={() => select(e.participant.basicInfo.id)}
                        className={cn(
                            'shrink-0',
                            dragProps && 'cursor-grab touch-none'
                        )}
                        {...dragProps?.(e.participant.basicInfo.id)}
                    >
                        <Portrait
                            fx="track"
                            key={e.current ? 'current' : 'queued'}
                            className={cn(
                                e.current && 'animate-[hud-turn_.6s_ease-out]'
                            )}
                            participant={e.participant}
                            size={e.current ? 52 : 36}
                            current={e.current}
                            me={
                                !e.current &&
                                mine.has(e.participant.basicInfo.id)
                            }
                            extra={e.kind === 'extra'}
                        />
                    </button>
                )
            )}
        </div>
    );
});
