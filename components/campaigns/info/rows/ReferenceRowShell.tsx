import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

export interface ReferenceRowProps<T> {
    item: T;
    selected: boolean;
    onSelect: (id: string) => void;
}

export function ReferenceRowShell({
    entity,
    fallback,
    meta,
    trailing,
    selected,
    onSelect,
}: {
    entity: { id: string; name: string; icon: string | null };
    fallback: ReactNode;
    meta?: ReactNode;
    trailing?: ReactNode;
    selected: boolean;
    onSelect: (id: string) => void;
}) {
    return (
        <HudButton
            data-ref-row
            aria-current={selected ? 'true' : undefined}
            onClick={() => onSelect(entity.id)}
            className={cn(
                'flex h-14 w-full touch-manipulation items-center gap-3 rounded-lg px-2 text-left [contain-intrinsic-size:auto_56px] [content-visibility:auto] hover:bg-hud-raised',
                selected &&
                    'bg-hud-panel-2 shadow-[inset_3px_0_0_var(--hud-accent)]'
            )}
        >
            <EntityIcon
                src={entity.icon}
                name={entity.name}
                size={32}
                className="size-8 shrink-0 rounded-lg bg-hud-field text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]"
                fallback={fallback}
            />
            <span className="min-w-0 flex-1">
                <span className="hud-sc block truncate text-[15px] leading-tight text-hud-ink">
                    {entity.name}
                </span>
                {meta ? (
                    <span className="block truncate text-xs text-hud-muted">
                        {meta}
                    </span>
                ) : null}
            </span>
            {trailing ? (
                <span className="shrink-0 text-xs text-hud-muted">
                    {trailing}
                </span>
            ) : null}
            <ChevronRight
                className="size-4 shrink-0 text-hud-muted"
                aria-hidden
            />
        </HudButton>
    );
}
