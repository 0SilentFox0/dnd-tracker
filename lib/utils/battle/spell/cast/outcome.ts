import type { CriticalEffect, CriticalEffectType } from "@/lib/constants/critical-effects";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, replaceParticipant, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { forcedRollMode, rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { critThresholdOf } from "@/lib/utils/battle/attack/crit-threshold";
import { applyAttackCritToFlow, applyCriticalEffect, critFlavorIndex, critNameRef } from "@/lib/utils/battle/attack/critical";
import { getP, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { type CritKind, randomCritEffect } from "@/lib/utils/battle/crit-choice/catalog";
import { isAdjacent, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { evasionFactor, hasEvasion } from "@/lib/utils/battle/saves/evasion";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { rollD20WithMode } from "@/lib/utils/battle/saves/roll-d20";
import { bestSaveAbility, rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Outcome, SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import { spellAttackBonus } from "@/lib/utils/battle/spell/power";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import { rollGroups } from "@/lib/utils/common/dice";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { RaceModifier } from "@/lib/utils/spells/model/schema";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const NON_PARTICIPANT_EFFECTS = new Set<CriticalEffectType>(["negate_damage", "negate_effects", "double_damage"]);

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

  const bonus = (state.attackBonus ?? spellAttackBonus(caster, spell.definition.addAbilityMod === true)) + collectModifiers(mods, caster.basicInfo.id, { stat: "attackBonus", attackKind: attackKindOf(pseudoAttack.type) }).flat;

  const total = roll + bonus;

  const ac = getEffectiveArmorClass(target, flow.ps);

  const crit = roll >= critThresholdOf(flow.ctx.rules, mods, caster.basicInfo.id);

  const fumble = roll <= (flow.ctx.rules?.criticals.fumbleOn ?? 1);

  const hit = !fumble && (crit || total >= ac);

  state.attacks.push({ participantId: id, roll, total, ac, hit, crit: hit && crit });

  const note = mode !== "normal" ? textRef("battleActions.spell.rollNote", { mode, rolls: rolls.join("/") }) : "";

  const name = target.basicInfo.name;

  const line = textRef("battleActions.spell.attack", { name, roll, bonus, total, ac, note });

  const kind: CritKind | null = crit && hit ? "success" : fumble ? "fail" : null;

  const rules = flow.ctx.rules ?? DEFAULT_RULES;

  const effect = kind && rules.criticals.effects ? pickAttackCrit(state, id, kind) : undefined;

  const type = effect?.effect.type;

  let critExtra = 0;

  const maxed = type === "max_damage" && state.diceCount > 0;

  if (maxed) critExtra = Math.max(0, state.diceCount * state.diceSides - state.diceRolls.reduce((a, b) => a + b, 0));
  else if (hit && critDoublesDice(flow.ctx.rules, crit) && state.diceCount > 0) critExtra = rollGroups([{ count: state.diceCount, size: state.diceSides }], state.rng).reduce((a, b) => a + b, 0);

  if (type === "additional_damage") critExtra += rollGroups([{ count: 1, size: 6 }], state.rng)[0];

  const doubled = hit && !maxed && critDoublesDice(flow.ctx.rules, crit) && state.diceCount > 0;

  flow.messages.push(textRef(!hit ? "battleActions.spell.attackMiss" : crit ? (doubled ? "battleActions.spell.attackCritDouble" : "battleActions.spell.attackCrit") : "battleActions.spell.attackHit", { line }));

  if (effect) {
    const flavorIndex = critFlavorIndex(effect, { battleId: state.battleId, round: flow.ctx.round, attackerId: caster.basicInfo.id, targetId: id, suffix: "s" });

    const flavor = dynamicTextRef(`battleTerms.crits.attack.${effect.type}.${effect.id}.flavor.${flavorIndex}`, { attacker: caster.basicInfo.name, target: name });

    flow.messages.push(textRef("battleLog.spell.saveCrit", { target: name, effect: critNameRef(effect), flavor }));

    applyAttackCritToFlow(flow, effect, { attackerId: caster.basicInfo.id, targetId: id }, { offTurn: spell.definition.cost === "reaction" });
  }

  if (!hit) return SKIPPED;

  return { skip: false, factor: 1, raceMultiplier: raceMultiplier * (type === "double_damage" ? 2 : 1), ...(critExtra > 0 && { critExtra }) };
}

function pickAttackCrit(state: SpellCastState, id: string, kind: CritKind): CriticalEffect | undefined {
  const { flow, caster } = state;

  const info = { source: "attack", kind, actorId: caster.basicInfo.id, targetId: id } as const;

  if (flow.ctx.crit) return flow.ctx.crit(info);

  const c = (flow.ctx.rules ?? DEFAULT_RULES).criticals;

  return randomCritEffect("attack", kind, state.rng, { success: c.disabledSuccess, fail: c.disabledFail });
}

function applySaveCrit(state: SpellCastState, id: string, kind: CritKind): CriticalEffect["effect"] | undefined {
  const { flow, caster } = state;

  if (!flow.ctx.crit) return undefined;

  const effect = flow.ctx.crit({ source: "save", kind, actorId: caster.basicInfo.id, targetId: id });

  if (!effect) return undefined;

  const target = getP(flow, id);

  const flavor = dynamicTextRef(`battleTerms.crits.save.${effect.type}.${effect.id}.flavor.${critFlavorIndex(effect, { battleId: state.battleId, round: flow.ctx.round, attackerId: caster.basicInfo.id, targetId: id })}`, { attacker: caster.basicInfo.name, target: target.basicInfo.name });

  flow.messages.push(textRef("battleLog.spell.saveCrit", { target: target.basicInfo.name, effect: critNameRef(effect, "save"), flavor }));

  if (!NON_PARTICIPANT_EFFECTS.has(effect.effect.type)) put(flow, applyCriticalEffect(target, effect, flow.ctx.round, { table: "save" }));

  return effect.effect;
}

export function resolveOutcome(state: SpellCastState, id: string, withSave: boolean): Outcome {
  const { flow, spell } = state;

  const def = spell.definition;

  const target = findParticipant(flow.ps, id);

  if (!target) return SKIPPED;

  if (participantImmuneToSpell(target, spell.id, flow.ps, state.actionModifiers[id])) {
    flow.messages.push(textRef("battleActions.spell.immune", { target: target.basicInfo.name }));

    return SKIPPED;
  }

  const race = raceEffect(def.raceModifiers, target);

  if (race.immune) {
    flow.messages.push(textRef("battleActions.spell.raceImmune", { target: target.basicInfo.name, spell: spell.name }));

    return SKIPPED;
  }

  let factor = 1;

  if (withSave && def.resolution.kind === "save") {
    const { ability: baseAbility, orAbility, onSuccess } = def.resolution;

    const saveAbility = orAbility ? bestSaveAbility(target, [baseAbility, orAbility], flow.ps, flow.ctx.rules) : baseAbility;

    const dc = state.saveDc;

    const r = rollSave({ target, ability: saveAbility, dc, participants: flow.ps, rules: flow.ctx.rules, rng: state.rng, presetRoll: state.saveRolls.find((s) => s.participantId === id)?.roll, vsSpell: true });

    // союзник кастера сам хоче провалити корисне заклинання — опір не витрачається
    const { roll, mod, bonus, total } = r;

    const saveCrit = !!flow.ctx.crit && (flow.ctx.rules ?? DEFAULT_RULES).criticals.effects && !r.autoFail && (roll === 20 || roll === 1);

    // нат. 20/1 визначають результат лише там, де діють криті; Легендарний опір діє вже на цей результат
    const base = saveCrit ? { ...r, success: roll === 20 } : r;

    const resisted = target.basicInfo.side !== state.caster.basicInfo.side ? resolveSave(target, base) : { result: base, participant: target, message: null };

    if (resisted.message) flow.ps = replaceParticipant(flow.ps, resisted.participant);

    const success = resisted.result.success;

    state.saves.push({ participantId: id, ability: saveAbility, roll, result: success ? "success" : "fail", ...(r.mode !== "normal" && { mode: r.mode, rolls: r.rolls }), ...(r.autoFail && { autoFail: true }) });

    const evasive = saveAbility === "dexterity" && onSuccess === "half" && hasEvasion(flow.ps, target);

    if (evasive) factor = evasionFactor(success, true);
    else if (success) factor = onSuccess === "half" ? 0.5 : 0;

    const extra = bonus ? `${bonus < 0 ? "-" : "+"}${Math.abs(bonus)}` : "";

    const note = r.mode !== "normal" ? textRef("battleActions.spell.rollNote", { mode: r.mode, rolls: r.rolls.join("/") }) : "";

    const outcome = success ? (factor > 0 ? "half" : "success") : "fail";

    flow.messages.push(
      r.autoFail
        ? textRef("battleActions.spell.saveAutoFail", { target: target.basicInfo.name, dc })
        : textRef("battleActions.spell.save", { target: target.basicInfo.name, roll, mod: `${mod < 0 ? "-" : "+"}${Math.abs(mod)}`, extra, total, dc, note, outcome, evasive: evasive ? "yes" : "no" }),
    );

    if (resisted.message) flow.messages.push(resisted.message);

    const crit = saveCrit && (roll === 20 || !success) ? applySaveCrit(state, id, roll === 20 ? "success" : "fail") : undefined;

    if (crit?.type === "negate_damage") factor = 0;

    if (factor === 0) return SKIPPED;

    return { skip: false, factor, raceMultiplier: race.multiplier * (crit?.type === "double_damage" ? 2 : 1), ...(crit?.type === "negate_effects" && { negateEffects: true }) };
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
