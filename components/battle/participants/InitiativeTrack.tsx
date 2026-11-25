'use client';

import { memo, useEffect, useMemo, useRef } from 'react';

import { Portrait } from '@/components/battle/hud';
import { HudButton } from '@/components/hud';
import { useBattleSceneData, useInitiativeDrag } from '@/lib/hooks/battle';
import { useFlip, useReducedMotion } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { currentRoundQueue, queueKeys } from '@/lib/utils/battle/view';

export const InitiativeTrack = memo(function InitiativeTrack({
    onReorder,
    compact = false,
    vertical = false,
}: {
    onReorder?: (order: string[]) => void;
    compact?: boolean;
    vertical?: boolean;
}) {
    const {
        battle,
        turn: { queue: fullQueue },
        roster: { myParticipants },
        select,
    } = useBattleSceneData();

    const queue = useMemo(() => currentRoundQueue(fullQueue), [fullQueue]);

    const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

    const keys = queueKeys(queue);

    const track = useRef<HTMLDivElement>(null);

    const reduceMotion = useReducedMotion();

    useFlip(track, queue);

    const dragProps = useInitiativeDrag(
        (battle.initiativeOrder ?? []).map((p) => p.basicInfo.id),
        onReorder
    );

    const currentIndex = queue.findIndex(
        (e) => e.kind !== 'round' && e.current
    );

    const currentKey = currentIndex < 0 ? null : keys[currentIndex];

    const placed = useRef(false);

    useEffect(() => {
        if (!currentKey) return;

        const first = !placed.current;

        placed.current = true;

        track.current?.querySelector('[data-current]')?.scrollIntoView?.({
            inline: vertical ? 'nearest' : 'center',
            block: vertical ? 'center' : 'nearest',
            behavior: reduceMotion || first ? 'auto' : 'smooth',
        });
    }, [currentKey, reduceMotion, vertical]);

    return (
        <div
            ref={track}
            data-tour="battle.initiative"
            onWheel={(e) => {
                if (e.deltaY && !e.shiftKey && !vertical)
                    e.currentTarget.scrollLeft += e.deltaY;
            }}
            className={cn(
                'pointer-events-auto relative flex [scrollbar-width:none]',
                vertical
                    ? 'max-h-full w-fit flex-col items-center gap-1 overflow-x-hidden overflow-y-auto px-0.5 py-1'
                    : 'w-full items-center overflow-x-auto overflow-y-hidden',
                !vertical &&
                    (compact ? 'gap-1 px-1.5 py-0.5' : 'gap-2 px-3 py-1.5')
            )}
        >
            {queue.map((e, i) => {
                if (e.kind === 'round') return null;

                return (
                    <HudButton
                        key={keys[i]}
                        data-flip={keys[i]}
                        data-current={e.current ? '' : undefined}
                        type="button"
                        onClick={() => select(e.participant.basicInfo.id)}
                        className={cn(
                            'shrink-0',
                            dragProps && 'cursor-grab touch-none'
                        )}
                        {...dragProps?.(e.participant.basicInfo.id)}
                    >
                        <span className="flex flex-col items-center gap-0.5">
                            <Portrait
                                fx="track"
                                key={e.current ? 'current' : 'queued'}
                                className={cn(
                                    e.current &&
                                        'animate-[hud-turn_.6s_ease-out]'
                                )}
                                participant={e.participant}
                                size={
                                    compact
                                        ? e.current
                                            ? 24
                                            : 19
                                        : e.current
                                          ? 48
                                          : 38
                                }
                                current={e.current}
                                me={
                                    !e.current &&
                                    mine.has(e.participant.basicInfo.id)
                                }
                                extra={e.kind === 'extra'}
                            />
                            {e.current && (
                                <small
                                    className={cn(
                                        'hud-sc truncate leading-none font-bold text-[#f3ead2] [text-shadow:0_1px_3px_#000,0_0_2px_#000]',
                                        compact
                                            ? 'max-w-10 text-[7px]'
                                            : 'max-w-20 text-[10px]'
                                    )}
                                >
                                    {e.participant.basicInfo.name}
                                </small>
                            )}
                        </span>
                    </HudButton>
                );
            })}
        </div>
    );
});
