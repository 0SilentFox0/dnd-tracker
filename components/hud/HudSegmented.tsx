'use client';

import { type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface HudSegmentedOption<T extends string> {
    value: T;
    label: ReactNode;
    ariaLabel?: string;
}

interface HudSegmentedProps<T extends string> {
    id: string;
    value: T | null;
    options: HudSegmentedOption<T>[];
    onValueChange: (value: T) => void;
    label: string;
    disabled?: boolean;
}

export function HudSegmented<T extends string>({
    id,
    value,
    options,
    onValueChange,
    label,
    disabled,
}: HudSegmentedProps<T>) {
    const selected = options.findIndex((option) => option.value === value);

    const tabbable = selected >= 0 ? selected : 0;

    function select(index: number) {
        const target = options[(index + options.length) % options.length];

        if (!target) return;

        onValueChange(target.value);
        document.getElementById(`${id}-${target.value}`)?.focus();
    }

    function onKeyDown(event: KeyboardEvent, index: number) {
        if (disabled) return;

        const next: Record<string, number> = {
            ArrowRight: index + 1,
            ArrowDown: index + 1,
            ArrowLeft: index - 1,
            ArrowUp: index - 1,
            Home: 0,
            End: options.length - 1,
        };

        if (!(event.key in next)) return;

        event.preventDefault();
        select(next[event.key]);
    }

    return (
        <div
            id={id}
            role="radiogroup"
            aria-label={label}
            className="inline-flex gap-1 rounded-lg border border-hud-line p-1"
        >
            {options.map((option, index) => {
                const checked = index === selected;

                return (
                    <button
                        key={option.value}
                        id={`${id}-${option.value}`}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={option.ariaLabel}
                        data-value={option.value}
                        disabled={disabled}
                        tabIndex={index === tabbable ? 0 : -1}
                        onClick={() => onValueChange(option.value)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                        className={cn(
                            'ds-interactive h-10 rounded-md px-3 text-sm text-hud-muted hover:text-hud-ink disabled:opacity-50 max-sm:h-11',
                            checked &&
                                'bg-hud-panel-2 text-hud-ink shadow-[inset_0_-2px_0_var(--hud-accent)]'
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
