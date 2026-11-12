import { resolveFlat } from './flat';
import { strengthOf } from './strength-core';

import type { StaticEffect } from '@/lib/utils/abilities/schema';
import type { BattleParticipant } from '@/types/battle';

/** Сила статичного ефекту для порівняння однакових аур: |flat| + |percent|, прапорці — їхній параметр або 1. Формули — лише з власником. */
export function staticEffectStrength(
    effect: StaticEffect,
    owner?: BattleParticipant
): number {
    return strengthOf(effect, (v) =>
        typeof v === 'number'
            ? v
            : v && owner
              ? resolveFlat(v as Parameters<typeof resolveFlat>[0], owner)
              : 0
    );
}
