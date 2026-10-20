import { eventActorId, eventTargetIds } from "./events";
import { findParticipant, isDormant, isTargetable } from "./participants";

import type { AbilityTarget } from "@/lib/utils/abilities/schema";
import { mazeGridOf } from "@/lib/utils/battle/maze/grid";
import { seesTarget } from "@/lib/utils/battle/maze/sight";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const targetableInPlay = (p: BattleParticipant) => isTargetable(p) && !isDormant(p);

export function resolveTargetIds(
  target: AbilityTarget | undefined,
  ownerId: string,
  event: AbilityEvent,
  ps: BattleParticipant[],
  { map }: { map?: BattleMapConfig | null } = {},
): string[] {
  const owner = findParticipant(ps, ownerId);

  if (!owner) return [];

  const side = owner.basicInfo.side;

  const grid = mazeGridOf(map);

  // у лабіринті масові вміння по ворогах — лише ті, кого власник бачить (як і заклинання)
  const reachable = (p: BattleParticipant) => targetableInPlay(p) && (!grid || p.basicInfo.side === side || seesTarget(grid, owner, p));

  switch (target ?? "self") {
    case "self":
      return [ownerId];
    case "eventTarget":
      return eventTargetIds(event);
    case "eventActor": {
      const actor = eventActorId(event);

      return actor ? [actor] : [];
    }
    case "otherEnemy": {
      // без сітки поля «ворог за ціллю» — перший за ініціативою живий ворог, окрім цілі події
      const taken = new Set(eventTargetIds(event));

      const other = ps.find((p) => isTargetable(p) && p.basicInfo.side !== side && !taken.has(p.basicInfo.id));

      return other ? [other.basicInfo.id] : [];
    }
    // nearby* дозволені лише пасивкам (схема) — тут безпечний запасний варіант
    case "allAllies":
    case "nearbyAllies":
      return ps.filter((p) => targetableInPlay(p) && p.basicInfo.side === side).map((p) => p.basicInfo.id);
    case "allEnemies":
    case "nearbyEnemies":
      return ps.filter((p) => reachable(p) && p.basicInfo.side !== side).map((p) => p.basicInfo.id);
    case "everyone":
      return ps.filter(reachable).map((p) => p.basicInfo.id);
  }
}
