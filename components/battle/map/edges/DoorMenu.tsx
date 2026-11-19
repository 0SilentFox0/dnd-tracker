'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { doorCentre } from '../layers/DoorsLayer';

import { Button } from '@/components/ui/button';
import type { MapDoorsTool } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { UNIT } from '@/lib/utils/battle/grid';
import type { DoorState } from '@/types/battle-grid';

const BUTTON =
    'h-8 border-hud-rule bg-black/80 px-2 text-xs text-hud-gold-bright hover:bg-black';

/** DM menu over a door: open/close and lock/unlock; positioned in map pixels, kept upright on a rotated map. */
export function DoorMenu({
    edge,
    door,
    pxPerUnit,
    rotated,
    tool,
}: {
    edge: string;
    door: DoorState;
    pxPerUnit: number;
    rotated: boolean;
    tool: MapDoorsTool;
}) {
    const t = useTranslations('battle.map.doors');

    const c = doorCentre(edge);

    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const previous = document.activeElement;

        root.current?.querySelector('button')?.focus({ preventScroll: true });

        return () => {
            if (previous instanceof HTMLElement && previous.isConnected)
                previous.focus({ preventScroll: true });
        };
    }, [edge]);

    return (
        <div
            ref={root}
            data-door-menu={edge}
            role="group"
            aria-label={t('menu')}
            onKeyDown={(event) => {
                if (event.key !== 'Escape') return;

                event.stopPropagation();
                tool.close();
            }}
            className={cn('absolute z-20 flex gap-1', rotated && '-rotate-90')}
            style={{
                left: c.x * pxPerUnit,
                top: c.y * pxPerUnit + UNIT * 0.25 * pxPerUnit,
                transform: 'translateX(-50%)',
            }}
        >
            <Button
                variant="outline"
                className={BUTTON}
                onClick={() => tool.act(edge, { open: !door.open })}
            >
                {door.open ? t('close') : t('open')}
            </Button>
            {!door.open && (
                <Button
                    variant="outline"
                    className={BUTTON}
                    onClick={() => tool.act(edge, { locked: !door.locked })}
                >
                    {door.locked ? t('unlock') : t('lock')}
                </Button>
            )}
        </div>
    );
}
