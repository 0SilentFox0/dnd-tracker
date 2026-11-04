import { findParticipant, isDormant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { bothOnMap, cellsOf, footprintDistance, isOnMap } from "@/lib/utils/battle/grid";
import { modeMeleeBlockedText } from "@/lib/utils/battle/modes/engine";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const FACINGS: GridPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/** Три клітинки напрямку: сторона — ряд із трьох, діагональ — кутик (клітинка і два її сусіди). */
function facingCells(at: GridPoint, { x: dx, y: dy }: GridPoint): GridPoint[] {
  if (dx === 0) return [-1, 0, 1].map((i) => ({ x: at.x + i, y: at.y + dy }));

  if (dy === 0) return [-1, 0, 1].map((i) => ({ x: at.x + dx, y: at.y + i }));

  return [
    { x: at.x + dx, y: at.y + dy },
    { x: at.x + dx, y: at.y },
    { x: at.x, y: at.y + dy },
  ];
}

const touches = (p: BattleParticipant, cells: GridPoint[]) => cellsOf(p).some((c) => cells.some((f) => f.x === c.x && f.y === c.y));

/** Додаткові цілі багатоголової атаки: голови б'ють лише 3 клітинки в одному напрямку (з основною ціллю); обирається напрямок із найбільшою кількістю цілей, за ініціативою. */
export function cleaveTargets(map: BattleMapConfig | null | undefined, order: BattleParticipant[], attacker: BattleParticipant, target: BattleParticipant, count: number): BattleParticipant[] {
  if (count <= 0 || !bothOnMap(map, attacker, target)) return [];

  const mine = cellsOf(attacker);

  const primary = findParticipant(order, target.basicInfo.id) ?? target;

  const candidates = order.filter(
    (p) =>
      p.basicInfo.id !== target.basicInfo.id &&
      p.basicInfo.side !== attacker.basicInfo.side &&
      isTargetable(p) &&
      !isDormant(p) &&
      isOnMap(p) &&
      footprintDistance(mine, cellsOf(p)) <= 1 &&
      modeMeleeBlockedText(map, attacker, p) === null,
  );

  if (mine.length !== 1) return candidates.slice(0, count);

  let best: BattleParticipant[] = [];

  for (const facing of FACINGS) {
    const cells = facingCells(mine[0], facing);

    if (!touches(primary, cells)) continue;

    const hit = candidates.filter((p) => touches(p, cells));

    if (hit.length > best.length) best = hit;
  }

  return best.slice(0, count);
}
