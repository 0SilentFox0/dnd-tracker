import type { DiceThrowSpec } from "./dice/from-action";

export const FX_ARCHETYPES = ["melee", "ranged", "bolt", "area", "heal", "buff", "debuff", "summon", "death", "swarm", "quake", "teleport", "entangle", "meteor", "eldritch", "slow", "haste", "stoneskin", "cleanse", "regenerate", "might", "deflect", "holyword", "empower", "spellward", "sunbeam", "retribution", "resurrect", "siphon", "rust", "pestilence", "whispers", "thorns", "raincloud", "blindfold", "puppet", "netherhands", "firesummon", "watersummon", "earthsummon", "airsummon", "phoenix", "avatar", "healword", "healwave", "rebirth", "forestspirit", "thornvines", "moonbeam", "vampire", "dice"] as const;

export type FxArchetype = (typeof FX_ARCHETYPES)[number];

export const FX_ELEMENTS = ["fire", "cold", "lightning", "poison", "necrotic", "radiant", "arcane", "physical", "nature", "earth", "fury", "wind"] as const;

export type FxElement = (typeof FX_ELEMENTS)[number];

export interface FxSpec {
  key: string;
  archetype: FxArchetype;
  element: FxElement;
  actorId: string;
  actorSide: "ally" | "enemy";
  targetIds: string[];
  hit: boolean;
  critical: boolean;
  at?: { x: number; y: number };
  dice?: DiceThrowSpec;
}

export const FX_AURA_KINDS = ["stun", "charm", "rage", "bind", "plague", "burning", "frost", "decay", "bleeding", "static", "marked", "curse", "regen", "shield", "blessing", "frozen", "moonmark", "dust", "stings", "roots", "blind", "bloodlust", "haste", "shackles", "stoneskin", "lifedome", "sunglow", "spellward", "deflect", "might", "holyweapon", "sapped", "rust", "dizzy", "thorncrown", "raincloud", "strings", "vines", "stag"] as const;

export type FxAuraKind = (typeof FX_AURA_KINDS)[number];
