"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { cellKey, deriveMapScene, deriveTrajectory, type MapClick } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export interface BattleMapScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view: BattleMapView;
  actions: BattleMapActions;
  placement: { active: boolean; toggle(): void } | null;
}

const NO_ORDER: BattleParticipant[] = [];

const sameCell = (a: GridPoint | null, b: GridPoint | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y);

export function useBattleMapScene(): BattleMapScene | null {
  const { battle, current, viewer, isMyTurn, isDM, selectedId, select, effects, actions, anyPending, requestAttack, toast } = useBattleScene();

  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);

  const [placingOn, setPlacingOn] = useState(false);

  const [placingId, setPlacingId] = useState<string | null>(null);

  const placing = placingOn && isDM;

  const map = battle.map ?? null;

  const order = battle.initiativeOrder ?? NO_ORDER;

  const canAct = isMyTurn && !anyPending && !!current;

  const scene = useMemo(
    () => (map ? deriveMapScene({ map, participants: order, current, viewer, canAct, isDM, placing, placingId, selectedId, effects }) : null),
    [map, order, current, viewer, canAct, isDM, placing, placingId, selectedId, effects],
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

  const latest = useRef({ scene, handle, anyPending });

  useEffect(() => {
    latest.current = { scene, handle, anyPending };
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
      onTokenClick: (id) => {
        const l = latest.current;

        if (l.scene) l.handle(l.scene.tokenClick(id));
      },
    }),
    [],
  );

  const togglePlacing = useCallback(() => {
    setPlacingOn((on) => !on);
    setPlacingId(null);
  }, []);

  useEffect(() => {
    if (!placing) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      setPlacingOn(false);
      setPlacingId(null);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [placing]);

  const placement = useMemo(() => (isDM ? { active: placing, toggle: togglePlacing } : null), [isDM, placing, togglePlacing]);

  if (!map || !scene || !view) return null;

  return { map, participants: scene.participants, view, actions: mapActions, placement };
}
