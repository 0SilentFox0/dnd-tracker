'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';

import { HudButton } from '@/components/hud';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { sealStyle } from '@/components/world/map/seal-style';
import { MARKER_ICON } from '@/components/world/marker-icons';
import { clusterCenter, type PixelCluster } from '@/lib/utils/world/cluster';
import { markerAnchor } from '@/lib/utils/world/geometry';
import type { MapPoint, WorldMarker } from '@/types/world';

interface PinClusterProps {
    cluster: PixelCluster<WorldMarker>;
    zoom: number;
    nextZoom: number | null;
    actions: {
        onZoom(center: MapPoint, zoom: number): void;
        onPick(id: string): void;
    };
}

const iconOf = (m: WorldMarker) => (m.icon && MARKER_ICON[m.icon]) || MapPin;

export function PinCluster({
    cluster,
    zoom,
    nextZoom,
    actions,
}: PinClusterProps) {
    const t = useTranslations('world');

    const [open, setOpen] = useState(false);

    const [top, ...rest] = cluster.items;

    const Icon = iconOf(top);

    const button = (
        <HudButton
            type="button"
            aria-label={t('pinCluster', { name: top.name, count: rest.length })}
            data-cluster={cluster.items.length}
            style={{
                left: `${cluster.point.x * 100}%`,
                top: `${cluster.point.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                touchAction: 'none',
            }}
            className="atlas-pin atlas-pin-cluster absolute"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onClick={
                nextZoom === null
                    ? undefined
                    : () =>
                          actions.onZoom(
                              clusterCenter(cluster.items.map(markerAnchor)),
                              nextZoom
                          )
            }
        >
            <span
                className="atlas-seal"
                style={top.color ? sealStyle(top.color) : undefined}
            >
                <Icon className="size-4" aria-hidden />
            </span>
            <span aria-hidden className="atlas-count-badge">
                +{rest.length}
            </span>
        </HudButton>
    );

    if (nextZoom !== null) return button;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{button}</PopoverTrigger>
            <PopoverContent
                aria-label={t('pinClusterList')}
                className="flex w-48 flex-col gap-1 p-1"
            >
                {cluster.items.map((m) => {
                    const RowIcon = iconOf(m);

                    return (
                        <HudButton
                            key={m.id}
                            type="button"
                            className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-left text-sm hover:bg-accent"
                            onClick={() => {
                                setOpen(false);
                                actions.onPick(m.id);
                            }}
                        >
                            <RowIcon className="size-4 shrink-0" aria-hidden />
                            <span className="truncate">{m.name}</span>
                        </HudButton>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}
