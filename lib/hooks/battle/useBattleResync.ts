'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getBattleVersion } from '@/lib/api/battles';
import { battleKeys } from '@/lib/hooks/battles/keys';
import type { BattleScene } from '@/types/api';

export const RESYNC_AFTER_HIDDEN_MS = 15_000;

export function useBattleResync(
    campaignId: string,
    battleId: string
): () => Promise<void> {
    const queryClient = useQueryClient();

    // keyed by battle: a stale battle's request must not block (or reset) the new one
    const inFlightRef = useRef<{
        battleId: string;
        promise: Promise<void>;
    } | null>(null);

    // visibility and reconnect often arrive together: one version request for both
    const resync = useCallback(() => {
        if (inFlightRef.current?.battleId === battleId)
            return inFlightRef.current.promise;

        const key = battleKeys.scene(campaignId, battleId);

        const entry = {
            battleId,
            promise: (async () => {
                // music has no version: missed battle-audio is re-read separately (only if sound is on)
                void queryClient.invalidateQueries({
                    queryKey: battleKeys.audio(campaignId, battleId),
                });

                if (queryClient.getQueryData<BattleScene>(key) === undefined)
                    return;

                try {
                    const { version } = await getBattleVersion(
                        campaignId,
                        battleId
                    );

                    const cached =
                        queryClient.getQueryData<BattleScene>(key)?.version;

                    if (cached === undefined || version <= cached) return;
                } catch {
                    // without a version it is safer to re-read the battle
                }

                await queryClient.invalidateQueries({ queryKey: key });
            })().finally(() => {
                if (inFlightRef.current === entry) inFlightRef.current = null;
            }),
        };

        inFlightRef.current = entry;

        return entry.promise;
    }, [campaignId, battleId, queryClient]);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        let hiddenAt: number | null = null;

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();

                return;
            }

            if (
                hiddenAt !== null &&
                Date.now() - hiddenAt > RESYNC_AFTER_HIDDEN_MS
            )
                void resync();

            hiddenAt = null;
        };

        document.addEventListener('visibilitychange', onVisibility);

        return () =>
            document.removeEventListener('visibilitychange', onVisibility);
    }, [resync]);

    return resync;
}
