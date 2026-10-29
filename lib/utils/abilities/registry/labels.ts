import { ABILITY_LABELS } from "@/lib/constants/abilities";
import type { AbilityTarget, Amount, AnyConditionKey, Condition5eKey, CustomConditionKey, DamageFilterKind, Flat, Limits, StatKey } from "@/lib/utils/abilities/schema";
import { isCustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
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

export function flatLabel(flat: Flat | { spellRoll: number }): string {
  if (typeof flat === "number") return signed(flat);

  if ("spellRoll" in flat) return flat.spellRoll === 100 ? "+кидок" : flat.spellRoll === -100 ? "−кидок" : `${signed(flat.spellRoll)}% кидка`;

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

export const TARGET_LABELS: Record<AbilityTarget, string> = {
  self: "я",
  eventTarget: "ціль події",
  eventActor: "виконавець події",
  otherEnemy: "інший ворог (не ціль)",
  allAllies: "усі союзники",
  allEnemies: "усі вороги",
  everyone: "усі учасники",
  nearbyAllies: "союзники поруч (зона)",
  nearbyEnemies: "вороги поруч (зона)",
};

export const CONDITION_LABELS: Record<AnyConditionKey, string> = {
  no_bonus_action: "без бонусної дії",
  no_reaction: "без реакції",
  disable_melee_attacks: "без ближніх атак",
  disable_ranged_attacks: "без дальніх атак",
  disable_spell_casting: "без заклинань",
  no_hostile_spells: "без ворожих заклинань",
  no_damage_dealt: "не завдає шкоди",
  skip_action: "втрата дії",
  immobilized: "знерухомлений",
  ...Object.fromEntries(Object.entries(CONDITION_5E_REGISTRY).map(([k, d]) => [k, d.label.toLowerCase()])) as Record<Condition5eKey, string>,
};

export const conditionLabel = (key: AnyConditionKey | CustomConditionKey): string => (isCustomConditionKey(key) ? key.slice("custom:".length) : CONDITION_LABELS[key]);

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
