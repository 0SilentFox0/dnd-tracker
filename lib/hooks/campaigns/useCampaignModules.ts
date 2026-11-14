'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCampaignExceptRules } from './invalidate';
import { campaignKeys } from './keys';
import { useCampaignRules } from './useCampaignRules';

import { ApiError } from '@/lib/api/client';
import { updateCampaignRules } from '@/lib/api/rules';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { useConfirm, useNotify } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    composition,
    moduleChange,
    type ModuleToggle,
    moduleToggles,
    type SystemSelection,
    withModule,
} from '@/lib/utils/rules/systems/catalog';

export function useCampaignModules(campaignId: string): {
    toggles: ModuleToggle[];
    toggle: (id: string, on: boolean) => Promise<void>;
    apply: (draft: SystemSelection) => Promise<void>;
    isPending: boolean;
} {
    const { data } = useCampaignRules(campaignId);

    const queryClient = useQueryClient();

    const router = useRouter();

    const confirm = useConfirm();

    const notify = useNotify();

    const t = useTranslations('rules');

    const tTerms = useTranslator('gameTerms');

    const mutation = useMutation({
        mutationFn: (patch: Parameters<typeof updateCampaignRules>[1]) =>
            updateCampaignRules(campaignId, patch),
        onSuccess: async (view) => {
            queryClient.setQueryData(campaignKeys.rules(campaignId), view);
            await invalidateCampaignExceptRules(queryClient, campaignId);
            router.refresh();
        },
    });

    const askConfirm = (ids: readonly string[]) =>
        confirm({
            title: t('system.modules.confirmTitle'),
            description: t('system.modules.confirmBody', {
                module: ids.map((id) => tTerms(`module.${id}.name`)).join(', '),
            }),
            confirmLabel: t('system.modules.confirmAction'),
            destructive: true,
        });

    const toggles = data ? moduleToggles(data.system) : [];

    const save = async (
        modules: readonly string[],
        setupIds: readonly string[]
    ) => {
        const send = (confirmed: boolean) =>
            mutation.mutateAsync({
                system: { modules: [...modules] },
                ...(confirmed && { confirm: true as const }),
            });

        try {
            if (setupIds.length > 0 && data?.hasCharacters) {
                if (!(await askConfirm(setupIds))) return;

                await send(true);

                return;
            }

            await send(false);
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.errorKey === API_ERRORS.SYSTEM_MODULE_CONFIRM
            ) {
                try {
                    if (await askConfirm(setupIds)) await send(true);
                } catch (retryError) {
                    await notify(
                        retryError instanceof Error
                            ? retryError.message
                            : t('form.saveFailed')
                    );
                }

                return;
            }

            await notify(
                error instanceof Error ? error.message : t('form.saveFailed')
            );
        }
    };

    const toggle = async (id: string, on: boolean) => {
        if (!data) return;

        const setup = toggles.find((m) => m.id === id)?.toggle === 'setup';

        await save(
            withModule(data.system, id, on).modules ?? [],
            setup ? [id] : []
        );
    };

    const apply = async (draft: SystemSelection) => {
        if (!data) return;

        const { setup } = moduleChange(data.system, draft);

        await save(composition(draft).modules, setup);
    };

    return {
        toggles,
        toggle,
        apply,
        isPending: mutation.isPending,
    };
}
