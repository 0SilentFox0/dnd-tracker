import { type RefObject, useMemo } from 'react';

import { type ModeTools, useMapCamera } from '@/lib/hooks/battle';
import {
    cellPointPx,
    followTarget,
    type Frame,
    participantsCenterPx,
} from '@/lib/utils/battle/camera';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapView } from '@/types/battle-grid';

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
    phone: boolean;
    rotated: boolean;
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
    phone,
    rotated,
}: Params) {
    const cameraTarget = followTarget(view?.currentId ?? null, participants);

    const selfTarget = followTarget(view?.camera?.selfId ?? null, participants);

    const overview = useMemo(() => {
        if (phone) return null;

        const point = participantsCenterPx(
            participants,
            win,
            pxPerUnit,
            rotated
        );

        return point && { point };
    }, [phone, participants, win, pxPerUnit, rotated]);

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
                              rotated
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
                              rotated
                          ),
                      }
                    : null,
            enabled: cameraMode && (view?.camera?.follow ?? false),
            startOverview: phone,
            overview,
        },
    });

    return { camera, cameraTarget, selfTarget };
}
