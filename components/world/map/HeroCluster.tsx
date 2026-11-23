'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudButton } from '@/components/hud';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { HeroDragHandlers } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import type { HeroClusterGroup } from '@/lib/utils/world/hero-clusters';

interface HeroClusterProps {
    cluster: HeroClusterGroup;
    zoom: number;
    party?: boolean;
    onHeroClick?(id: string): void;
    drag?: HeroDragHandlers;
}

export function HeroCluster({
    cluster,
    zoom,
    party,
    onHeroClick,
    drag,
}: HeroClusterProps) {
    const t = useTranslations('world');

    const [open, setOpen] = useState(false);

    const [top, ...rest] = cluster.heroes;

    const wasDrag = useRef(false);

    const style = {
        left: `${cluster.x * 100}%`,
        top: `${cluster.y * 100}%`,
        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
        touchAction: 'none',
    } as const;

    const stop = (e: React.PointerEvent) => e.stopPropagation();

    const noNativeDrag = (e: React.DragEvent) => e.preventDefault();

    const dragProps = {
        'data-draggable': drag ? true : undefined,
        onPointerDown: drag?.onPointerDown ?? stop,
        onPointerMove: drag?.onPointerMove,
        onPointerCancel: drag?.onPointerCancel,
        onDragStart: noNativeDrag,
    };

    const avatar = (
        <EntityIcon
            src={top.avatar}
            name={top.name}
            size={30}
            className="size-full rounded-full bg-transparent text-inherit"
        />
    );

    const partyStatus = party ? t('journey.partyHere') : undefined;

    const partyLabel = partyStatus ? (
        <span className="atlas-party-label">
            <span
                aria-hidden
                className="world-map-symbol world-map-symbol-party"
            />
            {partyStatus}
        </span>
    ) : null;

    if (rest.length === 0) {
        return (
            <HudButton
                type="button"
                aria-label={
                    partyStatus ? `${top.name} · ${partyStatus}` : top.name
                }
                data-party={party || undefined}
                data-own={top.own}
                className={cn(
                    'atlas-hero absolute',
                    top.own && 'atlas-hero-own'
                )}
                style={style}
                {...dragProps}
                onPointerUp={(e) => {
                    e.stopPropagation();

                    if (!drag?.onPointerUp(e)) onHeroClick?.(top.id);
                }}
                onClick={(e) => {
                    if (e.detail === 0) onHeroClick?.(top.id);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
            >
                {avatar}
                {partyLabel}
            </HudButton>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <HudButton
                    type="button"
                    aria-label={[
                        t('heroCluster', {
                            name: top.name,
                            count: rest.length,
                        }),
                        partyStatus,
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                    data-party={party || undefined}
                    data-own={top.own}
                    data-cluster={cluster.heroes.length}
                    className={cn(
                        'atlas-hero atlas-hero-cluster absolute',
                        top.own && 'atlas-hero-own'
                    )}
                    style={style}
                    {...dragProps}
                    onPointerUp={(e) => {
                        e.stopPropagation();
                        wasDrag.current = !!drag?.onPointerUp(e);
                    }}
                    onClick={(e) => {
                        if (!wasDrag.current) return;

                        wasDrag.current = false;
                        e.preventDefault();
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                >
                    {avatar}
                    {partyLabel}
                    <span aria-hidden className="atlas-count-badge">
                        +{rest.length}
                    </span>
                </HudButton>
            </PopoverTrigger>
            <PopoverContent className="flex w-48 flex-col gap-1 p-1">
                {cluster.heroes.map((h) => (
                    <HudButton
                        key={h.id}
                        type="button"
                        className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-left text-sm hover:bg-accent"
                        onClick={() => {
                            setOpen(false);
                            onHeroClick?.(h.id);
                        }}
                    >
                        <EntityIcon
                            src={h.avatar}
                            name={h.name}
                            size={24}
                            className="size-6 shrink-0 rounded-full"
                        />
                        <span className="truncate">{h.name}</span>
                    </HudButton>
                ))}
            </PopoverContent>
        </Popover>
    );
}
