import { attackReachError } from "./attack-reach";
import { cellKey } from "./geometry";
import { type CellMark, moveMarks, targetMarks } from "./map-view";
import { cellsOf, isOnMap } from "./occupancy";

import { canSeeExactStats, type Viewer } from "@/lib/utils/battle/view/visibility";
import type { ActiveEffect, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export function mapHudEffects(effects: ActiveEffect[] | undefined): ActiveEffect[] {
  return (effects ?? []).filter((e) => !e.permanent);
}

export interface MapSceneInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  current: BattleParticipant | null;
  viewer: Viewer;
  canAct: boolean;
  isDM: boolean;
  selectedId: string | null;
  hoverCell: GridPoint | null;
  effects: Map<string, ActiveEffect[]>;
}

export type MapClick =
  | { kind: "none" }
  | { kind: "move"; participantId: string; to: GridPoint; free: boolean }
  | { kind: "attack"; targetId: string }
  | { kind: "reject"; reason: string }
  | { kind: "select"; id: string };

export interface MapScene {
  participants: BattleParticipant[];
  view: BattleMapView;
  cellClick(p: GridPoint): MapClick;
  tokenClick(id: string): MapClick;
}

export function deriveMapScene(input: MapSceneInput): MapScene {
  const { map, current, viewer, canAct, isDM, selectedId, hoverCell, effects } = input;

  const participants = input.participants.filter((p) => !p.battleData.reserved);

  const marks = new Map<string, CellMark | number>();

  const attack = current?.battleData.attacks[0];

  const canAttack = !!current && !!attack && (!current.actionFlags.hasUsedAction || (current.battleData.pendingExtraActions ?? 0) > 0);

  if (canAct && current?.battleData.position) {
    for (const [key, cost] of moveMarks(map, participants, current)) marks.set(key, cost);

    if (canAttack) for (const [key, mark] of targetMarks(map, participants, current, attack)) marks.set(key, mark);
  }

  const hud: NonNullable<BattleMapView["hud"]> = new Map();

  for (const p of participants) hud.set(p.basicInfo.id, { exact: canSeeExactStats(p, viewer), effects: mapHudEffects(effects.get(p.basicInfo.id)) });

  const hoverMark = hoverCell ? marks.get(cellKey(hoverCell)) : undefined;

  const view: BattleMapView = {
    selectedId,
    currentId: current?.basicInfo.id ?? null,
    marks,
    trajectory: current && hoverCell && hoverMark === "target" ? { fromId: current.basicInfo.id, to: hoverCell } : null,
    hud,
  };

  function tokenClick(id: string): MapClick {
    const target = participants.find((p) => p.basicInfo.id === id);

    if (canAct && current && attack && target && target.basicInfo.side !== current.basicInfo.side && isOnMap(target)) {
      const mark = marks.get(cellKey(cellsOf(target)[0]));

      if (mark === "target") return { kind: "attack", targetId: id };

      if (mark === "invalid-target") return { kind: "reject", reason: attackReachError(map, participants, current, attack, [target]) ?? "Ціль недосяжна" };
    }

    return { kind: "select", id };
  }

  function cellClick(p: GridPoint): MapClick {
    const selected = selectedId && selectedId !== current?.basicInfo.id ? participants.find((x) => x.basicInfo.id === selectedId) : undefined;

    if (isDM && selected && isOnMap(selected)) return { kind: "move", participantId: selected.basicInfo.id, to: p, free: true };

    const key = cellKey(p);

    const mark = marks.get(key);

    if (canAct && current && typeof mark === "number") return { kind: "move", participantId: current.basicInfo.id, to: p, free: false };

    if (mark === "target" || mark === "invalid-target") {
      const occupant = participants.find((x) => x.basicInfo.side !== current?.basicInfo.side && isOnMap(x) && cellsOf(x).some((c) => cellKey(c) === key));

      if (occupant) return tokenClick(occupant.basicInfo.id);
    }

    return { kind: "none" };
  }

  return { participants, view, cellClick, tokenClick };
}
