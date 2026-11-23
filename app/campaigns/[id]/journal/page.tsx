import '@/lib/server/systems/registry';
import { GameShell } from '@/components/layout/GameShell';
import { Journal } from '@/components/quests/Journal';
import { CampaignKind } from '@/lib/constants/campaigns';
import { questKeys } from '@/lib/hooks/quests';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { readPlayerDashboard } from '@/lib/server/campaigns/dashboard';
import { readQuests } from '@/lib/server/quests/store';
import { campaignGameNavigation } from '@/lib/utils/campaigns/game-navigation';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function JournalPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ quest?: string; create?: string }>;
}) {
    const [{ id }, entry] = await Promise.all([params, searchParams]);

    const access = await requireCampaignMember(id);

    const [data, t] = await Promise.all([
        readQuests(id, access),
        getTranslator(await getRequestLocale(), 'common'),
    ]);

    const content = (
        <PrefetchedQuery queryKey={questKeys.list(id)} data={data}>
            <ExtendLocaleScope namespaces={['quests']}>
                <Journal
                    key={JSON.stringify(entry)}
                    entry={entry}
                    campaignId={id}
                    isDM={access.isDM}
                    readOnly={access.isDemo}
                />
            </ExtendLocaleScope>
        </PrefetchedQuery>
    );

    const { campaign, isDM, isDemo, userId } = access;

    const rules = parseRules(campaign.rules);

    const player =
        !isDM && !isDemo
            ? await readPlayerDashboard(id, userId).catch(() => null)
            : null;

    const items = campaignGameNavigation({
        id,
        isDM,
        context: {
            isTemplate: campaign.kind === CampaignKind.TEMPLATE,
            classesEnabled: classesEnabled(rules),
            mapLibraryEnabled: campaign.mapLibraryEnabled,
            system: rules.system,
        },
        activeBattleId: player?.activeBattle?.battleId,
        hasWorld: !!player?.hasWorld,
        label: (section) => t(`gameNavigation.${section}`),
    });

    return (
        <GameShell
            items={items}
            activeId="journal"
            title={t('gameNavigation.journal')}
            breadcrumbRootLabel={t('gameNavigation.campaign')}
        >
            {content}
        </GameShell>
    );
}
