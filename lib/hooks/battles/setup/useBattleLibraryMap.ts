'use client';

import { useState } from 'react';

import { useBattleMaps, useMapLibraryEnabled } from '@/lib/hooks/battle-maps';
import type { BattleMapRef } from '@/types/battle';

export function useBattleLibraryMap(
    campaignId: string,
    linked?: BattleMapRef | null,
    isEdit = false
) {
    const enabled = useMapLibraryEnabled(campaignId);

    const query = useBattleMaps(campaignId, enabled || !!linked);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const maps = query.data ?? [];

    const linkedId = isEdit ? (linked?.mapId ?? null) : null;

    return {
        visible: enabled && (isEdit ? !!linkedId : true) && maps.length > 0,
        maps,
        isLinked: linkedId !== null,
        selectedId: linkedId ?? selectedId,
        select: setSelectedId,
    };
}

export type BattleLibraryMap = ReturnType<typeof useBattleLibraryMap>;
