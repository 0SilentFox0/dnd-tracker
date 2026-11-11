import { applyWfrpCrit } from "./crit-effect";
import { rollCrit } from "./crit-table";
import { asLocation } from "./location";

import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { DamageConsequencesResult } from "@/lib/utils/battle/damage/consequences";
import type { ZeroHpCtx } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function wfrpOnZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult {
  const { before, after, participants } = ctx;

  const wentDown = before.combatStats.currentHp > 0 && after.combatStats.currentHp <= 0 && after.combatStats.status !== CombatStatus.DEAD;

  if (!wentDown) return { participant: after, participants, messages: [] };

  const alreadyDown = before.combatStats.status === CombatStatus.UNCONSCIOUS;

  let next: BattleParticipant = { ...after, combatStats: { ...after.combatStats, status: CombatStatus.UNCONSCIOUS } };

  if (alreadyDown) return { participant: next, participants: replaceParticipant(participants, next), messages: [] };

  const messages: LogLine[] = [textRef("battleWfrp.log.unconscious", { name: after.basicInfo.name })];

  // a doubles crit (ctx.crit) was already rolled for this blow
  if (!ctx.manual && !ctx.crit) {
    const applied = applyWfrpCrit(next, { ...rollCrit(asLocation(ctx.location), ctx.rules, ctx.rng), bonusDamage: 0 }, ctx.round ?? 0);

    next = applied.participant;
    messages.push(applied.message);
  }

  return { participant: next, participants: replaceParticipant(participants, next), messages };
}
