import { eventActorId, eventTargetIds } from "./events";
import { findParticipant, isTargetable } from "./participants";

import type { AbilityTarget } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

// сплячий у лабіринті ворог «заморожений»: масові вміння його не зачіпають
const inPlay = (p: BattleParticipant) => isTargetable(p) && !p.battleData.dormant;

export function resolveTargetIds(
  target: AbilityTarget | undefined,
  ownerId: string,
  event: AbilityEvent,
  ps: BattleParticipant[],
): string[] {
  const owner = findParticipant(ps, ownerId);

  if (!owner) return [];

  const side = owner.basicInfo.side;

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
      return ps.filter((p) => inPlay(p) && p.basicInfo.side === side).map((p) => p.basicInfo.id);
    case "allEnemies":
    case "nearbyEnemies":
      return ps.filter((p) => inPlay(p) && p.basicInfo.side !== side).map((p) => p.basicInfo.id);
    case "everyone":
      return ps.filter(inPlay).map((p) => p.basicInfo.id);
  }
}
