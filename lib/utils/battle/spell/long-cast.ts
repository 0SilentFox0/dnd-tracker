import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import { beginConcentration, castIdFor, dropConcentration, hasConcentration } from "@/lib/utils/battle/concentration";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, ruleErrorOf, systemEvent } from "@/lib/utils/battle/store";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant } from "@/types/battle";

type Source = { grantKey?: string; slotKey?: string; castLevel?: number };

export function prepareLongCast(ctx: BattleMutationContext, caster: BattleParticipant, spell: CastableSpell, source: Source, elapsed = 1) {
  if (elapsed !== 1 && !ctx.isDM) throw new BattleAccessError(403, actionReason("castDmOnly").message);

  const total = spell.definition.casting?.rounds;

  if (!total) throw ruleErrorOf("action_rejected", actionReason("castNoRounds"));

  const pending = caster.battleData.pendingCast;

  const same = pending?.spellId === spell.id && pending.grantKey === source.grantKey && pending.slotKey === source.slotKey && pending.castLevel === source.castLevel;

  if (pending && !same) throw ruleErrorOf("action_rejected", actionReason("castPending"));

  if (pending && (!hasConcentration(caster) || ctx.scene.round > pending.lastRound + 1)) throw ruleErrorOf("action_rejected", actionReason("castInterrupted"));

  if (pending && ctx.scene.round <= pending.lastRound) throw ruleErrorOf("action_rejected", actionReason("castContinued"));

  const left = same && pending ? pending.remainingRounds : total;

  if (elapsed > left) throw ruleErrorOf("action_rejected", actionReason("castOverrun"));

  if (left <= elapsed) {
    const dropped = dropConcentration(ctx.participants, caster.basicInfo.id, textRef("battleActions.spell.castFinished"));

    const ready = findParticipant(dropped.participants, caster.basicInfo.id) ?? caster;

    return { ready: true as const, participants: dropped.participants, caster: { ...ready, battleData: { ...ready.battleData, pendingCast: undefined } } };
  }

  const begun = pending ? { participants: ctx.participants } : beginConcentration(ctx.participants, caster.basicInfo.id, castIdFor(caster.basicInfo.id, spell.id, ctx.scene.round, 0), spell.name, total + 1, ctx.scene.round);

  const current = findParticipant(begun.participants, caster.basicInfo.id) ?? caster;

  const next = applyMainActionUsed({ ...current, battleData: { ...current.battleData, pendingCast: { spellId: spell.id, spellName: spell.name, remainingRounds: left - elapsed, totalRounds: total, lastRound: ctx.scene.round, ...source } } });

  return { ready: false as const, participants: replaceParticipant(begun.participants, next), caster: next, event: systemEvent(ctx.scene.round, textRef("battleActions.spell.castProgress", { name: caster.basicInfo.name, spell: spell.name, rounds: left - elapsed })) };
}
