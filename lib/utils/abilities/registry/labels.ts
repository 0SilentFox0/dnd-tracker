import { refMap } from "./text";

import { textRef } from "@/lib/i18n/text-ref";
import type { Amount } from "@/lib/utils/abilities/schema";
import { ABILITY_TARGETS, CONDITION_5E_KEYS, CONDITION_KEYS, DAMAGE_FILTER_KINDS, type Flat, type Limits, STAT_KEYS } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/common/format";
import type { LogLine, TextArg } from "@/types/text";

export const STAT_LABELS = refMap("abilityRegistry.stats", STAT_KEYS);

export const DAMAGE_FILTER_LABELS = refMap("abilityRegistry.damageFilters", DAMAGE_FILTER_KINDS);

export function flatLabel(flat: Flat): string {
  if (typeof flat === "number") return signed(flat);

  return "formula" in flat ? `+(${flat.formula})` : `+[${flat.scale}]`;
}

export function amountLabel(amount: Amount): TextArg {
  if (typeof amount === "number" || typeof amount === "string") return String(amount);

  if ("scale" in amount) return `[${amount.scale}]`;

  if ("formula" in amount) return `(${amount.formula})`;

  if ("spellRoll" in amount) {
    if (typeof amount.spellRoll !== "number") return textRef("abilityText.amount.spellRollFormula", { formula: amount.spellRoll.formula });

    return amount.spellRoll === 100 ? textRef("abilityText.amount.spellRoll") : textRef("abilityText.amount.spellRollPercent", { value: amount.spellRoll });
  }

  if (amount.percentOf === "ownerAttack") return textRef("abilityText.amount.ownerAttack", { value: amount.value });

  return textRef(amount.percentOf === "eventDamage" ? "abilityText.amount.eventDamage" : "abilityText.amount.maxHp", { value: amount.value });
}

export const TARGET_LABELS = refMap("abilityRegistry.targets", ABILITY_TARGETS);

export const CONDITION_LABELS = refMap("abilityRegistry.options.condition", [...CONDITION_KEYS, ...CONDITION_5E_KEYS]);

const usesLabel = (uses: NonNullable<Limits["perRest"]>["uses"]) => (typeof uses === "number" ? uses : "formula" in uses ? `(${uses.formula})` : `[${uses.scale}]`);

export function limitsLabel(l: Limits | undefined): LogLine[] {
  if (!l) return [];

  const lines: (LogLine | null)[] = [
    l.perBattle ? textRef("abilityText.limits.perBattle", { count: l.perBattle }) : null,
    l.perRest ? textRef(typeof l.perRest.uses === "number" ? "abilityText.limits.perRest" : "abilityText.limits.perRestFormula", { uses: usesLabel(l.perRest.uses), rest: l.perRest.rest }) : null,
    l.perRound ? textRef("abilityText.limits.perRound", { count: l.perRound }) : null,
    l.perTurn ? textRef("abilityText.limits.perTurn", { count: l.perTurn }) : null,
    l.cooldownRounds ? textRef("abilityText.limits.cooldown", { count: l.cooldownRounds }) : null,
    l.chance ? `${l.chance}%` : null,
    l.lair ? textRef("abilityText.limits.lair") : null,
    l.legendaryCost ? textRef("abilityText.limits.legendaryCost", { cost: l.legendaryCost }) : null,
    l.pool ? textRef("abilityText.limits.pool", { key: l.pool.key, cost: l.pool.cost }) : null,
  ];

  return lines.filter((x): x is LogLine => x !== null);
}
