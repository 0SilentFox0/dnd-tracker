import type { Amount, DamageFilterKind, Flat, StatKey } from "@/lib/utils/abilities/schema";

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
