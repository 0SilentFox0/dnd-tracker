import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { beginConcentration, castIdFor, dropConcentration, hasConcentration } from "@/lib/utils/battle/concentration";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError, systemEvent } from "@/lib/utils/battle/store";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant } from "@/types/battle";

type Source = { grantKey?: string; slotKey?: string; castLevel?: number };

export function prepareLongCast(ctx: BattleMutationContext, caster: BattleParticipant, spell: CastableSpell, source: Source, elapsed = 1) {
  if (elapsed !== 1 && !ctx.isDM) throw new BattleAccessError(403, "Лише ДМ зараховує минулий час накладання");

  const total = spell.definition.casting?.rounds;

  if (!total) throw new BattleRuleError("action_rejected", "Для тривалого накладання потрібен час у раундах");

  const pending = caster.battleData.pendingCast;

  const same = pending?.spellId === spell.id && pending.grantKey === source.grantKey && pending.slotKey === source.slotKey && pending.castLevel === source.castLevel;

  if (pending && !same) throw new BattleRuleError("action_rejected", "Спершу перервіть поточне накладання");

  if (pending && (!hasConcentration(caster) || ctx.scene.round > pending.lastRound + 1)) throw new BattleRuleError("action_rejected", "Накладання перервано: почніть знову");

  if (pending && ctx.scene.round <= pending.lastRound) throw new BattleRuleError("action_rejected", "Цього раунду накладання вже продовжено");

  const left = same && pending ? pending.remainingRounds : total;

  if (elapsed > left) throw new BattleRuleError("action_rejected", "Зарахований час перевищує залишок накладання");

  if (left <= elapsed) {
    const dropped = dropConcentration(ctx.participants, caster.basicInfo.id, "накладання завершено");

    const ready = findParticipant(dropped.participants, caster.basicInfo.id) ?? caster;

    return { ready: true as const, participants: dropped.participants, caster: { ...ready, battleData: { ...ready.battleData, pendingCast: undefined } } };
  }

  const begun = pending ? { participants: ctx.participants } : beginConcentration(ctx.participants, caster.basicInfo.id, castIdFor(caster.basicInfo.id, spell.id, ctx.scene.round, 0), spell.name, total + 1, ctx.scene.round);

  const current = findParticipant(begun.participants, caster.basicInfo.id) ?? caster;

  const next = applyMainActionUsed({ ...current, battleData: { ...current.battleData, pendingCast: { spellId: spell.id, spellName: spell.name, remainingRounds: left - elapsed, totalRounds: total, lastRound: ctx.scene.round, ...source } } });

  return { ready: false as const, participants: replaceParticipant(begun.participants, next), caster: next, event: systemEvent(ctx.scene.round, `⏳ ${caster.basicInfo.name}: ${spell.name} — залишилось ${left - elapsed} раундів накладання; слот і заряди ще не витрачено`) };
}
