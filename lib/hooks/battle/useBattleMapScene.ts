"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBattleScene } from "./useBattleScene";
import { type MapTerrainTool, useMapTerrainTool } from "./useMapTerrainTool";

import { cellKey, deriveMapScene, deriveTrajectory, type MapClick } from "@/lib/utils/battle/grid";
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

const sameCell = (a: GridPoint | null, b: GridPoint | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y);

export function useBattleMapScene(): BattleMapScene | null {
  const { battle, current, viewer, isMyTurn, isDM, selectedId, select, actions, anyPending, requestAttack, toast } = useBattleScene();

  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);

  const [placingOn, setPlacingOn] = useState(false);

  const [placingId, setPlacingId] = useState<string | null>(null);

  const stopPlacing = useCallback(() => {
    setPlacingOn(false);
    setPlacingId(null);
  }, []);

  const { mutate: mapTerrain } = actions.mapTerrain;

  const terrainTool = useMapTerrainTool({ isDM, mutate: mapTerrain, onActivate: stopPlacing });

  const placing = placingOn && isDM;

  const toolActive = terrainTool.active;

  const map = battle.map ?? null;

  const order = battle.initiativeOrder ?? NO_ORDER;

  const canAct = isMyTurn && !anyPending && !!current;

  const scene = useMemo(
    () => (map ? deriveMapScene({ map, participants: order, current, viewer, canAct, isDM, placing, toolActive, placingId, selectedId }) : null),
    [map, order, current, viewer, canAct, isDM, placing, toolActive, placingId, selectedId],
  );

  const view = useMemo(
    () => (scene ? { ...scene.view, trajectory: deriveTrajectory(scene.view.marks, scene.view.currentId ?? null, hoverCell) } : null),
    [scene, hoverCell],
  );

  const { mutate: move } = actions.move;

  const { show } = toast;

  const { currentRound, currentTurnIndex } = battle;

  const handle = useCallback(
    (click: MapClick) => {
      switch (click.kind) {
        case "move":
          move({ participantId: click.participantId, to: click.to, ...(click.free && { free: true }) });
          break;
        case "attack":
          if (current) requestAttack({ targetId: click.targetId, ...(click.attackId && { attackId: click.attackId }), actorId: current.basicInfo.id, round: currentRound, turnIndex: currentTurnIndex });

          break;
        case "reject":
          show(click.reason);
          break;
        case "select":
          select(click.id);
          break;
        case "arm":
          setPlacingId(click.id);
          break;
        case "none":
          break;
      }
    },
    [move, requestAttack, show, select, current, currentRound, currentTurnIndex],
  );

  const { commit } = terrainTool;

  const latest = useRef({ scene, handle, anyPending, stroke: commit });

  useEffect(() => {
    latest.current = { scene, handle, anyPending, stroke: commit };
  });

  const mapActions = useMemo<BattleMapActions>(
    () => ({
      onCellClick: (p) => {
        const l = latest.current;

        if (!l.anyPending && l.scene) l.handle(l.scene.cellClick(p));
      },
      onCellHover: (p) =>
        setHoverCell((prev) => {
          const next = p && latest.current.scene?.view.marks?.get(cellKey(p)) === "target" ? p : null;

          return sameCell(prev, next) ? prev : next;
        }),
      onStroke: (cells) => latest.current.stroke(cells),
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
