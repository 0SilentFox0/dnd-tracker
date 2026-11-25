'use client';

import { memo } from 'react';

import { type MapPlacement, tokenBoxStyle } from './token-box';

import { HitFloat } from '@/components/battle/hud';
import { useHitChange } from '@/lib/hooks/battle';
import type { FxImpact } from '@/lib/utils/battle/fx';
import { footprintSizeOf } from '@/lib/utils/battle/grid';
import { clamp } from '@/lib/utils/common/clamp';
import type { BattleParticipant } from '@/types/battle';

interface MapHitFloatProps {
    participant: BattleParticipant;
    placement: MapPlacement;
    impact?: FxImpact | null;
}

function MapHitFloatImpl({
    participant,
    placement,
    impact = null,
}: MapHitFloatProps) {
    const { box, mapSize, pxPerUnit, grid } = placement;

    const { change } = useHitChange(participant, impact);

    if (!change) return null;

    const cellPx = (box.size * pxPerUnit) / footprintSizeOf(participant, grid);

    return (
        <div
            data-map-hit-float={participant.basicInfo.id}
            className="pointer-events-none absolute z-30"
            style={tokenBoxStyle(box, mapSize)}
        >
            <HitFloat
                change={change}
                className="bottom-[70%] left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{ fontSize: clamp(cellPx * 0.45, 13, 30) }}
            />
        </div>
    );
}

export const MapHitFloat = memo(MapHitFloatImpl);
