'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { useBattleMaps } from '@/lib/hooks/battle-maps';
import { useMapLibraryEnabled } from '@/lib/hooks/campaigns';
import { useConfirm } from '@/lib/hooks/common';
import { battleMapMaxSide } from '@/lib/utils/battle/map-storage/limits';
import type { BattleMapRef } from '@/types/battle';

interface LibraryMapOptions {
    linked?: BattleMapRef | null;
    isEdit?: boolean;
    status?: string;
    hadMap?: boolean;
}

export function useBattleLibraryMap(
    campaignId: string,
    { linked, isEdit = false, status, hadMap = false }: LibraryMapOptions = {}
) {
    const t = useTranslations('battleSetup.library');

    const confirm = useConfirm();

    const enabled = useMapLibraryEnabled(campaignId);

    const query = useBattleMaps(campaignId, enabled || !!linked);

    const [choice, setChoice] = useState<string | null | undefined>(undefined);

    const maps = query.data ?? [];

    const linkedId = isEdit ? (linked?.mapId ?? null) : null;

    const locked = isEdit && status !== undefined && status !== 'prepared';

    const selectedId = choice === undefined ? linkedId : choice;

    const changed = isEdit && choice !== undefined && choice !== linkedId;

    const linkedMap = maps.find((m) => m.id === linkedId);

    const canUnlink =
        !linkedMap ||
        Math.max(linkedMap.cols, linkedMap.rows) <= MAP_LIMITS.photoMaxSide;

    const select = useCallback(
        async (id: string | null) => {
            if (id === null && !canUnlink) return;

            if (
                isEdit &&
                hadMap &&
                id !== selectedId &&
                !(await confirm({
                    title: t('relink.title'),
                    description: t('relink.description'),
                    confirmLabel: t('relink.confirm'),
                    destructive: true,
                }))
            )
                return;

            setChoice(id);
        },
        [isEdit, hadMap, selectedId, canUnlink, confirm, t]
    );

    return {
        visible: isEdit
            ? linkedId !== null || (!locked && enabled && maps.length > 0)
            : enabled && maps.length > 0,
        maps,
        maxSide: battleMapMaxSide({ mapLibraryEnabled: enabled }),
        isLinked: linkedId !== null && !changed,
        wasLinked: linkedId !== null,
        canUnlink,
        isLocked: locked,
        isChanged: changed,
        selectedId,
        select,
    };
}

export type BattleLibraryMap = ReturnType<typeof useBattleLibraryMap>;
