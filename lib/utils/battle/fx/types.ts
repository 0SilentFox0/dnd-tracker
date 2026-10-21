import type { DiceThrowSpec } from "./dice/from-action";

export type FxArchetype = "melee" | "ranged" | "bolt" | "area" | "heal" | "buff" | "debuff" | "summon" | "death" | "swarm" | "quake" | "teleport" | "entangle" | "meteor" | "eldritch" | "slow" | "haste" | "stoneskin" | "cleanse" | "regenerate" | "might" | "deflect" | "holyword" | "empower" | "spellward" | "sunbeam" | "retribution" | "resurrect" | "siphon" | "rust" | "pestilence" | "whispers" | "thorns" | "raincloud" | "blindfold" | "puppet" | "netherhands" | "firesummon" | "watersummon" | "earthsummon" | "airsummon" | "phoenix" | "avatar" | "healword" | "healwave" | "rebirth" | "forestspirit" | "thornvines" | "moonbeam" | "vampire" | "skystrike" | "icefall" | "dice";

export type FxElement = "fire" | "cold" | "lightning" | "poison" | "necrotic" | "radiant" | "arcane" | "physical" | "nature" | "earth" | "fury" | "wind";

export interface FxSpec {
  key: string;
  /** Дія журналу, з якої ця FX; кадр влучання токенів чекає її удару. */
  actionId?: string;
  archetype: FxArchetype;
  element: FxElement;
  actorId: string;
  actorSide: "ally" | "enemy";
  /** Звідки летить снаряд, якщо не від актора (стрибок ланцюга, сплеш від цілі). */
  originId?: string;
  targetIds: string[];
  hit: boolean;
  critical: boolean;
  at?: { x: number; y: number };
  dice?: DiceThrowSpec;
}

export type FxAuraKind = "stun" | "charm" | "rage" | "bind" | "plague" | "burning" | "frost" | "decay" | "bleeding" | "static" | "marked" | "curse" | "regen" | "shield" | "blessing" | "frozen" | "moonmark" | "dust" | "stings" | "roots" | "blind" | "bloodlust" | "haste" | "shackles" | "stoneskin" | "lifedome" | "sunglow" | "spellward" | "deflect" | "might" | "holyweapon" | "sapped" | "rust" | "dizzy" | "thorncrown" | "raincloud" | "strings" | "vines" | "stag";
