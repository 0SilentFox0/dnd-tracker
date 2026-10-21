import { eventActorId, eventTargetIds } from "./events";
import { findParticipant, isDormant, isTargetable } from "./participants";

import type { AbilityTarget } from "@/lib/utils/abilities/schema";
import { nearestTo } from "@/lib/utils/battle/grid/nearest";
import { modeSees } from "@/lib/utils/battle/modes/engine";
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

  // у лабіринті масові вміння по ворогах — лише ті, кого власник бачить (як і заклинання)
  const reachable = (p: BattleParticipant) => targetableInPlay(p) && (p.basicInfo.side === side || modeSees(map, owner, p));

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
      const taken = eventTargetIds(event);

      const others = ps.filter((p) => p.basicInfo.side !== side && !taken.includes(p.basicInfo.id) && reachable(p));

      const from = findParticipant(ps, taken[0] ?? "");

      const pick = from ? nearestTo(from, others) : others[0];

      return pick ? [pick.basicInfo.id] : [];
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
