import { ABILITY_LABELS } from "@/lib/constants/abilities";
import type { AbilityTarget, Amount, AnyConditionKey, Condition5eKey, DamageFilterKind, Flat, Limits, StatKey } from "@/lib/utils/abilities/schema";
import { ABILITY_TARGETS } from "@/lib/utils/abilities/schema/kinds";
import { seg,type Segment } from "@/lib/utils/abilities/segments";
import { CONDITION_5E_REGISTRY } from "@/lib/utils/battle/conditions/registry";
import { signed } from "@/lib/utils/common/format";
import { pluralUk } from "@/lib/utils/common/plural";

export const STAT_LABELS: Record<StatKey, string> = {
  armor: "AC",
  attackBonus: "бонус атаки",
  critThreshold: "поріг криту",
  actionsPerTurn: "дії за хід",
  savingThrow: "рятівні кидки",
  attacksPerAction: "Атак за дію «Атака»",
  initiative: "ініціатива",
  maxHp: "макс. HP",
  speed: "швидкість",
  morale: "мораль",
  minTargets: "мін. цілей",
  maxTargets: "макс. цілей",
  spellSlots: "слоти заклинань",
  ...ABILITY_LABELS,
};

export const DAMAGE_FILTER_LABELS: Record<DamageFilterKind, string> = {
  melee: "ближня",
  ranged: "дальня",
  magic: "магічна",
  physical: "фізична",
  all: "вся",
};

export function flatLabel(flat: Flat): string {
  if (typeof flat === "number") return signed(flat);

  return "formula" in flat ? `+(${flat.formula})` : `+[${flat.scale}]`;
}

export function amountLabel(amount: Amount): string {
  if (typeof amount === "number" || typeof amount === "string") return String(amount);

  if ("scale" in amount) return `[${amount.scale}]`;

  if ("formula" in amount) return `(${amount.formula})`;

  if ("spellRoll" in amount) {
    if (typeof amount.spellRoll !== "number") return `(${amount.spellRoll.formula})% кидка заклинання`;

    return amount.spellRoll === 100 ? "кидок заклинання" : `${amount.spellRoll}% кидка заклинання`;
  }

  if (amount.percentOf === "ownerAttack") return `${amount.value} % шкоди першої атаки`;

  return `${amount.value}% від ${amount.percentOf === "eventDamage" ? "завданої шкоди" : "макс. HP"}`;
}

export const CONDITION_LABELS: Record<AnyConditionKey, string> = {
  no_bonus_action: "без бонусної дії",
  no_reaction: "без реакції",
  disable_melee_attacks: "без ближніх атак",
  disable_ranged_attacks: "без дальніх атак",
  disable_spell_casting: "без заклинань",
  skip_action: "втрата дії",
  immobilized: "знерухомлений",
  ...Object.fromEntries(Object.entries(CONDITION_5E_REGISTRY).map(([k, d]) => [k, d.label.toLowerCase()])) as Record<Condition5eKey, string>,
};

const usesLabel = (uses: NonNullable<Limits["perRest"]>["uses"]) =>
  typeof uses === "number" ? `${uses} ${pluralUk(uses, ["раз", "рази", "разів"])}` : `${"formula" in uses ? `(${uses.formula})` : `[${uses.scale}]`} разів`;

export function limitsLabel(l: Limits | undefined): string[] {
  if (!l) return [];

  return [
    l.perBattle ? `${l.perBattle} ${pluralUk(l.perBattle, ["раз", "рази", "разів"])} за бій` : null,
    l.perRest ? `${usesLabel(l.perRest.uses)} за ${l.perRest.rest === "short" ? "короткий" : "довгий"} відпочинок` : null,
    l.perRound ? `${l.perRound}/раунд` : null,
    l.perTurn ? `${l.perTurn}/хід` : null,
    l.cooldownRounds ? `перезарядка ${l.cooldownRounds} р.` : null,
    l.chance ? `${l.chance}%` : null,
    l.lair ? "дія лігва" : null,
    l.legendaryCost ? `легендарна дія (${l.legendaryCost})` : null,
    l.pool ? `пул «${l.pool.key}»: ${l.pool.cost}` : null,
  ].filter((x): x is string => !!x);
}

export const TARGET_KEYS: readonly AbilityTarget[] = ABILITY_TARGETS;

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
