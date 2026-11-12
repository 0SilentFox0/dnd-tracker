'use client';

import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { characterKeys } from '@/lib/hooks/characters/keys';
import { useCrudMutation } from '@/lib/hooks/common';
import {
    postDowntimePeriod,
    postDowntimePeriodUndo,
    putDowntime,
} from '@/systems/wfrp/api/downtime';
import type {
    DowntimePeriodBody,
    DowntimePeriodUndoBody,
    DowntimeSetBody,
} from '@/systems/wfrp/rules/downtime/api-types';
import type { Character } from '@/types/characters';

const periodKeys = (c: string) => [
    characterKeys.details(c),
    characterKeys.sheet(c),
    characterKeys.lists(c),
    characterKeys.logs(c),
    characterKeys.stashes(c),
    characterKeys.inventoryLogs(c),
];

export function useDowntime(campaignId: string, characterId: string) {
    const t = useTranslations('wfrpDowntime.errors');

    const qc = useQueryClient();

    return useCrudMutation({
        mutationFn: (body: DowntimeSetBody) =>
            putDowntime(campaignId, characterId, body),
        onSuccess: (r) =>
            qc.setQueryData<Character>(
                characterKeys.detail(campaignId, characterId),
                (old) =>
                    old && {
                        ...old,
                        characteristics: {
                            ...old.characteristics,
                            downtime: r.downtime,
                        } as Character['characteristics'],
                    }
            ),
        errorText: t('saveFailed'),
    });
}

export function useDowntimePeriod(campaignId: string) {
    const t = useTranslations('wfrpDowntime.errors');

    return useCrudMutation({
        mutationFn: (body: DowntimePeriodBody) =>
            postDowntimePeriod(campaignId, body),
        invalidateKeys: periodKeys(campaignId),
        errorText: t('periodFailed'),
    });
}

export function useDowntimePeriodUndo(campaignId: string) {
    const t = useTranslations('wfrpDowntime.errors');

    return useCrudMutation({
        mutationFn: (body: DowntimePeriodUndoBody) =>
            postDowntimePeriodUndo(campaignId, body),
        invalidateKeys: periodKeys(campaignId),
        errorText: t('undoFailed'),
    });
}
