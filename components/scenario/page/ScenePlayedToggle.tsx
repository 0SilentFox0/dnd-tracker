'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { useScenarioPageActions } from '@/lib/hooks/scenario';
import type { ScenarioPage } from '@/types/scenario';

export function ScenePlayedToggle({
    campaignId,
    page,
}: {
    campaignId: string;
    page: ScenarioPage;
}) {
    const t = useTranslations('scenario.pageBody');

    const actions = useScenarioPageActions(campaignId);

    const played = page.status === 'played';

    return (
        <HudButton
            type="button"
            className="toggle"
            aria-pressed={played}
            disabled={actions.isPending}
            onClick={() =>
                void actions
                    .updateMeta(page.id, { status: played ? 'ready' : 'played' })
                    .catch(() => {})
            }
        >
            {played ? t('scenePlayed') : t('markScenePlayed')}
        </HudButton>
    );
}
