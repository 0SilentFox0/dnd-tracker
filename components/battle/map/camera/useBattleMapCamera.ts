import { type RefObject } from 'react';

import { type ModeTools, useMapCamera } from '@/lib/hooks/battle';
import {
    cellPointPx,
    followTarget,
    type Frame,
} from '@/lib/utils/battle/camera';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapView, GridKind } from '@/types/battle-grid';

interface Params {
    frame: Frame | null;
    cameraMode: boolean;
    scrolls: boolean;
    drawing: boolean;
    modeTools: ModeTools | null;
    containerRef: RefObject<HTMLDivElement | null>;
    view?: BattleMapView;
    participants: BattleParticipant[];
    win: { x: number; y: number; cols: number; rows: number };
    pxPerUnit: number;
    grid: GridKind;
}

export function useBattleMapCamera({
    frame,
    cameraMode,
    scrolls,
    drawing,
    modeTools,
    containerRef,
    view,
    participants,
    win,
    pxPerUnit,
    grid,
}: Params) {
    const cameraTarget = followTarget(
        view?.currentId ?? null,
        participants,
        grid
    );

    const selfTarget = followTarget(
        view?.camera?.selfId ?? null,
        participants,
        grid
    );

    const camera = useMapCamera({
        enabled: true,
        modeKey: cameraMode,
        frame,
        containerRef,
        panLocked: drawing || !!modeTools?.panLocked,
        wheelScrolls: !cameraMode && scrolls,
        follow: {
            currentId: view?.currentId ?? null,
            target:
                cameraMode && cameraTarget
                    ? {
                          point: cellPointPx(
                              cameraTarget.anchor,
                              cameraTarget.size,
                              win,
                              pxPerUnit,
                              grid
                          ),
                      }
                    : null,
            self:
                cameraMode && selfTarget
                    ? {
                          point: cellPointPx(
                              selfTarget.anchor,
                              selfTarget.size,
                              win,
                              pxPerUnit,
                              grid
                          ),
                      }
                    : null,
            enabled: cameraMode && (view?.camera?.follow ?? false),
        },
    });

    return { camera, cameraTarget, selfTarget };
}
