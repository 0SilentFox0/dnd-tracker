'use client';

import { useTranslations } from 'next-intl';

import { doorCentre } from './DoorsLayer';

import type { MapDoorsTool } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { UNIT } from '@/lib/utils/battle/grid';
import type { DoorState } from '@/types/battle';

const BUTTON =
    'h-8 rounded-md border border-hud-rule bg-black/80 px-2 text-xs text-hud-gold-bright hover:bg-black';

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

    return (
        <div
            data-door-menu={edge}
            role="menu"
            aria-label={t('menu')}
            className={cn('absolute z-20 flex gap-1', rotated && '-rotate-90')}
            style={{
                left: c.x * pxPerUnit,
                top: c.y * pxPerUnit + UNIT * 0.25 * pxPerUnit,
                transform: 'translateX(-50%)',
            }}
        >
            <button
                type="button"
                className={BUTTON}
                onClick={() => tool.act(edge, { open: !door.open })}
            >
                {door.open ? t('close') : t('open')}
            </button>
            {!door.open && (
                <button
                    type="button"
                    className={BUTTON}
                    onClick={() => tool.act(edge, { locked: !door.locked })}
                >
                    {door.locked ? t('unlock') : t('lock')}
                </button>
            )}
        </div>
    );
}
