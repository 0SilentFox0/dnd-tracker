'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useModeTools } from './modes/tools';
import { useModeView } from './modes/useModeView';
import type { BattleMapScene } from './battle-map-scene';
import { turnStartDue } from './turn-start-check';
import { useBattleScene } from './useBattleScene';
import { useExclusivePalettes } from './useExclusivePalettes';
import { useFollowTurnSetting } from './useFollowTurnSetting';
import { useMapCellActions } from './useMapCellActions';
import { useMapDmTools } from './useMapDmTools';
import { useMapEdgeSources } from './useMapEdgeSources';
import { useMapFogTool } from './useMapFogTool';
import { useMapPlacing } from './useMapPlacing';
import { useMapSceneView } from './useMapSceneView';
import { useMapTerrainTool } from './useMapTerrainTool';

import { useText } from '@/lib/i18n/use-text';
import type { SystemFx } from '@/lib/utils/battle/fx';
import {
    deriveMapScene,
    dispatchMapClick,
    type MapClick,
    mapClickHandlers,
    type MapSceneActor,
    type MapSceneMode,
} from '@/lib/utils/battle/grid';
import { NO_ORDER } from '@/lib/utils/battle/view';
import type { GridPoint } from '@/types/battle-grid';

export type { BattleMapScene };

export function useBattleMapScene(fx?: SystemFx): BattleMapScene | null {
    const t = useTranslations('battle.notify');

    const text = useText();

    const {
        battle,
        viewer,
        tileChunks,
        tileVersion,
        turn: { current, isMyTurn },
        roster: { hero },
        selectedId,
        select,
        campaignId,
        actions,
        anyPending,
        toast,
        intents,
        effects,
    } = useBattleScene();

    const { requestAttack, mapAim, mapPick, attackReady } = intents;

    const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);

    const { isDM } = viewer;

    const followSetting = useFollowTurnSetting();

    const { follow: followEnabled, setFollow } = followSetting;

    const followTurn = useMemo(
        () =>
            isDM
                ? {
                      on: followEnabled,
                      toggle: () => setFollow(!followEnabled),
                  }
                : null,
        [isDM, followEnabled, setFollow]
    );

    const map = battle.map ?? null;

    const modeTools = useModeTools(map);

    const modeToolActive = !!modeTools?.toolActive;

    const { placing, placingId, setPlacingOn, setPlacingId, stopPlacing } =
        useMapPlacing(isDM, modeToolActive);

    const { mutateAsync: mapTerrain } = actions.mapTerrain;

    const { show } = toast;

    const onSkipped = useCallback(
        (n: number) => show(t('skippedCells', { count: n })),
        [show, t]
    );

    const { edgeSource, stateEdgeSource } = useMapEdgeSources({
        map,
        battle,
        actions,
    });

    const terrainTool = useMapTerrainTool({
        isDM,
        mutate: mapTerrain,
        onSkipped,
        onActivate: stopPlacing,
        edgeSource: battle.mapRef ? undefined : edgeSource,
        stateEdgeSource,
    });

    const fogState = battle.mapState?.fog;

    const { mutateAsync: mapFog } = actions.mapFog;

    const fogTool = useMapFogTool({
        isDM,
        map,
        mode: fogState?.mode ?? 'off',
        radius: fogState?.visionRadius ?? 8,
        mutate: mapFog,
    });

    const toolActive = terrainTool.active || modeToolActive;

    const order = battle.initiativeOrder ?? NO_ORDER;

    const gateDue =
        !!current &&
        turnStartDue(
            { ...battle, initiativeOrder: order },
            current.basicInfo.id
        );

    const canAct = isMyTurn && !anyPending && !!current && !gateDue;

    const actor = useMemo<MapSceneActor>(
        () => ({ current, viewer, canAct, isDM, attackReady }),
        [current, viewer, canAct, isDM, attackReady]
    );

    const mode = useMemo<MapSceneMode>(
        () => ({ placing, placingId, toolActive, aim: mapAim, pick: mapPick }),
        [placing, placingId, toolActive, mapAim, mapPick]
    );

    const { view: modeView } = useModeView();

    const scene = useMemo(
        () =>
            map
                ? deriveMapScene({
                      map,
                      rules: battle.rules,
                      participants: order,
                      selectedId,
                      actor,
                      mode,
                      modeView,
                  })
                : null,
        [map, battle.rules, order, selectedId, actor, mode, modeView]
    );

    const view = useMapSceneView({
        scene,
        map,
        rules: battle.rules,
        current,
        canAct,
        order,
        aim: mapAim,
        hoverCell,
        pendingStroke: terrainTool.pending,
        fx,
        effects,
        round: battle.currentRound,
        modeView,
        camera: { isDM, follow: followEnabled, selfId: hero?.basicInfo.id },
    });

    const { currentRound, currentTurnIndex } = battle;

    const { mutate: move } = actions.move;

    const handle = useMemo(() => {
        const handlers = mapClickHandlers({
            current,
            turn: { round: currentRound, index: currentTurnIndex },
            aim: mapAim,
            pick: mapPick,
            move,
            requestAttack,
            show: (reason) => show(text(reason)),
            select,
            arm: setPlacingId,
        });

        return (click: MapClick) => dispatchMapClick(handlers, click);
    }, [
        move,
        requestAttack,
        show,
        text,
        select,
        setPlacingId,
        current,
        currentRound,
        currentTurnIndex,
        mapAim,
        mapPick,
    ]);

    const { commit } = terrainTool;

    const returnToStart = useCallback(() => {
        const to = current?.battleData.turnStartPosition;

        if (current && to)
            move({
                participantId: current.basicInfo.id,
                to,
                returnToStart: true,
            });
    }, [move, current]);

    const modeClick = modeTools?.clickCell;

    const closeModeTool = modeTools?.closeTool;

    const mapActions = useMapCellActions({
        scene,
        handle,
        anyPending,
        setHoverCell,
        tools: { modeToolActive, modeClick, stroke: commit, returnToStart },
    });

    const { close: closeTerrain } = terrainTool;

    const togglePlacing = useCallback(() => {
        setPlacingOn(!placing);
        setPlacingId(null);
        closeTerrain();
        closeModeTool?.();
    }, [placing, setPlacingOn, setPlacingId, closeTerrain, closeModeTool]);

    const { weatherTool, motionTool, backgroundTool, doors, mapUpdate } =
        useMapDmTools({
            isDM,
            map,
            battle,
            actions,
            current,
            isMyTurn,
            campaignId,
            notify: show,
        });

    useExclusivePalettes({
        mode: { active: !!modeTools?.paletteOpen, close: closeModeTool },
        terrain: { active: terrainTool.active, close: closeTerrain },
        weather: { active: !!weatherTool?.active, close: weatherTool?.close },
        motion: { active: !!motionTool?.active, close: motionTool?.close },
        background: {
            active: !!backgroundTool?.active,
            close: backgroundTool?.close,
        },
        fog: { active: !!fogTool?.active, close: fogTool?.close },
    });

    const placement = useMemo(
        () => (isDM ? { active: placing, toggle: togglePlacing } : null),
        [isDM, placing, togglePlacing]
    );

    if (!map || !scene || !view) return null;

    return {
        battle,
        viewer,
        ...(tileChunks && { tileChunks }),
        ...(tileVersion !== undefined && { tileVersion }),
        map,
        participants: scene.participants,
        view,
        followTurn,
        actions: mapActions,
        placement,
        terrainTool: isDM ? terrainTool : null,
        fogTool,
        modeTools,
        weatherTool,
        motionTool,
        backgroundTool,
        mapUpdate,
        doors,
        edgesLinked: !!battle.mapRef,
    };
}
