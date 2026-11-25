'use client';

import { memo, useEffect, useRef } from 'react';

import { Portrait } from '@/components/battle/hud';
import { HudButton } from '@/components/hud';
import { ROMAN_NUMERALS } from '@/lib/constants/spells';
import { useBattleSceneData, useInitiativeDrag } from '@/lib/hooks/battle';
import { useFlip, useReducedMotion } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import { arcStyle, queueKeys } from '@/lib/utils/battle/view';

const roundDividerShift = (
    queue: { kind: string }[],
    i: number,
    current: number
) => {
    const [lo, hi] = i > current ? [current, i] : [i, current];

    const dividers = queue
        .slice(lo, hi)
        .filter((e) => e.kind === 'round').length;

    return i > current ? dividers : -dividers;
};

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

    const reduceMotion = useReducedMotion();

    useFlip(track, queue);

    const dragProps = useInitiativeDrag(
        (battle.initiativeOrder ?? []).map((p) => p.basicInfo.id),
        onReorder
    );

    const currentIndex = queue.findIndex((e) => e.kind !== 'round' && e.current);

    const currentKey = currentIndex < 0 ? null : keys[currentIndex];

    useEffect(() => {
        if (!currentKey) return;

        track.current
            ?.querySelector('[data-current]')
            ?.scrollIntoView?.({
                inline: 'center',
                block: 'nearest',
                behavior: reduceMotion ? 'auto' : 'smooth',
            });
    }, [currentKey, reduceMotion]);

    return (
        <div
            ref={track}
            data-tour="battle.initiative"
            onWheel={(e) => {
                if (e.deltaY && !e.shiftKey)
                    e.currentTarget.scrollLeft += e.deltaY;
            }}
            className="pointer-events-none relative flex h-[84px] items-end justify-start gap-1.5 overflow-x-auto overflow-y-hidden px-3 pb-6 *:pointer-events-auto sm:h-[100px] sm:pb-7 [scrollbar-width:none] *:first:ml-auto *:last:mr-auto"
        >
            {queue.map((e, i) => {
                if (e.kind === 'round')
                    return (
                        <span
                            key="round"
                            data-flip="round"
                            className="relative mx-0.5 mb-3 h-9 w-px shrink-0 bg-white/30"
                        >
                            <span className="hud-sc absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[11px] text-[var(--hud-muted)]">
                                {roman(e.round)}
                            </span>
                        </span>
                    );

                const d =
                    currentIndex < 0
                        ? 0
                        : i -
                          currentIndex -
                          roundDividerShift(queue, i, currentIndex);

                const arc = arcStyle(d);

                const near = Math.abs(d) <= 1;

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
                        <span
                            style={{
                                transform: `translateY(${arc.y}px) scale(${arc.scale})`,
                                opacity: arc.opacity,
                            }}
                            className="flex flex-col items-center gap-0.5 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none"
                        >
                            <Portrait
                                fx="track"
                                key={e.current ? 'current' : 'queued'}
                                className={cn(
                                    e.current && 'animate-[hud-turn_.6s_ease-out]'
                                )}
                                participant={e.participant}
                                size={e.current ? 48 : 32}
                                current={e.current}
                                me={
                                    !e.current &&
                                    mine.has(e.participant.basicInfo.id)
                                }
                                extra={e.kind === 'extra'}
                            />
                            {near && (
                                <small
                                    className={cn(
                                        'hud-sc max-w-14 truncate text-[10px] leading-none font-bold text-[#f3ead2] [text-shadow:0_1px_3px_#000,0_0_2px_#000]',
                                        !e.current && 'max-sm:hidden'
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
