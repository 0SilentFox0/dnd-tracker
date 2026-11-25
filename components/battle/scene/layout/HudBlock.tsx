'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Eye,
} from 'lucide-react';

import { HUD_GLASS, HudButton } from '@/components/hud';
import {
    type HudBlockKey,
    toggleHudAll,
    useHudAllHidden,
    useHudBlock,
} from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

export function HudBlock({
    block,
    edge,
    align = 'start',
    className,
    detachedButton,
    ignoreAll,
    children,
}: {
    block: HudBlockKey;
    edge: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    className?: string;
    /** icon-only button placed by these classes instead of in the flow */
    detachedButton?: string;
    ignoreAll?: boolean;
    children: ReactNode;
}) {
    const t = useTranslations('battle.hudBlocks');

    const { collapsed, hidden, allHidden, toggle } = useHudBlock(
        block,
        ignoreAll
    );

    const name = t(`names.${block}`);

    const row = edge === 'left' || edge === 'right';

    const Chevron = row
        ? (edge === 'right') === collapsed
            ? ChevronLeft
            : ChevronRight
        : (edge === 'bottom') === collapsed
          ? ChevronUp
          : ChevronDown;

    const buttonFirst = edge === 'bottom' || edge === 'right';

    const button = (
        <HudButton
            type="button"
            hidden={allHidden}
            aria-expanded={!collapsed}
            aria-label={t(collapsed ? 'show' : 'hide', { name })}
            title={t(collapsed ? 'show' : 'hide', { name })}
            onClick={toggle}
            className={cn(
                'pointer-events-auto flex h-10 items-center justify-center gap-1 rounded-xl text-[var(--ink)] focus-visible:ring-2 focus-visible:outline-none',
                detachedButton
                    ? `${HUD_GLASS} size-8 rounded-lg ${detachedButton}`
                    : collapsed
                      ? `${HUD_GLASS} hud-sc px-3 text-[13px] tracking-[.08em]`
                      : 'w-10 border border-white/15 bg-black/30 hover:bg-white/10',
                align === 'end' && 'self-end',
                align === 'center' && 'self-center'
            )}
        >
            <Chevron className="size-4" aria-hidden />
            {collapsed && !detachedButton && name}
        </HudButton>
    );

    return (
        <div
            data-hud-block={block}
            hidden={allHidden}
            className={cn(
                row ? 'flex flex-row items-start' : 'flex flex-col',
                className
            )}
        >
            {buttonFirst && button}
            <div hidden={hidden} className="contents">
                {children}
            </div>
            {!buttonFirst && button}
        </div>
    );
}

export function HudRestoreButton() {
    const t = useTranslations('battle.hudBlocks');

    if (!useHudAllHidden()) return null;

    return (
        <HudButton
            type="button"
            aria-label={t('hotkey')}
            title={t('hotkey')}
            onClick={toggleHudAll}
            className={`${HUD_GLASS} pointer-events-auto absolute right-3 bottom-3 z-50 flex size-8 items-center justify-center rounded-lg text-[var(--ink)] opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none`}
        >
            <Eye className="size-4" aria-hidden />
        </HudButton>
    );
}
