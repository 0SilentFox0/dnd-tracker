import { appendHpChanges, fire, getP, put, settleDowned } from "../../attack/process/ability-flow";
import { applyBalanceDamageMultiplier } from "../../damage/balance-multiplier";
import { applyMainActionUsed } from "../../participant";
import type { CastSpellResult } from "../../types/spell-process";
import { diffAppliedEffects } from "../applied-effects";
import { actionOf, flatEffects, isDamageEffect, type SpellCastState } from "./state";

import { findParticipant, isActive, mergeParticipants } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant } from "@/types/battle";

export function spendCastCost(state: SpellCastState, cost: { slotKey: string; usesSlot: boolean; isDMCast: boolean }): void {
  let caster = getP(state.flow, state.caster.basicInfo.id);

  const spent = caster.spellcasting.spellSlots[cost.slotKey];

  if (cost.usesSlot && spent) {
    caster = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { ...caster.spellcasting.spellSlots, [cost.slotKey]: { ...spent, current: spent.current - 1 } } } };
  }

  if (!cost.isDMCast) {
    caster = state.spell.definition.cost === "bonusAction" ? { ...caster, actionFlags: { ...caster.actionFlags, hasUsedBonusAction: true } } : applyMainActionUsed(caster);
  }

  put(state.flow, caster);
}

function fxMeta(def: SpellCastState["spell"]["definition"]) {
  const effects = flatEffects(def.effects);

  const damage = effects.find(isDamageEffect) as { damageType?: string } | undefined;

  return {
    ...(damage?.damageType && { spellDamageType: damage.damageType }),
    spellTargeting: def.targeting.kind,
    spellEffectKinds: [...new Set(effects.map((e) => e.kind))],
  };
}

/** Кожен, хто впав за каст — і від ефектів зі своєю ціллю (всі вороги тощо), — отримує lethalDamage/kill. */
function settleAllDowned(state: SpellCastState, before: BattleParticipant[]): void {
  const ids = [...state.targetIds, ...before.map((p) => p.basicInfo.id).filter((id) => !state.targetIds.includes(id))];

  for (const id of ids) {
    const prev = findParticipant(before, id);

    if (prev && isActive(prev)) settleDowned(state.flow, id, state.caster.basicInfo.id);
  }
}

function hpTotals(before: BattleParticipant[], after: BattleParticipant[]): { dealt: number; healed: number } {
  let dealt = 0;

  let healed = 0;

  for (const p of after) {
    const prev = findParticipant(before, p.basicInfo.id);

    if (!prev) continue;

    const delta = p.combatStats.currentHp - prev.combatStats.currentHp;

    if (delta < 0) dealt -= delta;
    else healed += delta;
  }

  return { dealt, healed };
}

interface FinishInput {
  before: BattleParticipant[];
  targetsBefore: BattleParticipant[];
  allParticipants: BattleParticipant[];
  battleId: string;
  round: number;
}

export function finishSpellAction(state: SpellCastState, { before, targetsBefore, allParticipants, battleId, round }: FinishInput): CastSpellResult {
  const { flow, spell, caster } = state;

  const def = spell.definition;

  const casterId = caster.basicInfo.id;

  settleAllDowned(state, before);
  fire(flow, { type: "spellCast", phase: "after", actorId: casterId, targetIds: state.targetIds, ...state.info });

  const { dealt, healed } = hpTotals(before, flow.ps);

  const caption = [dealt > 0 ? `шкода: ${dealt}` : "", healed > 0 ? `лікування: ${healed} HP` : ""].filter(Boolean).join(", ");

  const action = actionOf(getP(flow, casterId), spell, targetsBefore, battleId, round, [`${caster.basicInfo.name} застосовує ${spell.name}${caption ? ` (${caption})` : ""}`, ...flow.messages].join(" | "));

  const applied = diffAppliedEffects(before, flow.ps, targetsBefore.map((t) => t.basicInfo.id));

  const meta = fxMeta(def);

  if (meta.spellDamageType) {
    // only the spell's own effects: one applied by a trigger during the cast keeps its own look
    for (const { id, name, targetId } of applied) {
      if (name !== spell.name) continue;

      const target = findParticipant(flow.ps, targetId);

      if (!target) continue;

      put(flow, { ...target, battleData: { ...target.battleData, activeEffects: target.battleData.activeEffects.map((e) => (e.id === id ? { ...e, fxElement: meta.spellDamageType } : e)) } });
    }
  }

  Object.assign(action.actionDetails, {
    ...meta,
    ...(applied.length > 0 && { appliedEffects: applied }),
    spellSlotUsed: spell.level,
    ...(dealt > 0 && { totalDamage: dealt }),
    ...(healed > 0 && { totalHealing: healed }),
    ...(state.power.breakdown.length > 0 && { damageBreakdown: state.power.breakdown.join("; ") }),
    ...(state.saves.length > 0 && { savingThrows: state.saves }),
    ...(Object.keys(state.damageSteps).length > 0 && { damageSteps: state.damageSteps }),
  });
  appendHpChanges(action, before, flow.ps);

  const spellDamage = flatEffects(def.effects).some(isDamageEffect)
    ? { amount: applyBalanceDamageMultiplier(caster, state.power.damage).damage, type: meta.spellDamageType ?? "magic" }
    : undefined;

  // withSelf ставить кастера першим — повертаємо вихідний порядок ініціативи
  return {
    success: true,
    casterUpdated: getP(flow, casterId),
    allParticipantsUpdated: mergeParticipants(allParticipants, flow.ps),
    battleAction: action,
    summons: [...state.summons, ...flow.summons],
    messages: flow.messages,
    ...(spellDamage && { spellDamage }),
  };
}
