'use client';

import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { characterKeys } from './keys';

import {
    getCharacterLog,
    patchResources,
    postExperience,
    postHitDie,
    postRest,
    postSheetRoll,
} from '@/lib/api/characters';
import { useCrudMutation } from '@/lib/hooks/common';
import { ENTITY_STALE_MS } from '@/lib/providers/query-provider';
import type {
    AwardXpBody,
    CharacterSheet,
    ResourcesEditBody,
    RestBody,
    SheetRollBody,
} from '@/types/characters';

const partyKeys = (c: string) => [
    characterKeys.sheet(c),
    characterKeys.lists(c),
    characterKeys.logs(c),
];

const heroKeys = (c: string, id: string) => [
    characterKeys.sheet(c, id),
    characterKeys.lists(c),
    characterKeys.log(c, id),
];

export function useRest(campaignId: string) {
    const t = useTranslations('rest.errors');

    return useCrudMutation({
        mutationFn: (body: RestBody) => postRest(campaignId, body),
        invalidateKeys: partyKeys(campaignId),
        errorText: t('restFailed'),
    });
}

export function useAwardXp(campaignId: string) {
    const t = useTranslations('rest.errors');

    return useCrudMutation({
        mutationFn: (body: AwardXpBody) => postExperience(campaignId, body),
        invalidateKeys: partyKeys(campaignId),
        errorText: t('xpFailed'),
    });
}

export function useSpendHitDie(campaignId: string, characterId: string) {
    return useCrudMutation({
        mutationFn: (classId: string) =>
            postHitDie(campaignId, characterId, classId),
        invalidateKeys: heroKeys(campaignId, characterId),
    });
}

export function useSheetRoll(campaignId: string, characterId: string) {
    return useCrudMutation({
        mutationFn: (body: SheetRollBody) =>
            postSheetRoll(campaignId, characterId, body),
        invalidateKeys: (_r, body) =>
            ('useInspiration' in body && body.useInspiration) ||
            ('fortune' in body && body.fortune)
                ? heroKeys(campaignId, characterId)
                : [characterKeys.log(campaignId, characterId)],
    });
}

export function useEditResources(campaignId: string, characterId: string) {
    const t = useTranslations('rest.errors');

    return useCrudMutation({
        mutationFn: (body: ResourcesEditBody) =>
            patchResources(campaignId, characterId, body),
        invalidateKeys: heroKeys(campaignId, characterId),
        errorText: t('resourcesFailed'),
    });
}

export function useSlotToggle(campaignId: string, characterId: string) {
    const t = useTranslations('characterProfile.slots');

    const queryClient = useQueryClient();

    const key = characterKeys.sheet(campaignId, characterId);

    const mutation = useCrudMutation({
        mutationFn: (body: ResourcesEditBody) =>
            patchResources(campaignId, characterId, body),
        invalidateKeys: heroKeys(campaignId, characterId),
        errorText: t('failed'),
        onMutate: async ({ slotsSpent }) => {
            await queryClient.cancelQueries({ queryKey: key });

            const previous = queryClient.getQueryData<CharacterSheet>(key);

            queryClient.setQueryData<CharacterSheet>(key, (old) =>
                old ? withSlotsSpent(old, slotsSpent ?? {}) : old
            );

            return { previous };
        },
        onError: (_e, _v, context) =>
            queryClient.setQueryData(key, context?.previous),
    });

    return {
        setCurrent: (slot: string, max: number, current: number) =>
            mutation.mutateOk({ slotsSpent: { [slot]: max - current } }),
        isPending: mutation.isPending,
    };
}

function withSlotsSpent(
    sheet: CharacterSheet,
    spent: Record<string, number>
): CharacterSheet {
    const current = (max: number, key: string, now: number) =>
        key in spent ? Math.max(0, max - spent[key]) : now;

    return {
        ...sheet,
        slots: sheet.slots.map((s) => ({
            ...s,
            current: current(s.count, String(s.level), s.current),
        })),
        pact: sheet.pact && {
            ...sheet.pact,
            current: current(sheet.pact.max, 'pact', sheet.pact.current),
        },
    };
}

export function useCharacterLog(
    campaignId: string,
    characterId: string,
    enabled = true
) {
    return useInfiniteQuery({
        queryKey: characterKeys.log(campaignId, characterId),
        queryFn: ({ pageParam }) =>
            getCharacterLog(campaignId, characterId, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        enabled,
        staleTime: ENTITY_STALE_MS,
    });
}
