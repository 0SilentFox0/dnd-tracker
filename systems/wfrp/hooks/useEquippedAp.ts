'use client';

import { useMemo } from 'react';

import { useCharacterSheet } from '@/lib/hooks/characters';
import type { HitLocation } from '@/systems/wfrp/rules/combat/constants';
import { armourAp } from '@/systems/wfrp/rules/equipment';
import { ARMOUR_SL_PER_AP } from '@/systems/wfrp/rules/magic/constants';
import type { SheetArtifact } from '@/types/characters';

export interface EquippedAp {
    ap: Record<HitLocation, number>;
    flexible: boolean;
    penalty: number;
    shield: number;
}

export function equippedApOf(artifacts: SheetArtifact[]): EquippedAp {
    const worn = artifacts.filter((a) => !a.carried);

    const { ap, armourOnly, flexible, shield } = armourAp(
        worn.map((a) => ({ slot: a.slot, systemStats: a.systemStats }))
    );

    return {
        ap,
        flexible,
        penalty: flexible
            ? 0
            : Math.max(armourOnly.head, armourOnly.body) * ARMOUR_SL_PER_AP,
        shield,
    };
}

export function useEquippedAp(
    campaignId: string,
    characterId: string
): EquippedAp | null {
    const { data: sheet } = useCharacterSheet(campaignId, characterId);

    const grid = sheet?.items.grid;

    return useMemo(
        () =>
            grid
                ? equippedApOf(
                      Object.values(grid).filter((a): a is SheetArtifact => !!a)
                  )
                : null,
        [grid]
    );
}
