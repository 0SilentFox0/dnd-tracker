'use client';
import { CompendiumMediaReport } from '../report/CompendiumMediaReport';
import { CompendiumReportTabs } from '../report/CompendiumReportTabs';
import { CompendiumVerdict } from '../report/CompendiumVerdict';

import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

export function ResultStep({
    campaignId,
    wizard,
}: {
    campaignId: string;
    wizard: CompendiumImportController;
}) {
    const { result, media, phase, mediaPaused } = wizard.state;

    if (!result) return null;

    return (
        <div className="space-y-4">
            {media && (
                <CompendiumMediaReport
                    media={media}
                    running={phase === 'media'}
                    paused={mediaPaused}
                    actions={wizard.actions.media}
                />
            )}
            <CompendiumVerdict report={result} committed />
            <CompendiumReportTabs
                key={result.runId}
                campaignId={campaignId}
                report={result}
                committed
            />
        </div>
    );
}
