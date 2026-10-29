import type { Trigger } from "@/lib/utils/abilities/schema";
import { SPELL_ONLY_EFFECT_KINDS, type SpellEffect } from "@/lib/utils/spells/model/schema";

export const SPELL_EFFECT_TRIGGER: Trigger = { event: "action" };

export type SpellOnlyKind = (typeof SPELL_ONLY_EFFECT_KINDS)[number];

export type SpellOnlyEffect<K extends SpellOnlyKind = SpellOnlyKind> = Extract<SpellEffect, { kind: K }>;

export const isSpellOnlyKind = (k: string): k is SpellOnlyKind => (SPELL_ONLY_EFFECT_KINDS as readonly string[]).includes(k);

export const SPELL_ONLY_LABEL_KEYS = Object.fromEntries(SPELL_ONLY_EFFECT_KINDS.map((k) => [k, `spellEffects.kinds.${k}`])) as Record<SpellOnlyKind, string>;

const DEFAULT_TEXT = "N";

const DEFAULTS: { [K in SpellOnlyKind]: Omit<SpellOnlyEffect<K>, "kind"> } = {
  chooseOne: { options: [{ kind: "heal", amount: { spellRoll: 100 } }, { kind: "dealDamage", amount: { spellRoll: 100 } }] },
  inputDice: { label: DEFAULT_TEXT, max: 20 },
  moveSelf: { to: "adjacentToTarget" },
  createTerrain: { terrain: "difficult", shape: "cell", cells: 4, rounds: 10 },
  transform: { unitId: "", revertAtZero: true, duration: { rounds: 10 } },
  grantCast: {
    label: DEFAULT_TEXT,
    cost: "action",
    duration: { rounds: 10 },
    cast: { targeting: { kind: "enemy", range: 30 }, resolution: { kind: "attack" }, dice: 1, dieSides: 6, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 } }] },
  },
  hitRider: { attackKind: "any", extraDice: "1d6", damageType: "fire", charges: 1, duration: { rounds: 10 } },
  anchoredZone: { radiusFeet: 10, side: "enemies", duration: { rounds: 10 }, onEnter: { effects: [{ kind: "dealDamage", amount: { spellRoll: 100 } }] } },
  summonInline: { name: DEFAULT_TEXT, size: "small", ac: "spellDc", hp: null, count: 1, duration: { rounds: 10 } },
};

export function newSpellOnlyEffect(kind: SpellOnlyKind): SpellEffect {
  return structuredClone({ kind, ...DEFAULTS[kind] }) as SpellEffect;
}

export function pruneEmpty<T>(value: T): T {
  if (Array.isArray(value) || value === null || typeof value !== "object") return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => [k, pruneEmpty(v)] as const)
    .filter(([, v]) => v !== undefined && !(v !== null && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0));

  return Object.fromEntries(entries) as T;
}
