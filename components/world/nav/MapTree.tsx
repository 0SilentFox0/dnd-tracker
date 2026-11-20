'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';
import { treeDepth, treeOrder } from '@/lib/utils/world/tree';
import type { WorldMapSummary } from '@/types/world';

const INDENT_REM = 1;

interface MapTreeProps {
    maps: WorldMapSummary[];
    activeId: string | null;
    onOpen(id: string): void;
    footer?: ReactNode;
}

export function MapTree({ maps, activeId, onOpen, footer }: MapTreeProps) {
    const t = useTranslations('world.tree');

    const ordered = useMemo(() => treeOrder(maps), [maps]);

    const focusable = ordered.some((m) => m.id === activeId)
        ? activeId
        : ordered[0]?.id;

    const onKeyDown = (e: KeyboardEvent<HTMLElement>, id: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onOpen(id);

            return;
        }

        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;

        if (!step) return;

        e.preventDefault();

        const items = [
            ...(e.currentTarget
                .closest('[role=tree]')
                ?.querySelectorAll<HTMLElement>('[role=treeitem]') ?? []),
        ];

        items[items.indexOf(e.currentTarget) + step]?.focus();
    };

    return (
        <div className="flex flex-col gap-1">
            <div role="tree" aria-label={t('label')} className="flex flex-col">
                {ordered.map((m) => (
                    <HudButton
                        key={m.id}
                        role="treeitem"
                        aria-level={treeDepth(maps, m.id) + 1}
                        aria-selected={m.id === activeId}
                        aria-current={m.id === activeId ? 'true' : undefined}
                        tabIndex={m.id === focusable ? 0 : -1}
                        className={cn(
                            'truncate rounded px-2 py-1 text-left text-sm hover:bg-white/10',
                            m.id === activeId
                                ? 'text-hud-gold-bright'
                                : 'text-hud-ink'
                        )}
                        style={{
                            paddingLeft: `${0.5 + treeDepth(maps, m.id) * INDENT_REM}rem`,
                        }}
                        onClick={() => onOpen(m.id)}
                        onKeyDown={(e) => onKeyDown(e, m.id)}
                    >
                        {m.name}
                    </HudButton>
                ))}
            </div>
            {footer}
        </div>
    );
}
