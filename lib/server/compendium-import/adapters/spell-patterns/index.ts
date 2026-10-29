import type { SpellCast } from "../spell-cast";
import type { SpellDerivation } from "../spell-derive";
import { anchoredZoneSpell } from "./anchored-zone";
import { autoReactionSpell } from "./auto-reaction";
import { chooseOneSpell, helpAlly, reduceDamageRoll } from "./choice-help";
import { byDistanceDamage, delayedStrike, fallingDamage } from "./distance";
import { grantSpellAttack, grantWeaponObject } from "./grant-cast";
import { armoredForm, grapplingDot } from "./held-form";
import { hitRiderSpell, moveSelfSpell } from "./hit-rider";
import { selfDamageTransfer } from "./self-damage-transfer";
import { summonObject, transformSpell } from "./summon-transform";
import { controlAnimal, speedAtLeast } from "./target-filter";
import { terrainZoneSpell, wallSpell } from "./zone-terrain";

import type { AbilityKey } from "@/lib/constants/abilities";

export interface SpellPatternInput {
  row: Record<string, unknown>;
  raw: string;
  text: string;
  higher: string;
  cast: SpellCast;
  ability: AbilityKey | null;
  damageTypes: string[];
}

export type SpellRecognizer = (i: SpellPatternInput) => SpellDerivation | null;

// narrow patterns first
export const SPELL_RECOGNIZERS: SpellRecognizer[] = [summonObject, transformSpell, terrainZoneSpell, anchoredZoneSpell, wallSpell, selfDamageTransfer, delayedStrike, byDistanceDamage, fallingDamage, grapplingDot, armoredForm, autoReactionSpell, grantSpellAttack, grantWeaponObject, hitRiderSpell, moveSelfSpell, controlAnimal, speedAtLeast, chooseOneSpell, reduceDamageRoll, helpAlly];

export function recognizeSpell(input: SpellPatternInput): SpellDerivation | null {
  for (const recognize of SPELL_RECOGNIZERS) {
    const found = recognize(input);

    if (found) return found;
  }

  return null;
}
