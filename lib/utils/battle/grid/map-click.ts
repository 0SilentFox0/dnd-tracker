import type { MapAim, MapClick, MapPick } from "./map-scene";

import type { AttackIntent } from "@/lib/utils/battle/flows";
import type { BattleParticipant, GridPoint } from "@/types/battle";

type MapClickHandlers = { [K in MapClick["kind"]]: (click: Extract<MapClick, { kind: K }>) => void };

interface MapClickDeps {
  current: BattleParticipant | null;
  turn: { round: number; index: number };
  aim: MapAim | null;
  pick: MapPick | null;
  move(input: { participantId: string; to: GridPoint; free?: true }): void;
  requestAttack(intent: AttackIntent): void;
  show(message: string): void;
  select(id: string): void;
  arm(id: string): void;
}

export function mapClickHandlers({ current, turn, aim, pick, move, requestAttack, show, select, arm }: MapClickDeps): MapClickHandlers {
  return {
    move: (c) => move({ participantId: c.participantId, to: c.to, ...(c.free && { free: true as const }) }),
    attack: (c) => {
      if (current) requestAttack({ targetId: c.targetId, ...(c.attackId && { attackId: c.attackId }), actorId: current.basicInfo.id, round: turn.round, turnIndex: turn.index });
    },
    reject: (c) => show(c.reason),
    select: (c) => select(c.id),
    arm: (c) => arm(c.id),
    aim: (c) => aim?.onAim(c.cell),
    pick: (c) => pick?.onPick(c.id),
    none: () => undefined,
  };
}

export function dispatchMapClick<K extends MapClick["kind"]>(handlers: MapClickHandlers, click: Extract<MapClick, { kind: K }>) {
  (handlers[click.kind] as (c: typeof click) => void)(click);
}

export const sameCell = (a: GridPoint | null, b: GridPoint | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y);
