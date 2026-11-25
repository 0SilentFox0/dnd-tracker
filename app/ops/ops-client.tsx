'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { QueryState } from '@/components/common/states';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { AlertList } from '@/components/ops/AlertList';
import { DbTopTable } from '@/components/ops/DbTopTable';
import { LimitGauge } from '@/components/ops/LimitGauge';
import { OpsChartGroup } from '@/components/ops/OpsChartGroup';
import { OpsRangeTabs } from '@/components/ops/OpsRangeTabs';
import { OpsStatusGrid } from '@/components/ops/OpsStatusGrid';
import { TestNotifyButton } from '@/components/ops/TestNotifyButton';
import {
    useMuteAlert,
    useOpsAlerts,
    useOpsDbTop,
    useOpsSummary,
} from '@/lib/hooks/ops';
import { CHART_GROUPS } from '@/lib/ops/chart-groups';
import type { OpsRange } from '@/types/ops';

export function OpsClient() {
    const t = useTranslations('ops');

    const [range, setRange] = useState<OpsRange>('6h');

    const summary = useOpsSummary();

    const alerts = useOpsAlerts();

    const dbTop = useOpsDbTop();

    const mute = useMuteAlert();

    return (
        <HudPage>
            <HudPageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                actions={<TestNotifyButton />}
            />
            <QueryState query={summary}>
                {(data) => (
                    <>
                        <HudPanel>
                            <OpsStatusGrid summary={data} />
                        </HudPanel>
                        <HudPanel>
                            <section
                                aria-labelledby="ops-limits"
                                className="space-y-3"
                            >
                                <h2
                                    id="ops-limits"
                                    className="text-lg font-semibold"
                                >
                                    {t('limits.title')}
                                </h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {data.limits.map((row) => (
                                        <LimitGauge key={row.id} row={row} />
                                    ))}
                                </div>
                            </section>
                        </HudPanel>
                    </>
                )}
            </QueryState>
            <HudPanel className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="ops-charts" className="text-lg font-semibold">
                        {t('charts.title')}
                    </h2>
                    <OpsRangeTabs value={range} onChange={setRange} />
                </div>
                {CHART_GROUPS.map((group) => (
                    <OpsChartGroup
                        key={group.id}
                        group={group}
                        range={range}
                        limits={summary.data?.limits ?? []}
                    />
                ))}
            </HudPanel>
            <HudPanel>
                <QueryState query={dbTop}>
                    {(data) => <DbTopTable data={data} />}
                </QueryState>
            </HudPanel>
            <HudPanel>
                <QueryState query={alerts}>
                    {(data) => (
                        <AlertList
                            alerts={data}
                            pending={mute.isPending}
                            onMute={(rule, minutes) =>
                                mute.mutate({ rule, minutes })
                            }
                        />
                    )}
                </QueryState>
            </HudPanel>
        </HudPage>
    );
}
