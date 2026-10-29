import type { SpellCast } from "../spell-cast";
import type { SpellDerivation } from "../spell-derive";
import { chooseOneSpell, helpAlly, reduceDamageRoll } from "./choice-help";
import { byDistanceDamage, fallingDamage } from "./distance";
import { grantSpellAttack } from "./grant-cast";
import { selfDamageTransfer } from "./self-damage-transfer";
import { controlAnimal, speedAtLeast } from "./target-filter";

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
export const SPELL_RECOGNIZERS: SpellRecognizer[] = [selfDamageTransfer, byDistanceDamage, fallingDamage, grantSpellAttack, controlAnimal, speedAtLeast, chooseOneSpell, reduceDamageRoll, helpAlly];

export function recognizeSpell(input: SpellPatternInput): SpellDerivation | null {
  for (const recognize of SPELL_RECOGNIZERS) {
    const found = recognize(input);

    if (found) return found;
  }

  return null;
}
