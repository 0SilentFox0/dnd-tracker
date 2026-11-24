'use client';

import { useState } from 'react';

import { Breakdown } from './Breakdown';

import { HudButton } from '@/components/hud';
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
        <div className="border-b border-hud-rule text-[15px] last:border-b-0">
            <HudButton
                type="button"
                disabled={!expandable}
                aria-expanded={expandable ? open : undefined}
                onClick={() => setOpen((v) => !v)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left hover:bg-hud-raised disabled:cursor-default disabled:hover:bg-transparent"
            >
                <span>{label}</span>
                <span className="hud-num text-lg text-hud-ink">{value}</span>
            </HudButton>
            {open && lines && <Breakdown lines={lines} />}
        </div>
    );
}
