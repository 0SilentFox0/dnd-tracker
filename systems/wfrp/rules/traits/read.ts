import { AVERAGE_SIZE } from "./constants";

import type { AnyEffect } from "@/lib/utils/abilities/schema";
import type { WfrpEffect } from "@/systems/wfrp/rules/ability-effects";
import { isWfrpEffectKind, TRAIT_SIZES, type TraitSize } from "@/systems/wfrp/rules/trait-kinds";
import type { ResolvedAbility } from "@/types/abilities";

export interface TraitEntry {
  ability: ResolvedAbility;
  effect: WfrpEffect;
  index: number;
}

export function traitEntries(abilities: readonly ResolvedAbility[]): TraitEntry[] {
  return abilities.flatMap((ability) =>
    ability.trigger.event !== "passive" || ability.condition ? [] : (ability.effects as readonly AnyEffect[]).flatMap((effect, index) => (isWfrpEffectKind(effect.kind) ? [{ ability, effect: effect as WfrpEffect, index }] : [])),
  );
}

export const traitEffects = (abilities: readonly ResolvedAbility[]): WfrpEffect[] => traitEntries(abilities).map((e) => e.effect);

export const sizeStep = (size: TraitSize | undefined): number => TRAIT_SIZES.indexOf(size ?? AVERAGE_SIZE);
