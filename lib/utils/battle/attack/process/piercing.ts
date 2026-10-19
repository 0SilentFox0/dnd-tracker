import { findParticipant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { apexOf, cellDistance, cellKey, cellLine, cellsOf, footprintDistance, inBounds, isOnMap } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

function lineBeyond(map: BattleMapConfig, apex: GridPoint, through: GridPoint): Set<string> {
  const vx = through.x - apex.x;

  const vy = through.y - apex.y;

  const k = Math.ceil(Math.max(map.cols, map.rows) / Math.max(Math.abs(vx), Math.abs(vy), 1)) + 1;

  const cells = [...cellLine(apex, through), ...cellLine(apex, { x: apex.x + vx * k, y: apex.y + vy * k })].filter((c) => inBounds(map, c));

  return new Set(cells.map(cellKey));
}

export function piercingTargets(map: BattleMapConfig | undefined, ps: BattleParticipant[], attacker: BattleParticipant, firstTargetId: string): string[] {
  const first = findParticipant(ps, firstTargetId);

  if (!map || !first || !isOnMap(attacker) || !isOnMap(first)) return [firstTargetId];

  const origin = cellsOf(attacker);

  const through = cellsOf(first).reduce((best, c) => (footprintDistance(origin, [c]) < footprintDistance(origin, [best]) ? c : best));

  const apex = apexOf(origin, through);

  const line = lineBeyond(map, apex, through);

  const rest = ps
    .filter((p) => p.basicInfo.id !== firstTargetId && p.basicInfo.side !== attacker.basicInfo.side && isTargetable(p) && isOnMap(p) && cellsOf(p).some((c) => line.has(cellKey(c))))
    .map((p, i) => ({ id: p.basicInfo.id, i, d: footprintDistance([apex], cellsOf(p)) }))
    .filter((x) => x.d >= cellDistance(apex, through))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.id);

  return [firstTargetId, ...rest];
}
