import {
  applyResistance,
  getCombinedResistancePercent,
} from "../resistance";

import { PHYSICAL_DAMAGE_TYPES } from "@/lib/constants/damage";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { AttackKind } from "@/lib/utils/abilities/schema";
import type { BattleParticipant, DamageStep } from "@/types/battle";

export function isPhysicalDamageType(dt: string): boolean {
  return PHYSICAL_DAMAGE_TYPES.includes(dt.toLowerCase());
}

export function getResistanceSkillsHighestOnly(
  target: BattleParticipant,
  damageType: string,
  participants: BattleParticipant[] = [target],
  attackKind?: AttackKind,
): Array<{ name: string; percent: number }> {
  const isPhysical = isPhysicalDamageType(damageType);

  const t = damageType.toLowerCase();

  const mods = collectModifiers(withSelf(participants, target), target.basicInfo.id, { flag: "resistance" });

  return mods.flags.flatMap((f, i) =>
    f.flag === "resistance" && (!f.attackKind || f.attackKind === attackKind) && (f.damageType === t || (f.damageType === "physical" && isPhysical) || (f.damageType === "spell" && t === "spell"))
      ? [{ name: mods.entries[i]?.label ?? "Опір", percent: f.percent }]
      : [],
  );
}

export function getDefenderResistanceBreakdown(
  target: BattleParticipant,
  damageType: string,
  incomingDamage: number,
  participants: BattleParticipant[] = [target],
  attackKind?: AttackKind,
): { targetBreakdown: string[]; finalDamage: number; targetSteps: DamageStep[] } {
  const targetBreakdown: string[] = [];

  const targetName = target.basicInfo.name;

  const resistanceSkills = getResistanceSkillsHighestOnly(target, damageType, participants, attackKind);

  for (const s of resistanceSkills) {
    targetBreakdown.push(
      `${targetName}: ${s.name} = ${s.percent}% резисту`,
    );
  }

  const resistanceResult = applyResistance(target, incomingDamage, damageType, { participants, attackKind });

  const finalDamage = resistanceResult.finalDamage;

  const resistPercent = getCombinedResistancePercent(target, damageType, { participants, attackKind });

  if (resistPercent !== 0) {
    targetBreakdown.push(
      `Сумарна шкода (${targetName}): ${incomingDamage} ${resistPercent > 0 ? "−" : "+"} ${Math.abs(resistPercent)}% = ${finalDamage}`,
    );
  } else {
    targetBreakdown.push(`Сумарна шкода (${targetName}): ${finalDamage}`);
  }

  return { targetBreakdown, finalDamage, targetSteps: resistanceResult.steps };
}
