'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';

import { BattleMapThumb } from './BattleMapThumb';
import { SidesStrip } from './SidesStrip';

import { ActionsMenu } from '@/components/common/entity/ActionsMenu';
import { Button } from '@/components/ui/button';
import { useDeleteBattleCard } from '@/lib/hooks/battles';
import type { BattleListCardData } from '@/types/battle';

export function BattleCard({
    battle,
    campaignId,
    canEdit = true,
    'data-tour': dataTour,
}: {
    battle: BattleListCardData;
    campaignId: string;
    canEdit?: boolean;
    'data-tour'?: string;
}) {
    const t = useTranslations('battleSetup.list.card');

    const { isDeleting, onDelete } = useDeleteBattleCard(campaignId, battle.id);

    const editHref = `/campaigns/${campaignId}/dm/battles/${battle.id}`;

    const playHref = `/campaigns/${campaignId}/battles/${battle.id}`;

    return (
        <article
            data-tour={dataTour}
            className="ds-panel group relative flex min-w-0 flex-col overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
            <BattleMapThumb map={battle.map} size="card" />
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
                <div className="min-w-0 space-y-1">
                    <h3 className="hud-sc min-w-0 truncate text-lg leading-tight text-hud-ink">
                        <Link
                            href={canEdit ? editHref : playHref}
                            className="after:absolute after:inset-0 after:content-['']"
                        >
                            {battle.name}
                        </Link>
                    </h3>
                    {battle.description && (
                        <p className="line-clamp-2 text-sm text-hud-muted">
                            {battle.description}
                        </p>
                    )}
                </div>
                <SidesStrip sides={battle.sides} compact />
                <div className="relative z-10 mt-auto flex items-center gap-2">
                    <Button asChild size="sm" className="flex-1">
                        <Link href={playHref} data-tour="battle.open">
                            {canEdit ? t('start') : t('open')}
                        </Link>
                    </Button>
                    {canEdit && (
                        <>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                <Link href={editHref}>{t('edit')}</Link>
                            </Button>
                            <ActionsMenu
                                label={t('more')}
                                actions={[
                                    {
                                        label: t('delete'),
                                        icon: Trash2,
                                        destructive: true,
                                        disabled: isDeleting,
                                        onSelect: () => void onDelete(),
                                    },
                                ]}
                            />
                        </>
                    )}
                </div>
            </div>
        </article>
    );
}
