import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, replaceParticipant, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { forcedRollMode, rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { critThresholdOf } from "@/lib/utils/battle/attack/crit-threshold";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { isAdjacent, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { evasionFactor, hasEvasion } from "@/lib/utils/battle/saves/evasion";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { rollD20WithMode } from "@/lib/utils/battle/saves/roll-d20";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Outcome, SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import { spellAttackBonus } from "@/lib/utils/battle/spell/power";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import { rollGroups } from "@/lib/utils/common/dice";
import type { RaceModifier } from "@/lib/utils/spells/model/schema";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const SKIPPED: Outcome = { skip: true, factor: 0, raceMultiplier: 0 };

const UNAFFECTED: Outcome = { skip: false, factor: 1, raceMultiplier: 1 };

function raceEffect(mods: RaceModifier[], target: BattleParticipant): { immune: boolean; multiplier: number } {
  const raceId = target.abilities.raceId;

  const percent = raceId ? mods.filter((m) => m.raceId === raceId).reduce((sum, m) => sum + m.percent, 0) : 0;

  return { immune: percent <= -100, multiplier: Math.max(0, (100 + percent) / 100) };
}

function resolveSpellAttack(state: SpellCastState, target: BattleParticipant, raceMultiplier: number): Outcome {
  const { flow, caster, spell } = state;

  const id = target.basicInfo.id;

  const adjacent = isOnMap(caster) && isOnMap(target) && isAdjacent(caster, target);

  const targeting = spell.definition.targeting;

  const range = "range" in targeting ? targeting.range : undefined;

  const pseudoAttack: BattleAttack = { name: spell.name, type: adjacent ? "melee" : "ranged", attackBonus: 0, damageDice: "", damageType: "magic", ...(range !== undefined && { range: String(range) }) };

  const { mode } = forcedRollMode(rollModeReasons(caster, pseudoAttack, flow.ps, { targetId: id, map: flow.ctx.map }));

  const { roll, rolls } = rollD20WithMode(mode, state.rng, state.attackRolls.find((a) => a.participantId === id)?.roll);

  const mods = withSelf(flow.ps, caster);

  const bonus = (state.attackBonus ?? spellAttackBonus(caster)) + collectModifiers(mods, caster.basicInfo.id, { stat: "attackBonus", attackKind: attackKindOf(pseudoAttack.type) }).flat;

  const total = roll + bonus;

  const ac = getEffectiveArmorClass(target, flow.ps);

  const crit = roll >= critThresholdOf(flow.ctx.rules, mods, caster.basicInfo.id);

  const fumble = roll <= (flow.ctx.rules?.criticals.fumbleOn ?? 1);

  const hit = !fumble && (crit || total >= ac);

  state.attacks.push({ participantId: id, roll, total, ac, hit, crit: hit && crit });

  const note = mode !== "normal" ? ` (${mode === "advantage" ? "перевага" : "недолік"}: ${rolls.join("/")})` : "";

  const name = target.basicInfo.name;

  const line = `🎯 ${name}: атака заклинанням ${roll}+${bonus}=${total} проти КЗ ${ac}${note}`;

  if (!hit) {
    flow.messages.push(`${line} — промах`);

    return SKIPPED;
  }

  if (!critDoublesDice(flow.ctx.rules, crit) || state.diceCount === 0) {
    flow.messages.push(`${line} — ${crit ? "крит" : "влучання"}`);

    return { skip: false, factor: 1, raceMultiplier };
  }

  const critExtra = rollGroups([{ count: state.diceCount, size: state.diceSides }], state.rng).reduce((a, b) => a + b, 0);

  flow.messages.push(`${line} — крит — кубики подвоєно`);

  return { skip: false, factor: 1, raceMultiplier, critExtra };
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

    // союзник кастера сам хоче провалити корисне заклинання — опір не витрачається
    const resisted = target.basicInfo.side !== state.caster.basicInfo.side ? resolveSave(target, r) : { result: r, participant: target, message: null };

    if (resisted.message) flow.ps = replaceParticipant(flow.ps, resisted.participant);

    const { roll, mod, bonus, total } = r;

    const { success } = resisted.result;

    state.saves.push({ participantId: id, ability: saveAbility, roll, result: success ? "success" : "fail", ...(r.mode !== "normal" && { mode: r.mode, rolls: r.rolls }), ...(r.autoFail && { autoFail: true }) });

    const evasive = saveAbility === "dexterity" && onSuccess === "half" && hasEvasion(flow.ps, target);

    if (evasive) factor = evasionFactor(success, true);
    else if (success) factor = onSuccess === "half" ? 0.5 : 0;

    const extra = (bonus ? `${bonus < 0 ? "-" : "+"}${Math.abs(bonus)}` : "");

    const note = r.autoFail ? " (автопровал)" : r.mode !== "normal" ? ` (${r.mode === "advantage" ? "перевага" : "недолік"}: ${r.rolls.join("/")})` : "";

    flow.messages.push(r.autoFail
      ? `🎲 ${target.basicInfo.name}: рятівний кидок проти СК ${dc} — автопровал`
      : `🎲 ${target.basicInfo.name}: рятівний кидок ${roll}${mod < 0 ? "-" : "+"}${Math.abs(mod)}${extra}=${total} проти СК ${dc}${note} — ${r.success ? (factor > 0 ? "успіх, половина шкоди" : "успіх") : "провал"}${evasive ? " · ухилення" : ""}`);

    if (resisted.message) flow.messages.push(resisted.message);

    if (factor === 0) return SKIPPED;
  }

  if (withSave && def.resolution.kind === "attack" && target.basicInfo.side !== state.caster.basicInfo.side) return resolveSpellAttack(state, target, race.multiplier);

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
