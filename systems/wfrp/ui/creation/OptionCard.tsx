import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface OptionCardProps {
    selected: boolean;
    onSelect: () => void;
    children: ReactNode;
    disabled?: boolean;
}

export function OptionCard({
    selected,
    onSelect,
    children,
    disabled,
}: OptionCardProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                'min-h-11 w-full rounded-lg border px-3 py-2 text-left text-sm',
                selected ? 'border-hud-gold bg-hud-field' : 'border-hud-line'
            )}
        >
            {children}
        </button>
    );
}

interface ModeTabsProps<T extends string> {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}

export function ModeTabs<T extends string>({
    label,
    value,
    options,
    onChange,
}: ModeTabsProps<T>) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
            {options.map((o) => (
                <OptionCard
                    key={o.value}
                    selected={o.value === value}
                    onSelect={() => onChange(o.value)}
                >
                    {o.label}
                </OptionCard>
            ))}
        </div>
    );
}
