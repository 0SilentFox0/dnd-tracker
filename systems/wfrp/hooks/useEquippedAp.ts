'use client';

import { useMemo } from 'react';

import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useCharacterSheet } from '@/lib/hooks/characters';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { HitLocation } from '@/systems/wfrp/rules/combat/constants';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { armourAp, WFRP_EQUIPMENT } from '@/systems/wfrp/rules/equipment';
import { ARMOUR_SL_PER_AP } from '@/systems/wfrp/rules/magic/constants';
import type { SheetArtifact } from '@/types/characters';

export interface EquippedAp {
    ap: Record<HitLocation, number>;
    flexible: boolean;
    penalty: number;
    shield: number;
}

/** With `rules` the sheet follows the battle snapshot: canon counts the best shield only and casting suffers from the AP of every location (p236) */
export function equippedApOf(
    artifacts: SheetArtifact[],
    rules?: Ruleset
): EquippedAp {
    const worn = artifacts
        .filter((a) => !a.carried)
        .map((a) => ({ slot: a.slot, systemStats: a.systemStats }));

    if (!rules) {
        const { ap, armourOnly, flexible, shield } = armourAp(worn);

        return {
            ap,
            flexible,
            penalty: flexible
                ? 0
                : Math.max(armourOnly.head, armourOnly.body) * ARMOUR_SL_PER_AP,
            shield,
        };
    }

    const gear = WFRP_EQUIPMENT.armourAp(worn, rules);

    const flexible = !!gear.flexible;

    const only = Object.values(gear.armourOnly ?? {});

    const cast =
        editionOf(rules).magicModel === 'canon5e'
            ? Math.max(0, ...only)
            : Math.max(gear.armourOnly?.head ?? 0, gear.armourOnly?.body ?? 0);

    return {
        ap: gear.ap as Record<HitLocation, number>,
        flexible,
        penalty: flexible ? 0 : cast * ARMOUR_SL_PER_AP,
        shield: gear.shield ?? 0,
    };
}

export function useEquippedAp(
    campaignId: string,
    characterId: string
): EquippedAp | null {
    const rules = useCampaignRules(campaignId).data;

    const { data: sheet } = useCharacterSheet(campaignId, characterId);

    const grid = sheet?.items.grid;

    return useMemo(
        () =>
            grid
                ? equippedApOf(
                      Object.values(grid).filter(
                          (a): a is SheetArtifact => !!a
                      ),
                      rules
                  )
                : null,
        [grid, rules]
    );
}
