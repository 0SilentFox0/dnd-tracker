/**
 * Утиліта для обчислення breakdown урону (для превью в UI).
 * Використовує ту саму логіку, що й processAttack, але без застосування до цілі.
 * Повертає блок по цілі: резист, скіли захисника, фінальна шкода.
 */

import { applyResistance, getCombinedResistancePercent } from "./battle-resistance";
import { calculateDamageWithModifiers } from "./battle-damage-calculations";
import {
  checkTriggerCondition,
  getPassiveAbilitiesByTrigger,
} from "./battle-triggers";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import {
  getDiceAverage,
  getTotalDiceCount,
  mergeDiceFormulas,
} from "@/lib/utils/battle/balance-calculations";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const PHYSICAL_DAMAGE_TYPES = ["slashing", "piercing", "bludgeoning", "physical"];

function isPhysicalDamageType(dt: string): boolean {
  return PHYSICAL_DAMAGE_TYPES.includes(dt.toLowerCase());
}

/** Збирає рядки breakdown для резисту цілі: скіли з physical/spell/all_resistance та фінальна шкода */
function getDefenderResistanceBreakdown(
  target: BattleParticipant,
  damageType: string,
  incomingDamage: number,
): { targetBreakdown: string[]; finalDamage: number } {
  const targetBreakdown: string[] = [];
  const targetName = target.basicInfo.name;

  const resistanceSkills: Array<{ name: string; percent: number }> = [];

  for (const skill of target.battleData.activeSkills) {
    for (const effect of skill.effects) {
      const stat = (effect.stat ?? "").toLowerCase();
      const val =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;
      if (val <= 0) continue;
      if (stat === "physical_resistance" && isPhysicalDamageType(damageType)) {
        resistanceSkills.push({ name: skill.name || "Скіл", percent: val });
        break;
      }
      if (stat === "spell_resistance" && damageType.toLowerCase() === "spell") {
        resistanceSkills.push({ name: skill.name || "Скіл", percent: val });
        break;
      }
      if (stat === "all_resistance") {
        resistanceSkills.push({ name: skill.name || "Скіл", percent: val });
        break;
      }
    }
  }

  for (const s of resistanceSkills) {
    targetBreakdown.push(
      `${targetName}: вкачаний ${s.name} = ${s.percent}% резисту`,
    );
  }

  const resistanceResult = applyResistance(target, incomingDamage, damageType);
  const finalDamage = resistanceResult.finalDamage;
  const resistPercent = getCombinedResistancePercent(target, damageType);

  if (resistPercent > 0) {
    targetBreakdown.push(
      `Сумарна шкода по ${targetName}: ${incomingDamage} − ${resistPercent}% = ${finalDamage}`,
    );
  } else {
    targetBreakdown.push(`Сумарна шкода по ${targetName}: ${finalDamage}`);
  }

  return { targetBreakdown, finalDamage };
}

export interface DamageBreakdownResult {
  breakdown: string[];
  totalDamage: number;
  /** Рядки по цілі: резист, скіли, фінальна шкода */
  targetBreakdown: string[];
  /** Фінальний урон по цілі після резисту */
  finalDamage: number;
}

export interface ComputeDamageBreakdownParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  /** Якщо true — застосовуємо подвійний урон від криту */
  isCritical?: boolean;
}

export interface DamageBreakdownTargetResult {
  targetId: string;
  targetName: string;
  targetBreakdown: string[];
  finalDamage: number;
}

export interface DamageBreakdownMultiTargetResult {
  breakdown: string[];
  totalDamage: number;
  targets: DamageBreakdownTargetResult[];
}

export function computeDamageBreakdown(
  params: ComputeDamageBreakdownParams,
): DamageBreakdownResult {
  const {
    attacker,
    target,
    attack,
    damageRolls,
    allParticipants,
    isCritical = false,
  } = params;

  const baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const typeStr = String(attack.type ?? "").toLowerCase();

  const isMelee = typeStr === "melee";

  const attackTypeSafe: AttackType = isMelee
    ? AttackType.MELEE
    : AttackType.RANGED;

  const statModifier = isMelee
    ? Math.floor((attacker.abilities.strength - 10) / 2)
    : Math.floor((attacker.abilities.dexterity - 10) / 2);

  const isHero = attacker.basicInfo.sourceType === "character";

  const heroLevelPart = isHero ? attacker.abilities.level : 0;

  const heroDiceNotation = isHero
    ? getHeroDamageDiceForLevel(
        attacker.abilities.level,
        attackTypeSafe,
      )
    : "";

  const weaponDiceCount = getTotalDiceCount(attack.damageDice ?? "");

  const heroDiceCount = getTotalDiceCount(heroDiceNotation);

  const fullDiceCount = weaponDiceCount + heroDiceCount;

  const clientSentFullRolls =
    isHero && fullDiceCount > 0 && damageRolls.length === fullDiceCount;

  const heroDicePart =
    heroDiceNotation && !clientSentFullRolls
      ? getDiceAverage(heroDiceNotation)
      : 0;

  const onAttackAbilities = getPassiveAbilitiesByTrigger(
    attacker,
    "on_attack",
  );

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  for (const ability of onAttackAbilities) {
    if (
      checkTriggerCondition(ability.trigger, attacker, {
        target,
        allParticipants,
      })
    ) {
      if (ability.effect.type === "additional_damage") {
        const modifierType =
          (ability.effect as { damageType?: string }).damageType || "fire";

        const modifierValue = ability.effect.value || 0;

        additionalDamageModifiers.push({ type: modifierType, value: modifierValue });
      }
    }
  }

  const weaponDiceNotationForBreakdown = clientSentFullRolls
    ? mergeDiceFormulas(attack.damageDice ?? "", heroDiceNotation)
    : undefined;

  const heroDiceNotationForBreakdown = clientSentFullRolls
    ? ""
    : heroDiceNotation;

  const damageCalculation = calculateDamageWithModifiers(
    attacker,
    baseDamage,
    statModifier,
    attackTypeSafe,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
      heroLevelPart,
      heroDicePart,
      heroDiceNotation: heroDiceNotationForBreakdown,
      weaponDiceNotation:
        weaponDiceNotationForBreakdown || attack.damageDice || undefined,
    },
  );

  let totalDamage = damageCalculation.totalDamage;

  const breakdown = [...damageCalculation.breakdown];

  if (isCritical) {
    totalDamage *= 2;
    breakdown.push(`──────────`);
    breakdown.push(`× 2 (крит) = ${totalDamage} урону`);
  }

  const damageType = attack.damageType ?? "physical";
  const { targetBreakdown, finalDamage } = getDefenderResistanceBreakdown(
    target,
    damageType,
    totalDamage,
  );

  return {
    breakdown,
    totalDamage,
    targetBreakdown,
    finalDamage,
  };
}

/**
 * Обчислює breakdown урону для кількох цілей (AOE).
 * Повертає спільний блок атакуючого та масив по кожній цілі (резист, фінальна шкода).
 */
export function computeDamageBreakdownMultiTarget(
  params: {
    attacker: BattleParticipant;
    targets: BattleParticipant[];
    attack: BattleAttack;
    damageRolls: number[];
    allParticipants: BattleParticipant[];
    isCritical?: boolean;
  },
): DamageBreakdownMultiTargetResult {
  if (params.targets.length === 0) {
    return { breakdown: [], totalDamage: 0, targets: [] };
  }

  const firstTarget = params.targets[0];
  const single = computeDamageBreakdown({
    attacker: params.attacker,
    target: firstTarget,
    attack: params.attack,
    damageRolls: params.damageRolls,
    allParticipants: params.allParticipants,
    isCritical: params.isCritical,
  });

  const damageType = params.attack.damageType ?? "physical";
  const dist = params.attack.damageDistribution;
  const n = params.targets.length;
  const targetsResult: DamageBreakdownTargetResult[] = [];

  for (let i = 0; i < params.targets.length; i++) {
    const target = params.targets[i];
    const dmgMult =
      dist && dist[i] != null
        ? (dist[i] as number) / 100
        : 1 / n;
    const damageForTarget = Math.floor(single.totalDamage * dmgMult);
    const { targetBreakdown, finalDamage } = getDefenderResistanceBreakdown(
      target,
      damageType,
      damageForTarget,
    );
    targetsResult.push({
      targetId: target.basicInfo.id,
      targetName: target.basicInfo.name,
      targetBreakdown,
      finalDamage,
    });
  }

  return {
    breakdown: single.breakdown,
    totalDamage: single.totalDamage,
    targets: targetsResult,
  };
}
