'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { Square, Trash2 } from 'lucide-react';

import { BattleMapThumb } from './BattleMapThumb';
import { SidesStrip } from './SidesStrip';

import { ActionsMenu } from '@/components/common/entity/ActionsMenu';
import { HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { useDeleteBattleCard, useResetBattleCard } from '@/lib/hooks/battles';
import { useMediaQuery } from '@/lib/hooks/common';
import type { BattleListCardData } from '@/types/battle';

export function ActiveBattleBanner({
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
        'stop'
    );

    const wide = useMediaQuery('(min-width: 640px)', true);

    const playHref = `/campaigns/${campaignId}/battles/${battle.id}`;

    const started = battle.startedAt
        ? format.dateTime(new Date(battle.startedAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : null;

    return (
        <article
            data-tour={dataTour}
            className="ds-panel relative grid min-w-0 overflow-hidden shadow-[inset_0_0_0_1px_var(--hud-accent)] sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
        >
            <div className="relative h-28 sm:h-auto">
                <BattleMapThumb map={battle.map} size="banner" />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-hud-panel max-sm:bg-gradient-to-b"
                />
            </div>
            <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="hud-sc min-w-0 truncate text-xl text-hud-ink">
                        {battle.name}
                    </h2>
                    <HudPill tone="gold">{t('active')}</HudPill>
                </div>
                <p className="text-sm text-hud-muted">
                    {t('roundN', { round: battle.currentRound })}
                    {started && ` · ${t('started', { date: started })}`}
                </p>
                <SidesStrip sides={battle.sides} />
                <div className="mt-auto flex items-center gap-2">
                    <Button asChild size="sm">
                        <Link href={playHref} data-tour="battle.open">
                            {canEdit ? t('continue') : t('open')}
                        </Link>
                    </Button>
                    {canEdit && (
                        <>
                            {wide && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isResetting}
                                    onClick={() => void onReset()}
                                >
                                    {t('stop')}
                                </Button>
                            )}
                            <ActionsMenu
                                label={t('more')}
                                actions={[
                                    ...(wide
                                        ? []
                                        : [
                                              {
                                                  label: t('stop'),
                                                  icon: Square,
                                                  disabled: isResetting,
                                                  onSelect: () =>
                                                      void onReset(),
                                              },
                                          ]),
                                    {
                                        label: t('delete'),
                                        icon: Trash2,
                                        destructive: true,
                                        disabled: isDeleting,
                                        onSelect: () => void onDelete(),
                                        separatorBefore: !wide,
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
