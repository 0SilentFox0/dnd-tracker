import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { heroTunnel, mazeAwareness, nearestFree, tunnelFacing } from "@/lib/utils/battle/maze";
import { toReserve } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError, type NewBattleEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { originalSide } from "@/lib/utils/battle/turn/victory";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const reject = (message: string): never => {
  throw new BattleRuleError("action_rejected", message);
};

const isDead = (p: BattleParticipant) => p.combatStats.status === CombatStatus.DEAD;

// зачарований лишається на своєму початковому боці, як у перевірці перемоги
const leaves = (p: BattleParticipant) => originalSide(p) === ParticipantSide.ENEMY && (!!p.basicInfo.isExtraTurnSlot || !isDead(p));

const entersTunnel = (p: BattleParticipant) => originalSide(p) === ParticipantSide.ALLY && !p.basicInfo.isExtraTurnSlot && !isDead(p) && !p.battleData.escaped;

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

  const advanced = advanceTurn({ participants: remaining, pending, scene: { ...ctx.scene, turnIndex: before - 1, pendingMoraleCheck: null }, map, skipEnding: true });

  return { participants: advanced.participants, pending: advanced.pending, scene: advanced.scene, events: advanced.actions.map(battleActionToEvent) };
}

const tunnelError = (heroes: number) => `Тунель від центру до краю не вміщує ${heroes} героїв`;

/** «1 тунель»: вороги зникають у резерв ДМа, решта карти — відкрита кімната, герої стоять рядом у прямому тунелі від центру до нового виходу на краю. */
export function tunnelMutation(ctx: BattleMutationContext, maze: MazeConfig, event: NewBattleEvent): MutationResult {
  const base = ctx.meta.map as BattleMapConfig;

  const heroes = ctx.participants.filter(entersTunnel);

  const tunnel = heroTunnel(base, maze.exit, heroes.length) ?? reject(tunnelError(heroes.length));

  const nextMaze: MazeConfig = { ...maze, walls: tunnel.walls, exit: tunnel.exit, teleports: [], fog: [], marks: {}, moved: true };

  const grid = { cols: base.cols, rows: base.rows, maze: nextMaze };

  const spotOf = new Map(heroes.map((h, i) => [h.basicInfo.id, tunnel.cells[i]]));

  const inTunnel = new Set(tunnel.cells.map(cellKey));

  const taken = new Set(inTunnel);

  const stays = ctx.participants.filter((p) => !leaves(p) && !spotOf.has(p.basicInfo.id) && p.battleData.position);

  stays.forEach((p) => taken.add(cellKey(p.battleData.position as GridPoint)));

  // тіла й вибулі, що лежали на лінії тунелю, зсуваються в кімнату поруч
  const shifted = new Map(
    stays.flatMap((p) => {
      const at = p.battleData.position as GridPoint;

      if (!inTunnel.has(cellKey(at))) return [];

      const free = nearestFree(base, at, taken);

      if (free) taken.add(cellKey(free));

      return free ? [[p.basicInfo.id, free] as const] : [];
    }),
  );

  const remaining = ctx.participants.filter((p) => !leaves(p)).map((p) => {
    const at = spotOf.get(p.basicInfo.id);

    if (at) return { ...p, battleData: { ...p.battleData, position: at, facing: tunnelFacing(tunnel) } };

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
