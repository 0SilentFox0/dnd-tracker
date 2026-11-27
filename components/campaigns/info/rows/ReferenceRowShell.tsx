'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

export interface ReferenceRowState {
    selected: boolean;
    onSelect: () => void;
    tabIndex?: 0 | -1;
    register?: (el: HTMLElement | null) => void;
}

interface ReferenceRowShellProps {
    icon: { src: string | null; fallback: ReactNode };
    name: string;
    meta: ReactNode;
    tags?: ReactNode;
    row: ReferenceRowState;
}

export function ReferenceRowShell({
    icon,
    name,
    meta,
    tags,
    row,
}: ReferenceRowShellProps) {
    const { selected, onSelect, tabIndex, register } = row;

    return (
        <HudButton
            ref={register}
            tabIndex={tabIndex}
            aria-current={selected ? 'true' : undefined}
            onClick={onSelect}
            data-ux-tile
            className={cn(
                'flex h-14 w-full touch-manipulation items-center gap-3 px-3 text-left [contain-intrinsic-size:56px] [content-visibility:auto]',
                selected &&
                    'bg-hud-panel-2 shadow-[inset_2px_0_0_var(--hud-accent)]'
            )}
        >
            <EntityIcon
                src={icon.src}
                name={name}
                size={32}
                className="size-8 shrink-0 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                fallback={icon.fallback}
            />
            <span className="min-w-0 flex-1">
                <span className="hud-sc block truncate text-base leading-tight text-hud-ink">
                    {name}
                </span>
                <span className="block truncate text-xs text-hud-muted">
                    {meta}
                </span>
            </span>
            {tags}
            <ChevronRight className="size-4 shrink-0 text-hud-muted" />
        </HudButton>
    );
}
