'use client';

import { memo, type PointerEvent, useId, useMemo } from 'react';

import { type GridCellActions,GridHit } from './GridHit';
import { GridMarks } from './GridMarks';
import { GridDefs, GridStatic } from './GridStatic';

import {
    blockedSet,
    type GridWindow,
} from '@/lib/utils/battle/grid';
import type {
    BattleMapConfig,
    BattleMapView,
    GridPoint,
} from '@/types/battle';

export type { GridCellActions } from './GridHit';

export interface GridScene {
    round?: number;
    rotated: boolean;
    clickableBlocked?: boolean;
    showBlocked?: boolean;
    window: GridWindow | null;
}

interface GridLayerProps {
    map: BattleMapConfig;
    marks: BattleMapView['marks'];
    range?: BattleMapView['range'];
    cellActions: GridCellActions;
    onStrokeStart?: (p: GridPoint, e: PointerEvent) => void;
    scene: GridScene;
}

export const GridLayer = memo(function GridLayer({
    map,
    marks,
    range,
    cellActions,
    onStrokeStart,
    scene,
}: GridLayerProps) {
    const maskId = `battle-map-mask-${useId().replace(/:/g, '')}`;

    const blocked = useMemo(
        () => blockedSet({ blocked: map.blocked }),
        [map.blocked]
    );

    return (
        <>
            <GridDefs />
            <GridStatic
                map={map}
                blocked={blocked}
                window={scene.window}
                rotated={scene.rotated}
                showBlocked={scene.showBlocked}
            />
            <GridMarks
                map={map}
                blocked={blocked}
                marks={marks}
                range={range}
                maskId={maskId}
            />
            <GridHit
                map={map}
                blocked={blocked}
                cellActions={cellActions}
                onStrokeStart={onStrokeStart}
                scene={scene}
            />
        </>
    );
});
