import {
  applyResistance,
  getCombinedResistancePercent,
} from "../resistance";

import { PHYSICAL_DAMAGE_TYPES } from "@/lib/constants/damage";
import { textRef } from "@/lib/i18n/text-ref";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { AttackKind } from "@/lib/utils/abilities/schema";
import type { BattleParticipant, DamageStep } from "@/types/battle";
import type { LogLine } from "@/types/text";

function isPhysicalDamageType(dt: string): boolean {
  return PHYSICAL_DAMAGE_TYPES.includes(dt.toLowerCase());
}

function getResistanceSkillsHighestOnly(
  target: BattleParticipant,
  damageType: string,
  participants: BattleParticipant[] = [target],
  attackKind?: AttackKind,
): Array<{ name: LogLine; percent: number }> {
  const isPhysical = isPhysicalDamageType(damageType);

  const t = damageType.toLowerCase();

  const mods = collectModifiers(withSelf(participants, target), target.basicInfo.id, { flag: "resistance" });

  return mods.flags.flatMap((f, i) =>
    f.flag === "resistance" && (!f.attackKind || f.attackKind === attackKind) && (f.damageType === t || (f.damageType === "physical" && isPhysical) || (f.damageType === "spell" && t === "spell"))
      ? [{ name: mods.entries[i]?.label ?? textRef("battleLog.damage.steps.resistance"), percent: f.percent }]
      : [],
  );
}

export function getDefenderResistanceBreakdown(
  target: BattleParticipant,
  damageType: string,
  incomingDamage: number,
  participants: BattleParticipant[] = [target],
  attackKind?: AttackKind,
): { targetBreakdown: LogLine[]; finalDamage: number; targetSteps: DamageStep[] } {
  const targetBreakdown: LogLine[] = [];

  const targetName = target.basicInfo.name;

  const resistanceSkills = getResistanceSkillsHighestOnly(target, damageType, participants, attackKind);

  for (const s of resistanceSkills) {
    targetBreakdown.push(s.percent < 0 ? textRef("battleLog.resistance.targetVulnerable", { target: targetName, source: s.name, percent: -s.percent }) : textRef("battleLog.resistance.targetResist", { target: targetName, source: s.name, percent: s.percent }));
  }

  const resistanceResult = applyResistance(target, incomingDamage, damageType, { participants, attackKind });

  const finalDamage = resistanceResult.finalDamage;

  const resistPercent = getCombinedResistancePercent(target, damageType, { participants, attackKind });

  if (resistPercent !== 0) {
    targetBreakdown.push(textRef("battleLog.resistance.targetTotal", { target: targetName, incoming: incomingDamage, sign: resistPercent > 0 ? "−" : "+", percent: Math.abs(resistPercent), final: finalDamage }));
  } else {
    targetBreakdown.push(textRef("battleLog.resistance.targetTotalPlain", { target: targetName, final: finalDamage }));
  }

  return { targetBreakdown, finalDamage, targetSteps: resistanceResult.steps };
}
