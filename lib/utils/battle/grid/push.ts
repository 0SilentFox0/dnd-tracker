import { canStand } from "./occupancy";

import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

/** Клітинка на крок далі від `from` — та сама геометрія для «Штовхнути» і заклинань. */
export const awayStep = (from: GridPoint, at: GridPoint): GridPoint => ({ x: at.x + Math.sign(at.x - from.x), y: at.y + Math.sign(at.y - from.y) });

/** Крок за кроком від `from`; зупиняється перед першою клітинкою, де не можна стати. */
export function pushAway(map: BattleMapConfig, participants: BattleParticipant[], from: GridPoint, target: BattleParticipant, cells: number): { position: GridPoint; steps: number } {
  let position = target.battleData.position as GridPoint;

  let steps = 0;

  while (steps < cells) {
    const next = awayStep(from, position);

    if (next.x === position.x && next.y === position.y) break;

    if (!canStand(map, participants, target, next)) break;

    position = next;
    steps += 1;
  }

  return { position, steps };
}
