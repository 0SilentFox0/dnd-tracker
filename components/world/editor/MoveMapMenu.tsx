'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Move } from 'lucide-react';

import { HudButton } from '@/components/hud';
import { MarkerPickerDialog } from '@/components/world/nav/MarkerPickerDialog';
import { subtreeMapIds } from '@/lib/utils/world/tree';
import type { WorldMapSummary, WorldMarker } from '@/types/world';

const isFree = (m: WorldMarker) => !m.childMapId;

interface MoveMapMenuProps {
    campaignId: string;
    map: WorldMapSummary;
    maps: WorldMapSummary[];
    onMove(markerId: string): void;
}

export function MoveMapMenu({
    campaignId,
    map,
    maps,
    onMove,
}: MoveMapMenuProps) {
    const t = useTranslations('world.bubble');

    const tMove = useTranslations('world.moveMap');

    const [open, setOpen] = useState(false);

    const excluded = useMemo(() => subtreeMapIds(maps, map.id), [maps, map.id]);

    if (!map.parentMapId) return null;

    return (
        <>
            <HudButton
                className="inline-flex items-center gap-1 text-xs text-hud-gold-bright underline"
                onClick={() => setOpen(true)}
            >
                <Move className="size-3.5" aria-hidden />
                {t('moveMap')}
            </HudButton>
            <MarkerPickerDialog
                campaignId={campaignId}
                open={open}
                title={tMove('title')}
                onOpenChange={setOpen}
                excludeMapIds={excluded}
                markerFilter={isFree}
                onPick={(ref) => onMove(ref.markerId)}
            />
        </>
    );
}
