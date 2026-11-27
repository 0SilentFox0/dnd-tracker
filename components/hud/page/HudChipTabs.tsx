'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import {
    HUD_CHIP_ACTIVE_CLASS,
    HUD_CHIP_CLASS,
} from '@/components/hud/page/chip-class';
import { cn } from '@/lib/utils';

interface ChipItem {
    key: string;
    label: ReactNode;
    href?: string;
    active: boolean;
    onSelect?: () => void;
}

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
