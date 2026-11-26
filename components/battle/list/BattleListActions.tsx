'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';

import { ActionsMenu } from '@/components/common/entity/ActionsMenu';
import { Button } from '@/components/ui/button';
import { useDeleteAllBattles } from '@/lib/hooks/battles';
import { useConfirm } from '@/lib/hooks/common';

export function BattleListActions({
    campaignId,
    battlesCount,
}: {
    campaignId: string;
    battlesCount: number;
}) {
    const t = useTranslations('battleSetup.list');

    const confirm = useConfirm();

    const deleteAll = useDeleteAllBattles(campaignId);

    const askDeleteAll = () =>
        confirm({
            title: t('actions.deleteAll'),
            description: t('deleteAll.description', { count: battlesCount }),
            confirmLabel: t('actions.deleteAll'),
            destructive: true,
            onConfirm: () => deleteAll.mutateAsync(),
        });

    return (
        <>
            <Button asChild className="shrink-0">
                <Link href={`/campaigns/${campaignId}/dm/battles/new`}>
                    <Plus aria-hidden />
                    <span className="max-sm:sr-only">{t('page.create')}</span>
                </Link>
            </Button>
            {battlesCount > 0 && (
                <ActionsMenu
                    label={t('actions.more')}
                    actions={[
                        {
                            label: t('actions.deleteAll'),
                            icon: Trash2,
                            destructive: true,
                            disabled: deleteAll.isPending,
                            onSelect: () => void askDeleteAll(),
                        },
                    ]}
                />
            )}
        </>
    );
}
