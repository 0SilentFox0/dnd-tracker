'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { useBattleMaps, useMapLibrarySync } from '@/lib/hooks/battle-maps';
import { useConfirm } from '@/lib/hooks/common';
import type { BattleMapRef } from '@/types/battle';

export interface MapUpdateTool {
    available: boolean;
    pending: boolean;
    run(): Promise<void>;
}

export function useMapUpdateTool(args: {
    isDM: boolean;
    campaignId: string;
    mapRef?: BattleMapRef;
    mutation: {
        mutate(data: object, options: { onSuccess: () => void }): void;
        isPending: boolean;
    };
    notify(message: string): void;
}): MapUpdateTool | null {
    const {
        isDM,
        campaignId,
        mapRef,
        mutation: { mutate, isPending },
        notify,
    } = args;

    const t = useTranslations('battle.map.update');

    const confirm = useConfirm();

    const linked = isDM && !!mapRef;

    useMapLibrarySync(campaignId, linked);

    const { data: maps } = useBattleMaps(campaignId, linked, {
        staleTime: 0,
        refetchOnWindowFocus: 'always',
    });

    const latest = maps?.find((m) => m.id === mapRef?.mapId)?.version;

    const available =
        !!mapRef && latest !== undefined && latest > mapRef.version;

    const run = useCallback(async () => {
        const ok = await confirm({
            title: t('confirmTitle'),
            description: t('confirmDescription'),
            confirmLabel: t('confirm'),
        });

        if (ok) mutate({}, { onSuccess: () => notify(t('done')) });
    }, [confirm, mutate, notify, t]);

    const tool = useMemo(
        () => ({ available, pending: isPending, run }),
        [available, isPending, run]
    );

    return linked ? tool : null;
}
