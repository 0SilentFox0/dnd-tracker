import { applyWfrpConditionTo } from "../conditions/apply";
import { rollTable } from "../tables/roll-table";
import { MISCAST_TABLE } from "./miscast-table";

import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/effects/hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules";
import type { ApplyDamageConsequences, SystemConditionResult } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function wfrpMiscast(
  ps: BattleParticipant[],
  casterId: string,
  kind: "minor" | "major",
  ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences; presetRoll?: number },
): SystemConditionResult {
  const caster = findParticipant(ps, casterId);

  if (!caster) return { participants: ps, messages: [] };

  const { index, row } = rollTable(MISCAST_TABLE[kind], ctx.rng, ctx.presetRoll);

  const name = caster.basicInfo.name;

  const messages: LogLine[] = [textRef("wfrpMagic.log.miscast", { name, effect: dynamicTextRef(`wfrpMagic.miscast.${kind}.${index + 1}`) })];

  let participants = ps;

  if (row.condition) {
    const applied = applyWfrpConditionTo(caster, { ...row.condition, round: ctx.round, sourceName: dynamicTextRef(`wfrpMagic.miscast.${kind}.${index + 1}`) });

    participants = replaceParticipant(participants, applied.participant);

    messages.push(...applied.messages);
  }

  const before = findParticipant(participants, casterId);

  if (row.wounds && before) {
    const after = dropBreakOnDamage({ ...before, combatStats: { ...before.combatStats, currentHp: Math.max(0, before.combatStats.currentHp - row.wounds) } }, row.wounds);

    const r = ctx.applyDamage({ before, after, amount: row.wounds, rules: ctx.rules, rng: ctx.rng, participants: replaceParticipant(participants, after), round: ctx.round });

    participants = r.participants;

    messages.push(...r.messages);
  }

  return { participants, messages };
}
