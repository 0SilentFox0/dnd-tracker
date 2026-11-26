'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

interface ChipItem {
    key: string;
    label: ReactNode;
    href?: string;
    active: boolean;
    onSelect?: () => void;
}

export const HUD_CHIP_CLASS =
    'flex h-8 shrink-0 items-center rounded-lg border border-hud-line px-3 text-[13px] text-hud-muted transition-[background-color,box-shadow,color,border-color] duration-150 hover:border-hud-muted hover:text-hud-ink';

const CHIP_LG = 'h-11 min-h-11 px-4 text-sm';

export const HUD_CHIP_ACTIVE_CLASS =
    'bg-hud-panel-2 text-hud-ink shadow-[inset_0_-2px_0_var(--hud-accent)]';

const scrollActiveIntoView = (el: HTMLElement | null) =>
    el?.scrollIntoView?.({ inline: 'center', block: 'nearest' });

export function HudChipTabs({
    items,
    ariaLabel,
    size = 'md',
}: {
    items: ChipItem[];
    ariaLabel: string;
    size?: 'md' | 'lg';
}) {
    const chip = cn(HUD_CHIP_CLASS, size === 'lg' && CHIP_LG);

    return (
        <nav
            aria-label={ariaLabel}
            className="hud-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1"
        >
            {items.map((it) =>
                it.href ? (
                    <Link
                        key={it.key}
                        href={it.href}
                        ref={it.active ? scrollActiveIntoView : undefined}
                        aria-current={it.active ? 'page' : undefined}
                        className={cn(chip, it.active && HUD_CHIP_ACTIVE_CLASS)}
                    >
                        {it.label}
                    </Link>
                ) : (
                    <button
                        key={it.key}
                        type="button"
                        ref={it.active ? scrollActiveIntoView : undefined}
                        aria-pressed={it.active}
                        onClick={it.onSelect}
                        className={cn(chip, it.active && HUD_CHIP_ACTIVE_CLASS)}
                    >
                        {it.label}
                    </button>
                )
            )}
        </nav>
    );
}
