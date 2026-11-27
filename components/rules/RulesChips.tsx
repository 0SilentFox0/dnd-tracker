'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { HudButton } from '@/components/hud';
import { HudPill } from '@/components/hud/page';

const MORE_CLASS =
    'inline-flex h-8 items-center rounded-sm px-2 text-sm font-semibold text-hud-accent-fg shadow-[inset_0_0_0_1px_var(--color-hud-accent)] hover:bg-hud-accent/15';

export function ChipRow<T>({
    items,
    limit,
    keyOf,
    render,
    className,
}: {
    items: readonly T[];
    limit: number;
    keyOf: (item: T) => string;
    render: (item: T) => ReactNode;
    className?: string;
}) {
    const t = useTranslations('rules.page');

    const [expanded, setExpanded] = useState(false);

    const shown = expanded ? items : items.slice(0, limit);

    const rest = items.length - shown.length;

    return (
        <ul className={className ?? 'flex flex-wrap items-center gap-1.5'}>
            {shown.map((item) => (
                <li key={keyOf(item)}>{render(item)}</li>
            ))}
            {rest > 0 && (
                <li>
                    <HudButton
                        className={MORE_CLASS}
                        onClick={() => setExpanded(true)}
                    >
                        {t('more', { count: rest })}
                    </HudButton>
                </li>
            )}
        </ul>
    );
}

export interface SystemChip {
    key: string;
    label: string;
    tone: 'accent' | 'meta';
}

export function RulesHeaderChips({ chips }: { chips: readonly SystemChip[] }) {
    return (
        <ChipRow
            items={chips}
            limit={4}
            keyOf={(chip) => chip.key}
            render={(chip) => <HudPill tone={chip.tone}>{chip.label}</HudPill>}
        />
    );
}

export function ChangedChip({
    label,
    resetLabel,
    onReset,
}: {
    label: string;
    resetLabel: string;
    onReset: () => void;
}) {
    return (
        <span className="inline-flex h-8 items-center gap-0.5 rounded-[var(--r-md)] bg-hud-accent/10 pl-2 text-xs font-semibold text-hud-accent-fg shadow-[inset_0_0_0_1px_var(--color-hud-accent)]">
            {label}
            <HudButton
                aria-label={`${resetLabel}: ${label}`}
                className="flex size-8 items-center justify-center rounded-[var(--r-md)] hover:bg-hud-accent/20"
                onClick={onReset}
            >
                <X className="size-3.5" aria-hidden />
            </HudButton>
        </span>
    );
}
