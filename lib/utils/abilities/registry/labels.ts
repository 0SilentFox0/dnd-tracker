import type { AbilityTarget, Amount, CONDITION_KEYS, DamageFilterKind, Flat, Limits, StatKey } from "@/lib/utils/abilities/schema";

export const STAT_LABELS: Record<StatKey, string> = {
  armor: "AC",
  attackBonus: "бонус атаки",
  critThreshold: "поріг криту",
  initiative: "ініціатива",
  maxHp: "макс. HP",
  speed: "швидкість",
  morale: "мораль",
  minTargets: "мін. цілей",
  maxTargets: "макс. цілей",
  spellSlots: "слоти заклинань",
  strength: "Сила",
  dexterity: "Спритність",
  constitution: "Статура",
  intelligence: "Інтелект",
  wisdom: "Мудрість",
  charisma: "Харизма",
};

export const DAMAGE_FILTER_LABELS: Record<DamageFilterKind, string> = {
  melee: "ближня",
  ranged: "дальня",
  magic: "магічна",
  physical: "фізична",
  all: "вся",
};

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function flatLabel(flat: Flat): string {
  return typeof flat === "number" ? signed(flat) : `+(${flat.formula})`;
}

export function amountLabel(amount: Amount): string {
  if (typeof amount === "number" || typeof amount === "string") return String(amount);

  if ("formula" in amount) return `(${amount.formula})`;

  return `${amount.value}% від ${amount.percentOf === "eventDamage" ? "завданої шкоди" : "макс. HP"}`;
}

export const TARGET_LABELS: Record<AbilityTarget, string> = {
  self: "я",
  eventTarget: "ціль події",
  eventActor: "виконавець події",
  allAllies: "усі союзники",
  allEnemies: "усі вороги",
};

export const CONDITION_LABELS: Record<(typeof CONDITION_KEYS)[number], string> = {
  no_bonus_action: "без бонусної дії",
  no_reaction: "без реакції",
  disable_melee_attacks: "без ближніх атак",
  disable_ranged_attacks: "без дальніх атак",
  disable_spell_casting: "без заклинань",
};

export function limitsLabel(l: Limits | undefined): string[] {
  if (!l) return [];

  return [
    l.perBattle ? `${l.perBattle} раз${l.perBattle > 1 ? "и" : ""} за бій` : null,
    l.perRound ? `${l.perRound}/раунд` : null,
    l.perTurn ? `${l.perTurn}/хід` : null,
    l.chance ? `${l.chance}%` : null,
  ].filter((x): x is string => !!x);
}
