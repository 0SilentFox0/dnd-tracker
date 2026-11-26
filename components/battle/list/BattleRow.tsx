'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { RotateCcw, Trash2 } from 'lucide-react';

import { BattleMapThumb } from './BattleMapThumb';

import { ActionsMenu } from '@/components/common/entity/ActionsMenu';
import { HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { useDeleteBattleCard, useResetBattleCard } from '@/lib/hooks/battles';
import type { BattleListCardData } from '@/types/battle';

export function BattleRow({
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

    const format = useFormatter();

    const { isDeleting, onDelete } = useDeleteBattleCard(campaignId, battle.id);

    const { isResetting, onReset } = useResetBattleCard(
        campaignId,
        battle.id,
        'replay'
    );

    const date = format.dateTime(
        new Date(battle.completedAt ?? battle.createdAt),
        { dateStyle: 'medium' }
    );

    const viewHref = canEdit
        ? `/campaigns/${campaignId}/dm/battles/${battle.id}`
        : `/campaigns/${campaignId}/battles/${battle.id}`;

    return (
        <div
            data-tour={dataTour}
            className="ds-panel relative flex min-w-0 items-center gap-3 p-2 pr-3 transition-colors duration-150 hover:bg-hud-panel-2"
        >
            <BattleMapThumb map={battle.map} size="row" />
            <div className="min-w-0 flex-1">
                <h3 className="hud-sc min-w-0 truncate text-base leading-tight text-hud-ink">
                    <Link
                        href={viewHref}
                        className="after:absolute after:inset-0 after:content-['']"
                    >
                        {battle.name}
                    </Link>
                </h3>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-hud-muted">
                    <span>
                        {t('rounds', { count: battle.currentRound })} · {date}
                    </span>
                    {battle.result && (
                        <HudPill
                            tone={battle.result === 'victory' ? 'accent' : 'muted'}
                        >
                            {t(`result.${battle.result}`)}
                        </HudPill>
                    )}
                </p>
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" size="sm">
                    <Link href={viewHref} data-tour="battle.open">
                        {canEdit ? t('view') : t('open')}
                    </Link>
                </Button>
                {canEdit && (
                    <ActionsMenu
                        label={t('more')}
                        actions={[
                            {
                                label: t('replay'),
                                icon: RotateCcw,
                                disabled: isResetting,
                                onSelect: () => void onReset(),
                            },
                            {
                                label: t('delete'),
                                icon: Trash2,
                                destructive: true,
                                disabled: isDeleting,
                                onSelect: () => void onDelete(),
                                separatorBefore: true,
                            },
                        ]}
                    />
                )}
            </div>
        </div>
    );
}
