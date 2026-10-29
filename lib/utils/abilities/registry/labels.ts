import { DAMAGE_ELEMENT_LABELS } from "@/lib/constants/damage";
import type { AbilityTarget, Amount, AnyConditionKey, Condition5eKey, DamageFilterKind, Flat, Limits, StatKey } from "@/lib/utils/abilities/schema";
import { ABILITY_TARGETS, CONDITION_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { seg,type Segment } from "@/lib/utils/abilities/segments";
import { CONDITION_5E_REGISTRY } from "@/lib/utils/battle/conditions/registry";
import { signed } from "@/lib/utils/common/format";

export const CONDITION_KEYS_ALL: readonly AnyConditionKey[] = [...CONDITION_KEYS, ...(Object.keys(CONDITION_5E_REGISTRY) as Condition5eKey[])];

export const TARGET_KEYS: readonly AbilityTarget[] = ABILITY_TARGETS;

export const damageTypeSegment = (type: string): Segment => (type in DAMAGE_ELEMENT_LABELS ? seg(`damageTypes.${type}`) : seg("summary.text", { value: type }));

export const statSegment = (k: StatKey): Segment => seg(`stats.${k}`);

export const targetSegment = (k: AbilityTarget): Segment => seg(`targets.${k}`);

export const damageFilterSegment = (k: DamageFilterKind): Segment => seg(`damageFilters.${k}`);

export const conditionKeySegment = (k: AnyConditionKey): Segment => seg(`options.condition.${k}`);

export function flatSegment(flat: Flat): Segment {
  if (typeof flat === "number") return seg("summary.flat.number", { value: signed(flat) });

  return "formula" in flat ? seg("summary.flat.formula", { formula: flat.formula }) : seg("summary.flat.scale", { scale: flat.scale });
}

export function amountSegment(amount: Amount): Segment {
  if (typeof amount === "number" || typeof amount === "string") return seg("summary.amount.value", { value: amount });

  if ("scale" in amount) return seg("summary.amount.scale", { scale: amount.scale });

  if ("formula" in amount) return seg("summary.amount.formula", { formula: amount.formula });

  if ("spellRoll" in amount) {
    if (typeof amount.spellRoll !== "number") return seg("summary.amount.spellRollFormula", { formula: amount.spellRoll.formula });

    return amount.spellRoll === 100 ? seg("summary.amount.spellRollFull") : seg("summary.amount.spellRollPct", { value: amount.spellRoll });
  }

  if (amount.percentOf === "ownerAttack") return seg("summary.amount.percentOwnerAttack", { value: amount.value });

  return seg(amount.percentOf === "eventDamage" ? "summary.amount.percentOfEventDamage" : "summary.amount.percentOfMaxHp", { value: amount.value });
}

function perRestSegment(r: NonNullable<Limits["perRest"]>): Segment {
  const rest = seg(r.rest === "short" ? "summary.limits.restShort" : "summary.limits.restLong");

  if (typeof r.uses === "number") return seg("summary.limits.perRestN", { n: r.uses, rest });

  return seg("summary.limits.perRestExpr", { expr: "formula" in r.uses ? `(${r.uses.formula})` : `[${r.uses.scale}]`, rest });
}

export function limitsSegments(l: Limits | undefined): Segment[] {
  if (!l) return [];

  return [
    l.perBattle ? seg("summary.limits.perBattle", { n: l.perBattle }) : null,
    l.perRest ? perRestSegment(l.perRest) : null,
    l.perRound ? seg("summary.limits.perRound", { n: l.perRound }) : null,
    l.perTurn ? seg("summary.limits.perTurn", { n: l.perTurn }) : null,
    l.cooldownRounds ? seg("summary.limits.cooldown", { n: l.cooldownRounds }) : null,
    l.chance ? seg("summary.limits.chance", { n: l.chance }) : null,
    l.lair ? seg("summary.limits.lair") : null,
    l.legendaryCost ? seg("summary.limits.legendary", { n: l.legendaryCost }) : null,
    l.pool ? seg("summary.limits.pool", { key: l.pool.key, cost: l.pool.cost }) : null,
  ].filter((x): x is Segment => !!x);
}

export function percentSegment(p: Flat): Segment {
  if (typeof p === "number") return seg("summary.percent.number", { value: signed(p) });

  return "formula" in p ? seg("summary.percent.formula", { formula: p.formula }) : seg("summary.percent.scale", { scale: p.scale });
}
