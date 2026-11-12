'use client';

import { useState } from 'react';

import { Breakdown } from './Breakdown';

import type { SheetLine } from '@/types/characters';

export function CombatRow({
    label,
    value,
    lines,
}: {
    label: string;
    value: string;
    lines?: SheetLine[];
}) {
    const [open, setOpen] = useState(false);

    const expandable = !!lines && lines.length > 1;

    return (
        <div className="border-b border-hud-raised py-1.5 text-sm">
            <button
                type="button"
                disabled={!expandable}
                aria-expanded={expandable ? open : undefined}
                onClick={() => setOpen((v) => !v)}
                className="flex min-h-8 w-full items-center justify-between gap-3 text-left disabled:cursor-default"
            >
                <span>{label}</span>
                <span className="text-hud-ink tabular-nums">{value}</span>
            </button>
            {open && lines && <Breakdown lines={lines} />}
        </div>
    );
}
