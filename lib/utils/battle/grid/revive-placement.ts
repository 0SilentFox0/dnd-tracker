import { fits, isFallen, nearestStandable, occupiedBy, occupiesCells, sizeOf } from "./occupancy";

import { modePlaceRevived } from "@/lib/utils/battle/modes/server";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

/** Воскреслі стають на свою останню клітинку, а якщо вона зайнята — на найближчу вільну; без клітинки лишаються до звичайної розстановки. */
export function placeRevived(map: BattleMapConfig, before: BattleParticipant[], after: BattleParticipant[]): BattleParticipant[] {
  const fallen = new Set(before.filter(isFallen).map((p) => p.basicInfo.id));

  const pending = new Set(after.filter((p) => fallen.has(p.basicInfo.id) && occupiesCells(p)).map((p) => p.basicInfo.id));

  let out = after;

  for (const p of after) {
    const id = p.basicInfo.id;

    if (!pending.delete(id) || !p.battleData.position) continue;

    const from = p.battleData.position;

    // ще не поставлені воскреслі клітинок не займають, інакше порядок у списку вирішував би, хто зсувається
    const standing = out.filter((q) => !pending.has(q.basicInfo.id));

    const others = occupiedBy(standing, (q) => q.basicInfo.id !== id);

    const byMode = modePlaceRevived(map, { participants: standing, mover: p, from });

    const cell = byMode !== undefined ? byMode : fits(map, from, sizeOf(p), others) ? from : nearestStandable(map, standing, p, from);

    if (cell?.x === from.x && cell.y === from.y) continue;

    const placed = { ...p, battleData: { ...p.battleData, position: cell ?? undefined } };

    out = out.map((q) => (q === p ? placed : q));
  }

  return out;
}
