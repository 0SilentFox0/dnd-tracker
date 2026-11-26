'use client';

import type { ReactNode } from 'react';

import {
    HUD_CHIP_ACTIVE_CLASS,
    HUD_CHIP_CLASS,
} from '@/components/hud/page/HudChipTabs';
import { useRovingIndex } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export function HudSegmented<T extends string>({
    id,
    value,
    options,
    onValueChange,
    label,
    disabled,
}: {
    id: string;
    value: T | null;
    options: { value: T; label: ReactNode }[];
    onValueChange: (v: T) => void;
    label: string;
    disabled?: boolean;
}) {
    const selected = options.findIndex((o) => o.value === value);

    const roving = useRovingIndex({
        count: options.length,
        active: Math.max(selected, 0),
        loop: true,
        onMove: (i) => onValueChange(options[i].value),
    });

    return (
        <div
            id={id}
            role="radiogroup"
            aria-label={label}
            className="flex flex-wrap gap-1.5"
            onKeyDown={disabled ? undefined : roving.onKeyDown}
        >
            {options.map((o, i) => (
                <button
                    key={o.value}
                    id={`${id}-${o.value}`}
                    ref={roving.itemRef(i)}
                    type="button"
                    role="radio"
                    aria-checked={i === selected}
                    tabIndex={roving.tabIndex(i)}
                    disabled={disabled}
                    onClick={() => onValueChange(o.value)}
                    className={cn(
                        HUD_CHIP_CLASS,
                        'cursor-pointer disabled:pointer-events-none disabled:opacity-50',
                        i === selected && HUD_CHIP_ACTIVE_CLASS
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
