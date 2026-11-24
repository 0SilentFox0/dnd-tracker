import type { ReactNode } from 'react';

import { GameShell } from '@/components/layout/GameShell';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import type { requireCampaignMember } from '@/lib/server/campaigns/access';
import { readPlayerNavState } from '@/lib/server/campaigns/dashboard';
import {
    campaignGameNavigation,
    campaignSectionContext,
} from '@/lib/utils/campaigns/game-navigation';

type Section = 'world' | 'journal' | 'character';

export async function CampaignGameShell({
    campaign,
    viewer,
    active,
    hasWorld,
    children,
}: {
    campaign: Awaited<ReturnType<typeof requireCampaignMember>>['campaign'];
    viewer: { isDM: boolean; isDemo?: boolean; userId: string };
    active: Section;
    hasWorld?: boolean;
    children: ReactNode;
}) {
    const [t, player] = await Promise.all([
        getTranslator(await getRequestLocale(), 'common'),
        viewer.isDM || viewer.isDemo
            ? null
            : readPlayerNavState(campaign.id, viewer.userId).catch(() => null),
    ]);

    const items = campaignGameNavigation({
        id: campaign.id,
        isDM: viewer.isDM,
        context: campaignSectionContext(campaign),
        activeBattleId: player?.activeBattleId,
        hasWorld: hasWorld ?? !!player?.hasWorld,
        label: (section) => t(`gameNavigation.${section}`),
    });

    return (
        <GameShell
            items={items}
            activeId={active}
            fit={active === 'world'}
            title={t(`gameNavigation.${active}`)}
            breadcrumbRootLabel={t('gameNavigation.campaign')}
        >
            {children}
        </GameShell>
    );
}
