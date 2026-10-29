import type { MazeEnv } from "./maze-ops";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import { currentOf } from "@/lib/utils/battle/common/control";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { heroTunnel, isPlaced, mazeAwareness, nearestFree } from "@/lib/utils/battle/modes/maze";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import { toReserve } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, type NewBattleEvent, rejectAction } from "@/lib/utils/battle/store";
import { advanceAfterRemoval } from "@/lib/utils/battle/turn";
import { originalSide } from "@/lib/utils/battle/turn/original-side";
import type { BattleMapConfig, BattleParticipant, MazeConfig } from "@/types/battle";

const isDead = (p: BattleParticipant) => p.combatStats.status === CombatStatus.DEAD;

// зачарований лишається на своєму початковому боці, як у перевірці перемоги
const leaves = (p: BattleParticipant) => originalSide(p) === ParticipantSide.ENEMY && (!!p.basicInfo.isExtraTurnSlot || !isDead(p));

const entersTunnel = (p: BattleParticipant) => originalSide(p) === ParticipantSide.ALLY && !p.basicInfo.isExtraTurnSlot && !isDead(p) && !isEscaped(p);

// у резерві позиції немає: після «Ввести в бій» лабіринт сам поставить ворога (сплячим) на вільну клітинку
function intoReserve(p: BattleParticipant): BattleParticipant {
  const { position: _position, dormant: _dormant, mazeWakeRound: _wake, facing: _facing, ...battleData } = p.battleData;

  return toReserve({ ...p, battleData });
}

function turnAfter(ctx: BattleMutationContext, remaining: BattleParticipant[], pending: BattleParticipant[], map: BattleMapConfig) {
  const current = currentOf(ctx);

  const kept = current ? remaining.findIndex((p) => p.basicInfo.id === current.basicInfo.id) : -1;

  if (kept >= 0 || remaining.length === 0) return { participants: remaining, pending, scene: { turnIndex: Math.max(0, kept) }, events: [] };

  const before = ctx.participants.slice(0, ctx.scene.turnIndex).filter((p) => !leaves(p)).length;

  const advanced = advanceAfterRemoval({ participants: remaining, pending, scene: ctx.scene, map, before });

  return { participants: advanced.participants, pending: advanced.pending, scene: advanced.scene, events: advanced.actions.map(battleActionToEvent) };
}

/** «1 тунель»: вороги зникають у резерв ДМа, решта карти — відкрита кімната, герої стоять рядом у прямому тунелі від центру до нового виходу на краю; перший за ініціативою — біля виходу. */
export function tunnelMutation(ctx: BattleMutationContext, { map: base, grid: current }: MazeEnv, event: NewBattleEvent): MutationResult {
  const heroes = ctx.participants.filter(entersTunnel);

  const tunnel = heroTunnel(base, current.maze.exit, heroes.length) ?? rejectAction(MAZE_TEXTS.tunnelTooShort(heroes.length));

  const nextMaze: MazeConfig = { ...current.maze, walls: tunnel.walls, exit: tunnel.exit, teleports: [], fog: [], marks: {}, moved: true };

  const grid = { ...current, maze: nextMaze };

  const spotOf = new Map(heroes.map((h, i) => [h.basicInfo.id, tunnel.cells[tunnel.cells.length - 2 - i]]));

  const inTunnel = new Set(tunnel.cells.map(cellKey));

  const taken = new Set(inTunnel);

  const stays = ctx.participants.filter((p) => !leaves(p) && !spotOf.has(p.basicInfo.id)).filter(isPlaced);

  stays.forEach((p) => taken.add(cellKey(p.battleData.position)));

  // тіла й вибулі, що лежали на лінії тунелю, зсуваються в кімнату поруч
  const shifted = new Map(
    stays.flatMap((p) => {
      const at = p.battleData.position;

      if (!inTunnel.has(cellKey(at))) return [];

      const free = nearestFree(base, at, taken);

      if (free) taken.add(cellKey(free));

      return free ? [[p.basicInfo.id, free] as const] : [];
    }),
  );

  const remaining = ctx.participants.filter((p) => !leaves(p)).map((p) => {
    const at = spotOf.get(p.basicInfo.id);

    if (at) return { ...p, battleData: { ...p.battleData, position: at, facing: tunnel.dir } };

    const moved = shifted.get(p.basicInfo.id);

    return moved ? { ...p, battleData: { ...p.battleData, position: moved } } : p;
  });

  const reserve = ctx.participants.filter((p) => leaves(p) && !p.basicInfo.isExtraTurnSlot).map(intoReserve);

  const map = { ...base, maze: nextMaze };

  const turn = turnAfter(ctx, remaining, [...ctx.pending, ...reserve], map);

  const awareness = mazeAwareness(grid, { participants: turn.participants, round: ctx.scene.round, sleep: true });

  return {
    participants: awareness.participants,
    pending: turn.pending,
    scene: { ...turn.scene, map },
    events: [event, ...turn.events, ...awareness.events],
  };
}
