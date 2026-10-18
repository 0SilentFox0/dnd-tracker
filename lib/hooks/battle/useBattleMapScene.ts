"use client";

import { useCallback, useMemo, useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { deriveMapScene, type MapClick } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export interface BattleMapScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view: BattleMapView;
  actions: BattleMapActions;
}

const NO_ORDER: BattleParticipant[] = [];

export function useBattleMapScene(): BattleMapScene | null {
  const { battle, current, viewer, isMyTurn, isDM, selectedId, select, effects, actions, anyPending, requestAttack, toast } = useBattleScene();

  const [hoverCell, setHoverCell] = useState<GridPoint | null>(null);

  const map = battle.map ?? null;

  const order = battle.initiativeOrder ?? NO_ORDER;

  const canAct = isMyTurn && !anyPending && !!current;

  const scene = useMemo(
    () => (map ? deriveMapScene({ map, participants: order, current, viewer, canAct, isDM, selectedId, hoverCell, effects }) : null),
    [map, order, current, viewer, canAct, isDM, selectedId, hoverCell, effects],
  );

  const { mutate: move } = actions.move;

  const { show } = toast;

  const handle = useCallback(
    (click: MapClick) => {
      switch (click.kind) {
        case "move":
          move({ participantId: click.participantId, to: click.to, ...(click.free && { free: true }) });
          break;
        case "attack":
          requestAttack(click.targetId);
          break;
        case "reject":
          show(click.reason);
          break;
        case "select":
          select(click.id);
          break;
        case "none":
          break;
      }
    },
    [move, requestAttack, show, select],
  );

  const mapActions = useMemo<BattleMapActions>(
    () => ({
      onCellClick: (p) => {
        if (!anyPending && scene) handle(scene.cellClick(p));
      },
      onCellHover: setHoverCell,
      onTokenClick: (id) => {
        if (scene) handle(scene.tokenClick(id));
      },
    }),
    [scene, handle, anyPending],
  );

  if (!map || !scene) return null;

  return { map, participants: scene.participants, view: scene.view, actions: mapActions };
}
