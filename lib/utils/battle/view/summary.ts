import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { BattleSummary, BattleSummaryHero } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";
import type { TextRef } from "@/types/text";

type SummaryEvent = Pick<BattleAction, "round" | "actorId" | "hpChanges" | "actionDetails"> & { isCancelled?: boolean };

export function resolveOutcome(events: SummaryEvent[], participants: BattleParticipant[]): BattleSummary["outcome"] {
  const recorded = events.findLast((e) => !e.isCancelled && e.actionDetails?.battleResult)?.actionDetails?.battleResult;

  return recorded ?? checkVictoryConditions(participants).result;
}

export function summarizeBattle(events: SummaryEvent[], participants: BattleParticipant[]): BattleSummary {
  const sideOf = new Map(participants.map((p) => [p.basicInfo.id, p.basicInfo.side]));

  const stats = new Map<string, BattleSummaryHero>();

  for (const p of participants) {
    if (p.basicInfo.sourceType !== ParticipantSourceType.CHARACTER || p.basicInfo.side !== ParticipantSide.ALLY) continue;

    stats.set(p.basicInfo.id, {
      participantId: p.basicInfo.id,
      name: p.basicInfo.name,
      avatar: p.basicInfo.avatar,
      damageDealt: 0,
      healingDone: 0,
      kills: 0,
      damageTaken: 0,
      status: p.combatStats.status,
    });
  }

  let rounds = 0;

  for (const event of events) {
    if (event.isCancelled) continue;

    rounds = Math.max(rounds, event.round);

    const actor = stats.get(event.actorId);

    for (const change of event.hpChanges ?? []) {
      const victim = stats.get(change.participantId);

      if (victim && change.change > 0) victim.damageTaken += change.change;

      if (!actor) continue;

      const targetSide = sideOf.get(change.participantId);

      const actorSide = sideOf.get(event.actorId);

      if (!targetSide || !actorSide) continue;

      if (targetSide === actorSide) {
        if (change.change < 0) actor.healingDone -= change.change;

        continue;
      }

      if (change.change > 0) actor.damageDealt += change.change;

      if (change.oldHp > 0 && change.newHp <= 0) actor.kills += 1;
    }
  }

  return { outcome: resolveOutcome(events, participants), rounds, heroes: [...stats.values()] };
}

export const HERO_STATUS_LABEL: Record<BattleSummaryHero["status"], TextRef> = {
  [CombatStatus.ACTIVE]: textRef("battle.view.heroStatus.active"),
  [CombatStatus.UNCONSCIOUS]: textRef("battle.view.heroStatus.unconscious"),
  [CombatStatus.DEAD]: textRef("battle.view.heroStatus.dead"),
};
