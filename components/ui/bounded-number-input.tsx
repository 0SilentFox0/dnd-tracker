'use client';

import { type ComponentProps, useState } from 'react';

import { Input } from '@/components/ui/input';

type BoundedNumberInputProps = Omit<
    ComponentProps<typeof Input>,
    'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'min' | 'max'
> & {
    value: number;
    min: number;
    max: number;
    onCommit: (value: number) => void;
    onValueChange?: (value: number) => void;
    decimal?: boolean;
};

export function BoundedNumberInput({
    value,
    min,
    max,
    onCommit,
    onValueChange,
    onKeyDown,
    decimal = false,
    inputMode = decimal ? 'decimal' : 'numeric',
    ...props
}: BoundedNumberInputProps) {
    const [draft, setDraft] = useState<string | null>(null);

    const commit = () => {
        if (draft === null) return;

        setDraft(null);

        const n = Number(draft);

        if (draft.trim() === '' || !Number.isFinite(n)) return;

        const next = Math.max(min, Math.min(max, decimal ? n : Math.trunc(n)));

        if (next !== value) onCommit(next);
    };

    return (
        <Input
            {...props}
            inputMode={inputMode}
            value={draft ?? String(value)}
            onChange={(e) => {
                setDraft(e.target.value);

                const n = Number(e.target.value);

                if (
                    onValueChange &&
                    e.target.value.trim() !== '' &&
                    Number.isFinite(n) &&
                    (decimal || Number.isInteger(n)) &&
                    n >= min &&
                    n <= max &&
                    n !== value
                )
                    onValueChange(n);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
                // otherwise Enter in the battle form would submit the whole form
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }

                onKeyDown?.(e);
            }}
        />
    );
}
