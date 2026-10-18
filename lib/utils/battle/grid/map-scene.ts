import { cellKey } from "./geometry";
import { type CellMark, moveMarks, reachingAttack, targetMarks } from "./map-view";
import { cellsOf, isOnMap } from "./occupancy";

import { canSeeExactStats, type Viewer } from "@/lib/utils/battle/view/visibility";
import type { BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export interface MapSceneInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  current: BattleParticipant | null;
  viewer: Viewer;
  canAct: boolean;
  isDM: boolean;
  placing: boolean;
  placingId: string | null;
  selectedId: string | null;
}

export type MapClick =
  | { kind: "none" }
  | { kind: "move"; participantId: string; to: GridPoint; free: boolean }
  | { kind: "attack"; targetId: string; attackId?: string }
  | { kind: "reject"; reason: string }
  | { kind: "select"; id: string }
  | { kind: "arm"; id: string };

export interface MapScene {
  participants: BattleParticipant[];
  view: BattleMapView;
  cellClick(p: GridPoint): MapClick;
  tokenClick(id: string): MapClick;
}

export function deriveTrajectory(marks: BattleMapView["marks"], currentId: string | null, hoverCell: GridPoint | null): BattleMapView["trajectory"] {
  return currentId && hoverCell && marks?.get(cellKey(hoverCell)) === "target" ? { fromId: currentId, to: hoverCell } : null;
}

export function deriveMapScene(input: MapSceneInput): MapScene {
  const { map, current, viewer, canAct, isDM, selectedId, placingId } = input;

  const placing = input.placing && isDM;

  const participants = input.participants.filter((p) => !p.battleData.reserved);

  const marks = new Map<string, CellMark | number>();

  const attacks = current?.battleData.attacks ?? [];

  const canAttack = !!current && attacks.length > 0 && (!current.actionFlags.hasUsedAction || (current.battleData.pendingExtraActions ?? 0) > 0);

  if (!placing && canAct && current?.battleData.position) {
    for (const [key, cost] of moveMarks(map, participants, current)) marks.set(key, cost);

    if (canAttack) for (const [key, mark] of targetMarks(map, participants, current, attacks)) marks.set(key, mark);
  }

  const hud: NonNullable<BattleMapView["hud"]> = new Map();

  for (const p of participants) hud.set(p.basicInfo.id, { exact: canSeeExactStats(p, viewer) });

  const view: BattleMapView = {
    selectedId: placing ? placingId : selectedId,
    currentId: current?.basicInfo.id ?? null,
    marks,
    trajectory: null,
    hud,
  };

  function tokenClick(id: string): MapClick {
    const target = participants.find((p) => p.basicInfo.id === id);

    if (placing) return target && isOnMap(target) ? { kind: "arm", id } : { kind: "none" };

    if (canAct && canAttack && current && target && target.basicInfo.side !== current.basicInfo.side && isOnMap(target)) {
      const mark = marks.get(cellKey(cellsOf(target)[0]));

      if (mark === "target") {
        const { attack } = reachingAttack(map, participants, current, attacks, target);

        return { kind: "attack", targetId: id, ...(attack && { attackId: attack.id ?? attack.name }) };
      }

      if (mark === "invalid-target") return { kind: "reject", reason: reachingAttack(map, participants, current, attacks, target).error ?? "Ціль недосяжна" };
    }

    return { kind: "select", id };
  }

  function cellClick(p: GridPoint): MapClick {
    if (placing) {
      const placed = placingId ? participants.find((x) => x.basicInfo.id === placingId) : undefined;

      return placed && isOnMap(placed) ? { kind: "move", participantId: placed.basicInfo.id, to: p, free: true } : { kind: "none" };
    }

    const key = cellKey(p);

    const mark = marks.get(key);

    if (current && isOnMap(current) && cellKey(cellsOf(current)[0]) === key) return { kind: "select", id: current.basicInfo.id };

    if (canAct && current && typeof mark === "number") return { kind: "move", participantId: current.basicInfo.id, to: p, free: false };

    if (mark === "target" || mark === "invalid-target") {
      const occupant = participants.find((x) => x.basicInfo.side !== current?.basicInfo.side && isOnMap(x) && cellsOf(x).some((c) => cellKey(c) === key));

      if (occupant) return tokenClick(occupant.basicInfo.id);
    }

    return { kind: "none" };
  }

  return { participants, view, cellClick, tokenClick };
}
