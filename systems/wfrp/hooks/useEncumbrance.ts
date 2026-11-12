'use client';

import { useMemo } from 'react';

import { useCharacterSheet, useStash } from '@/lib/hooks/characters';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { type Encumbrance, encumbrance } from '@/systems/wfrp/rules/equipment';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';
import type { SheetArtifact } from '@/types/characters';
import type { SpecialItem, StashArtifact } from '@/types/inventory';

type WeighedItem = { systemStats: unknown; quantity: number };

export function encumbranceItemsOf(
    grid: SheetArtifact[],
    backpack: StashArtifact[],
    specials: SpecialItem[]
): WeighedItem[] {
    const stats = new Map<string, unknown>();

    for (const a of [...grid, ...backpack]) stats.set(a.id, a.systemStats);

    return [
        ...[...grid, ...backpack].map((a) => ({
            systemStats: a.systemStats,
            quantity: 1,
        })),
        ...specials.map((i) => ({
            systemStats: i.artifactId ? stats.get(i.artifactId) : undefined,
            quantity: i.quantity,
        })),
    ];
}

export function useEncumbrance(
    campaignId: string,
    characterId: string
): Encumbrance | null {
    const { data: sheet } = useCharacterSheet(campaignId, characterId);

    const canSeeStash = !!sheet && (sheet.viewer.isDM || sheet.viewer.isOwner);

    const { data: stash } = useStash(campaignId, characterId, {
        enabled: canSeeStash,
    });

    const block = SHEET_SLOT.read(sheet?.systemSlot);

    const grid = sheet?.items.grid;

    const backpack = stash?.artifacts;

    const specials = stash?.items;

    return useMemo(() => {
        if (!block || !grid) return null;

        const base = { ...DEFAULT_CHARACTERISTICS.base };

        for (const c of block.characteristics) base[c.key] = c.value;

        const items = encumbranceItemsOf(
            Object.values(grid).filter((a): a is SheetArtifact => !!a),
            backpack ?? [],
            specials ?? []
        );

        return encumbrance(items, {
            base,
            advances: DEFAULT_CHARACTERISTICS.advances,
        });
    }, [block, grid, backpack, specials]);
}
