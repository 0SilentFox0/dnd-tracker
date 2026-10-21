import { damageTaken } from "./damage-taken";

import type { AttackOutcomeSummary } from "@/lib/utils/battle/flows";
import { splashVictimIds } from "@/lib/utils/battle/fx/impact";
import { isUp } from "@/lib/utils/battle/participant/state";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export function volleyResults(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, after: BattleParticipant[]): AttackOutcomeSummary[] {
  const downed = (id: string) => {
    const p = after.find((x) => x.basicInfo.id === id);

    return !!p && !isUp(p);
  };

  return log
    .filter((a) => !seen.has(a.actionIndex) && !a.isCancelled && a.actorId === attackerId && a.actionType === "attack")
    .sort((a, b) => a.actionIndex - b.actionIndex)
    .flatMap((a) => {
      const targetId = a.targets[0]?.participantId;

      if (!targetId) return [];

      const d = a.actionDetails;

      const kind = d.isHit === false || d.isCriticalFail ? "miss" : d.isCritical ? "crit" : "hit";

      const main: AttackOutcomeSummary = { kind, targetId, damage: damageTaken(a, targetId), downed: downed(targetId) };

      const splash = splashVictimIds(a, [targetId, attackerId]).map(
        (id): AttackOutcomeSummary => ({ kind: "hit", targetId: id, damage: damageTaken(a, id), downed: downed(id), splash: true }),
      );

      return [main, ...splash];
    });
}
