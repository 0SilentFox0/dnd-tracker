'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { worldKeys } from './keys';

import {
    deleteSession,
    getSessions,
    startSession,
    updateSession,
} from '@/lib/api/world';
import { useCrudMutation } from '@/lib/hooks/common';
import type {
    CreateSessionData,
    UpdateSessionData,
    WorldSession,
} from '@/types/world';

const STALE_MS = 30_000;

export function useWorldSessions(campaignId: string) {
    const t = useTranslations('world.errors');

    const list = useQuery<WorldSession[]>({
        queryKey: worldKeys.sessions(campaignId),
        queryFn: () => getSessions(campaignId),
        staleTime: STALE_MS,
    });

    const invalidateKeys = () => [
        worldKeys.sessions(campaignId),
        worldKeys.trailAll(campaignId),
    ];

    const start = useCrudMutation({
        mutationFn: (data: CreateSessionData) => startSession(campaignId, data),
        invalidateKeys,
        errorText: t('saveSession'),
    });

    const update = useCrudMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSessionData }) =>
            updateSession(campaignId, id, data),
        invalidateKeys,
        errorText: t('saveSession'),
    });

    const remove = useCrudMutation({
        mutationFn: (id: string) => deleteSession(campaignId, id),
        invalidateKeys,
        errorText: t('deleteSession'),
    });

    return {
        list,
        start,
        update,
        remove,
        active: list.data?.find((s) => s.active),
    };
}
