import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Outcome, SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import type { RaceModifier } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const SKIPPED: Outcome = { skip: true, factor: 0, raceMultiplier: 0 };

const UNAFFECTED: Outcome = { skip: false, factor: 1, raceMultiplier: 1 };

function raceEffect(mods: RaceModifier[], target: BattleParticipant): { immune: boolean; multiplier: number } {
  const raceId = target.abilities.raceId;

  const percent = raceId ? mods.filter((m) => m.raceId === raceId).reduce((sum, m) => sum + m.percent, 0) : 0;

  return { immune: percent <= -100, multiplier: Math.max(0, (100 + percent) / 100) };
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

    const r = rollSave({ target, ability: saveAbility, dc, participants: flow.ps, rules: flow.ctx.rules, rng: state.rng, presetRoll: state.saveRolls.find((s) => s.participantId === id)?.roll, vsSpell: true });

    const { roll, mod, bonus, total, success } = r;

    state.saves.push({ participantId: id, ability: saveAbility, roll, result: success ? "success" : "fail", ...(r.mode !== "normal" && { mode: r.mode, rolls: r.rolls }), ...(r.autoFail && { autoFail: true }) });

    if (success) factor = onSuccess === "half" ? 0.5 : 0;

    const extra = (bonus ? `${bonus < 0 ? "-" : "+"}${Math.abs(bonus)}` : "");

    const note = r.autoFail ? " (автопровал)" : r.mode !== "normal" ? ` (${r.mode === "advantage" ? "перевага" : "недолік"}: ${r.rolls.join("/")})` : "";

    flow.messages.push(r.autoFail
      ? `🎲 ${target.basicInfo.name}: рятівний кидок проти СК ${dc} — автопровал`
      : `🎲 ${target.basicInfo.name}: рятівний кидок ${roll}${mod < 0 ? "-" : "+"}${Math.abs(mod)}${extra}=${total} проти СК ${dc}${note} — ${success ? (factor > 0 ? "успіх, половина шкоди" : "успіх") : "провал"}`);

    if (factor === 0) return SKIPPED;
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
