'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ScrollText } from 'lucide-react';

import { SourceUpdateTile } from '@/components/campaigns/dashboard/SourceUpdateTile';
import { HudPanel, HudPill } from '@/components/hud/page';
import type { DmDashboardData } from '@/types/campaigns';

const ROW =
    'flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-hud-page/45 px-3 py-2 text-sm text-hud-ink shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] transition-colors hover:bg-hud-raised';

export function DmPrepPanel({
    campaignId,
    data,
}: {
    campaignId: string;
    data: DmDashboardData;
}) {
    const t = useTranslations('dashboard');

    const base = `/campaigns/${campaignId}`;

    const hasPrep =
        data.pendingDrafts > 0 ||
        data.scenarioPages.length > 0 ||
        data.battles.length > 0;

    return (
        <HudPanel className="flex flex-col" data-tour="dashboard.dm-prep">
            <h2 className="hud-sc mb-3 text-[13px] tracking-[.06em] text-hud-gold">
                {t('prep.title')}
            </h2>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
                {data.sourceUpdate && (
                    <SourceUpdateTile
                        campaignId={campaignId}
                        version={data.sourceUpdate.sourceVersion}
                    />
                )}
                {hasPrep ? (
                    <ul className="max-h-36 space-y-1.5 overflow-y-auto">
                        {data.pendingDrafts > 0 && (
                            <li>
                                <Link href={`${base}/dm/characters`} className={ROW}>
                                    <span className="truncate">
                                        {t('nextSteps.pending', {
                                            count: data.pendingDrafts,
                                        })}
                                    </span>
                                </Link>
                            </li>
                        )}
                        {data.scenarioPages.map((p) => (
                            <li key={p.id}>
                                <Link href={`${base}/dm/scenario/${p.id}`} className={ROW}>
                                    <ScrollText
                                        className="size-4 shrink-0 text-hud-gold"
                                        aria-hidden
                                    />
                                    <span className="min-w-0 truncate">{p.title}</span>
                                </Link>
                            </li>
                        ))}
                        {data.battles.map((b) => (
                            <li key={b.id}>
                                <Link href={`${base}/battles/${b.id}`} className={ROW}>
                                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                                    <HudPill tone="accent">
                                        {t(`battleStatus.${b.status}`)}
                                    </HudPill>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-lg border border-dashed border-hud-rule bg-hud-page/30 p-3">
                        <p className="text-sm text-hud-muted">{t('prep.empty')}</p>
                        <Link
                            href={`${base}/dm/scenario`}
                            className="mt-2 inline-flex min-h-8 items-center text-sm font-medium text-hud-gold underline-offset-4 hover:underline"
                        >
                            {t('prep.create')}
                        </Link>
                    </div>
                )}
            </div>
        </HudPanel>
    );
}
