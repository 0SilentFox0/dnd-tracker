import type { DamageCalculationResult } from "../types/damage-calculations";
import { ruleRow, stepRow, totalRow } from "./rows";

import type { AbilityKey } from "@/lib/constants/abilities";
import { AttackType, BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { collectModifiers, type ModifierEntry } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { abilityRef } from "@/lib/utils/battle/common/terms";
import { signed } from "@/lib/utils/common/format";
import type { BattleParticipant, DamageRow, DamageStep } from "@/types/battle";
import type { TextRef } from "@/types/text";

const BONUS_PREFIX: Record<ModifierEntry["sourceType"], TextRef> = {
  skill: textRef("battleLog.damage.sources.skill"),
  race: textRef("battleLog.damage.sources.race"),
  class: textRef("battleLog.damage.sources.class"),
  feat: textRef("battleLog.damage.sources.feat"),
  artifact: textRef("battleLog.damage.sources.artifact"),
  artifactSet: textRef("battleLog.damage.sources.artifactSet"),
  unit: textRef("battleLog.damage.sources.unit"),
  character: textRef("battleLog.damage.sources.character"),
  effect: textRef("battleLog.damage.sources.effect"),
  action: textRef("battleLog.damage.sources.action"),
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
    statKey?: AbilityKey;
    targetId?: string;
  },
): DamageCalculationResult {
  const breakdown: DamageRow[] = [];

  const heroLevelPart = context?.heroLevelPart ?? 0;

  const heroDicePart = context?.heroDicePart ?? 0;

  const heroDiceNotation = context?.heroDiceNotation;

  const statLabel = abilityRef(context?.statKey ?? (attackType === AttackType.MELEE ? "strength" : "dexterity"));

  const baseWithStat = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    baseDamage + heroLevelPart + heroDicePart + statModifier,
  );

  breakdown.push(stepRow(textRef("battleLog.damage.rows.dice"), baseDamage));

  breakdown.push(stepRow(statLabel, signed(statModifier)));

  if (heroLevelPart > 0 || heroDicePart > 0) {
    const levelAndDice = heroLevelPart + heroDicePart;

    const levelLabel =
      heroDicePart > 0 && heroDiceNotation
        ? textRef("battleLog.damage.rows.levelDiceNotation", { dice: heroDiceNotation })
        : heroDicePart > 0
          ? textRef("battleLog.damage.rows.levelDice")
          : textRef("battleLog.damage.rows.level");

    breakdown.push(stepRow(levelLabel, `+${levelAndDice}`));
  }

  breakdown.push(totalRow(textRef("battleLog.damage.rows.base"), baseWithStat));

  const kind = attackKindOf(attackType);

  const mods = collectModifiers(
    withSelf(context?.allParticipants ?? [], attacker),
    attacker.basicInfo.id,
    { damage: { kind, targetId: context?.targetId } },
    context?.actionModifiers,
  );

  for (const e of mods.entries) {
    const prefix = BONUS_PREFIX[e.sourceType];

    if (e.percent) breakdown.push(stepRow(e.label, `${signed(e.percent)}%`, prefix));

    if (e.flat) breakdown.push(stepRow(e.label, signed(e.flat), prefix));
  }

  const isArtifact = (e: ModifierEntry) => e.sourceType === "artifact" || e.sourceType === "artifactSet";

  const sum = (pred: (e: ModifierEntry) => boolean, key: "flat" | "percent") =>
    mods.entries.filter(pred).reduce((acc, e) => acc + e[key], 0);

  const percentBonusDamage = Math.floor((baseWithStat * mods.percent) / BATTLE_CONSTANTS.PERCENT_DIVISOR);

  const totalBeforeFloor = baseWithStat + percentBonusDamage + mods.flat;

  const totalDamage = Math.max(0, Math.floor(totalBeforeFloor));

  breakdown.push(ruleRow());
  breakdown.push(totalRow(textRef("battleLog.damage.rows.sum"), totalDamage));

  const steps: DamageStep[] = [{ label: textRef("battleLog.damage.steps.dice"), side: "attacker", kind: "dice", value: baseDamage, after: baseDamage }];

  let running = baseDamage;

  if (statModifier !== 0) {
    running += statModifier;
    steps.push({ label: statLabel, side: "attacker", kind: "flat", value: statModifier, after: running });
  }

  if (heroLevelPart + heroDicePart > 0) {
    running += heroLevelPart + heroDicePart;
    steps.push({ label: textRef("battleLog.damage.steps.heroLevel"), side: "attacker", kind: "flat", value: heroLevelPart + heroDicePart, after: running });
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
