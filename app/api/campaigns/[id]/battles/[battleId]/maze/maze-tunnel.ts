import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { clusterAt, facingTo, mazeAwareness, roomCentre, tunnelRoom } from "@/lib/utils/battle/maze";
import { toReserve } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError, type NewBattleEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

export const MAZE_TUNNEL_NO_EXIT = "Спершу поставте вихід лабіринту";

export const MAZE_TUNNEL_NO_ROOM = "У кімнаті не вистачає місця для героїв";

const reject = (message: string): never => {
  throw new BattleRuleError("action_rejected", message);
};

const isDead = (p: BattleParticipant) => p.combatStats.status === CombatStatus.DEAD;

const isEnemy = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ENEMY;

const leaves = (p: BattleParticipant) => isEnemy(p) && (!!p.basicInfo.isExtraTurnSlot || !isDead(p));

const movesToCentre = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY && !isDead(p) && !p.battleData.escaped;

// у резерві позиції немає: після «Ввести в бій» лабіринт сам поставить ворога (сплячим) на вільну клітинку
function intoReserve(p: BattleParticipant): BattleParticipant {
  const { position: _position, dormant: _dormant, mazeWakeRound: _wake, facing: _facing, ...battleData } = p.battleData;

  return toReserve({ ...p, battleData });
}

function turnAfter(ctx: BattleMutationContext, remaining: BattleParticipant[], pending: BattleParticipant[], map: BattleMapConfig) {
  const current = ctx.participants[ctx.scene.turnIndex];

  const kept = current ? remaining.findIndex((p) => p.basicInfo.id === current.basicInfo.id) : -1;

  if (kept >= 0 || remaining.length === 0) return { participants: remaining, pending, scene: { turnIndex: Math.max(0, kept) }, events: [] };

  // ходив ворог, що зник — хід переходить далі, як після видалення учасника
  const before = ctx.participants.slice(0, ctx.scene.turnIndex).filter((p) => !leaves(p)).length;

  const advanced = advanceTurn({ participants: remaining, pending, scene: { ...ctx.scene, turnIndex: before - 1, pendingMoraleCheck: null }, map });

  return { participants: advanced.participants, pending: advanced.pending, scene: advanced.scene, events: advanced.actions.map(battleActionToEvent) };
}

/** «1 тунель»: вороги зникають у резерв ДМа, лабіринт стає однією кімнатою з тунелем до виходу, герої збираються в центрі. */
export function tunnelMutation(ctx: BattleMutationContext, maze: MazeConfig, event: NewBattleEvent): MutationResult {
  const base = ctx.meta.map as BattleMapConfig;

  const exit = maze.exit ?? reject(MAZE_TUNNEL_NO_EXIT);

  const room = tunnelRoom(base, exit);

  const nextMaze: MazeConfig = { ...maze, walls: [...room.walls].sort(), teleports: [], fog: [], marks: {}, moved: true };

  const grid = { cols: base.cols, rows: base.rows, maze: nextMaze };

  const heroes = ctx.participants.filter(movesToCentre);

  const blocked = new Set([...room.cells.map(cellKey), ...ctx.participants.filter((p) => !leaves(p) && !movesToCentre(p) && p.battleData.position).map((p) => cellKey(p.battleData.position as GridPoint))]);

  const spots = clusterAt(grid, roomCentre(base), heroes.length, blocked) ?? reject(MAZE_TUNNEL_NO_ROOM);

  const facingTarget = room.cells.at(-1) ?? exit;

  const spotOf = new Map(heroes.map((h, i) => [h.basicInfo.id, spots[i]]));

  const remaining = ctx.participants.filter((p) => !leaves(p)).map((p) => {
    const at = spotOf.get(p.basicInfo.id);

    return at ? { ...p, battleData: { ...p.battleData, position: at, facing: facingTo(at, facingTarget) } } : p;
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
