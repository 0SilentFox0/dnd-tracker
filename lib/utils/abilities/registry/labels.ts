import { ABILITY_LABELS } from "@/lib/constants/abilities";
import type { AbilityTarget, Amount, CONDITION_KEYS, DamageFilterKind, Flat, Limits, StatKey } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/format";
import { pluralUk } from "@/lib/utils/plural";

export const STAT_LABELS: Record<StatKey, string> = {
  armor: "AC",
  attackBonus: "бонус атаки",
  critThreshold: "поріг криту",
  actionsPerTurn: "дії за хід",
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
  return typeof flat === "number" ? signed(flat) : `+(${flat.formula})`;
}

export function amountLabel(amount: Amount): string {
  if (typeof amount === "number" || typeof amount === "string") return String(amount);

  if ("formula" in amount) return `(${amount.formula})`;

  if (amount.percentOf === "ownerAttack") return `${amount.value} % шкоди першої атаки`;

  return `${amount.value}% від ${amount.percentOf === "eventDamage" ? "завданої шкоди" : "макс. HP"}`;
}

export const TARGET_LABELS: Record<AbilityTarget, string> = {
  self: "я",
  eventTarget: "ціль події",
  eventActor: "виконавець події",
  allAllies: "усі союзники",
  allEnemies: "усі вороги",
  everyone: "усі учасники",
};

export const CONDITION_LABELS: Record<(typeof CONDITION_KEYS)[number], string> = {
  no_bonus_action: "без бонусної дії",
  no_reaction: "без реакції",
  disable_melee_attacks: "без ближніх атак",
  disable_ranged_attacks: "без дальніх атак",
  disable_spell_casting: "без заклинань",
  skip_action: "втрата дії",
};

export function limitsLabel(l: Limits | undefined): string[] {
  if (!l) return [];

  return [
    l.perBattle ? `${l.perBattle} ${pluralUk(l.perBattle, ["раз", "рази", "разів"])} за бій` : null,
    l.perRound ? `${l.perRound}/раунд` : null,
    l.perTurn ? `${l.perTurn}/хід` : null,
    l.chance ? `${l.chance}%` : null,
  ].filter((x): x is string => !!x);
}
