import { appendHpChanges, type AttackFlow, fire, getP, put, settleDowned } from "../attack/process/ability-flow";
import { applyBalanceDamageMultiplier } from "../damage/balance-multiplier";
import { applyMainActionUsed } from "../participant";
import { applyResistance } from "../resistance";
import type { CastableSpell, CastSpellParams, CastSpellResult } from "../types/spell-process";
import { casterSpellDice } from "./caster-dice";
import { computeSpellPower, spellSaveDc } from "./power";
import { participantImmuneToSpell } from "./spell-immunity";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { resolveAmount } from "@/lib/utils/abilities/engine/amount";
import { applyRawDamage } from "@/lib/utils/abilities/engine/hp";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/participants";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/targets";
import type { SummonRequest } from "@/lib/utils/abilities/engine/types";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Amount, Effect } from "@/lib/utils/abilities/schema";
import type { RaceModifier } from "@/lib/utils/spells/model/schema";
import type { AbilityEvent, ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";

function amountOf(e: Effect): Amount | undefined {
  switch (e.kind) {
    case "dealDamage":
    case "heal":
      return e.amount;
    case "dot":
      return e.damagePerRound;
    case "hot":
      return e.healPerRound;
    default:
      return undefined;
  }
}

const usesRoll = (e: Effect) => {
  const a = amountOf(e);

  return typeof a === "object" && a !== null && "spellRoll" in a;
};

const isDamageEffect = (e: Effect) => e.kind === "dealDamage" || e.kind === "dot";

const NO_TARGET_KINDS = new Set<Effect["kind"]>(["note", "summon", "randomOf"]);

const targetOf = (e: Effect) => (NO_TARGET_KINDS.has(e.kind) ? undefined : (e as { target?: string }).target);

const isPerTarget = (e: Effect) => !NO_TARGET_KINDS.has(e.kind) && (targetOf(e) === undefined || targetOf(e) === "eventTarget");

function raceEffect(mods: RaceModifier[], target: BattleParticipant): { immune: boolean; multiplier: number } {
  const raceId = target.abilities.raceId;

  const percent = raceId ? mods.filter((m) => m.raceId === raceId).reduce((sum, m) => sum + m.percent, 0) : 0;

  return { immune: percent <= -100, multiplier: Math.max(0, (100 + percent) / 100) };
}

function abilityOf(spell: CastableSpell): ResolvedAbility {
  return {
    id: `spell-${spell.id}`,
    name: spell.name,
    trigger: { event: "spellCast", phase: "after", role: "caster" },
    effects: spell.definition.effects,
    key: `spell:${spell.id}`,
    source: { type: "skill", id: spell.id, name: spell.name, icon: spell.icon },
  } as ResolvedAbility;
}

function actionOf(caster: BattleParticipant, spell: CastableSpell, targets: BattleParticipant[], battleId: string, round: number, text: string): BattleAction {
  return {
    id: `spell-${caster.basicInfo.id}-${Date.now()}`,
    battleId,
    round,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: caster.basicInfo.id,
    actorName: caster.basicInfo.name,
    actorSide: caster.basicInfo.side,
    actionType: "spell",
    targets: targets.map((t) => ({ participantId: t.basicInfo.id, participantName: t.basicInfo.name })),
    actionDetails: { spellId: spell.id, spellName: spell.name, spellLevel: spell.level },
    resultText: text,
    hpChanges: [],
    isCancelled: false,
  };
}

export function castSpell(params: CastSpellParams): CastSpellResult {
  const { caster, spell, targetIds, allParticipants, currentRound, battleId, diceRolls, saveRolls = [], isDMCast = false } = params;

  const def = spell.definition;

  const rng = params.rng ?? Math.random;

  const casterId = caster.basicInfo.id;

  const flow: AttackFlow = { ps: withSelf(allParticipants, caster), messages: [], ctx: { round: currentRound, rng } };

  const before = flow.ps;

  const info = { spellId: spell.id, school: spell.groupId, level: spell.level };

  const targetsBefore = targetIds.flatMap((id) => findParticipant(before, id) ?? []);

  const { actionModifiers } = fire(flow, { type: "spellCast", phase: "before", actorId: casterId, targetIds, ...info });

  let updatedCaster = getP(flow, casterId);

  const slotKey = updatedCaster.basicInfo.sourceType === ParticipantSourceType.UNIT ? "universal" : String(spell.level);

  const slot = updatedCaster.spellcasting.spellSlots[slotKey];

  if (!isDMCast && (!slot || slot.current <= 0)) {
    return {
      success: false,
      casterUpdated: updatedCaster,
      allParticipantsUpdated: flow.ps,
      battleAction: actionOf(updatedCaster, spell, targetsBefore, battleId, currentRound, `${updatedCaster.basicInfo.name} намагався використати ${spell.name}, але немає доступних spell slots`),
      summons: [],
    };
  }

  const dice = casterSpellDice(updatedCaster, { dice: def.dice, groupId: spell.groupId });

  const power = computeSpellPower({ caster: updatedCaster, groupId: spell.groupId, rolls: diceRolls, flat: dice.flat, participants: flow.ps, extra: actionModifiers[casterId] });

  const ability = abilityOf(spell);

  const summons: SummonRequest[] = [];

  const damageSteps: Record<string, DamageStep[]> = {};

  const saves: NonNullable<BattleAction["actionDetails"]["savingThrows"]> = [];

  const baseFor = (e: Effect) => (isDamageEffect(e) ? power.damage : power.heal);

  const run = (effect: Effect, effectIndex: number, ids: string[], roll: number) => {
    const event: AbilityEvent = { type: "spellCast", phase: "after", actorId: casterId, targetIds, ...info, roll };

    const r = applyEffect({ participants: flow.ps, ability, effectIndex, ownerId: casterId, effect, targetIds: ids, event, ctx: flow.ctx });

    flow.ps = r.participants;
    flow.messages.push(...r.messages);
    summons.push(...(r.summons ?? []));
  };

  const dealDamage = (effect: Extract<Effect, { kind: "dealDamage" }>, id: string, roll: number, index: number) => {
    const target = getP(flow, id);

    const raw = resolveAmount(effect.amount, { owner: getP(flow, casterId), target, spellRoll: roll, rng, participants: flow.ps });

    const share = effect.falloff ? effect.falloff[Math.min(index, effect.falloff.length - 1)] : 100;

    const planned = applyBalanceDamageMultiplier(caster, Math.floor((raw * share) / 100)).damage;

    if (planned <= 0) return;

    const resisted = applyResistance(target, planned, effect.damageType ?? "magic", { participants: flow.ps, fromSpell: true, extra: actionModifiers[id] });

    put(flow, applyRawDamage(target, resisted.finalDamage));
    damageSteps[id] = resisted.steps;
  };

  for (const [index, id] of targetIds.entries()) {
    const target = findParticipant(flow.ps, id);

    if (!target) continue;

    if (participantImmuneToSpell(target, spell.id, flow.ps, actionModifiers[id])) {
      flow.messages.push(`⛔ ${target.basicInfo.name}: імунітет до цього заклинання`);
      continue;
    }

    const race = raceEffect(def.raceModifiers, target);

    if (race.immune) {
      flow.messages.push(`⛔ ${target.basicInfo.name}: імунітет раси до ${spell.name}`);
      continue;
    }

    let factor = 1;

    if (def.resolution.kind === "save") {
      const { ability: saveAbility, onSuccess } = def.resolution;

      const roll = saveRolls.find((s) => s.participantId === id)?.roll ?? Math.floor(rng() * 20) + 1;

      const success = roll + target.abilities.modifiers[saveAbility] >= spellSaveDc(updatedCaster);

      saves.push({ participantId: id, ability: saveAbility, roll, result: success ? "success" : "fail" });

      if (success) factor = onSuccess === "half" ? 0.5 : 0;

      if (factor === 0) {
        flow.messages.push(`🛡 ${target.basicInfo.name} уникає ${spell.name}`);
        continue;
      }
    }

    def.effects.forEach((effect, effectIndex) => {
      if (!isPerTarget(effect) || (factor < 1 && !usesRoll(effect))) return;

      const roll = Math.floor(baseFor(effect) * factor * (isDamageEffect(effect) ? race.multiplier : 1));

      if (effect.kind === "dealDamage") dealDamage(effect, id, roll, index);
      else run(effect, effectIndex, [id], roll);
    });
  }

  def.effects.forEach((effect, effectIndex) => {
    if (isPerTarget(effect)) return;

    const event: AbilityEvent = { type: "spellCast", phase: "after", actorId: casterId, targetIds, ...info };

    const ids = resolveTargetIds(targetOf(effect) as Parameters<typeof resolveTargetIds>[0], casterId, event, flow.ps);

    run(effect, effectIndex, ids, baseFor(effect));
  });

  updatedCaster = getP(flow, casterId);

  const spent = updatedCaster.spellcasting.spellSlots[slotKey];

  if (!isDMCast && spent) {
    updatedCaster = { ...updatedCaster, spellcasting: { ...updatedCaster.spellcasting, spellSlots: { ...updatedCaster.spellcasting.spellSlots, [slotKey]: { ...spent, current: spent.current - 1 } } } };
  }

  updatedCaster = def.cost === "bonusAction" ? { ...updatedCaster, actionFlags: { ...updatedCaster.actionFlags, hasUsedBonusAction: true } } : applyMainActionUsed(updatedCaster);

  put(flow, updatedCaster);

  for (const t of targetsBefore) {
    if (isActive(t)) settleDowned(flow, t.basicInfo.id, casterId);
  }

  fire(flow, { type: "spellCast", phase: "after", actorId: casterId, targetIds, ...info });

  const dealt = targetsBefore.reduce((sum, t) => sum + Math.max(0, t.combatStats.currentHp - (findParticipant(flow.ps, t.basicInfo.id)?.combatStats.currentHp ?? 0)), 0);

  const healed = targetsBefore.reduce((sum, t) => sum + Math.max(0, (findParticipant(flow.ps, t.basicInfo.id)?.combatStats.currentHp ?? 0) - t.combatStats.currentHp), 0);

  const caption = [dealt > 0 ? `завдавши ${dealt} урону` : "", healed > 0 ? `вилікувавши ${healed} HP` : ""].filter(Boolean).join(", ");

  const action = actionOf(getP(flow, casterId), spell, targetsBefore, battleId, currentRound, [`${caster.basicInfo.name} використав ${spell.name}${caption ? ` ${caption}` : ""}`, ...flow.messages].join(" | "));

  Object.assign(action.actionDetails, {
    spellSlotUsed: spell.level,
    ...(dealt > 0 && { totalDamage: dealt }),
    ...(healed > 0 && { totalHealing: healed }),
    ...(power.breakdown.length > 0 && { damageBreakdown: power.breakdown.join("; ") }),
    ...(saves.length > 0 && { savingThrows: saves }),
    ...(Object.keys(damageSteps).length > 0 && { damageSteps }),
  });
  appendHpChanges(action, before, flow.ps);

  return { success: true, casterUpdated: getP(flow, casterId), allParticipantsUpdated: flow.ps, battleAction: action, summons };
}
