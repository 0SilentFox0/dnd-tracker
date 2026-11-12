'use client';

import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';

import { DeleteAllButton } from '@/components/common/DeleteAllButton';
import { useDeleteAllArtifacts } from '@/lib/hooks/artifacts';

interface DeleteAllArtifactsButtonProps {
    campaignId: string;
    artifactsCount: number;
}

export function DeleteAllArtifactsButton({
    campaignId,
    artifactsCount,
}: DeleteAllArtifactsButtonProps) {
    const t = useTranslations('artifacts.list');

    const deleteAll = useDeleteAllArtifacts(campaignId);

    return (
        <DeleteAllButton
            count={artifactsCount}
            noun={t('deleteAllNoun')}
            view={{
                variant: 'soft',
                icon: <Trash2 className="mr-1.5 h-4 w-4" />,
            }}
            confirm={{
                title: t('deleteAllTitle'),
                description: t('deleteAllDescription', {
                    count: artifactsCount,
                }),
            }}
            status={{ isPending: deleteAll.isPending }}
            actions={{ onConfirm: () => deleteAll.mutateAsync() }}
        />
    );
}
