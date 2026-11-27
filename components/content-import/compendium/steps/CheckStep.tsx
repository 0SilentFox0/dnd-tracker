'use client';
import { useState } from 'react';

import { RulesPatchOffer } from '../../shared/RulesPatchOffer';
import { CompendiumDependencies } from '../CompendiumDependencies';
import {
    CompendiumReportTabs,
    type ReportTab,
} from '../report/CompendiumReportTabs';
import { CompendiumVerdict } from '../report/CompendiumVerdict';

import { LoadingState } from '@/components/common/states';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

export function CheckStep({
    campaignId,
    wizard,
}: {
    campaignId: string;
    wizard: CompendiumImportController;
}) {
    const { preview, options, busy, phase } = wizard.state;

    const [tab, setTab] = useState<ReportTab | null>(null);

    if (!preview || phase === 'previewing') return <LoadingState count={6} />;

    const { report } = preview;

    const needsDeps =
        !report.readyToImport ||
        report.nextActions.some((issue) => issue.code === 'UNRESOLVED_REF');

    const active = tab ?? (needsDeps ? 'deps' : 'records');

    return (
        <div className="space-y-4">
            <CompendiumVerdict
                report={report}
                blockerActions={{
                    busy,
                    goToDependencies: () => setTab('deps'),
                    allowMixedEdition: options.allowMixedEdition
                        ? undefined
                        : () =>
                              wizard.actions.applyOptions({
                                  ...options,
                                  allowMixedEdition: true,
                              }),
                }}
            />
            <RulesPatchOffer wizard={wizard} />
            <CompendiumReportTabs
                campaignId={campaignId}
                report={report}
                activeTab={active}
                onTabChange={setTab}
                deps={
                    <CompendiumDependencies
                        key={preview.token}
                        wizard={wizard}
                    />
                }
            />
        </div>
    );
}
