'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
    useCreateBattle,
    useDeleteBattle,
    useUpdateBattle,
} from '../useBattles';

import { useConfirm, useNavigateFresh, useNotify } from '@/lib/hooks/common';
import type {
    BattleMapConfig,
    BattlePreparationParticipant,
} from '@/types/battle';
import type { CreateBattleData } from '@/types/battle-setup';

interface UseBattleFormParams {
    campaignId: string;
    battleId?: string;
    formData: {
        name: string;
        description: string;
        turnTimerSeconds: number | null;
    };
    participants: BattlePreparationParticipant[];
    map?: BattleMapConfig | null;
    library?: { mapId: string | null; isLinked: boolean; unlink?: boolean };
}

export function useBattleForm({
    campaignId,
    battleId,
    formData,
    participants,
    map,
    library,
}: UseBattleFormParams) {
    const libraryMapId = library?.mapId;

    const isLinked = library?.isLinked;

    const unlink = library?.unlink;

    const t = useTranslations('battleSetup.form');

    const tActions = useTranslations('common.actions');

    const notify = useNotify();

    const confirm = useConfirm();

    const router = useRouter();

    const navigateFresh = useNavigateFresh();

    const create = useCreateBattle(campaignId);

    const update = useUpdateBattle(campaignId, battleId ?? '');

    const remove = useDeleteBattle(campaignId);

    const listHref = `/campaigns/${campaignId}/dm/battles`;

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (participants.length === 0) {
                void notify(t('notify.noParticipants'));

                return;
            }

            const body = {
                name: formData.name,
                description: formData.description,
                participants,
                turnTimerSeconds: formData.turnTimerSeconds,
                ...(isLinked
                    ? {}
                    : unlink
                      ? { mapId: null }
                      : libraryMapId
                        ? { mapId: libraryMapId }
                        : { map: map ?? null }),
            };

            if (battleId) {
                update.mutate(body, {
                    onSuccess: () => navigateFresh(listHref),
                    onError: (error) =>
                        void notify(
                            error instanceof Error
                                ? error.message
                                : t('notify.updateFailed')
                        ),
                });

                return;
            }

            create.mutate(body as CreateBattleData, {
                onSuccess: (battle) => router.push(`${listHref}/${battle.id}`),
                onError: (error) =>
                    void notify(
                        error instanceof Error
                            ? error.message
                            : t('notify.createFailed')
                    ),
            });
        },
        [
            battleId,
            formData.name,
            formData.description,
            formData.turnTimerSeconds,
            participants,
            map,
            libraryMapId,
            isLinked,
            unlink,
            router,
            navigateFresh,
            notify,
            create,
            update,
            listHref,
            t,
        ]
    );

    const handleDelete = useCallback(async () => {
        if (!battleId) return;

        if (
            !(await confirm({
                title: t('confirmDelete'),
                confirmLabel: tActions('delete'),
                destructive: true,
            }))
        )
            return;

        remove.mutate(battleId, {
            onSuccess: () => navigateFresh(listHref),
            onError: () => void notify(t('notify.deleteFailed')),
        });
    }, [
        battleId,
        confirm,
        remove,
        navigateFresh,
        listHref,
        notify,
        t,
        tActions,
    ]);

    return {
        status: {
            isSaving: battleId ? update.isPending : create.isPending,
            isDeleting: remove.isPending,
        },
        actions: { submit: handleSubmit, remove: handleDelete },
    };
}
