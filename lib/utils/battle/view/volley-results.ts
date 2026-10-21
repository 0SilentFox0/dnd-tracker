import type { AttackOutcomeSummary } from "@/lib/utils/battle/flows";
import { isUp } from "@/lib/utils/battle/participant/state";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export function volleyResults(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, after: BattleParticipant[]): AttackOutcomeSummary[] {
  const downed = (id: string) => {
    const p = after.find((x) => x.basicInfo.id === id);

    return !!p && !isUp(p);
  };

  const damageTo = (a: BattleAction, id: string) => a.hpChanges.filter((h) => h.participantId === id).reduce((sum, h) => sum + Math.max(0, h.change), 0);

  return log
    .filter((a) => !seen.has(a.actionIndex) && !a.isCancelled && a.actorId === attackerId && a.actionType === "attack")
    .sort((a, b) => a.actionIndex - b.actionIndex)
    .flatMap((a) => {
      const targetId = a.targets[0]?.participantId;

      if (!targetId) return [];

      const d = a.actionDetails;

      const kind = d.isHit === false || d.isCriticalFail ? "miss" : d.isCritical ? "crit" : "hit";

      const main: AttackOutcomeSummary = { kind, targetId, damage: damageTo(a, targetId), downed: downed(targetId) };

      const splash = [...new Set(a.hpChanges.filter((h) => h.change > 0 && h.participantId !== targetId && h.participantId !== attackerId).map((h) => h.participantId))].map(
        (id): AttackOutcomeSummary => ({ kind: "hit", targetId: id, damage: damageTo(a, id), downed: downed(id), splash: true }),
      );

      return [main, ...splash];
    });
}
