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
    'hud-body flex h-8 shrink-0 items-center rounded-lg border border-hud-line ds-inset px-3 text-sm font-semibold text-hud-muted transition-[background-color,box-shadow,color,border-color] duration-150 hover:border-hud-muted hover:text-hud-ink pointer-coarse:min-h-10';

export const HUD_CHIP_ACTIVE_CLASS =
    'border-hud-accent bg-hud-accent/15 text-hud-accent-fg';

const scrollActiveIntoView = (el: HTMLElement | null) =>
    el?.scrollIntoView?.({ inline: 'center', block: 'nearest' });

export function HudChipTabs({
    items,
    ariaLabel,
    wrap = false,
}: {
    items: ChipItem[];
    ariaLabel: string;
    wrap?: boolean;
}) {
    const chip = HUD_CHIP_CLASS;

    return (
        <nav
            aria-label={ariaLabel}
            className={cn(
                '-mx-1 flex gap-1.5 px-1 py-1',
                wrap ? 'flex-wrap' : 'hud-scroll-x overflow-x-auto'
            )}
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
