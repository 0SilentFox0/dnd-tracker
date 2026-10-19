"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBattleScene } from "./useBattleScene";
import { useFxImpacts } from "./useFxImpact";
import { type MapTerrainTool, useMapTerrainTool } from "./useMapTerrainTool";

import { aimView, cellKey, checkReturnToStart, deriveMapScene, deriveTrajectory, type MapClick, type MapSceneActor, type MapSceneMode } from "@/lib/utils/battle/grid";
import { pluralUk } from "@/lib/utils/common/plural";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export interface BattleMapScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view: BattleMapView;
  actions: BattleMapActions;
  placement: { active: boolean; toggle(): void } | null;
  terrainTool: MapTerrainTool | null;
}

const NO_ORDER: BattleParticipant[] = [];

type MapClickHandlers = { [K in MapClick["kind"]]: (click: Extract<MapClick, { kind: K }>) => void };

function dispatchClick<K extends MapClick["kind"]>(handlers: MapClickHandlers, click: Extract<MapClick, { kind: K }>) {
  (handlers[click.kind] as (c: typeof click) => void)(click);
}

const sameCell = (a: GridPoint | null, b: GridPoint | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y);

export function useBattleMapScene(): BattleMapScene | null {
  const { battle, turn: { current, isMyTurn }, viewer, selectedId, select, actions, anyPending, toast, intents, effects } = useBattleScene();

  const { requestAttack, mapAim, attackReady } = intents;

  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);

  const [placingOn, setPlacingOn] = useState(false);

  const [placingId, setPlacingId] = useState<string | null>(null);

  const stopPlacing = useCallback(() => {
    setPlacingOn(false);
    setPlacingId(null);
  }, []);

  const { mutateAsync: mapTerrain } = actions.mapTerrain;

  const { show } = toast;

  const onSkipped = useCallback((n: number) => show(`Пропущено ${n} ${pluralUk(n, ["клітинку", "клітинки", "клітинок"])} (зайняті або поза полем)`), [show]);

  const { isDM } = viewer;

  const terrainTool = useMapTerrainTool({ isDM, mutate: mapTerrain, onSkipped, onActivate: stopPlacing });

  const placing = placingOn && isDM;

  const toolActive = terrainTool.active;

  const map = battle.map ?? null;

  const order = battle.initiativeOrder ?? NO_ORDER;

  const canAct = isMyTurn && !anyPending && !!current;

  const actor = useMemo<MapSceneActor>(() => ({ current, viewer, canAct, isDM, attackReady }), [current, viewer, canAct, isDM, attackReady]);

  const mode = useMemo<MapSceneMode>(() => ({ placing, placingId, toolActive, aim: mapAim }), [placing, placingId, toolActive, mapAim]);

  const scene = useMemo(
    () => (map ? deriveMapScene({ map, participants: order, selectedId, actor, mode }) : null),
    [map, order, selectedId, actor, mode],
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

    return {
      ...scene.view,
      ...hovered,
      trajectory: deriveTrajectory({ map, participants: scene.participants, marks: scene.view.marks, current }, hoverCell),
      ...(returnId && { returnId }),
      ...(pendingStroke.size > 0 && { pendingStroke }),
      impactFor,
      effects,
      round: currentRound,
    };
  }, [scene, map, hovered, hoverCell, pendingStroke, current, returnId, impactFor, effects, currentRound]);

  const { mutate: move } = actions.move;

  const handle = useMemo(() => {
    const handlers: MapClickHandlers = {
      move: (c) => move({ participantId: c.participantId, to: c.to, ...(c.free && { free: true }) }),
      attack: (c) => {
        if (current) requestAttack({ targetId: c.targetId, ...(c.attackId && { attackId: c.attackId }), actorId: current.basicInfo.id, round: currentRound, turnIndex: currentTurnIndex });
      },
      reject: (c) => show(c.reason),
      select: (c) => select(c.id),
      arm: (c) => setPlacingId(c.id),
      aim: (c) => mapAim?.onAim(c.cell),
      none: () => undefined,
    };

    return (click: MapClick) => dispatchClick(handlers, click);
  }, [move, requestAttack, show, select, current, currentRound, currentTurnIndex, mapAim]);

  const { commit } = terrainTool;

  const returnToStart = useCallback(() => {
    const to = current?.battleData.turnStartPosition;

    if (current && to) move({ participantId: current.basicInfo.id, to, returnToStart: true });
  }, [move, current]);

  const latest = useRef({ scene, handle, anyPending, stroke: commit, returnToStart });

  useEffect(() => {
    latest.current = { scene, handle, anyPending, stroke: commit, returnToStart };
  });

  const mapActions = useMemo<BattleMapActions>(
    () => ({
      onCellClick: (p) => {
        const l = latest.current;

        if (!l.anyPending && l.scene) l.handle(l.scene.cellClick(p));
      },
      onCellHover: (p) =>
        setHoverCell((prev) => {
          const l = latest.current.scene;

          const next = p && (l?.aiming || l?.view.marks?.get(cellKey(p)) === "target") ? p : null;

          return sameCell(prev, next) ? prev : next;
        }),
      onStroke: (cells) => latest.current.stroke(cells),
      onReturn: () => latest.current.returnToStart(),
      onTokenClick: (id) => {
        const l = latest.current;

        if (l.scene) l.handle(l.scene.tokenClick(id));
      },
    }),
    [],
  );

  const { close: closeTerrain } = terrainTool;

  const togglePlacing = useCallback(() => {
    setPlacingOn((on) => !on);
    setPlacingId(null);
    closeTerrain();
  }, [closeTerrain]);

  useEffect(() => {
    if (!placing) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      stopPlacing();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [placing, stopPlacing]);

  const placement = useMemo(() => (isDM ? { active: placing, toggle: togglePlacing } : null), [isDM, placing, togglePlacing]);

  if (!map || !scene || !view) return null;

  return { map, participants: scene.participants, view, actions: mapActions, placement, terrainTool: isDM ? terrainTool : null };
}
