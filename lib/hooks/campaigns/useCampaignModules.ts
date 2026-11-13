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
    type ModuleToggle,
    moduleToggles,
    withModule,
} from '@/lib/utils/rules/systems/catalog';

export function useCampaignModules(campaignId: string): {
    toggles: ModuleToggle[];
    toggle: (id: string, on: boolean) => Promise<void>;
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

    const askConfirm = (id: string) =>
        confirm({
            title: t('system.modules.confirmTitle'),
            description: t('system.modules.confirmBody', {
                module: tTerms(`module.${id}.name`),
            }),
            confirmLabel: t('system.modules.confirmAction'),
            destructive: true,
        });

    const toggle = async (id: string, on: boolean) => {
        if (!data) return;

        const modules = withModule(data.system, id, on).modules;

        const setup =
            moduleToggles(data.system).find((m) => m.id === id)?.toggle ===
            'setup';

        const send = (confirmed: boolean) =>
            mutation.mutateAsync({
                system: { modules: [...(modules ?? [])] },
                ...(confirmed && { confirm: true as const }),
            });

        try {
            if (setup && data.systemLocked) {
                if (!(await askConfirm(id))) return;

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
                    if (await askConfirm(id)) await send(true);
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

    return {
        toggles: data ? moduleToggles(data.system) : [],
        toggle,
        isPending: mutation.isPending,
    };
}
