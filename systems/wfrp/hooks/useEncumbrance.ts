'use client';

import { useMemo } from 'react';

import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useCharacterSheet, useStash } from '@/lib/hooks/characters';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { editionOf } from '@/systems/wfrp/rules/edition';
import {
    type CarriedArtifact,
    carriedLoad,
    type CarriedSpecial,
    type EncumbranceReport,
} from '@/systems/wfrp/rules/equipment';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';
import type { SheetArtifact } from '@/types/characters';
import type { SpecialItem, StashArtifact } from '@/types/inventory';

export function encumbranceInputOf(
    grid: SheetArtifact[],
    backpack: StashArtifact[],
    specials: SpecialItem[]
): { artifacts: CarriedArtifact[]; specials: CarriedSpecial[] } {
    const stats = new Map<string, unknown>();

    for (const a of [...grid, ...backpack]) stats.set(a.id, a.systemStats);

    return {
        artifacts: [
            ...grid.map((a) => ({ ...a, carried: a.carried ?? false })),
            ...backpack.map((a) => ({ ...a, carried: true })),
        ],
        specials: specials.map((i) => ({
            artifactId: i.artifactId,
            systemStats: i.artifactId ? stats.get(i.artifactId) : undefined,
            quantity: i.quantity,
        })),
    };
}

export function useEncumbrance(
    campaignId: string,
    characterId: string
): EncumbranceReport | null {
    const rules = useCampaignRules(campaignId).data;

    const { data: sheet } = useCharacterSheet(campaignId, characterId);

    const canSeeStash = !!sheet && (sheet.viewer.isDM || sheet.viewer.isOwner);

    const { data: stash } = useStash(campaignId, characterId, {
        enabled: canSeeStash,
    });

    const block = SHEET_SLOT.read(sheet?.systemSlot);

    const grid = sheet?.items.grid;

    const backpack = stash?.artifacts;

    const specials = stash?.items;

    const coins = stash
        ? stash.purse.gp + stash.purse.sp + stash.purse.cp
        : undefined;

    return useMemo(() => {
        if (!block || !grid) return null;

        const base = { ...DEFAULT_CHARACTERISTICS.base };

        for (const c of block.characteristics) base[c.key] = c.value;

        const input = encumbranceInputOf(
            Object.values(grid).filter((a): a is SheetArtifact => !!a),
            backpack ?? [],
            specials ?? []
        );

        const canon = editionOf(rules).gearModel === 'canon';

        const report = carriedLoad(
            { ...input, coins: coins ?? 0 },
            { base, advances: DEFAULT_CHARACTERISTICS.advances },
            canon
        );

        return canon ? report : { ...report, tier: 0, oversized: 0 };
    }, [block, grid, backpack, specials, coins, rules]);
}
