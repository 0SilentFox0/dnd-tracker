"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { type ModeTools, useModeTools } from "./modes/tools";
import { useModeView } from "./modes/useModeView";
import { useBattleScene } from "./useBattleScene";
import { useExclusivePalettes } from "./useExclusivePalettes";
import { useFxImpacts } from "./useFxImpacts";
import { useMapCellActions } from "./useMapCellActions";
import { useMapPlacing } from "./useMapPlacing";
import { type MapTerrainTool, useMapTerrainTool } from "./useMapTerrainTool";
import { type MapWeatherTool, useMapWeatherTool } from "./useMapWeatherTool";

import { useText } from "@/lib/i18n/use-text";
import { aimView, checkReturnToStart, composeMapView, deriveMapScene, dispatchMapClick, type MapClick, mapClickHandlers, type MapSceneActor, type MapSceneMode } from "@/lib/utils/battle/grid";
import { awaitsMoraleCheck } from "@/lib/utils/battle/morale/awaits-check";
import { NO_ORDER } from "@/lib/utils/battle/view";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export interface BattleMapScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view: BattleMapView;
  actions: BattleMapActions;
  placement: { active: boolean; toggle(): void } | null;
  terrainTool: MapTerrainTool | null;
  modeTools: ModeTools | null;
  weatherTool: MapWeatherTool | null;
}

export function useBattleMapScene(): BattleMapScene | null {
  const t = useTranslations("battle.notify");

  const text = useText();

  const { battle, turn: { current, isMyTurn }, viewer, selectedId, select, actions, anyPending, toast, intents, effects } = useBattleScene();

  const { requestAttack, mapAim, mapPick, attackReady } = intents;

  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);

  const { isDM } = viewer;

  const map = battle.map ?? null;

  const modeTools = useModeTools(map);

  const modeToolActive = !!modeTools?.toolActive;

  const { placing, placingId, setPlacingOn, setPlacingId, stopPlacing } = useMapPlacing(isDM, modeToolActive);

  const { mutateAsync: mapTerrain } = actions.mapTerrain;

  const { show } = toast;

  const onSkipped = useCallback((n: number) => show(t("skippedCells", { count: n })), [show, t]);

  const terrainTool = useMapTerrainTool({ isDM, mutate: mapTerrain, onSkipped, onActivate: stopPlacing });

  const toolActive = terrainTool.active || modeToolActive;

  const order = battle.initiativeOrder ?? NO_ORDER;

  const moraleDue = !!current && awaitsMoraleCheck({ participants: order, scene: { turnIndex: battle.currentTurnIndex, pendingMoraleCheck: battle.pendingMoraleCheck } }, current.basicInfo.id);

  const canAct = isMyTurn && !anyPending && !!current && !moraleDue;

  const actor = useMemo<MapSceneActor>(() => ({ current, viewer, canAct, isDM, attackReady }), [current, viewer, canAct, isDM, attackReady]);

  const mode = useMemo<MapSceneMode>(() => ({ placing, placingId, toolActive, aim: mapAim, pick: mapPick }), [placing, placingId, toolActive, mapAim, mapPick]);

  const { view: modeView } = useModeView();

  const scene = useMemo(
    () => (map ? deriveMapScene({ map, participants: order, selectedId, actor, mode, modeView }) : null),
    [map, order, selectedId, actor, mode, modeView],
  );

  const { pending: pendingStroke } = terrainTool;

  const impactFor = useFxImpacts();

  const { currentRound, currentTurnIndex } = battle;

  const hovered = useMemo(
    () => (scene?.aiming && map && mapAim && hoverCell ? aimView({ map, participants: scene.participants }, mapAim, hoverCell) : null),
    [scene, map, mapAim, hoverCell],
  );

  const previewCell = hovered ? hoverCell : null;

  const onAimHover = mapAim?.onHover;

  useEffect(() => {
    onAimHover?.(previewCell);
  }, [onAimHover, previewCell]);

  const returnId = useMemo(
    () => (canAct && map && current && !current.battleData.reserved && checkReturnToStart(map, order, current).ok ? current.basicInfo.id : null),
    [canAct, map, order, current],
  );

  const view = useMemo(() => {
    if (!scene || !map) return null;

    return composeMapView({
      scene,
      map,
      current,
      hover: { cell: hoverCell, preview: hovered },
      overlay: { returnId, pendingStroke, impactFor, effects, round: currentRound, mode: modeView },
    });
  }, [scene, map, hovered, hoverCell, pendingStroke, current, returnId, impactFor, effects, currentRound, modeView]);

  const { mutate: move } = actions.move;

  const handle = useMemo(() => {
    const handlers = mapClickHandlers({ current, turn: { round: currentRound, index: currentTurnIndex }, aim: mapAim, pick: mapPick, move, requestAttack, show: (reason) => show(text(reason)), select, arm: setPlacingId });

    return (click: MapClick) => dispatchMapClick(handlers, click);
  }, [move, requestAttack, show, text, select, setPlacingId, current, currentRound, currentTurnIndex, mapAim, mapPick]);

  const { commit } = terrainTool;

  const returnToStart = useCallback(() => {
    const to = current?.battleData.turnStartPosition;

    if (current && to) move({ participantId: current.basicInfo.id, to, returnToStart: true });
  }, [move, current]);

  const modeClick = modeTools?.clickCell;

  const closeModeTool = modeTools?.closeTool;

  const mapActions = useMapCellActions({ scene, handle, anyPending, setHoverCell, tools: { modeToolActive, modeClick, stroke: commit, returnToStart } });

  const { close: closeTerrain } = terrainTool;

  const togglePlacing = useCallback(() => {
    setPlacingOn(!placing);
    setPlacingId(null);
    closeTerrain();
    closeModeTool?.();
  }, [placing, setPlacingOn, setPlacingId, closeTerrain, closeModeTool]);

  const weatherTool = useMapWeatherTool({ isDM, current: map?.weather ?? null, mutation: actions.mapWeather });

  useExclusivePalettes(
    { mode: !!modeTools?.paletteOpen, terrain: terrainTool.active, weather: !!weatherTool?.active },
    { mode: closeModeTool, terrain: closeTerrain, weather: weatherTool?.close },
  );

  const placement = useMemo(() => (isDM ? { active: placing, toggle: togglePlacing } : null), [isDM, placing, togglePlacing]);

  if (!map || !scene || !view) return null;

  return { map, participants: scene.participants, view, actions: mapActions, placement, terrainTool: isDM ? terrainTool : null, modeTools, weatherTool };
}
