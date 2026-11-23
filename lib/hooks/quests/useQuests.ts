'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { questKeys } from './keys';

import {
    deleteQuest,
    getQuests,
    saveQuest,
    trackQuest,
} from '@/lib/api/quests';
import type { QuestInput } from '@/types/quests';
export function useQuests(campaignId: string) {
    return useQuery({
        queryKey: questKeys.list(campaignId),
        queryFn: () => getQuests(campaignId),
        staleTime: 30000,
    });
}
export function useQuestActions(campaignId: string) {
    const client = useQueryClient();

    const onSuccess = () =>
        client.invalidateQueries({ queryKey: questKeys.list(campaignId) });

    const save = useMutation({
        mutationFn: ({ data, id }: { data: QuestInput; id?: string }) =>
            saveQuest(campaignId, data, id),
        onSuccess,
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteQuest(campaignId, id),
        onSuccess,
    });

    const track = useMutation({
        mutationFn: ({ id, tracked }: { id: string; tracked: boolean }) =>
            trackQuest(campaignId, id, tracked),
        onSuccess,
    });

    return { save, remove, track };
}
