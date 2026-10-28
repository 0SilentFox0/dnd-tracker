import type { CriticalEffect, CriticalEffectType } from "@/lib/constants/critical-effects";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applyCriticalEffect, critFlavorFor } from "@/lib/utils/battle/attack/critical";
import { getP, put } from "@/lib/utils/battle/common/action-flow";
import type { CritKind } from "@/lib/utils/battle/crit-choice/catalog";
import type { Outcome, SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import { rollSavingThrow } from "@/lib/utils/battle/spell/power";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import type { RaceModifier } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const NON_PARTICIPANT_EFFECTS = new Set<CriticalEffectType>(["negate_damage", "negate_effects", "double_damage"]);

const SKIPPED: Outcome = { skip: true, factor: 0, raceMultiplier: 0 };

const UNAFFECTED: Outcome = { skip: false, factor: 1, raceMultiplier: 1 };

function raceEffect(mods: RaceModifier[], target: BattleParticipant): { immune: boolean; multiplier: number } {
  const raceId = target.abilities.raceId;

  const percent = raceId ? mods.filter((m) => m.raceId === raceId).reduce((sum, m) => sum + m.percent, 0) : 0;

  return { immune: percent <= -100, multiplier: Math.max(0, (100 + percent) / 100) };
}

function applySaveCrit(state: SpellCastState, id: string, kind: CritKind): CriticalEffect["effect"] | undefined {
  const { flow, spell, caster } = state;

  if (!flow.ctx.crit) return undefined;

  const effect = flow.ctx.crit({ source: "save", kind, actorId: caster.basicInfo.id, targetId: id });

  const target = getP(flow, id);

  const flavor = critFlavorFor(effect, caster.basicInfo.name, target.basicInfo.name, { battleId: spell.id, round: flow.ctx.round, attackerId: caster.basicInfo.id, targetId: id });

  flow.messages.push(`🎯 ${target.basicInfo.name}: ${effect.name} — ${flavor}`);

  if (!NON_PARTICIPANT_EFFECTS.has(effect.effect.type)) put(flow, applyCriticalEffect(target, effect, flow.ctx.round));

  return effect.effect;
}

export function resolveOutcome(state: SpellCastState, id: string, withSave: boolean): Outcome {
  const { flow, spell } = state;

  const def = spell.definition;

  const target = findParticipant(flow.ps, id);

  if (!target) return SKIPPED;

  if (participantImmuneToSpell(target, spell.id, flow.ps, state.actionModifiers[id])) {
    flow.messages.push(`⛔ ${target.basicInfo.name}: імунітет до цього заклинання`);

    return SKIPPED;
  }

  const race = raceEffect(def.raceModifiers, target);

  if (race.immune) {
    flow.messages.push(`⛔ ${target.basicInfo.name}: імунітет раси до ${spell.name}`);

    return SKIPPED;
  }

  let factor = 1;

  if (withSave && def.resolution.kind === "save") {
    const { ability: saveAbility, onSuccess } = def.resolution;

    const dc = state.saveDc;

    const { roll, mod, total, success } = rollSavingThrow(target, saveAbility, dc, state.rng, state.saveRolls.find((s) => s.participantId === id)?.roll);

    state.saves.push({ participantId: id, ability: saveAbility, roll, result: success ? "success" : "fail" });

    if (success) factor = onSuccess === "half" ? 0.5 : 0;

    flow.messages.push(`🎲 ${target.basicInfo.name}: рятівний кидок ${roll}${mod < 0 ? "-" : "+"}${Math.abs(mod)}=${total} проти СК ${dc} — ${success ? (factor > 0 ? "успіх, половина шкоди" : "успіх") : "провал"}`);

    const crit = roll === 20 || roll === 1 ? applySaveCrit(state, id, roll === 20 ? "success" : "fail") : undefined;

    if (crit?.type === "negate_damage") factor = 0;

    if (factor === 0) return SKIPPED;

    return { skip: false, factor, raceMultiplier: race.multiplier * (crit?.type === "double_damage" ? 2 : 1), ...(crit?.type === "negate_effects" && { negateEffects: true }) };
  }

  return { skip: false, factor, raceMultiplier: race.multiplier };
}

// ефекти не на цілі заклинання (всі вороги тощо): імунітети ворожих цілей діють і тут, збереження — лише для цілей каста
export function outcomeFor(state: SpellCastState, id: string): Outcome {
  const known = state.outcomes.get(id);

  if (known) return known;

  const target = findParticipant(state.flow.ps, id);

  const outcome = target && target.basicInfo.side !== state.caster.basicInfo.side ? resolveOutcome(state, id, false) : UNAFFECTED;

  state.outcomes.set(id, outcome);

  return outcome;
}
