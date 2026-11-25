import { useCallback, useEffect, useMemo, useRef } from 'react';

import { inWindow } from '../grid/grid-style';
import type { MapPlacement } from './token-box';

import { useMoveRoutes } from '@/lib/hooks/battle';
import { isEscaped } from '@/lib/utils/abilities/engine/core/participants';
import {
    centreCell,
    gridOf,
    isFallen,
    isMoveMark,
    tokenBox,
} from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
    GridKind,
} from '@/types/battle-grid';

export interface PlacedToken {
    p: BattleParticipant;
    box: NonNullable<ReturnType<typeof tokenBox>>;
    placement: MapPlacement;
}

interface Params {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    view?: BattleMapView;
    actions?: BattleMapActions;
    size: { width: number; height: number };
    pxPerUnit: number;
    wasDragged: () => boolean;
}

function isOutOfRange(
    p: BattleParticipant,
    range: BattleMapView['range'],
    casterId: string | undefined,
    grid: GridKind
) {
    return (
        !!range &&
        p.basicInfo.id !== casterId &&
        !inWindow(range, centreCell(p, grid))
    );
}

export function useMapStageTokens({
    map,
    participants,
    view,
    actions,
    size,
    pxPerUnit,
    wasDragged,
}: Params) {
    const grid = gridOf(map);

    const modeView = view?.mode;

    const onTokenClickProp = actions?.onTokenClick;

    const onCellHover = actions?.onCellHover;

    const range = view?.range ?? null;

    const casterId = view?.rangeCasterId;

    const routes = useMoveRoutes(map, participants);

    // fallen tokens stay until the hit animation lands; the lethal-hit number outlives them
    const placed = useMemo<PlacedToken[]>(
        () =>
            participants
                .filter((p) => !p.battleData.reserved)
                .filter(
                    (p) =>
                        !modeView ||
                        (!isEscaped(p) &&
                            modeView.visibleIds.has(p.basicInfo.id))
                )
                .flatMap((p) => {
                    const box = tokenBox(p, grid);

                    return box
                        ? [
                              {
                                  p,
                                  box,
                                  placement: {
                                      grid,
                                      box,
                                      mapSize: size,
                                      pxPerUnit,
                                      route: routes.get(p.basicInfo.id),
                                      dimmed: isOutOfRange(
                                          p,
                                          range,
                                          casterId,
                                          grid
                                      ),
                                  } satisfies MapPlacement,
                              },
                          ]
                        : [];
                }),
        [participants, modeView, size, pxPerUnit, routes, range, casterId, grid]
    );

    const tokens = useMemo(
        () => placed.filter(({ p }) => !isFallen(p)),
        [placed]
    );

    const tokenClickRef = useRef(onTokenClickProp);

    useEffect(() => {
        tokenClickRef.current = onTokenClickProp;
    }, [onTokenClickProp]);

    const onTokenClick = useCallback(
        (id: string) => !wasDragged() && tokenClickRef.current?.(id),
        [wasDragged]
    );

    // the portrait captures the pointer, so the cell under it gets no pointerenter
    const onTokenHover = useCallback(
        (id: string | null) => {
            const token = id
                ? tokens.find((t) => t.p.basicInfo.id === id)
                : undefined;

            onCellHover?.(token ? centreCell(token.p, grid) : null);
        },
        [tokens, onCellHover, grid]
    );

    const movingId =
        view?.currentId &&
        view.marks &&
        [...view.marks.values()].some((m) => isMoveMark(m))
            ? view.currentId
            : null;

    const trajectory = view?.trajectory ?? null;

    const from =
        trajectory?.kind === 'ranged'
            ? tokens.find((t) => t.p.basicInfo.id === trajectory.fromId)
            : undefined;

    return { placed, onTokenClick, onTokenHover, movingId, from };
}
