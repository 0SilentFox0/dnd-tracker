'use client';

import type { KeyboardEvent } from 'react';

import { HudButton } from '@/components/hud';
import { ALIGNMENTS } from '@/lib/constants/alignment';
import { useAlignmentLabel } from '@/lib/hooks/characters';
import { cn } from '@/lib/utils';

interface AlignmentGridProps {
    id: string;
    value: string | null;
    onChange: (value: string | null) => void;
    allowNone?: boolean;
    noneLabel?: string;
}

const COLUMNS = 3;

const CELL =
    'flex min-h-11 items-center justify-center rounded-lg border border-hud-line text-sm text-hud-muted hover:text-hud-ink focus-visible:ring-2 focus-visible:outline-none lg:min-h-9';

const CHECKED = 'border-hud-accent bg-hud-panel-2 text-hud-ink';

export function AlignmentGrid({
    id,
    value,
    onChange,
    allowNone = false,
    noneLabel,
}: AlignmentGridProps) {
    const label = useAlignmentLabel();

    const count = ALIGNMENTS.length + (allowNone ? 1 : 0);

    const known = ALIGNMENTS.findIndex((a) => a === value);

    const selected = known >= 0 ? known : value ? -1 : allowNone ? count - 1 : -1;

    const tabbable = selected >= 0 ? selected : 0;

    const pick = (index: number) => {
        onChange(ALIGNMENTS[index] ?? null);
        document.getElementById(`${id}-${index}`)?.focus();
    };

    const onKeyDown = (event: KeyboardEvent, index: number) => {
        const target =
            {
                ArrowRight: index + 1,
                ArrowLeft: index - 1,
                ArrowDown: index + COLUMNS,
                ArrowUp: index - COLUMNS,
            }[event.key] ?? null;

        if (target === null) return;

        event.preventDefault();

        if (target >= 0 && target < count) pick(target);
    };

    return (
        <div
            id={id}
            role="radiogroup"
            aria-labelledby={`${id}-label`}
            className="grid gap-2"
        >
            <div className="grid grid-cols-3 gap-1.5">
                {ALIGNMENTS.map((alignment, index) => (
                    <HudButton
                        key={alignment}
                        id={`${id}-${index}`}
                        role="radio"
                        aria-checked={index === selected}
                        aria-label={label(alignment)}
                        title={label(alignment)}
                        tabIndex={index === tabbable ? 0 : -1}
                        onClick={() => onChange(alignment)}
                        onKeyDown={(e) => onKeyDown(e, index)}
                        className={cn(CELL, index === selected && CHECKED)}
                    >
                        {label(alignment, 'short')}
                    </HudButton>
                ))}
            </div>
            {allowNone && (
                <HudButton
                    id={`${id}-${ALIGNMENTS.length}`}
                    role="radio"
                    aria-checked={selected === count - 1}
                    tabIndex={tabbable === count - 1 ? 0 : -1}
                    onClick={() => onChange(null)}
                    onKeyDown={(e) => onKeyDown(e, count - 1)}
                    className={cn(
                        CELL,
                        selected === count - 1 && CHECKED
                    )}
                >
                    {noneLabel}
                </HudButton>
            )}
            {value && known < 0 && (
                <p className="text-xs text-hud-muted">{value}</p>
            )}
        </div>
    );
}
