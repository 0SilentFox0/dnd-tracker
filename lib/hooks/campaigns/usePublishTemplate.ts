'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';

import { publishTemplate } from '@/lib/api/templates';
import { useConfirm, useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';

export function usePublishTemplate(campaignId: string) {
    const t = useTranslations('campaigns');

    const notify = useNotify();

    const confirm = useConfirm();

    const router = useRouter();

    const mutation = useMutation({
        mutationFn: () => publishTemplate(campaignId),
        onSuccess: (result) => {
            const unchanged =
                !result.added && !result.changed && !result.removed;

            void notify(
                unchanged
                    ? t('publishTemplate.unchanged', {
                          version: result.version,
                      })
                    : t('publishTemplate.published', result)
            );
            router.refresh();
        },
        onError: (error) =>
            void notify(errorMessage(error, t('publishTemplate.failed'))),
    });

    const publish = async () => {
        if (
            await confirm({
                title: t('publishTemplate.confirmTitle'),
                description: t('publishTemplate.confirmDescription'),
                confirmLabel: t('publishTemplate.confirmLabel'),
            })
        )
            mutation.mutate();
    };

    return { publish, isPending: mutation.isPending };
}
