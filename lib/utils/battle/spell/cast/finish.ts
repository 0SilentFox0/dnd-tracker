import { findParticipant, isActive, mergeParticipants } from "@/lib/utils/abilities/engine/core/participants";
import { appendHpChanges, fire, getP, put, settleDowned } from "@/lib/utils/battle/common/action-flow";
import { applyBalanceDamageMultiplier } from "@/lib/utils/battle/damage/balance-multiplier";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import { diffAppliedEffects } from "@/lib/utils/battle/spell/applied-effects";
import { actionOf, flatEffects, isDamageEffect, SPELL_ONLY_KINDS, type SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import type { CastSpellResult } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant, SpellGrant } from "@/types/battle";

export function spendCastCost(state: SpellCastState, cost: { slotKey: string; usesSlot: boolean; isDMCast: boolean; isLegendaryCast?: boolean; grant?: SpellGrant }): void {
  let caster = getP(state.flow, state.caster.basicInfo.id);

  const spent = caster.spellcasting.spellSlots[cost.slotKey];

  if (cost.usesSlot && spent) {
    caster = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { ...caster.spellcasting.spellSlots, [cost.slotKey]: { ...spent, current: spent.current - 1 } } } };
  }

  const poolKey = cost.grant?.pool;

  if (!cost.isDMCast && poolKey && (cost.grant?.cost ?? 1) > 0) {
    const usage = caster.battleData.abilityUsage?.[poolKey] ?? { battle: 0, round: 0, turn: 0 };

    const amount = cost.grant?.cost ?? 1;

    caster = {
      ...caster,
      battleData: {
        ...caster.battleData,
        abilityUsage: { ...caster.battleData.abilityUsage, [poolKey]: { battle: usage.battle + amount, round: usage.round + amount, turn: usage.turn + amount, lastRound: state.flow.ctx.round } },
      },
    };
  }

  if (!cost.isDMCast && !cost.isLegendaryCast) {
    caster = state.spell.definition.cost === "reaction" ? { ...caster, actionFlags: { ...caster.actionFlags, hasUsedReaction: true } } : state.spell.definition.cost === "bonusAction" ? { ...caster, actionFlags: { ...caster.actionFlags, hasUsedBonusAction: true } } : applyMainActionUsed(caster);
  }

  put(state.flow, caster);
}

function fxMeta(def: SpellCastState["spell"]["definition"], sourceEffects: Array<{ kind: string }>) {
  const effects = flatEffects(def.effects);

  const damage = effects.find(isDamageEffect) as { damageType?: string } | undefined;

  return {
    ...(damage?.damageType && { spellDamageType: damage.damageType }),
    spellTargeting: def.targeting.kind,
    spellEffectKinds: [...new Set([...effects.map((e) => e.kind), ...sourceEffects.map((e) => e.kind).filter((k) => SPELL_ONLY_KINDS.has(k))])],
  };
}

/** Кожен, кого зачепило заклинання і хто впав, отримує lethalDamage/kill; власна смерть кастера — без kill на його рахунок. */
function settleAllDowned(state: SpellCastState, before: BattleParticipant[]): void {
  const casterId = state.caster.basicInfo.id;

  for (const id of state.touchedIds) {
    const prev = findParticipant(before, id);

    if (prev && isActive(prev)) settleDowned(state.flow, id, id === casterId ? null : casterId);
  }
}

function hpTotals(state: SpellCastState, before: BattleParticipant[]): { dealt: number; healed: number; hits: string[] } {
  let dealt = 0;

  const hits: string[] = [];

  let healed = 0;

  for (const id of state.touchedIds) {
    const prev = findParticipant(before, id);

    const now = findParticipant(state.flow.ps, id);

    if (!prev || !now) continue;

    const delta = now.combatStats.currentHp - prev.combatStats.currentHp;

    if (delta < 0) {
      dealt -= delta;
      hits.push(`${now.basicInfo.name} ${-delta}`);
    } else healed += delta;
  }

  return { dealt, healed, hits };
}

interface FinishInput {
  before: BattleParticipant[];
  targetsBefore: BattleParticipant[];
  allParticipants: BattleParticipant[];
  battleId: string;
  round: number;
  sourceEffects: Array<{ kind: string }>;
}

export function finishSpellAction(state: SpellCastState, { before, targetsBefore, allParticipants, battleId, round, sourceEffects }: FinishInput): CastSpellResult {
  const { flow, spell, caster } = state;

  const def = spell.definition;

  const casterId = caster.basicInfo.id;

  settleAllDowned(state, before);
  fire(flow, { type: "spellCast", phase: "after", actorId: casterId, targetIds: state.targetIds, ...state.info });

  const { dealt, healed, hits } = hpTotals(state, before);

  const caption = [dealt > 0 ? `шкода: ${dealt}${hits.length > 1 ? ` (${hits.join(", ")})` : ""}` : "", healed > 0 ? `лікування: ${healed} HP` : ""].filter(Boolean).join(", ");

  const action = actionOf(getP(flow, casterId), spell, targetsBefore, battleId, round, [`${caster.basicInfo.name} застосовує ${spell.name}${caption ? ` (${caption})` : ""}`, ...flow.messages].join(" | "));

  const applied = diffAppliedEffects(before, flow.ps, targetsBefore.map((t) => t.basicInfo.id));

  const meta = fxMeta(def, sourceEffects);

  const stamp = { ...(meta.spellDamageType && { fxElement: meta.spellDamageType }), ...(spell.fx?.aura && { fxAura: spell.fx.aura }) };

  if (Object.keys(stamp).length > 0) {
    // only the spell's own effects: one applied by a trigger during the cast keeps its own look
    for (const { id, name, targetId } of applied) {
      if (name !== spell.name) continue;

      const target = findParticipant(flow.ps, targetId);

      if (!target) continue;

      put(flow, { ...target, battleData: { ...target.battleData, activeEffects: target.battleData.activeEffects.map((e) => (e.id === id ? { ...e, ...stamp } : e)) } });
    }
  }

  Object.assign(action.actionDetails, {
    ...meta,
    ...(applied.length > 0 && { appliedEffects: applied }),
    spellSlotUsed: state.castLevel,
    ...(state.grant?.key && { spellGrantKey: state.grant.key }),
    ...(state.grant?.label && { spellGrantLabel: state.grant.label }),
    ...(state.chosenCastLevel !== undefined && { castLevel: state.chosenCastLevel }),
    ...(dealt > 0 && { totalDamage: dealt }),
    ...(healed > 0 && { totalHealing: healed }),
    ...(state.power.breakdown.length > 0 && { damageBreakdown: state.power.breakdown.join("; ") }),
    ...(state.saves.length > 0 && { savingThrows: state.saves }),
    ...(state.attacks.length > 0 && { spellAttacks: state.attacks }),
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
    ...(state.transforms.length > 0 && { transforms: state.transforms }),
    messages: flow.messages,
    ...(spellDamage && { spellDamage }),
  };
}
