import { AVERAGE_SIZE } from "./constants";

import type { AnyEffect, TraitEffect } from "@/lib/utils/abilities/schema";
import { isTraitEffectKind, TRAIT_SIZES, type TraitSize } from "@/lib/utils/abilities/schema/kinds";
import type { ResolvedAbility } from "@/types/abilities";

export interface TraitEntry {
  ability: ResolvedAbility;
  effect: TraitEffect;
  index: number;
}

export function traitEntries(abilities: readonly ResolvedAbility[]): TraitEntry[] {
  return abilities.flatMap((ability) =>
    ability.trigger.event !== "passive" || ability.condition ? [] : (ability.effects as readonly AnyEffect[]).flatMap((effect, index) => (isTraitEffectKind(effect.kind) ? [{ ability, effect: effect as TraitEffect, index }] : [])),
  );
}

export const traitEffects = (abilities: readonly ResolvedAbility[]): TraitEffect[] => traitEntries(abilities).map((e) => e.effect);

export const sizeStep = (size: TraitSize | undefined): number => TRAIT_SIZES.indexOf(size ?? AVERAGE_SIZE);
