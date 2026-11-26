'use client';
import { useTranslations } from 'next-intl';

import { CompendiumMediaReport } from '../report/CompendiumMediaReport';
import { CompendiumReport } from '../report/CompendiumReport';

import { HudPanel } from '@/components/hud/page';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

export function ResultStep({
    wizard,
    campaignId,
}: {
    wizard: CompendiumImportController;
    campaignId: string;
}) {
    const t = useTranslations('compendium');

    const { result, media, phase, mediaPaused } = wizard.state;

    if (!result) return null;

    return (
        <HudPanel className="space-y-3">
            <h2 className="hud-sc text-base text-hud-accent-fg">
                {t('result.title')}
            </h2>
            {media && (
                <CompendiumMediaReport
                    media={media}
                    running={phase === 'media'}
                    paused={mediaPaused}
                    actions={wizard.actions.media}
                />
            )}
            <CompendiumReport
                key={result.runId}
                campaignId={campaignId}
                report={result}
                committed
            />
        </HudPanel>
    );
}
