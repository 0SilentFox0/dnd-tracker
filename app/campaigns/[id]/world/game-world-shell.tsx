import type { ReactNode } from 'react';

import { GameShell } from '@/components/layout/GameShell';
import { CampaignKind } from '@/lib/constants/campaigns';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import type { requireCampaignMember } from '@/lib/server/campaigns/access';
import { readPlayerDashboard } from '@/lib/server/campaigns/dashboard';
import { campaignGameNavigation } from '@/lib/utils/campaigns/game-navigation';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { parseRules } from '@/lib/utils/rules/schema';

interface Props {
    campaign: Awaited<ReturnType<typeof requireCampaignMember>>['campaign'];
    viewer: { isDM: boolean; userId: string };
    children: ReactNode;
}

export function GameWorldShell(props: Props) {
    return <CampaignWorldShell {...props} />;
}

async function CampaignWorldShell({ campaign, viewer, children }: Props) {
    const [t, player] = await Promise.all([
        getTranslator(await getRequestLocale(), 'common'),
        viewer.isDM
            ? null
            : readPlayerDashboard(campaign.id, viewer.userId).catch(() => null),
    ]);

    const rules = parseRules(campaign.rules);

    const items = campaignGameNavigation({
        id: campaign.id,
        isDM: viewer.isDM,
        context: {
            isTemplate: campaign.kind === CampaignKind.TEMPLATE,
            classesEnabled: classesEnabled(rules),
            mapLibraryEnabled: campaign.mapLibraryEnabled,
            system: rules.system,
        },
        activeBattleId: player?.activeBattle?.battleId,
        hasWorld: true,
        label: (section) => t(`gameNavigation.${section}`),
    });

    return (
        <GameShell
            items={items}
            activeId="world"
            title={t('gameNavigation.world')}
            breadcrumbRootLabel={t('gameNavigation.campaign')}
        >
            {children}
        </GameShell>
    );
}
