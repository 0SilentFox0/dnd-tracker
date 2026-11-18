import { useEffect, useMemo } from 'react';

import { useFxImpacts } from './useFxImpacts';

import type { SystemFx } from '@/lib/utils/battle/fx';
import {
    aimView,
    checkReturnToStart,
    composeMapView,
    type deriveMapScene,
    type MapAim,
} from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

type Scene = NonNullable<ReturnType<typeof deriveMapScene>>;

type ViewParams = Parameters<typeof composeMapView>[0];

export function useMapSceneView({
    scene,
    map,
    rules,
    current,
    canAct,
    order,
    aim,
    hoverCell,
    pendingStroke,
    fx,
    effects,
    round,
    modeView,
    camera,
}: {
    scene: Scene | null;
    map: BattleMapConfig | null;
    rules: ViewParams['rules'];
    current: BattleParticipant | null | undefined;
    canAct: boolean;
    order: BattleParticipant[];
    aim: MapAim | null;
    hoverCell: GridPoint | null;
    pendingStroke: ViewParams['overlay']['pendingStroke'];
    fx?: SystemFx;
    effects: ViewParams['overlay']['effects'];
    round: number;
    modeView: ViewParams['overlay']['mode'];
    camera: { isDM: boolean; follow: boolean; selfId?: string };
}) {
    const impactFor = useFxImpacts(fx);

    const hovered = useMemo(
        () =>
            scene?.aiming && map && aim && hoverCell
                ? aimView(
                      {
                          map,
                          participants: scene.participants,
                          rules: rules,
                      },
                      aim,
                      hoverCell
                  )
                : null,
        [scene, map, aim, hoverCell, rules]
    );

    const previewCell = hovered ? hoverCell : null;

    const onAimHover = aim?.onHover;

    useEffect(() => {
        onAimHover?.(previewCell);
    }, [onAimHover, previewCell]);

    const returnId = useMemo(
        () =>
            canAct &&
            map &&
            current &&
            !current.battleData.reserved &&
            checkReturnToStart(map, order, current).ok
                ? current.basicInfo.id
                : null,
        [canAct, map, order, current]
    );

    const composedView = useMemo(() => {
        if (!scene || !map) return null;

        return composeMapView({
            scene,
            map,
            rules: rules,
            current: current ?? null,
            hover: { cell: hoverCell, preview: hovered },
            overlay: {
                returnId,
                pendingStroke,
                impactFor,
                effects,
                round,
                mode: modeView,
            },
        });
    }, [
        scene,
        map,
        rules,
        hovered,
        hoverCell,
        pendingStroke,
        current,
        returnId,
        impactFor,
        effects,
        round,
        modeView,
    ]);

    return useMemo(
        () =>
            composedView
                ? {
                      ...composedView,
                      camera: {
                          follow: camera.isDM ? camera.follow : true,
                          selfId: camera.selfId ?? null,
                      },
                  }
                : null,
        [composedView, camera.isDM, camera.follow, camera.selfId]
    );
}
