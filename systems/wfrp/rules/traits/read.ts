import { AVERAGE_SIZE } from './constants';

import { resolvedAbilitiesOf } from '@/lib/utils/abilities/engine/core/participants';
import type { AnyEffect } from '@/lib/utils/abilities/schema';
import type { WfrpEffect } from '@/systems/wfrp/rules/ability-effects';
import {
    isWfrpEffectKind,
    type PsychologyKind,
    TRAIT_SIZES,
    type TraitSize,
} from '@/systems/wfrp/rules/trait-kinds';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';

export interface TraitEntry {
    ability: ResolvedAbility;
    effect: WfrpEffect;
    index: number;
}

export function traitEntries(
    abilities: readonly ResolvedAbility[]
): TraitEntry[] {
    return abilities.flatMap((ability) =>
        ability.trigger.event !== 'passive' || ability.condition
            ? []
            : (ability.effects as readonly AnyEffect[]).flatMap(
                  (effect, index) =>
                      isWfrpEffectKind(effect.kind)
                          ? [{ ability, effect: effect as WfrpEffect, index }]
                          : []
              )
    );
}

export const traitEffects = (
    abilities: readonly ResolvedAbility[]
): WfrpEffect[] => traitEntries(abilities).map((e) => e.effect);

export const psychologyOf = (
    p: BattleParticipant
): { kind: PsychologyKind; value: number }[] =>
    traitEffects(resolvedAbilitiesOf(p)).flatMap((e) =>
        e.kind === 'wfrpPsychology'
            ? [{ kind: e.psychology, value: e.value }]
            : []
    );

export const CANON_SIZES = [
    'small',
    'average',
    'large',
    'enormous',
    'monstrous',
] as const;

export type CanonSize = (typeof CANON_SIZES)[number];

/** Canon has five sizes: Tiny and Little read as Small */
export const canonSizeOf = (size: TraitSize | undefined): CanonSize =>
    size === 'tiny' || size === 'little'
        ? 'small'
        : ((size ?? AVERAGE_SIZE) as CanonSize);

export const canonSizeStep = (size: TraitSize | undefined): number =>
    CANON_SIZES.indexOf(canonSizeOf(size));

export const sizeStep = (size: TraitSize | undefined): number =>
    TRAIT_SIZES.indexOf(size ?? AVERAGE_SIZE);
