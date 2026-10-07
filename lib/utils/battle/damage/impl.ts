import type { DamageCalculationResult } from "../types/damage-calculations";

import { AttackType, BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { collectModifiers, type ModifierEntry } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/format";
import type { BattleParticipant, DamageStep } from "@/types/battle";

const BONUS_PREFIX: Record<ModifierEntry["sourceType"], string> = {
  skill: "Бонус зі скілів",
  race: "Расовий бонус",
  artifact: "Бонус артефакту",
  artifactSet: "Бонус сету",
  unit: "Бонус істоти",
  character: "Бонус персонажа",
  effect: "Бонус ефекту",
  action: "Бонус дії",
};

export function calculateDamageWithModifiersImpl(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: {
    allParticipants?: BattleParticipant[];
    additionalDamage?: Array<{ type: string; value: number }>;
    heroLevelPart?: number;
    heroDicePart?: number;
    heroDiceNotation?: string;
    weaponDiceNotation?: string;
    actionModifiers?: StaticEffect[];
    statLabel?: string;
  },
): DamageCalculationResult {
  const breakdown: string[] = [];

  const heroLevelPart = context?.heroLevelPart ?? 0;

  const heroDicePart = context?.heroDicePart ?? 0;

  const heroDiceNotation = context?.heroDiceNotation;

  const statLabel = context?.statLabel ?? (attackType === AttackType.MELEE ? "Сила" : "Спритність");

  const baseWithStat = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    baseDamage + heroLevelPart + heroDicePart + statModifier,
  );

  breakdown.push(`Сума кубиків: ${baseDamage}`);

  if (heroLevelPart > 0 || heroDicePart > 0) {
    breakdown.push(`+ бонус ${statModifier} (${statLabel})`);

    const levelAndDice = heroLevelPart + heroDicePart;

    const levelLabel =
      heroDicePart > 0 && heroDiceNotation
        ? `рівень + кубики за рівнем (${heroDiceNotation})`
        : heroDicePart > 0
          ? "рівень + кубики за рівнем"
          : "рівень";

    breakdown.push(`+ ${levelAndDice} (${levelLabel})`);
    breakdown.push(`= ${baseWithStat} (база)`);
  } else {
    breakdown.push(`+ бонус ${statModifier} (${statLabel})`);
    breakdown.push(`= ${baseWithStat} (база)`);
  }

  const kind = attackType === AttackType.MELEE ? "melee" : "ranged";

  const mods = collectModifiers(
    withSelf(context?.allParticipants ?? [], attacker),
    attacker.basicInfo.id,
    { damage: { kind } },
    context?.actionModifiers,
  );

  for (const e of mods.entries) {
    const prefix = BONUS_PREFIX[e.sourceType];

    if (e.percent) breakdown.push(`${prefix}: ${signed(e.percent)}% (${e.label})`);

    if (e.flat) breakdown.push(`Flat ${prefix.toLowerCase()}: ${signed(e.flat)} (${e.label})`);
  }

  const isArtifact = (e: ModifierEntry) => e.sourceType === "artifact" || e.sourceType === "artifactSet";

  const sum = (pred: (e: ModifierEntry) => boolean, key: "flat" | "percent") =>
    mods.entries.filter(pred).reduce((acc, e) => acc + e[key], 0);

  const percentBonusDamage = Math.floor((baseWithStat * mods.percent) / BATTLE_CONSTANTS.PERCENT_DIVISOR);

  const totalBeforeFloor = baseWithStat + percentBonusDamage + mods.flat;

  const totalDamage = Math.max(0, Math.floor(totalBeforeFloor));

  breakdown.push(`──────────`);
  breakdown.push(`Сума ${totalBeforeFloor.toFixed(1)} = ${totalDamage} шкоди`);

  const steps: DamageStep[] = [{ label: "Кубики", side: "attacker", kind: "dice", value: baseDamage, after: baseDamage }];

  let running = baseDamage;

  if (statModifier !== 0) {
    running += statModifier;
    steps.push({ label: statLabel, side: "attacker", kind: "flat", value: statModifier, after: running });
  }

  if (heroLevelPart + heroDicePart > 0) {
    running += heroLevelPart + heroDicePart;
    steps.push({ label: "Рівень героя", side: "attacker", kind: "flat", value: heroLevelPart + heroDicePart, after: running });
  }

  let percentSoFar = 0;

  for (const e of mods.entries.filter((x) => x.percent)) {
    percentSoFar += e.percent;
    steps.push({
      label: e.label,
      side: "attacker",
      kind: "percent",
      value: e.percent,
      after: baseWithStat + Math.floor((baseWithStat * percentSoFar) / BATTLE_CONSTANTS.PERCENT_DIVISOR),
      icon: e.icon,
    });
  }

  let flatSoFar = 0;

  for (const e of mods.entries.filter((x) => x.flat)) {
    flatSoFar += e.flat;
    steps.push({ label: e.label, side: "attacker", kind: "flat", value: e.flat, after: baseWithStat + percentBonusDamage + flatSoFar, icon: e.icon });
  }

  steps[steps.length - 1] = { ...steps[steps.length - 1], after: totalDamage };

  return {
    baseDamage: baseWithStat,
    skillPercentBonus: sum((e) => !isArtifact(e), "percent"),
    skillFlatBonus: sum((e) => !isArtifact(e), "flat"),
    artifactPercentBonus: sum(isArtifact, "percent"),
    artifactFlatBonus: sum(isArtifact, "flat"),
    passiveAbilityBonus: 0,
    additionalDamage: context?.additionalDamage || [],
    totalDamage,
    breakdown,
    steps,
  };
}
