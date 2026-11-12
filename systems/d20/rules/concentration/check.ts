import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { Ruleset } from "@/lib/utils/rules";
import { concentrationOn, dropConcentration, stripConcentration } from "@/systems/d20/rules/concentration/sustain";
import { resolveSave } from "@/systems/d20/rules/saves/legendary";
import { rollSave } from "@/systems/d20/rules/saves/roll-save";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function concentrationCheck(input: { caster: BattleParticipant; damage: number; participants: BattleParticipant[]; rules: Ruleset; rng: () => number }): { participants: BattleParticipant[]; messages: LogLine[] } {
  const { caster, damage, participants, rules, rng } = input;

  const id = caster.basicInfo.id;

  const marker = concentrationOn(caster);

  const ps = findParticipant(participants, id) ? replaceParticipant(participants, caster) : [caster, ...participants];

  if (!marker?.concentration || damage <= 0) return { participants: ps, messages: [] };

  if (caster.combatStats.currentHp <= 0 || caster.combatStats.status === CombatStatus.DEAD) return dropConcentration(ps, id, "");

  const dc = Math.min(rules.concentration.dcCap ?? Infinity, Math.max(10, Math.floor(damage / 2)));

  const rolled = rollSave({ target: caster, ability: "constitution", dc, participants: ps, rules, rng });

  const { result: save, participant: resisted, message } = resolveSave(caster, rolled);

  const head = textRef("battleLog.concentration.check", { name: caster.basicInfo.name, total: rolled.total, dc });

  if (save.success) return { participants: message ? replaceParticipant(ps, resisted) : ps, messages: [textRef("battleLog.concentration.holds", { head }), ...(message ? [message] : [])] };

  return { participants: stripConcentration(ps, id)?.participants ?? ps, messages: [textRef("battleLog.concentration.broke", { head, spell: marker.concentration.spellName })] };
}
